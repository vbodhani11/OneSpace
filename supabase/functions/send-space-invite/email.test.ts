import { describe, expect, it } from 'vitest';
import { buildEmailHtml, escapeHtml, sanitizeEmailHeader } from './email';

describe('invitation email rendering', () => {
  it('escapes user-controlled content', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );

    const html = buildEmailHtml({
      spaceName: '<img src=x onerror=alert(1)>',
      inviterName: 'A&B',
      role: 'viewer',
      invitationUrl: 'https://example.com/invite/token?next="bad"',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('A&amp;B');
    expect(html).toContain('as a viewer');
  });

  it('describes invitations as valid until accepted or revoked', () => {
    const html = buildEmailHtml({
      spaceName: 'Home',
      inviterName: 'Owner',
      role: 'editor',
      invitationUrl: 'https://oneabyss.com/invite/token',
    });

    expect(html).toContain('remains valid until the invitation is accepted or revoked by the space owner');
    expect(html).not.toContain('expires after seven days');
  });

  it('removes line breaks from email headers', () => {
    expect(sanitizeEmailHeader('Project\r\nBcc: attacker@example.com')).toBe(
      'Project Bcc: attacker@example.com',
    );
  });
});
