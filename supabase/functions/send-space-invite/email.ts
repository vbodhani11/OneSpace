export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

export function buildEmailHtml({
  spaceName,
  inviterName,
  role,
  invitationUrl,
}: {
  spaceName: string;
  inviterName: string;
  role: 'editor' | 'viewer';
  invitationUrl: string;
}) {
  const safeSpaceName = escapeHtml(spaceName);
  const safeInviterName = escapeHtml(inviterName);
  const safeInvitationUrl = escapeHtml(invitationUrl);
  const roleDescription = role === 'editor' ? 'an editor' : 'a viewer';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitation to ${safeSpaceName}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a18;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#151526;border:1px solid #2c2c45;border-radius:20px;padding:40px 36px;max-width:560px;">
        <tr><td style="text-align:center;padding-bottom:28px;color:#a78bfa;font-size:28px;font-weight:900;">OneSpace</td></tr>
        <tr><td style="text-align:center;padding-bottom:20px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">You've been invited</h1>
          <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.6;">
            <strong style="color:#e2e8f0;">${safeInviterName}</strong> invited you to
            <strong style="color:#a78bfa;">${safeSpaceName}</strong> as ${roleDescription}.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0;">
          <a href="${safeInvitationUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;">
            Review invitation
          </a>
        </td></tr>
        <tr><td style="text-align:center;padding-top:8px;">
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
            This private link expires after seven days and only works with the invited email address.
          </p>
          <p style="margin:20px 0 0;color:#475569;font-size:11px;">If you weren't expecting this invitation, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
