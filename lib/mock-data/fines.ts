import type { Fine } from '@/lib/types';

export const fines: Fine[] = [
  {
    id: 'f1',
    playerId: 'p4',
    reason: 'Late to training',
    amount: 20,
    issuedAt: '2026-04-02T19:15:00+10:00',
    paid: false,
  },
  {
    id: 'f2',
    playerId: 'p7',
    reason: 'Missed recovery session',
    amount: 25,
    issuedAt: '2026-04-04T10:30:00+10:00',
    paid: true,
  },
  {
    id: 'f3',
    playerId: 'p2',
    reason: 'Forgot team polo on game day',
    amount: 10,
    issuedAt: '2026-04-06T13:10:00+10:00',
    paid: false,
  },
];
