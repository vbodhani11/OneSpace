import { describe, expect, it } from 'vitest';
import { buildEmailHtml, escapeHtml } from './email';

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
});
