export type ClubMembershipRole = 'admin' | 'coach' | 'player';
export type PlayerPositionProfile = 'B' | 'HB' | 'W' | 'C' | 'HF' | 'F' | 'Fol';
export type PlayerRunningProfile = 'high' | 'balanced' | 'managed';
export type PlayerRotationGroup =
  | 'inside-mids'
  | 'running-players'
  | 'key-position-players'
  | 'utility-players';
export type PlayerDevelopmentLevel = 'emerging' | 'developing' | 'reliable' | 'advanced';
export type PlayerDevelopmentProgressStatus = 'not-started' | 'building' | 'on-track' | 'banked';
export type PlayerDevelopmentTask = {
  id: string;
  title: string;
  priority: number;
  progressStatus: PlayerDevelopmentProgressStatus;
};

export type Club = {
  id: string;
  name: string;
  inviteCode: string;
  role: ClubMembershipRole;
  email: string | null;
  playerId: string | null;
  squads: PlayerSquad[];
};

export type Player = {
  id: string;
  name: string;
  nickname: string | null;
  number: number | null;
  squad: PlayerSquad | null;
  role: PlayerRole;
  active: boolean;
  primaryPosition: PlayerPositionProfile | null;
  secondaryPosition: PlayerPositionProfile | null;
  runningProfile: PlayerRunningProfile | null;
  rotationGroupOverrides: PlayerRotationGroup[] | null;
  seasonGoals: string | null;
  skillSummary: string | null;
  developmentLevel: PlayerDevelopmentLevel | null;
};

export type PlayerRole = 'player' | 'captain' | 'vice-captain' | 'leader';
export type PlayerSquad = 'cup' | 'plate';

export type TrainingSession = {
  id: string;
  title: string;
  date: string;
  location: string;
  squad: PlayerSquad | null;
  focus: string | null;
  runPlan: TrainingSessionDrill[];
};

export type TrainingSessionDrill = {
  id: string;
  title: string;
  durationMinutes: number | null;
  description: string | null;
  coachingPoints: string | null;
  media: TrainingSessionDrillMedia[];
};

export type TrainingSessionDrillMedia = {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string | null;
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
  squad: PlayerSquad | null;
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

export type PlayerVoteBallot = {
  fixtureId: string;
  voterPlayerId: string;
  nomineePlayerId: string;
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

export type PlayerDevelopmentEntry = {
  playerId: string;
  weekStart: string;
  tasks: PlayerDevelopmentTask[];
  coachingNote: string | null;
  progressStatus: PlayerDevelopmentProgressStatus;
  proficiency: 1 | 2 | 3 | 4 | 5 | null;
  progressNote: string | null;
  generatedAt: string | null;
  updatedAt: string;
};
