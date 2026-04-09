import type { Player } from '@/lib/types';

export const players: Player[] = [
  { id: 'p1', name: 'Jack Murphy', number: 2, position: 'Half Back', squad: 'cup', role: 'leader', active: true },
  { id: 'p2', name: 'Liam Carter', number: 5, position: 'Wing', squad: 'cup', role: 'player', active: true },
  { id: 'p3', name: 'Ben Walsh', number: 7, position: 'Midfield', squad: 'cup', role: 'captain', active: true },
  { id: 'p4', name: 'Tom Hayes', number: 9, position: 'Half Forward', squad: 'cup', role: 'vice-captain', active: true },
  { id: 'p5', name: 'Noah Sullivan', number: 11, position: 'Back Pocket', squad: 'plate', role: 'player', active: true },
  { id: 'p6', name: 'Ethan Brooks', number: 14, position: 'Forward Pocket', squad: 'plate', role: 'player', active: true },
  { id: 'p7', name: "Sam O'Connor", number: 18, position: 'Ruck', squad: 'cup', role: 'leader', active: true },
  { id: 'p8', name: 'Cooper Davis', number: 21, position: 'Centre Half Back', squad: 'plate', role: 'player', active: true },
  { id: 'p9', name: 'Harry Quinn', number: 24, position: 'Midfield', squad: null, role: 'player', active: true },
  { id: 'p10', name: 'Mason Reid', number: 27, position: 'Full Forward', squad: 'plate', role: 'player', active: false },
];
