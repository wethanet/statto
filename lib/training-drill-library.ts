import type { TrainingDrillLibraryDrill, TrainingDrillLibraryLink } from '@/lib/types';

export function normalizeTrainingDrillName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isExtendedTrainingDrill(name: string) {
  const normalizedName = name.toLowerCase();

  return normalizedName.includes('small sided game') || normalizedName.includes('match sim');
}

export function normalizeTrainingDrillLength(name: string, lengthMinutes: number) {
  const normalizedLength = Number.isFinite(lengthMinutes) ? Math.round(lengthMinutes) : 12;

  if (isExtendedTrainingDrill(name)) {
    return Math.max(1, normalizedLength);
  }

  return Math.min(12, Math.max(1, normalizedLength));
}

export function getTrainingDrillLibraryDrills(libraryLinks: TrainingDrillLibraryLink[]) {
  return libraryLinks.flatMap((libraryLink) => {
    return libraryLink.drills.map((drill) => {
      return {
        ...drill,
        link: drill.link || libraryLink.url,
        skills: drill.skills,
        outcomes: drill.outcomes.length > 0 ? drill.outcomes : libraryLink.outcomes,
      };
    });
  });
}

export function isDuplicateTrainingDrill(
  drill: Pick<TrainingDrillLibraryDrill, 'name'>,
  existingDrills: Array<Pick<TrainingDrillLibraryDrill, 'name'>>
) {
  const normalizedName = normalizeTrainingDrillName(drill.name);

  if (!normalizedName) {
    return false;
  }

  return existingDrills.some((existingDrill) => {
    return normalizeTrainingDrillName(existingDrill.name) === normalizedName;
  });
}
