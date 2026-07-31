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

/** Dark-launch provider: records nothing to a real inbox. Used when emailDelivery
 *  is armed but real sending is not yet enabled, to validate rendering/flow. */
export class NoopProvider implements EmailProvider {
  send(email: OutgoingEmail): Promise<SendResult> {
    console.log(`[email-worker] noop send to ${email.to}: ${email.subject}`);
    return Promise.resolve({ providerMessageId: `noop:${email.idempotencyKey}` });
  }
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
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderSendError(`provider ${response.status}: ${body}`, retryable);
    }

    const json = (await response.json().catch(() => ({}))) as { id?: string };
    if (!json.id) {
      throw new ProviderSendError('provider response missing message id', true);
    }
    return { providerMessageId: json.id };
  }
}
