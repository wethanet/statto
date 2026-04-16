import type { PlayerDevelopmentEntry } from '@/lib/types';

export const playerDevelopmentEntries: PlayerDevelopmentEntry[] = [
  {
    playerId: 'p1',
    weekStart: '2026-04-06',
    tasks: [
      {
        id: 'p1-w1-task-1',
        title: 'Hit the corridor with the first kick after intercepts',
        priority: 1,
        progressStatus: 'on-track',
      },
      {
        id: 'p1-w1-task-2',
        title: 'Drive overlap support after the handball receive',
        priority: 2,
        progressStatus: 'building',
      },
      {
        id: 'p1-w1-task-3',
        title: 'Scan inside options before taking ground',
        priority: 3,
        progressStatus: 'building',
      },
    ],
    coachingNote: 'Keep your first two decisions aggressive but simple so the rebound chain starts from you.',
    progressStatus: 'on-track',
    proficiency: 3,
    progressNote: 'Decision-making was cleaner in match sim. Keep scanning before the mark.',
    generatedAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-09T08:00:00.000Z',
  },
  {
    playerId: 'p2',
    weekStart: '2026-04-06',
    tasks: [
      {
        id: 'p2-w1-task-1',
        title: 'Explode two steps clear after the first touch',
        priority: 1,
        progressStatus: 'building',
      },
      {
        id: 'p2-w1-task-2',
        title: 'Lower the eyes on the release handball in congestion',
        priority: 2,
        progressStatus: 'building',
      },
      {
        id: 'p2-w1-task-3',
        title: 'Open hips before contact so the exit lane is visible',
        priority: 3,
        progressStatus: 'not-started',
      },
    ],
    coachingNote: 'Your contest work is already strong. The next gain comes from what happens in the second after you win it.',
    progressStatus: 'building',
    proficiency: 2,
    progressNote: 'Still got caught twice after first possession, but body position at stoppage was improved.',
    generatedAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-08T08:00:00.000Z',
  },
  {
    playerId: 'p6',
    weekStart: '2026-04-06',
    tasks: [
      {
        id: 'p6-w1-task-1',
        title: 'Hold width early then burst back inside for overlap',
        priority: 1,
        progressStatus: 'on-track',
      },
      {
        id: 'p6-w1-task-2',
        title: 'Finish wing chains with a composed inside-50 entry',
        priority: 2,
        progressStatus: 'building',
      },
      {
        id: 'p6-w1-task-3',
        title: 'Check over both shoulders before receiving at speed',
        priority: 3,
        progressStatus: 'on-track',
      },
    ],
    coachingNote: 'Use your running power to arrive late and dangerous rather than sitting under the contest.',
    progressStatus: 'on-track',
    proficiency: 3,
    progressNote: 'Ran hard both ways and hit one quality inside-50 kick in the last drill block.',
    generatedAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z',
  },
];
