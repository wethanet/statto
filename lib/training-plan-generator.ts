import type { TrainingDrillLibraryLink, TrainingSessionDrill } from '@/lib/types';
import {
  getTrainingDrillLibraryDrills,
  isExtendedTrainingDrill,
  normalizeTrainingDrillLength,
} from '@/lib/training-drill-library';

type DrillTemplate = {
  name: string;
  lengthMinutes: number;
  link: string | null;
  skills: string[];
};

const focusTemplates: Array<{
  keywords: string[];
  drills: DrillTemplate[];
}> = [
  {
    keywords: ['pressure', 'tackle', 'contest', 'contested', 'ground ball', 'hunt'],
    drills: [
      { name: 'Pressure activation grid', lengthMinutes: 10, link: null, skills: ['Pressure', 'Tackling', 'Reaction'] },
      { name: 'Two-on-two contest exit', lengthMinutes: 12, link: null, skills: ['Contested ball', 'Clean hands', 'Decision making'] },
      { name: 'Repeat pressure transition', lengthMinutes: 12, link: null, skills: ['Pressure', 'Transition', 'Work rate'] },
      { name: 'Conditioned pressure small sided game', lengthMinutes: 18, link: null, skills: ['Pressure', 'Communication', 'Game sense'] },
    ],
  },
  {
    keywords: ['kick', 'kicking', 'skill', 'skills', 'ball use', 'disposal', 'inside 50'],
    drills: [
      { name: 'Kicking lanes warm-up extension', lengthMinutes: 10, link: null, skills: ['Kicking', 'Leading', 'Timing'] },
      { name: 'Lead-up connection', lengthMinutes: 12, link: null, skills: ['Kicking', 'Marking', 'Connection'] },
      { name: 'Inside-50 entry options', lengthMinutes: 12, link: null, skills: ['Forward entry', 'Decision making', 'Kicking'] },
      { name: 'Turnover-free ball movement small sided game', lengthMinutes: 18, link: null, skills: ['Ball movement', 'Decision making', 'Skill execution'] },
    ],
  },
  {
    keywords: ['transition', 'spread', 'switch', 'rebound', 'half back', 'overlap', 'run'],
    drills: [
      { name: 'Width and switch activation', lengthMinutes: 10, link: null, skills: ['Switching', 'Spacing', 'Kicking'] },
      { name: 'Half-back rebound lanes', lengthMinutes: 12, link: null, skills: ['Rebound', 'Run and carry', 'Decision making'] },
      { name: 'Turnover to attack wave', lengthMinutes: 12, link: null, skills: ['Transition', 'Support running', 'Ball movement'] },
      { name: 'Full-ground transition match sim', lengthMinutes: 20, link: null, skills: ['Transition', 'Team shape', 'Communication'] },
    ],
  },
  {
    keywords: ['defence', 'defense', 'defensive', 'backline', 'zone', 'team defence'],
    drills: [
      { name: 'Defensive shape walk-through', lengthMinutes: 10, link: null, skills: ['Defensive shape', 'Positioning', 'Communication'] },
      { name: 'Intercept and outlet', lengthMinutes: 12, link: null, skills: ['Intercept marking', 'Outlet running', 'Decision making'] },
      { name: 'Lock-in repeat entries', lengthMinutes: 12, link: null, skills: ['Forward pressure', 'Defensive setup', 'Repeat effort'] },
      { name: 'Defensive transition small sided game', lengthMinutes: 18, link: null, skills: ['Defensive transition', 'Pressure', 'Team defence'] },
    ],
  },
];

const defaultDrills: DrillTemplate[] = [
  { name: 'Focus activation', lengthMinutes: 10, link: null, skills: ['Activation', 'Touch', 'Communication'] },
  { name: 'Technical build-up', lengthMinutes: 12, link: null, skills: ['Skill execution', 'Decision making', 'Connection'] },
  { name: 'Pressure decision drill', lengthMinutes: 12, link: null, skills: ['Pressure', 'Decision making', 'Clean hands'] },
  { name: 'Conditioned small sided game', lengthMinutes: 18, link: null, skills: ['Game sense', 'Communication', 'Team play'] },
];

function normalizeLength(name: string, lengthMinutes: number) {
  return normalizeTrainingDrillLength(name, lengthMinutes);
}

function getDrillTemplates(focus: string) {
  const normalizedFocus = focus.toLowerCase();
  const matchedTemplate = focusTemplates.find((template) => {
    return template.keywords.some((keyword) => normalizedFocus.includes(keyword));
  });

  return matchedTemplate?.drills ?? defaultDrills;
}

function getLibraryDrills(focus: string, libraryLinks: TrainingDrillLibraryLink[]) {
  const normalizedFocus = focus.toLowerCase();
  const libraryDrills = getTrainingDrillLibraryDrills(libraryLinks);
  const matchedDrills = libraryDrills.filter((drill) => {
    if (drill.outcomes.length === 0) {
      return true;
    }

    return drill.outcomes.some((outcome) => {
      return normalizedFocus.includes(outcome.toLowerCase()) || outcome.toLowerCase().includes(normalizedFocus);
    });
  });

  return matchedDrills.map((drill) => {
    return {
      name: drill.name,
      lengthMinutes: drill.lengthMinutes || (isExtendedTrainingDrill(drill.name) ? 18 : 12),
      link: drill.link,
      skills: drill.skills,
    } satisfies DrillTemplate;
  });
}

export function generateTrainingSessionPlanFromFocus(
  focus: string,
  libraryLinks: TrainingDrillLibraryLink[] = []
): TrainingSessionDrill[] {
  const normalizedFocus = focus.trim();
  const generatedAt = Date.now();
  const libraryDrills = getLibraryDrills(normalizedFocus, libraryLinks);
  const templates = libraryDrills.length > 0 ? libraryDrills.slice(0, 4) : getDrillTemplates(normalizedFocus);

  return templates.map((template, index) => {
    return {
      id: `generated-drill-${generatedAt}-${index + 1}`,
      name: template.name,
      lengthMinutes: normalizeLength(template.name, template.lengthMinutes),
      link: template.link,
      skills: template.skills,
    };
  });
}
