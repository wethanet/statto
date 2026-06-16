// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Reminder = {
  kind: 'training' | 'match';
  title: string;
  date: string;
  location: string;
};

type PlayerReminder = {
  email: string;
  playerName: string;
  reminders: Reminder[];
};

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

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Failed to send response reminders.';
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

function isFutureEvent(value: string, now: number) {
  return new Date(value).getTime() >= now;
}

function isAvailabilityLocked(fixtureDate: string, now: number, lockDays: number) {
  const fixtureTime = new Date(fixtureDate).getTime();

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  return fixtureTime <= now || fixtureTime - now <= Math.max(0, lockDays) * 24 * 60 * 60 * 1000;
}

function canPlayerSeeSquadItem(playerSquad: string | null, eventSquad: string | null) {
  return eventSquad === null || playerSquad === null || eventSquad === playerSquad;
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderReminderList(reminders: Reminder[]) {
  return reminders
    .map((reminder) => {
      const label = reminder.kind === 'training' ? 'Training' : 'Match';
      return `
        <li style="margin:0 0 12px;padding:0 0 12px;border-bottom:1px solid #e4eaf7;">
          <strong style="display:block;color:#10213f;font-size:15px;">${escapeHtml(label)}: ${escapeHtml(reminder.title)}</strong>
          <span style="display:block;color:#687385;font-size:14px;line-height:1.5;">${escapeHtml(formatEventDate(reminder.date))} &middot; ${escapeHtml(reminder.location)}</span>
        </li>`;
    })
    .join('');
}

function renderReminderEmail(playerName: string, reminders: Reminder[], actionUrl: string) {
  const safeName = escapeHtml(playerName);
  const safeUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#eef3ff;font-family:Inter,Arial,sans-serif;color:#10213f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #d6e0f2;box-shadow:0 18px 45px rgba(20,36,72,0.08);">
            <tr>
              <td style="padding:32px 32px 12px;">
                <p style="margin:0 0 10px;color:#315bff;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Warners Bay Bulldogs</p>
                <h1 style="margin:0;font-size:28px;line-height:1.18;color:#10213f;">Responses needed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#4a5568;">Hi ${safeName},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#4a5568;">There are a few training or match responses still waiting for you in the Bulldogs workspace.</p>
                <ul style="list-style:none;margin:0 0 24px;padding:0;">${renderReminderList(reminders)}</ul>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#4a5568;">Please update them when you can so the coaches can plan the week clearly.</p>
                <p style="margin:0 0 28px;">
                  <a href="${safeUrl}" style="display:inline-block;background:#315bff;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:800;">Open your actions</a>
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#687385;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:0 0 22px;font-size:13px;line-height:1.6;word-break:break-all;color:#315bff;">${safeUrl}</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#687385;">Thanks for keeping your availability up to date.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendReminderEmail(reminder: PlayerReminder, actionUrl: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Warners Bay Bulldogs <onboarding@resend.dev>';

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: reminder.email,
      subject: 'Responses needed for Bulldogs training and matches',
      html: renderReminderEmail(reminder.playerName, reminder.reminders, actionUrl),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Resend could not send the reminder email.');
  }
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
      return jsonResponse({ error: 'You must be signed in to send reminders.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role environment is not configured for this function.');
    }

    const body = await req.json();
    const clubId = typeof body?.clubId === 'string' ? body.clubId.trim() : '';
    const actionUrl =
      typeof body?.actionUrl === 'string' && /^https?:\/\//i.test(body.actionUrl.trim())
        ? body.actionUrl.trim()
        : Deno.env.get('APP_URL') ?? '';

    if (!clubId) {
      return jsonResponse({ error: 'Missing club id.' }, 400);
    }

    if (!actionUrl) {
      return jsonResponse({ error: 'Missing app action URL.' }, 400);
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
      return jsonResponse({ error: 'Only club admins can send reminders.' }, 403);
    }

    const now = Date.now();
    const [
      playersResult,
      membershipsResult,
      trainingSessionsResult,
      attendanceRecordsResult,
      fixturesResult,
      availabilityRecordsResult,
      policyResult,
    ] = await Promise.all([
      adminClient
        .from('club_players')
        .select('id, name, nickname, squad, active')
        .eq('club_id', clubId)
        .eq('active', true),
      adminClient
        .from('club_memberships')
        .select('email, player_id')
        .eq('club_id', clubId)
        .not('player_id', 'is', null)
        .not('email', 'is', null),
      adminClient
        .from('club_training_sessions')
        .select('id, title, date, location, squad')
        .eq('club_id', clubId),
      adminClient
        .from('club_attendance_records')
        .select('session_id, player_id')
        .eq('club_id', clubId),
      adminClient
        .from('club_fixtures')
        .select('id, opponent, date, venue, squad')
        .eq('club_id', clubId),
      adminClient
        .from('club_availability_records')
        .select('fixture_id, player_id')
        .eq('club_id', clubId),
      adminClient
        .from('club_policy_settings')
        .select('availability_lock_days')
        .eq('club_id', clubId)
        .maybeSingle(),
    ]);

    const firstError = [
      playersResult.error,
      membershipsResult.error,
      trainingSessionsResult.error,
      attendanceRecordsResult.error,
      fixturesResult.error,
      availabilityRecordsResult.error,
      policyResult.error,
    ].find(Boolean);

    if (firstError) {
      throw firstError;
    }

    const playersById = new Map((playersResult.data ?? []).map((player) => [player.id, player]));
    const attendanceKeys = new Set(
      (attendanceRecordsResult.data ?? []).map((record) => `${record.session_id}:${record.player_id}`)
    );
    const availabilityKeys = new Set(
      (availabilityRecordsResult.data ?? []).map((record) => `${record.fixture_id}:${record.player_id}`)
    );
    const futureTrainingSessions = (trainingSessionsResult.data ?? []).filter((session) => {
      return isFutureEvent(session.date, now);
    });
    const availabilityLockDays = policyResult.data?.availability_lock_days ?? 3;
    const futureFixtures = (fixturesResult.data ?? []).filter((fixture) => {
      return isFutureEvent(fixture.date, now) && !isAvailabilityLocked(fixture.date, now, availabilityLockDays);
    });
    const remindersByEmail = new Map<string, PlayerReminder>();

    for (const member of membershipsResult.data ?? []) {
      const email = typeof member.email === 'string' ? member.email.trim().toLowerCase() : '';
      const playerId = typeof member.player_id === 'string' ? member.player_id : null;
      const player = playerId ? playersById.get(playerId) : null;

      if (!email || !player) {
        continue;
      }

      const reminders: Reminder[] = [];

      for (const sessionItem of futureTrainingSessions) {
        if (
          canPlayerSeeSquadItem(player.squad, sessionItem.squad) &&
          !attendanceKeys.has(`${sessionItem.id}:${player.id}`)
        ) {
          reminders.push({
            kind: 'training',
            title: sessionItem.title,
            date: sessionItem.date,
            location: sessionItem.location,
          });
        }
      }

      for (const fixture of futureFixtures) {
        if (
          canPlayerSeeSquadItem(player.squad, fixture.squad) &&
          !availabilityKeys.has(`${fixture.id}:${player.id}`)
        ) {
          reminders.push({
            kind: 'match',
            title: `vs ${fixture.opponent}`,
            date: fixture.date,
            location: fixture.venue,
          });
        }
      }

      if (reminders.length <= 0) {
        continue;
      }

      remindersByEmail.set(email, {
        email,
        playerName: player.nickname || player.name,
        reminders: reminders
          .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
          .slice(0, 6),
      });
    }

    const remindersToSend = [...remindersByEmail.values()];

    for (const reminder of remindersToSend) {
      await sendReminderEmail(reminder, actionUrl);
    }

    return jsonResponse({
      sent: remindersToSend.length,
      skipped: Math.max(0, (membershipsResult.data ?? []).length - remindersToSend.length),
    });
  } catch (error) {
    console.error('send-response-reminders failed', error);
    return jsonResponse(
      {
        error: getErrorMessage(error),
      },
      400
    );
  }
});
