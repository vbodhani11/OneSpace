import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { buildEmailHtml, sanitizeEmailHeader } from './email.ts';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INVITEES = 10;

interface InviteRequest {
  spaceId?: unknown;
  inviteeEmails?: unknown;
}

interface InvitationRecord {
  member_id: string;
  invitee_email: string;
  invitee_role: 'editor' | 'viewer';
  token: string;
  token_expires_at: string | null;
}

function appUrl(): URL {
  const configuredUrl = Deno.env.get('APP_URL') || 'https://onespaceapp.netlify.app';
  return new URL(configuredUrl);
}

function corsHeaders(request: Request): Record<string, string> {
  const configuredOrigin = appUrl().origin;
  const requestOrigin = request.headers.get('Origin');

  const allowedOrigins = new Set([
    'https://oneabyss.com',
    'https://onespaceapp.netlify.app',
  ]);

  const allowedOrigin =
    requestOrigin && allowedOrigins.has(requestOrigin)
      ? requestOrigin
      : configuredOrigin;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
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

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!resendApiKey || !resendFromEmail) {
      return jsonResponse(request, {
        ok: false,
        sent: 0,
        total: inviteeEmails.length,
        reason: 'Email delivery is not configured.',
      });
    }

    const { data: claimedRows, error: claimError } = await supabase.rpc(
      'claim_space_invites_for_delivery',
      { p_space_id: spaceId, p_invitee_emails: inviteeEmails },
    );
    if (claimError) {
      console.error('Invitation claim failed', claimError.message);
      return jsonResponse(request, { ok: false, reason: 'Invitations could not be prepared for delivery.' }, 500);
    }

    const eligibleInvitations = (claimedRows || []) as InvitationRecord[];
    if (eligibleInvitations.length === 0) {
      return jsonResponse(request, {
        ok: false,
        sent: 0,
        total: inviteeEmails.length,
        reason: 'No sendable invitations were found. Wait before resending or verify that the invitation is still pending.',
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    const inviterName = profile?.full_name || user.email || 'A OneSpace user';
    const safeSubjectInviter = sanitizeEmailHeader(inviterName);
    const safeSubjectSpace = sanitizeEmailHeader(space.name);

    const deliveryResults = await Promise.all(eligibleInvitations.map(async (invitation) => {
      const invitationUrl = new URL(`/invite/${invitation.token}`, appUrl()).toString();
      let delivered = false;
      try {
        const response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [invitation.invitee_email],
            subject: `${safeSubjectInviter} invited you to "${safeSubjectSpace}" on OneSpace`,
            html: buildEmailHtml({
              spaceName: space.name,
              inviterName,
              role: invitation.invitee_role,
              invitationUrl,
            }),
          }),
        });

        if (!response.ok) {
          console.error('Resend rejected an invitation', response.status, (await response.text()).slice(0, 500));
        } else {
          delivered = true;
        }
      } catch (deliveryError) {
        console.error('Invitation delivery failed', deliveryError);
      }

      const { error: completionError } = await supabase.rpc('complete_space_invite_delivery', {
        p_member_id: invitation.member_id,
        p_delivery_succeeded: delivered,
      });
      if (completionError) {
        console.error('Invitation delivery bookkeeping failed', completionError.message);
      }

      return { delivered };
    }));

    const sent = deliveryResults.filter((result) => result.delivered).length;
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
