// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error && typeof error.message === 'string' ? error.message : null;
    const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : null;
    const maybeDetails = 'details' in error && typeof error.details === 'string' ? error.details : null;
    const maybeHint = 'hint' in error && typeof error.hint === 'string' ? error.hint : null;
    const parts = [maybeMessage, maybeCode, maybeDetails, maybeHint].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return 'Failed to send the club invite.';
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Missing authorization header.');
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    throw new Error("Auth header is not 'Bearer {token}'.");
  }

  return token;
}

async function verifyUserSession(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth environment is not configured for this function.');
  }

  const token = getBearerToken(req);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    return null;
  }

  return {
    userId: data.user.id,
    email: typeof data.user.email === 'string' ? data.user.email : null,
  };
}

function normalizeRole(input: unknown) {
  if (input === 'admin' || input === 'coach' || input === 'player') {
    return input;
  }

  return 'player';
}

function normalizeSquads(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value) => value === 'cup' || value === 'plate');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const session = await verifyUserSession(req);

    if (!session?.userId) {
      return jsonResponse({ error: 'You must be signed in to send an invite.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role environment is not configured for this function.');
    }

    const body = await req.json();
    const clubId = typeof body?.clubId === 'string' ? body.clubId.trim() : '';
    const normalizedEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = normalizeRole(body?.role);
    const playerId = role === 'player' && typeof body?.playerId === 'string' && body.playerId.trim()
      ? body.playerId.trim()
      : null;
    const squads = role === 'admin' ? [] : normalizeSquads(body?.squads);
    const redirectTo =
      typeof body?.redirectTo === 'string' && /^https?:\/\//i.test(body.redirectTo.trim())
        ? body.redirectTo.trim()
        : undefined;

    if (!clubId) {
      return jsonResponse({ error: 'Missing club id.' }, 400);
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return jsonResponse({ error: 'Enter a valid email address.' }, 400);
    }

    if ((role === 'coach' || role === 'player') && squads.length <= 0) {
      return jsonResponse({ error: 'Assign at least one squad before sending the invite.' }, 400);
    }

    if (role === 'player' && !playerId) {
      return jsonResponse({ error: 'Link a player before sending a player invite.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: membership, error: membershipError } = await adminClient
      .from('club_memberships')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership || membership.role !== 'admin') {
      return jsonResponse({ error: 'Only club admins can send invites.' }, 403);
    }

    const { data: club, error: clubError } = await adminClient
      .from('clubs')
      .select('name, invite_code')
      .eq('id', clubId)
      .maybeSingle();

    if (clubError) {
      throw clubError;
    }

    if (!club) {
      return jsonResponse({ error: 'Club not found.' }, 404);
    }

    const { error: inviteSaveError } = await adminClient.from('club_member_invites').upsert(
      {
        club_id: clubId,
        email: normalizedEmail,
        role,
        player_id: playerId,
        squads,
        invited_by: session.userId,
      },
      { onConflict: 'club_id,email' }
    );

    if (inviteSaveError) {
      throw inviteSaveError;
    }

    const inviteOptions: Record<string, unknown> = {
      data: {
        club_id: clubId,
        club_name: club.name,
        invite_code: club.invite_code,
      },
    };

    if (redirectTo) {
      inviteOptions.redirectTo = redirectTo;
    }

    const { error: inviteEmailError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      inviteOptions
    );

    if (inviteEmailError) {
      return jsonResponse({
        inviteSaved: true,
        emailSent: false,
        message: `Invite saved for ${normalizedEmail}, but the email could not be sent automatically. They can still sign up with that email and will be added to ${club.name} automatically.`,
      });
    }

    return jsonResponse({
      inviteSaved: true,
      emailSent: true,
      message: `Invite emailed to ${normalizedEmail}.`,
    });
  } catch (error) {
    console.error('send-club-invite failed', error);
    return jsonResponse(
      {
        error: getErrorMessage(error),
      },
      400
    );
  }
});
