import { describe, expect, it } from 'vitest';
import { escapeHtml, hasTemplate, renderTemplate } from './templates';

const ctx = {
  appUrl: 'https://openinvite.app',
  unsubscribeUrl: 'https://openinvite.app/unsubscribe?token=abc',
  senderIdentity: 'Open Invite, 1 Main St',
};

describe('renderTemplate', () => {
  it('renders a known template with subject, cta deep link, and unsubscribe footer', () => {
    const out = renderTemplate(
      'invite_v1',
      { title: 'New invite', message: 'You are invited', related_event_id: 'evt-1' },
      ctx
    );
    expect(out.subject).toBe('New invite');
    expect(out.html).toContain('https://openinvite.app/events/evt-1');
    expect(out.html).toContain('https://openinvite.app/unsubscribe?token=abc');
    expect(out.text).toContain('Unsubscribe:');
  });

  it('falls back to a generic renderer for unknown templates', () => {
    expect(hasTemplate('does_not_exist')).toBe(false);
    const out = renderTemplate('does_not_exist', { title: 'Hello', message: 'Body' }, ctx);
    expect(out.subject).toBe('Hello');
    expect(out.html).toContain('Body');
  });

  it('omits the CTA when there is no related event', () => {
    const out = renderTemplate('invite_v1', { title: 'T', message: 'M' }, ctx);
    expect(out.html).not.toContain('/events/');
  });

  it('escapes HTML in payload values', () => {
    const out = renderTemplate('comment_v1', { title: 'T', message: '<script>x</script>' }, ctx);
    expect(out.html).not.toContain('<script>');
    expect(out.html).toContain('&lt;script&gt;');
  });
});

describe('escapeHtml', () => {
  it('escapes the dangerous characters', () => {
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
  });
});
