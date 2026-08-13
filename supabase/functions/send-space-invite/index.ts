import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { buildEmailHtml } from './email.ts';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INVITEES = 10;
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

interface InviteRequest {
  spaceId?: unknown;
  inviteeEmails?: unknown;
}

interface InvitationRecord {
  id: string;
  email: string;
  role: 'editor' | 'viewer';
  invite_token: string | null;
  expires_at: string | null;
  last_invited_at: string | null;
  invite_send_count: number;
}

function appUrl(): URL {
  const configuredUrl = Deno.env.get('APP_URL') || 'https://onespaceapp.netlify.app';
  return new URL(configuredUrl);
}

function corsHeaders(request: Request): Record<string, string> {
  const configuredOrigin = appUrl().origin;
  const requestOrigin = request.headers.get('Origin');
  const isLocalDevelopment = requestOrigin
    ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
    : false;
  const allowedOrigin = requestOrigin === configuredOrigin || isLocalDevelopment
    ? requestOrigin
    : configuredOrigin;

  return {
    'Access-Control-Allow-Origin': allowedOrigin || configuredOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { ok: false, reason: 'Method not allowed.' }, 405);
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse(request, { ok: false, reason: 'Authentication required.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(request, { ok: false, reason: 'Service configuration is incomplete.' }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;
    if (authError || !user) {
      return jsonResponse(request, { ok: false, reason: 'Authentication required.' }, 401);
    }

    const payload = await request.json() as InviteRequest;
    const spaceId = typeof payload.spaceId === 'string' ? payload.spaceId : '';
    const rawEmails = Array.isArray(payload.inviteeEmails) ? payload.inviteeEmails : [];
    const inviteeEmails = Array.from(new Set(
      rawEmails
        .filter((email): email is string => typeof email === 'string')
        .map((email) => email.trim().toLowerCase()),
    ));

    if (!UUID_PATTERN.test(spaceId)) {
      return jsonResponse(request, { ok: false, reason: 'A valid space is required.' }, 400);
    }
    if (inviteeEmails.length < 1 || inviteeEmails.length > MAX_INVITEES) {
      return jsonResponse(request, { ok: false, reason: `Send between 1 and ${MAX_INVITEES} invitations at a time.` }, 400);
    }
    if (inviteeEmails.some((email) => !EMAIL_PATTERN.test(email))) {
      return jsonResponse(request, { ok: false, reason: 'Every invitee must have a valid email address.' }, 400);
    }

    const { data: space, error: spaceError } = await supabase
      .from('task_spaces')
      .select('id, name, owner_id')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space || space.owner_id !== user.id) {
      return jsonResponse(request, { ok: false, reason: 'Only the space owner can send invitations.' }, 403);
    }

    const { data: invitationRows, error: invitationError } = await supabase
      .from('task_space_members')
      .select('id, email, role, invite_token, expires_at, last_invited_at, invite_send_count')
      .eq('space_id', spaceId)
      .eq('status', 'invited')
      .in('email', inviteeEmails);

    if (invitationError) {
      return jsonResponse(request, { ok: false, reason: 'Invitations could not be verified.' }, 500);
    }

    const now = Date.now();
    const invitations = (invitationRows || []) as InvitationRecord[];
    const eligibleInvitations = invitations.filter((invitation) => {
      const expiresAt = invitation.expires_at ? new Date(invitation.expires_at).getTime() : 0;
      const lastSentAt = invitation.last_invited_at ? new Date(invitation.last_invited_at).getTime() : 0;
      return Boolean(invitation.invite_token)
        && expiresAt > now
        && invitation.invite_send_count < 5
        && (!lastSentAt || now - lastSentAt >= RESEND_COOLDOWN_MS);
    });

    if (eligibleInvitations.length === 0) {
      return jsonResponse(request, {
        ok: false,
        sent: 0,
        total: inviteeEmails.length,
        reason: 'No sendable invitations were found. The invite may be expired or was emailed recently.',
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return jsonResponse(request, {
        ok: false,
        sent: 0,
        total: inviteeEmails.length,
        reason: 'Email delivery is not configured.',
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    const inviterName = profile?.full_name || user.email || 'A OneSpace user';

    const deliveryResults = await Promise.all(eligibleInvitations.map(async (invitation) => {
      const invitationUrl = new URL(`/invite/${invitation.invite_token}`, appUrl()).toString();
      try {
        const response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM_EMAIL') || 'OneSpace <onboarding@resend.dev>',
            to: [invitation.email],
            subject: `${inviterName} invited you to "${space.name}" on OneSpace`,
            html: buildEmailHtml({
              spaceName: space.name,
              inviterName,
              role: invitation.role,
              invitationUrl,
            }),
          }),
        });

        if (!response.ok) {
          await response.text();
          return { invitation, delivered: false };
        }

        return { invitation, delivered: true };
      } catch {
        return { invitation, delivered: false };
      }
    }));

    const delivered = deliveryResults.filter((result) => result.delivered);
    await Promise.all(delivered.map(({ invitation }) => (
      supabase
        .from('task_space_members')
        .update({
          last_invited_at: new Date().toISOString(),
          invite_send_count: invitation.invite_send_count + 1,
        })
        .eq('id', invitation.id)
        .eq('space_id', spaceId)
    )));

    const sent = delivered.length;
    return jsonResponse(request, {
      ok: sent === inviteeEmails.length,
      sent,
      total: inviteeEmails.length,
      reason: sent === inviteeEmails.length ? undefined : 'Some invitation emails could not be sent.',
    });
  } catch {
    return jsonResponse(request, { ok: false, reason: 'The invitation could not be processed.' }, 500);
  }
});
