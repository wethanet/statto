import type { Player, PlayerRole } from '@/lib/types';

const validRoles: PlayerRole[] = ['player', 'captain', 'vice-captain', 'leader'];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function normalizeRole(role: string | undefined): PlayerRole {
  const normalizedRole = role?.trim().toLowerCase() as PlayerRole | undefined;

  if (normalizedRole && validRoles.includes(normalizedRole)) {
    return normalizedRole;
  }

  return 'player';
}

function normalizeActive(active: string | undefined) {
  if (!active) {
    return true;
  }

  const normalizedActive = active.trim().toLowerCase();

  if (['false', 'inactive', 'no', '0'].includes(normalizedActive)) {
    return false;
  }

  return true;
}

function makePlayerId(name: string, number: number | null, rowIndex: number) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `player-${number ?? 'no-number'}-${slug || rowIndex + 1}`;
}

export function parsePlayersCsv(csvContent: string): Player[] {
  const rows = csvContent
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one player row.');
  }

  const headers = parseCsvLine(rows[0]).map(normalizeHeader);
  const nameIndex = headers.indexOf('name');
  const numberIndex = headers.indexOf('number');
  const positionIndex = headers.indexOf('position');
  const roleIndex = headers.indexOf('role');
  const activeIndex = headers.indexOf('active');

  if (nameIndex === -1) {
    throw new Error('CSV headers must include name.');
  }

  return rows.slice(1).map((row, rowIndex) => {
    const values = parseCsvLine(row);
    const name = values[nameIndex];
    const numberValue = numberIndex === -1 ? undefined : values[numberIndex];
    const positionValue = positionIndex === -1 ? undefined : values[positionIndex];
    const normalizedNumberValue = numberValue?.trim();
    const number = normalizedNumberValue ? Number(normalizedNumberValue) : null;
    const position = positionValue?.trim() || null;

    if (!name) {
      throw new Error(`Row ${rowIndex + 2} is missing a valid name.`);
    }

    if (
      normalizedNumberValue &&
      (number == null || Number.isNaN(number) || !Number.isInteger(number) || number <= 0)
    ) {
      throw new Error(`Row ${rowIndex + 2} has an invalid guernsey number.`);
    }

    return {
      id: makePlayerId(name, number, rowIndex),
      name,
      number,
      position,
      role: normalizeRole(roleIndex === -1 ? undefined : values[roleIndex]),
      active: normalizeActive(activeIndex === -1 ? undefined : values[activeIndex]),
    };
  });
}
