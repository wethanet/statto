export type ClubMembershipRole = 'owner' | 'manager';

export type Club = {
  id: string;
  name: string;
  inviteCode: string;
  role: ClubMembershipRole;
};

export type Player = {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  role: PlayerRole;
  active: boolean;
};

export type PlayerRole = 'player' | 'captain' | 'vice-captain' | 'leader';

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
  grade: string | null;
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

export type Fine = {
  id: string;
  playerId: string;
  reason: string;
  amount: number;
  issuedAt: string;
  paid: boolean;
};

export type VoteEntry = {
  fixtureId: string;
  playerId: string;
  points: number;
};
