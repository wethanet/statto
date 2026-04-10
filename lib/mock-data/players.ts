import type { Player } from '@/lib/types';

export const players: Player[] = [
  { id: 'p1', name: 'Jack Murphy', nickname: 'Murph', number: 2, squad: 'cup', role: 'leader', active: true },
  { id: 'p2', name: 'Liam Carter', nickname: null, number: 5, squad: 'cup', role: 'player', active: true },
  { id: 'p3', name: 'Ben Walsh', nickname: 'Walshy', number: 7, squad: 'cup', role: 'captain', active: true },
  { id: 'p4', name: 'Tom Hayes', nickname: null, number: 9, squad: 'cup', role: 'vice-captain', active: true },
  { id: 'p5', name: 'Noah Sullivan', nickname: null, number: 11, squad: 'plate', role: 'player', active: true },
  { id: 'p6', name: 'Ethan Brooks', nickname: 'Brooksy', number: 14, squad: 'plate', role: 'player', active: true },
  { id: 'p7', name: "Sam O'Connor", nickname: 'OC', number: 18, squad: 'cup', role: 'leader', active: true },
  { id: 'p8', name: 'Cooper Davis', nickname: null, number: 21, squad: 'plate', role: 'player', active: true },
  { id: 'p9', name: 'Harry Quinn', nickname: null, number: 24, squad: null, role: 'player', active: true },
  { id: 'p10', name: 'Mason Reid', nickname: 'Mase', number: 27, squad: 'plate', role: 'player', active: false },
];
