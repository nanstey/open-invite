// email-worker — the generic delivery worker (Supabase Edge Function, Deno).
//
// Producer-agnostic: it claims a batch from the outbox, applies the shared delivery
// policy, renders the row's template, and sends via the provider adapter. It knows
// nothing about notifications beyond a producer→flag map used for staged rollout.
//
// It talks to Postgres through PostgREST with the service role key (never a Postgres
// driver), so it typechecks under the app's tsconfig and needs no URL imports. The
// claim/finalize/webhook SQL functions are granted to service_role only.
//
// Invoke on a schedule (pg_cron / Supabase scheduled function every ~1 min) or nudge
// it from enqueue for low-latency transactional mail. See the PRD §6.4.

import { backoffSeconds, DEFAULT_MAX_ATTEMPTS } from './backoff.ts';
import type { EmailMessageClass } from './policy.ts';
import { resolveDelivery } from './policy.ts';
import type { EmailProvider } from './provider.ts';
import { NoopProvider, ProviderSendError, ResendProvider } from './provider.ts';
import { type EmailPayload, renderTemplate } from './templates.ts';
import { signUnsubscribeToken, type UnsubscribeScope } from './unsubscribe.ts';

interface ClaimedRow {
  id: string;
  producer: string;
  message_class: EmailMessageClass;
  topic: string;
  template: string;
  payload: EmailPayload;
  attempts: number;
  user_id: string | null;
  recipient_email: string | null;
  resolved_email: string | null;
  subscribed: boolean | null;
  topic_default_subscribed: boolean | null;
  suppressed_all: boolean | null;
  suppressed_marketing: boolean | null;
}

// Per-producer rollout gate. Unknown producers default to off (no real send).
const PRODUCER_FLAG: Record<string, string> = {
  notifications: 'emailNotifications',
};

function env(key: string, fallback = ''): string {
  return Deno.env.get(key) ?? fallback;
}

class Db {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string
  ) {}

  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`rpc ${fn} failed: ${res.status} ${await res.text().catch(() => '')}`);
    }
    return (await res.json().catch(() => null)) as T;
  }

  async flags(keys: string[]): Promise<Record<string, boolean>> {
    const inList = keys.join(',');
    const res = await fetch(
      `${this.url}/rest/v1/feature_flags?key=in.(${inList})&select=key,enabled`,
      {
        headers: {
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
        },
      }
    );
    if (!res.ok) {
      return {};
    }
    const rows = (await res.json().catch(() => [])) as Array<{ key: string; enabled: boolean }>;
    return Object.fromEntries(rows.map(r => [r.key, r.enabled]));
  }
}

function unsubscribeScopeFor(messageClass: EmailMessageClass): UnsubscribeScope | null {
  if (messageClass === 'account') return null; // account mail is not unsubscribable
  if (messageClass === 'marketing') return 'marketing';
  return 'topic';
}

async function processRow(row: ClaimedRow, db: Db, cfg: WorkerConfig): Promise<string> {
  const decision = resolveDelivery({
    messageClass: row.message_class,
    subscribed: row.subscribed,
    topicDefaultSubscribed: row.topic_default_subscribed ?? true,
    suppressedAll: row.suppressed_all ?? false,
    suppressedMarketing: row.suppressed_marketing ?? false,
    hasRecipient: Boolean(row.resolved_email),
  });

  if (!decision.send) {
    await db.rpc('mark_email_skipped', { p_id: row.id, p_reason: decision.reason });
    return `skipped:${decision.reason}`;
  }

  const to = row.resolved_email as string;

  // Producer must be enabled AND a real provider configured, else dark-launch (noop).
  const producerEnabled = cfg.flags[PRODUCER_FLAG[row.producer] ?? ''] === true;
  const provider: EmailProvider =
    producerEnabled && cfg.resendKey ? new ResendProvider(cfg.resendKey) : new NoopProvider();

  // Build a signed unsubscribe link + List-Unsubscribe header (skipped for account mail).
  const headers: Record<string, string> = {};
  let unsubscribeUrl: string | undefined;
  const scope = unsubscribeScopeFor(row.message_class);
  if (scope && cfg.unsubscribeKey) {
    const token = await signUnsubscribeToken(
      {
        scope,
        userId: row.user_id ?? undefined,
        email: row.recipient_email ?? undefined,
        topic: scope === 'topic' ? row.topic : undefined,
      },
      cfg.unsubscribeKey
    );
    unsubscribeUrl = `${cfg.appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const rendered = renderTemplate(row.template, row.payload, {
    appUrl: cfg.appUrl,
    unsubscribeUrl,
    senderIdentity: cfg.senderIdentity,
  });

  try {
    const { providerMessageId } = await provider.send({
      to,
      from: cfg.from,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers,
      idempotencyKey: row.id,
    });
    await db.rpc('mark_email_sent', { p_id: row.id, p_provider_message_id: providerMessageId });
    return 'sent';
  } catch (err) {
    const retryable = err instanceof ProviderSendError ? err.retryable : true;
    const message = err instanceof Error ? err.message : String(err);
    // Non-retryable errors jump straight to the attempt ceiling (dead-letter now).
    await db.rpc('mark_email_failed', {
      p_id: row.id,
      p_error: message,
      p_backoff_seconds: backoffSeconds(row.attempts),
      p_max_attempts: retryable ? DEFAULT_MAX_ATTEMPTS : row.attempts,
    });
    return retryable ? 'failed:retry' : 'failed:dead';
  }
}

interface WorkerConfig {
  appUrl: string;
  from: string;
  senderIdentity: string;
  resendKey: string;
  unsubscribeKey: string;
  flags: Record<string, boolean>;
}

async function runOnce(): Promise<{ processed: number; results: Record<string, number> }> {
  const url = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  const db = new Db(url, serviceKey);

  const flags = await db.flags(['emailDelivery', ...Object.values(PRODUCER_FLAG)]);
  // Core switch: off = the worker does nothing (enqueue-only dark launch).
  if (flags.emailDelivery !== true) {
    return { processed: 0, results: { disabled: 1 } };
  }

  const cfg: WorkerConfig = {
    appUrl: env('APP_URL', 'https://openinvite.app').replace(/\/$/, ''),
    from: env('EMAIL_FROM', 'Open Invite <no-reply@mail.openinvite.app>'),
    senderIdentity: env('EMAIL_SENDER_IDENTITY', 'Open Invite'),
    resendKey: env('RESEND_API_KEY'),
    unsubscribeKey: env('UNSUBSCRIBE_SIGNING_KEY'),
    flags,
  };

  const batchSize = Number.parseInt(env('EMAIL_BATCH_SIZE', '20'), 10) || 20;
  const rows = await db.rpc<ClaimedRow[]>('claim_email_batch', { p_limit: batchSize });

  const results: Record<string, number> = {};
  for (const row of rows ?? []) {
    const outcome = await processRow(row, db, cfg);
    results[outcome] = (results[outcome] ?? 0) + 1;
  }
  return { processed: (rows ?? []).length, results };
}

Deno.serve(async () => {
  try {
    const summary = await runOnce();
    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
