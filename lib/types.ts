export type ClubMembershipRole = 'owner' | 'manager';
export type PlayerPositionProfile = 'B' | 'HB' | 'W' | 'C' | 'HF' | 'F' | 'Fol';
export type PlayerRunningProfile = 'high' | 'balanced' | 'managed';
export type PlayerRotationGroup =
  | 'inside-mids'
  | 'running-players'
  | 'key-position-players'
  | 'utility-players';

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
  squad: PlayerSquad | null;
  role: PlayerRole;
  active: boolean;
  primaryPosition: PlayerPositionProfile | null;
  secondaryPosition: PlayerPositionProfile | null;
  runningProfile: PlayerRunningProfile | null;
  rotationGroupOverrides: PlayerRotationGroup[] | null;
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

export type MatchLinePosition = 'B' | 'HB' | 'W' | 'C' | 'HF' | 'F' | 'Fol' | 'Int';

export type MatchLineupAssignment = {
  fixtureId: string;
  playerId: string;
  position: MatchLinePosition;
};

export type MatchRotationAssignment = {
  fixtureId: string;
  playerId: string;
  group: PlayerRotationGroup;
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
  | 'kicks'
  | 'handballs'
  | 'disposals'
  | 'effective-disposals'
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
export type MatchStatQuarter = 'game' | 'q1' | 'q2' | 'q3' | 'q4';

export type MatchStatEntry = {
  fixtureId: string;
  quarter: MatchStatQuarter;
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
