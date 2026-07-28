export type Snapshot = {
  date: string;
  level: number;
  expCurrent: string;
  expToNext: string;
  progress: number;
  world: string;
  job: string;
};

export type CharacterHistory = {
  name: string;
  region: "NA" | "EU";
  color: string;
  snapshots: Snapshot[];
};

export type LeaderboardData = {
  title: string;
  description: string;
  updatedOn: string;
  characters: CharacterHistory[];
};

export type LeaderboardMember = CharacterHistory & {
  current: Snapshot;
  previous: Snapshot | null;
  finishedOn: string | null;
  movement: number | null;
  dailyGain: string | null;
};
