import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Invitee {
  email: string;
  role: string;
}

interface InvitePayload {
  spaceId: string;
  spaceName: string;
  inviterName: string;
  inviterEmail: string;
  invitees: Invitee[];
  inviteUrl: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      // Gracefully fail — invites are still stored in DB
      return new Response(
        JSON.stringify({ ok: false, reason: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const payload: InvitePayload = await req.json();
    const { spaceName, inviterName, invitees, inviteUrl } = payload;

    const results = await Promise.allSettled(
      invitees.map(({ email, role }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'OneSpace <noreply@onespace-abc123.netlify.app>',
            to: [email],
            subject: `${inviterName} invited you to "${spaceName}" on OneSpace`,
            html: buildEmailHtml({ spaceName, inviterName, role, inviteUrl }),
          }),
        })
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({ ok: true, sent, total: invitees.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function buildEmailHtml({
  spaceName,
  inviterName,
  role,
  inviteUrl,
}: {
  spaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're invited to ${spaceName}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a18;font-family:Inter,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px 36px;max-width:560px;">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="font-size:28px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            OneSpace
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:20px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">
            You've been invited!
          </h1>
          <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.6;">
            <strong style="color:#e2e8f0;">${inviterName}</strong> has invited you to collaborate
            on <strong style="color:#a78bfa;">${spaceName}</strong> as ${role === 'editor' ? 'an editor' : 'a viewer'}.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0;">
          <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
            Accept invitation →
          </a>
        </td></tr>
        <tr><td style="text-align:center;padding-top:8px;">
          <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
            Or copy this link:<br />
            <a href="${inviteUrl}" style="color:#7c3aed;word-break:break-all;">${inviteUrl}</a>
          </p>
          <p style="margin:20px 0 0;color:#334155;font-size:11px;">
            If you weren't expecting this invite, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
