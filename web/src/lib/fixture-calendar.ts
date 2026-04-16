import type { Fixture } from '@/lib/types';

import { supabase } from '@web/lib/supabase';

type CalendarEvent = {
  dtstart: {
    params: string;
    value: string;
  } | null;
  location: string | null;
  summary: string | null;
};

type ImportedFixtureInput = Omit<Fixture, 'id'>;

export type FixtureImportResult = {
  fixtures: Fixture[];
  importedCount: number;
  skippedCount: number;
};

export function normalizeWebcalUrl(input: string) {
  const normalizedInput = input.trim();

  if (normalizedInput.startsWith('webcals://')) {
    return `https://${normalizedInput.slice('webcals://'.length)}`;
  }

  if (normalizedInput.startsWith('webcal://')) {
    return `https://${normalizedInput.slice('webcal://'.length)}`;
  }

  return normalizedInput;
}

export async function importFixturesFromCalendarUrl(url: string, existingFixtures: Fixture[]) {
  const normalizedUrl = normalizeWebcalUrl(url);

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('Enter a valid webcal, http, or https link.');
  }

  const icsContent = await fetchCalendarFeed(normalizedUrl);
  const importedFixtures = parseCalendarFixtures(icsContent);

  if (importedFixtures.length === 0) {
    throw new Error('No fixtures were found in that calendar feed.');
  }

  return mergeImportedFixtures(existingFixtures, importedFixtures);
}

async function fetchCalendarFeed(url: string) {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('fetch-calendar-feed', {
      body: { url },
    });

    if (!error && data?.icsContent && typeof data.icsContent === 'string') {
      return data.icsContent;
    }

    if (error) {
      const functionMessage =
        typeof error.message === 'string' && error.message.trim()
          ? error.message
          : 'Could not reach the calendar import service.';

      throw new Error(functionMessage);
    }
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Calendar request failed with status ${response.status}.`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }

    throw new Error('Failed to fetch the calendar feed.');
  }
}

export function parseCalendarFixtures(icsContent: string): ImportedFixtureInput[] {
  const events = parseCalendarEvents(icsContent);

  return events.flatMap((event) => {
    const summary = event.summary?.trim();
    const dtstart = event.dtstart?.value.trim();

    if (!summary || !dtstart) {
      return [];
    }

    const fixtureDate = parseCalendarDate(dtstart, event.dtstart?.params ?? '');

    if (!fixtureDate) {
      return [];
    }

    const details = inferFixtureDetails(summary);

    return [
      {
        opponent: details.opponent,
        grade: null,
        squad: null,
        date: fixtureDate,
        venue: event.location?.trim() || 'TBC',
        isHome: details.isHome,
      },
    ];
  });
}

export function mergeImportedFixtures(
  existingFixtures: Fixture[],
  importedFixtures: ImportedFixtureInput[]
): FixtureImportResult {
  const fixtureKeys = new Set(existingFixtures.map((fixture) => getFixtureImportKey(fixture)));
  const fixturesToAdd: Fixture[] = [];
  const importSeed = Date.now();

  importedFixtures.forEach((fixture, index) => {
    const fixtureKey = getFixtureImportKey(fixture);

    if (fixtureKeys.has(fixtureKey)) {
      return;
    }

    fixtureKeys.add(fixtureKey);
    fixturesToAdd.push({
      id: `fx-import-${importSeed}-${index}`,
      ...fixture,
    });
  });

  return {
    fixtures: [...existingFixtures, ...fixturesToAdd],
    importedCount: fixturesToAdd.length,
    skippedCount: importedFixtures.length - fixturesToAdd.length,
  };
}

function parseCalendarEvents(icsContent: string): CalendarEvent[] {
  const lines = unfoldIcsLines(icsContent);
  const events: CalendarEvent[] = [];
  let currentEvent: CalendarEvent | null = null;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        dtstart: null,
        location: null,
        summary: null,
      };
      return;
    }

    if (line === 'END:VEVENT') {
      if (currentEvent) {
        events.push(currentEvent);
      }

      currentEvent = null;
      return;
    }

    if (!currentEvent) {
      return;
    }

    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return;
    }

    const rawKey = line.slice(0, separatorIndex);
    const value = decodeCalendarText(line.slice(separatorIndex + 1));
    const [key, ...params] = rawKey.split(';');
    const normalizedKey = key.toUpperCase();

    if (normalizedKey === 'SUMMARY') {
      currentEvent.summary = value;
      return;
    }

    if (normalizedKey === 'LOCATION') {
      currentEvent.location = value;
      return;
    }

    if (normalizedKey === 'DTSTART') {
      currentEvent.dtstart = {
        params: params.join(';').toUpperCase(),
        value,
      };
    }
  });

  return events;
}

function unfoldIcsLines(icsContent: string) {
  return icsContent
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function decodeCalendarText(value: string) {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseCalendarDate(value: string, params: string) {
  if (/VALUE=DATE/i.test(params) || /^\d{8}$/.test(value)) {
    return buildIsoDate(value, '12:00');
  }

  const utcMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/);

  if (utcMatch) {
    const [, year, month, day, hour, minute, second = '00'] = utcMatch;
    return new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    ).toISOString();
  }

  const localMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);

  if (localMatch) {
    const [, year, month, day, hour, minute, second = '00'] = localMatch;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return null;
}

function buildIsoDate(value: string, time: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month}-${day}T${time}:00`;
}

function inferFixtureDetails(summary: string) {
  const cleanedSummary = summary.replace(/\s+/g, ' ').trim();

  if (/^(vs|v)\.?\s+/i.test(cleanedSummary)) {
    return {
      opponent: cleanedSummary.replace(/^(vs|v)\.?\s+/i, '').trim(),
      isHome: true,
    };
  }

  if (/^(@|at)\s+/i.test(cleanedSummary)) {
    return {
      opponent: cleanedSummary.replace(/^(@|at)\s+/i, '').trim(),
      isHome: false,
    };
  }

  const homeMatch = cleanedSummary.match(/\b(?:vs|v)\.?\b/i);

  if (homeMatch?.index != null) {
    return {
      opponent: cleanedSummary.slice(homeMatch.index + homeMatch[0].length).trim(),
      isHome: true,
    };
  }

  const awayMatch = cleanedSummary.match(/\b(?:at)\b|@/i);

  if (awayMatch?.index != null) {
    return {
      opponent: cleanedSummary.slice(awayMatch.index + awayMatch[0].length).trim(),
      isHome: false,
    };
  }

  return {
    opponent: cleanedSummary,
    isHome: true,
  };
}

function getFixtureImportKey(fixture: Omit<Fixture, 'id'> | Fixture) {
  return [
    fixture.opponent.trim().toLowerCase(),
    fixture.date,
    fixture.venue.trim().toLowerCase(),
    fixture.isHome ? 'home' : 'away',
  ].join('|');
}
