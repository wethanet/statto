// @ts-nocheck
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeCalendarUrl(input: string) {
  const normalizedInput = input.trim();

  if (normalizedInput.startsWith('webcals://')) {
    return `https://${normalizedInput.slice('webcals://'.length)}`;
  }

  if (normalizedInput.startsWith('webcal://')) {
    return `https://${normalizedInput.slice('webcal://'.length)}`;
  }

  return normalizedInput;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const rawUrl = typeof body?.url === 'string' ? body.url : '';
    const url = normalizeCalendarUrl(rawUrl);

    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: 'Enter a valid webcal, http, or https link.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'statto-calendar-import/1.0',
        Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.8',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Calendar request failed with status ${response.status}.` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const icsContent = await response.text();

    return new Response(JSON.stringify({ icsContent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error && error.message ? error.message : 'Failed to fetch the calendar feed.',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
