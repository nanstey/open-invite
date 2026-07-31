// Provider adapter. The worker depends only on this interface, so swapping Resend
// for Postmark/SES — or using a different provider per message class — is an adapter
// change, not a change to the delivery core.

export interface OutgoingEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe / List-Unsubscribe-Post. */
  headers?: Record<string, string>;
  /** Passed to the provider so it can dedupe on our idempotency key. */
  idempotencyKey: string;
}

export interface SendResult {
  providerMessageId: string;
}

export class ProviderSendError extends Error {
  /** true when the failure is worth retrying (network / 5xx / 429). */
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'ProviderSendError';
    this.retryable = retryable;
  }
}

export interface EmailProvider {
  send(email: OutgoingEmail): Promise<SendResult>;
}

/** Resend REST adapter (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(apiKey: string, endpoint = 'https://api.resend.com/emails') {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async send(email: OutgoingEmail): Promise<SendResult> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Resend honors an idempotency key to dedupe retried sends.
          'Idempotency-Key': email.idempotencyKey,
        },
        body: JSON.stringify({
          from: email.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: email.headers,
        }),
      });
    } catch (err) {
      // Network-level failure — always retryable.
      throw new ProviderSendError(`network error: ${String(err)}`, true);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // Only genuinely permanent, per-message errors should skip retries and
      // dead-letter: a bad request (400) or unprocessable recipient (422). Auth /
      // rate-limit / transient statuses (401/403/408/425/429/5xx/network) are
      // retryable — otherwise a rotated API key would dead-letter the whole backlog
      // on the first attempt instead of recovering once the key is fixed.
      const permanent = response.status === 400 || response.status === 422;
      throw new ProviderSendError(`provider ${response.status}: ${body}`, !permanent);
    }

    // A 2xx means the provider accepted the message. If the body is momentarily
    // unparseable or missing an id we must NOT throw retryable (that would resend an
    // already-accepted message); treat it as sent with a best-effort id so the row
    // reaches a terminal state. The idempotency key still guards a provider-side dupe.
    const json = (await response.json().catch(() => ({}))) as { id?: string };
    return { providerMessageId: json.id ?? `resend:unknown:${email.idempotencyKey}` };
  }
}
