// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const openAiModel = 'gpt-4o-mini';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizePlayer(input: Record<string, unknown>) {
  return {
    name: typeof input?.name === 'string' ? input.name.trim() : '',
    number:
      typeof input?.number === 'number'
        ? input.number
        : typeof input?.number === 'string'
          ? Number(input.number)
          : null,
    squad: typeof input?.squad === 'string' ? input.squad : null,
    role: typeof input?.role === 'string' ? input.role : null,
    primaryPosition: typeof input?.primaryPosition === 'string' ? input.primaryPosition : null,
    secondaryPosition: typeof input?.secondaryPosition === 'string' ? input.secondaryPosition : null,
    runningProfile: typeof input?.runningProfile === 'string' ? input.runningProfile : null,
    seasonGoals: typeof input?.seasonGoals === 'string' ? input.seasonGoals.trim() : '',
    skillSummary: typeof input?.skillSummary === 'string' ? input.skillSummary.trim() : '',
    developmentLevel: typeof input?.developmentLevel === 'string' ? input.developmentLevel : null,
  };
}

function normalizeRecentEntries(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.slice(0, 4).map((entry) => {
    const tasks = Array.isArray(entry?.tasks)
      ? entry.tasks
          .map((task) => {
            if (!task || typeof task !== 'object') {
              return null;
            }

            const title = typeof task.title === 'string' ? task.title.trim() : '';

            if (!title) {
              return null;
            }

            return {
              title,
              priority:
                typeof task.priority === 'number'
                  ? task.priority
                  : typeof task.priority === 'string'
                    ? Number(task.priority)
                    : null,
              progressStatus:
                typeof task.progressStatus === 'string'
                  ? task.progressStatus
                  : typeof task.progress_status === 'string'
                    ? task.progress_status
                    : 'not-started',
            };
          })
          .filter(Boolean)
      : Array.isArray(entry?.focusAreas)
        ? entry.focusAreas
            .map((focusArea, index) => {
              const title = typeof focusArea === 'string' ? focusArea.trim() : '';

              if (!title) {
                return null;
              }

              return {
                title,
                priority: index + 1,
                progressStatus: 'not-started',
              };
            })
            .filter(Boolean)
        : [];

    return {
      weekStart: typeof entry?.weekStart === 'string' ? entry.weekStart : '',
      tasks,
      progressStatus: typeof entry?.progressStatus === 'string' ? entry.progressStatus : 'not-started',
      proficiency:
        typeof entry?.proficiency === 'number'
          ? entry.proficiency
          : typeof entry?.proficiency === 'string'
            ? Number(entry.proficiency)
            : null,
      progressNote: typeof entry?.progressNote === 'string' ? entry.progressNote.trim() : '',
    };
  });
}

function normalizeCurrentWeekEntry(input: unknown) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const entry = input as Record<string, unknown>;

  return {
    weekStart: typeof entry.weekStart === 'string' ? entry.weekStart : '',
    tasks: normalizeGeneratedTasks(entry.tasks),
    coachingNote: typeof entry.coachingNote === 'string' ? entry.coachingNote.trim() : '',
    progressStatus: typeof entry.progressStatus === 'string' ? entry.progressStatus : 'not-started',
    proficiency:
      typeof entry.proficiency === 'number'
        ? entry.proficiency
        : typeof entry.proficiency === 'string'
          ? Number(entry.proficiency)
          : null,
    progressNote: typeof entry.progressNote === 'string' ? entry.progressNote.trim() : '',
  };
}

function normalizeMessages(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const role = entry.role === 'assistant' ? 'assistant' : entry.role === 'coach' ? 'coach' : null;
      const content = typeof entry.content === 'string' ? entry.content.trim() : '';

      if (!role || !content) {
        return null;
      }

      return { role, content };
    })
    .filter(Boolean)
    .slice(-12);
}

function normalizeGeneratedTasks(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((task, index) => {
      if (!task || typeof task !== 'object') {
        return null;
      }

      const title = typeof task.title === 'string' ? task.title.trim() : '';
      const priorityValue =
        typeof task.priority === 'number'
          ? task.priority
          : typeof task.priority === 'string'
            ? Number(task.priority)
            : index + 1;

      if (!title) {
        return null;
      }

      return {
        title,
        priority: Number.isInteger(priorityValue) && priorityValue > 0 ? priorityValue : index + 1,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 5);
}

function normalizeSeasonGoals(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    throw new Error("Auth header is not 'Bearer {token}'");
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
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    return null;
  }

  return data.claims.sub;
}

async function createStructuredFocus(
  player: Record<string, unknown>,
  weekStart: string,
  currentWeekEntry: Record<string, unknown> | null,
  recentEntries: unknown[],
  messages: Array<{ role: 'assistant' | 'coach'; content: string }>
) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for this Supabase project.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModel,
      store: false,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are an AFL player development coach collaborating with another coach in an ongoing chat. Respond conversationally, but also keep an up-to-date draft player development plan the coach can apply into the app. Always output valid JSON that matches the schema exactly. The assistantMessage should sound like a thoughtful coaching reply, acknowledge the latest coach message, and either refine the plan or ask the next useful question. The seasonGoals field should be a concise multi-line coaching plan with 2 to 4 season goals. The weeklyFocus must include a short coachingNote plus 3 to 5 specific, trainable tasks or drills for this week, ordered by priority. Avoid vague goals. Make every task specific enough that a coach could run it at training or reference it in feedback.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                currentWeekEntry,
                messages,
                weekStart,
                player,
                recentEntries,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'player_development_focus',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              assistantMessage: {
                type: 'string',
              },
              seasonGoals: {
                type: 'string',
              },
              weeklyFocus: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  coachingNote: {
                    type: 'string',
                  },
                  tasks: {
                    type: 'array',
                    minItems: 3,
                    maxItems: 5,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        title: {
                          type: 'string',
                        },
                        priority: {
                          type: 'integer',
                        },
                      },
                      required: ['title', 'priority'],
                    },
                  },
                },
                required: ['coachingNote', 'tasks'],
              },
            },
            required: ['assistantMessage', 'seasonGoals', 'weeklyFocus'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const refusal = payload?.output
    ?.flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    ?.find((item) => item?.type === 'refusal');

  if (refusal?.refusal) {
    throw new Error(refusal.refusal);
  }

  const outputText = payload?.output
    ?.flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    ?.find((item) => item?.type === 'output_text')
    ?.text;

  if (typeof outputText !== 'string' || !outputText.trim()) {
    throw new Error('OpenAI returned an empty development response.');
  }

  return JSON.parse(outputText);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const userId = await verifyUserSession(req);

    if (!userId) {
      return jsonResponse({ error: 'Invalid user session.' }, 401);
    }

    const body = await req.json();
    const weekStart = typeof body?.weekStart === 'string' ? body.weekStart.trim() : '';
    const player = normalizePlayer(body?.player ?? {});
    const currentWeekEntry = normalizeCurrentWeekEntry(body?.currentWeekEntry ?? null);
    const recentEntries = normalizeRecentEntries(body?.recentEntries);
    const messages = normalizeMessages(body?.messages);

    if (!weekStart) {
      return jsonResponse({ error: 'weekStart is required.' }, 400);
    }

    if (!player.name) {
      return jsonResponse({ error: 'A player profile is required.' }, 400);
    }

    if (messages.length <= 0) {
      return jsonResponse({ error: 'At least one coach message is required.' }, 400);
    }

    const generatedFocus = await createStructuredFocus(
      player,
      weekStart,
      currentWeekEntry,
      recentEntries,
      messages
    );

    const assistantMessage =
      typeof generatedFocus?.assistantMessage === 'string' ? generatedFocus.assistantMessage.trim() : '';
    const seasonGoals = normalizeSeasonGoals(generatedFocus?.seasonGoals);
    const tasks = normalizeGeneratedTasks(generatedFocus?.weeklyFocus?.tasks);
    const coachingNote =
      typeof generatedFocus?.weeklyFocus?.coachingNote === 'string'
        ? generatedFocus.weeklyFocus.coachingNote.trim()
        : '';

    if (!assistantMessage || !seasonGoals || tasks.length <= 0 || !coachingNote) {
      return jsonResponse({ error: 'The coaching development response was incomplete.' }, 400);
    }

    return jsonResponse({
      assistantMessage,
      seasonGoals,
      weeklyFocus: {
        coachingNote,
        tasks,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Failed to generate a weekly development focus.',
      },
      400
    );
  }
});
