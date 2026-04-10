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
  nickname: string | null;
  number: number | null;
  squad: PlayerSquad | null;
  role: PlayerRole;
  active: boolean;
};

export type PlayerRole = 'player' | 'captain' | 'vice-captain' | 'leader';
export type PlayerSquad = 'cup' | 'plate';

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

export type MatchLinePosition = 'B' | 'HB' | 'C' | 'HF' | 'F' | 'Fol' | 'Int';

export type MatchLineupAssignment = {
  fixtureId: string;
  playerId: string;
  position: MatchLinePosition;
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
  voteType: VoteType;
  points: number;
};

export type VoteType = 'players' | 'coaches' | 'best-and-fairest';

export type MatchStatMetric =
  | 'clearances'
  | 'goals'
  | 'points'
  | 'tackles'
  | 'hit-outs'
  | 'inside-50s'
  | 'uncontested-marks'
  | 'marks-i50'
  | 'free-kicks'
  | 'intercept-marks';

export type MatchStatTeam = 'ours' | 'theirs';

export type MatchStatEntry = {
  fixtureId: string;
  metric: MatchStatMetric;
  team: MatchStatTeam;
  value: number;
};

export type FitnessMetric = 'time-trial-1.2km' | 'agility' | 'speed';

export type FitnessPhase = 'start-of-season' | 'mid-season' | 'end-of-season';

export type FitnessResult = {
  playerId: string;
  metric: FitnessMetric;
  phase: FitnessPhase;
  value: number;
  recordedAt: string;
};
