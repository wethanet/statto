import type { VoteEntry } from '@/lib/types';

export const voteEntries: VoteEntry[] = [
  { fixtureId: 'fx1', playerId: 'p1', voteType: 'players', points: 2 },
  { fixtureId: 'fx1', playerId: 'p3', voteType: 'players', points: 3 },
  { fixtureId: 'fx1', playerId: 'p8', voteType: 'players', points: 1 },
  { fixtureId: 'fx2', playerId: 'p4', voteType: 'players', points: 2 },
  { fixtureId: 'fx2', playerId: 'p7', voteType: 'players', points: 3 },
  { fixtureId: 'fx2', playerId: 'p9', voteType: 'players', points: 1 },
  { fixtureId: 'fx3', playerId: 'p3', voteType: 'players', points: 1 },
  { fixtureId: 'fx3', playerId: 'p4', voteType: 'players', points: 2 },
  { fixtureId: 'fx3', playerId: 'p10', voteType: 'players', points: 3 },
];
