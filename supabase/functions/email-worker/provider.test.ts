import { afterEach, describe, expect, it, vi } from 'vitest';
import { type OutgoingEmail, ProviderSendError, ResendProvider } from './provider';

const email: OutgoingEmail = {
  to: 'a@b.com',
  from: 'Open Invite <no-reply@mail.test>',
  subject: 'Hi',
  html: '<p>hi</p>',
  text: 'hi',
  idempotencyKey: 'row-1',
};

function mockFetch(response: Partial<Response> & { _json?: unknown; _text?: string }) {
  const res = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: () => Promise.resolve(response._json ?? {}),
    text: () => Promise.resolve(response._text ?? ''),
  } as unknown as Response;
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(res);
}

describe('ResendProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the provider message id on success', async () => {
    mockFetch({ ok: true, status: 200, _json: { id: 'msg-123' } });
    const result = await new ResendProvider('key').send(email);
    expect(result.providerMessageId).toBe('msg-123');
  });

  it('sends the idempotency key as a header', async () => {
    const spy = mockFetch({ ok: true, status: 200, _json: { id: 'x' } });
    await new ResendProvider('key').send(email);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('row-1');
  });

  it('treats 2xx without an id as sent (no retry) with a best-effort id', async () => {
    mockFetch({ ok: true, status: 202, _json: {} });
    const result = await new ResendProvider('key').send(email);
    expect(result.providerMessageId).toBe('resend:unknown:row-1');
  });

  it('classifies 401/403/408/429/5xx as retryable', async () => {
    for (const status of [401, 403, 408, 429, 500, 503]) {
      mockFetch({ ok: false, status, _text: 'err' });
      await expect(new ResendProvider('key').send(email)).rejects.toMatchObject({
        name: 'ProviderSendError',
        retryable: true,
      });
      vi.restoreAllMocks();
    }
  });

  it('classifies 400 and 422 as permanent (non-retryable)', async () => {
    for (const status of [400, 422]) {
      mockFetch({ ok: false, status, _text: 'bad' });
      await expect(new ResendProvider('key').send(email)).rejects.toMatchObject({
        name: 'ProviderSendError',
        retryable: false,
      });
      vi.restoreAllMocks();
    }
  });

  it('treats a network error as retryable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
    await expect(new ResendProvider('key').send(email)).rejects.toMatchObject({
      name: 'ProviderSendError',
      retryable: true,
    });
  });

  it('ProviderSendError carries the retryable flag', () => {
    expect(new ProviderSendError('x', true).retryable).toBe(true);
    expect(new ProviderSendError('x', false).retryable).toBe(false);
  });
});
