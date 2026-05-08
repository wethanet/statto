// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const openAiModel = 'gpt-4o-mini';
const maxSourceCharacters = 30000;
const maxDrillImages = 12;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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

function isPrivateHostname(hostname: string) {
  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost === '0.0.0.0' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '::1'
  ) {
    return true;
  }

  const octets = normalizedHost.split('.').map((part) => Number(part));

  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

function parseSourceUrl(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const sourceUrl = new URL(value.trim());

    if (!['http:', 'https:'].includes(sourceUrl.protocol) || isPrivateHostname(sourceUrl.hostname)) {
      return null;
    }

    return sourceUrl;
  } catch {
    return null;
  }
}

function extractPageTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return normalizeText(titleMatch?.[1] ?? '');
}

function getAttributeValue(tag: string, attributeName: string) {
  const attributePattern = new RegExp(`${attributeName}\\s*=\\s*(['"])(.*?)\\1`, 'i');
  const match = tag.match(attributePattern);

  return normalizeText(match?.[2] ?? '');
}

function resolvePublicUrl(value: string, sourceUrl: URL) {
  if (!value) {
    return '';
  }

  try {
    const resolvedUrl = new URL(value, sourceUrl);

    if (!['http:', 'https:'].includes(resolvedUrl.protocol) || isPrivateHostname(resolvedUrl.hostname)) {
      return '';
    }

    return resolvedUrl.toString();
  } catch {
    return '';
  }
}

function extractOpenGraphData(html: string, sourceUrl: URL) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const values: Record<string, string> = {};

  metaTags.forEach((tag) => {
    const key = getAttributeValue(tag, 'property') || getAttributeValue(tag, 'name');
    const content = getAttributeValue(tag, 'content');

    if (!key || !content) {
      return;
    }

    values[key.toLowerCase()] = content;
  });

  const image = resolvePublicUrl(
    values['og:image:secure_url'] || values['og:image'] || values['twitter:image'],
    sourceUrl
  );
  const url = resolvePublicUrl(values['og:url'], sourceUrl) || sourceUrl.toString();

  return {
    title: values['og:title'] || values['twitter:title'] || '',
    description: values['og:description'] || values['twitter:description'] || '',
    image,
    siteName: values['og:site_name'] || '',
    type: values['og:type'] || '',
    url,
  };
}

function htmlToText(html: string) {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function normalizeText(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isYouTubeHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase();

  return normalizedHost === 'youtu.be' || normalizedHost === 'youtube.com' || normalizedHost.endsWith('.youtube.com');
}

function parseJsonObjectFromMarker(html: string, marker: string) {
  const markerIndex = html.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  const objectStart = html.indexOf('{', markerIndex + marker.length);

  if (objectStart < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = objectStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(html.slice(objectStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function getTextValue(value: unknown) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  if (typeof value.simpleText === 'string') {
    return normalizeText(value.simpleText);
  }

  if (Array.isArray(value.runs)) {
    return normalizeText(
      value.runs
        .map((run) => {
          return typeof run?.text === 'string' ? run.text : '';
        })
        .join(' ')
    );
  }

  return '';
}

function getBestThumbnailUrl(value: unknown, sourceUrl: URL) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  const thumbnails = Array.isArray(record.thumbnails) ? record.thumbnails : [];
  const sortedThumbnails = thumbnails
    .filter((thumbnail): thumbnail is Record<string, unknown> => {
      return Boolean(thumbnail && typeof thumbnail === 'object' && typeof thumbnail.url === 'string');
    })
    .sort((first, second) => {
      const firstArea =
        (typeof first.width === 'number' ? first.width : 0) * (typeof first.height === 'number' ? first.height : 0);
      const secondArea =
        (typeof second.width === 'number' ? second.width : 0) * (typeof second.height === 'number' ? second.height : 0);

      return secondArea - firstArea;
    });

  const url = typeof sortedThumbnails[0]?.url === 'string' ? sortedThumbnails[0].url : '';

  return resolvePublicUrl(url, sourceUrl);
}

function parseDurationMinutes(value: string) {
  const parts = value
    .split(':')
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 0) {
    return 12;
  }

  const seconds = parts.reduce((total, part) => {
    return total * 60 + part;
  }, 0);

  return Math.max(1, Math.ceil(seconds / 60));
}

function collectYouTubeVideos(
  value: unknown,
  videos: Array<{ image: string; lengthMinutes: number; title: string; url: string }>,
  sourceUrl: URL
) {
  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const renderer =
    record.playlistVideoRenderer ??
    record.videoRenderer ??
    record.gridVideoRenderer ??
    record.compactVideoRenderer;

  if (renderer && typeof renderer === 'object') {
    const video = renderer as Record<string, unknown>;
    const videoId = typeof video.videoId === 'string' ? video.videoId : '';
    const title = getTextValue(video.title);
    const lengthText = getTextValue(video.lengthText);
    const image =
      getBestThumbnailUrl(video.thumbnail, sourceUrl) ||
      getBestThumbnailUrl(
        (video.richThumbnail as Record<string, unknown> | undefined)?.movingThumbnailRenderer
          ? (video.richThumbnail as Record<string, unknown>).movingThumbnailRenderer
          : null,
        sourceUrl
      );

    if (videoId && title && !title.toLowerCase().includes('private video')) {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (!videos.some((existingVideo) => existingVideo.url === url)) {
        videos.push({
          image,
          title,
          url,
          lengthMinutes: lengthText ? parseDurationMinutes(lengthText) : 12,
        });
      }
    }
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectYouTubeVideos(entry, videos, sourceUrl));
    return;
  }

  Object.values(record).forEach((entry) => collectYouTubeVideos(entry, videos, sourceUrl));
}

function extractYouTubeVideos(html: string, sourceUrl: URL) {
  const videos: Array<{ image: string; lengthMinutes: number; title: string; url: string }> = [];
  const initialData =
    parseJsonObjectFromMarker(html, 'var ytInitialData =') ??
    parseJsonObjectFromMarker(html, 'window["ytInitialData"] =') ??
    parseJsonObjectFromMarker(html, 'ytInitialData =');

  collectYouTubeVideos(initialData, videos, sourceUrl);

  return videos.slice(0, 50);
}

async function fetchSource(sourceUrl: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(sourceUrl.toString(), {
      headers: {
        Accept: 'text/html, text/plain;q=0.9, application/json;q=0.8',
        'User-Agent': 'Statto drill library discovery',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`The source returned ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('text/') && !contentType.includes('application/json')) {
      throw new Error('The source is not a readable text page.');
    }

    const rawText = await response.text();
    const isHtml = contentType.includes('text/html') || rawText.includes('<html');
    const openGraph = isHtml ? extractOpenGraphData(rawText, sourceUrl) : null;
    const sourceTitle = openGraph?.title || (isHtml ? extractPageTitle(rawText) : sourceUrl.hostname);
    const youtubeVideos = isHtml && isYouTubeHost(sourceUrl.hostname) ? extractYouTubeVideos(rawText, sourceUrl) : [];
    const drillImages = youtubeVideos
      .filter((video) => video.image)
      .slice(0, maxDrillImages)
      .map((video) => ({
        title: video.title,
        url: video.url,
        image: video.image,
      }));
    const youtubeContent =
      youtubeVideos.length > 0
        ? [
            'YouTube playlist or video entries clearly listed at the source URL:',
            ...youtubeVideos.map((video) => {
              return `- ${video.title} (${video.lengthMinutes} min): ${video.url}${
                video.image ? ` | drill image: ${video.image}` : ''
              }`;
            }),
          ].join('\n')
        : '';
    const openGraphContent = openGraph
      ? [
          'OpenGraph preview data discovered at the source URL:',
          openGraph.title ? `- Title: ${openGraph.title}` : '',
          openGraph.description ? `- Description: ${openGraph.description}` : '',
          openGraph.type ? `- Type: ${openGraph.type}` : '',
          openGraph.siteName ? `- Site: ${openGraph.siteName}` : '',
          openGraph.image ? `- Image: ${openGraph.image}` : '',
          openGraph.url ? `- Canonical URL: ${openGraph.url}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';
    const pageContent = isHtml ? htmlToText(rawText) : normalizeText(rawText);
    const content = [openGraphContent, youtubeContent, pageContent].filter(Boolean).join('\n\n').slice(0, maxSourceCharacters);

    if (content.length < 80 && youtubeVideos.length === 0) {
      throw new Error('The source did not include enough readable drill content.');
    }

    return {
      content,
      drillImages,
      openGraph,
      sourceTitle: sourceTitle || sourceUrl.hostname,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverDrills(
  sourceUrl: string,
  sourceTitle: string,
  sourceText: string,
  openGraph: ReturnType<typeof extractOpenGraphData> | null,
  drillImages: Array<{ image: string; title: string; url: string }>
) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for this Supabase project.');
  }

  const userContent = [
    {
      type: 'input_text',
      text: JSON.stringify({
        openGraph,
        sourceTitle,
        sourceUrl,
        sourceText,
        drillImages,
      }),
    },
  ];

  drillImages.forEach((drillImage, index) => {
    userContent.push({
      type: 'input_text',
      text: `Drill image ${index + 1}: title="${drillImage.title}", source="${drillImage.url}", image="${drillImage.image}"`,
    });
    userContent.push({
      type: 'input_image',
      image_url: drillImage.image,
    });
  });

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
                'You extract AFL or team-sport training drills from a web page for a coaching app. Return only drills that are actually described or clearly listed in the source text, OpenGraph preview data, or supplied drill-level images. YouTube playlist entries count as clearly listed source items when their titles or item thumbnails describe a drill, coaching activity, small-sided game, match simulation, or training exercise. Use drill-level images to read contextual labels such as drill names, but do not use a page-level OpenGraph image as a drill image. Do not invent drills. Each drill needs a concise name, likely length in minutes, a source link, an image URL when a supplied drill-level image belongs to that drill, skills the drill is designed to improve, and outcome tags such as kicking, pressure, transition, defence, contest, stoppage, communication, fitness, or match simulation. The image field must be the exact supplied drill-level image URL for that drill, or an empty string if no drill-level image applies. Skills should be specific coaching skill tags such as clean hands, ground balls, tackling, kicking accuracy, leading patterns, decision making, marking, defensive positioning, communication, transition running, or stoppage craft. Standard drills must be 12 minutes or less. Only small-sided games or match simulation blocks may be longer than 12 minutes. If no drills are present, return an empty drills array.',
            },
          ],
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'training_drill_library_discovery',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sourceTitle: { type: 'string' },
              summary: { type: 'string' },
              drills: {
                type: 'array',
                maxItems: 20,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    lengthMinutes: { type: 'integer' },
                    link: { type: 'string' },
                    image: { type: 'string' },
                    skills: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 8,
                      items: { type: 'string' },
                    },
                    outcomes: {
                      type: 'array',
                      maxItems: 6,
                      items: { type: 'string' },
                    },
                  },
                  required: ['name', 'lengthMinutes', 'link', 'image', 'skills', 'outcomes'],
                },
              },
            },
            required: ['sourceTitle', 'summary', 'drills'],
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
    throw new Error('OpenAI returned an empty drill discovery response.');
  }

  return JSON.parse(outputText);
}

function normalizeDiscoveredDrills(
  input: unknown,
  fallbackLink: string,
  drillImages: Array<{ image: string; title: string; url: string }>
) {
  if (!Array.isArray(input)) {
    return [];
  }

  const knownDrillImages = new Set(drillImages.map((drillImage) => drillImage.image));

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      const link = typeof entry.link === 'string' && entry.link.trim() ? entry.link.trim() : fallbackLink;
      const image =
        typeof entry.image === 'string' && knownDrillImages.has(entry.image.trim()) ? entry.image.trim() : '';
      const rawLength =
        typeof entry.lengthMinutes === 'number'
          ? entry.lengthMinutes
          : typeof entry.lengthMinutes === 'string'
            ? Number(entry.lengthMinutes)
            : 12;
      const outcomes = Array.isArray(entry.outcomes)
        ? entry.outcomes
            .filter((outcome) => typeof outcome === 'string')
            .map((outcome) => outcome.trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];
      const skills = Array.isArray(entry.skills)
        ? entry.skills
            .filter((skill) => typeof skill === 'string')
            .map((skill) => skill.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      if (!name || !link) {
        return null;
      }

      const isExtended =
        name.toLowerCase().includes('small sided game') || name.toLowerCase().includes('match sim');
      const lengthMinutes = isExtended
        ? Math.max(1, Math.round(rawLength))
        : Math.min(12, Math.max(1, Math.round(rawLength)));

      return {
        name,
        lengthMinutes: Number.isFinite(lengthMinutes) ? lengthMinutes : 12,
        link,
        image,
        skills: skills.length > 0 ? skills : outcomes,
        outcomes,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
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
    const sourceUrl = parseSourceUrl(body?.sourceUrl);

    if (!sourceUrl) {
      return jsonResponse({ error: 'A valid public http or https URL is required.' }, 400);
    }

    const source = await fetchSource(sourceUrl);
    const discovered = await discoverDrills(
      sourceUrl.toString(),
      source.sourceTitle,
      source.content,
      source.openGraph,
      source.drillImages
    );
    const drills = normalizeDiscoveredDrills(discovered?.drills, sourceUrl.toString(), source.drillImages);

    return jsonResponse({
      openGraph: source.openGraph,
      sourceTitle:
        typeof discovered?.sourceTitle === 'string' && discovered.sourceTitle.trim()
          ? discovered.sourceTitle.trim()
          : source.sourceTitle,
      sourceUrl: sourceUrl.toString(),
      summary: typeof discovered?.summary === 'string' ? discovered.summary.trim() : '',
      drills,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Could not discover drills from that link.',
      },
      400
    );
  }
});
