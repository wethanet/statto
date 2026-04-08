export type Player = {
  id: string;
  name: string;
  number: number;
  position: string;
};

export type TrainingSession = {
  id: string;
  title: string;
  date: string;
  location: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'unknown';

export type AttendanceRecord = {
  sessionId: string;
  playerId: string;
  status: AttendanceStatus;
};

export type Fixture = {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  isHome: boolean;
};

export type AvailabilityStatus = 'available' | 'unavailable' | 'uncertain';

export type AvailabilityRecord = {
  fixtureId: string;
  playerId: string;
  status: AvailabilityStatus;
};
