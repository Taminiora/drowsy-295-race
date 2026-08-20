import { formatExp } from "./format";
import type {
  CharacterHistory,
  LeaderboardData,
  Snapshot,
} from "./types";

export const RACE_START_DATE = "2026-07-27";
const FINISH_LEVEL = 295;

type FinishOverride = {
  date: string;
  place: number;
};

const FINISH_OVERRIDES: Record<string, FinishOverride> = {
  xZenjiro: { date: "2026-08-05", place: 1 },
  edison: { date: "2026-08-05", place: 2 },
  RoyaiOrange: {
    date: "2026-08-05",
    place: 3,
  },
  nelo: { date: "2026-08-20", place: 9 },
};

export type RaceFrameEntry = {
  color: string;
  finished: boolean;
  gainPercent: number;
  gainXp: bigint;
  justFinished: boolean;
  name: string;
  progress: number;
};

export type RaceFrame = {
  date: string;
  entries: RaceFrameEntry[];
};

export type RaceStanding = {
  color: string;
  finishLabel: string | null;
  finished: boolean;
  name: string;
  place: number;
  progress: number;
  startRank: number;
};

export type RaceStat = {
  detail: string;
  label: string;
  value: string;
};

export type RaceSummary = {
  allFinished: boolean;
  endDate: string;
  frames: RaceFrame[];
  standings: RaceStanding[];
  stats: RaceStat[];
};

function snapshotOnOrBefore(character: CharacterHistory, date: string) {
  return [...character.snapshots]
    .reverse()
    .find((snapshot) => snapshot.date <= date);
}

function targetLevelExp(character: CharacterHistory) {
  const snapshot = character.snapshots.find(
    (candidate) => candidate.level === FINISH_LEVEL - 1,
  );
  return snapshot ? BigInt(snapshot.expToNext) : 0n;
}

function firstDetectedFinish(character: CharacterHistory) {
  return (
    character.snapshots.find((snapshot) => snapshot.level >= FINISH_LEVEL) ??
    null
  );
}

function finishDate(character: CharacterHistory) {
  return (
    FINISH_OVERRIDES[character.name]?.date ??
    firstDetectedFinish(character)?.date ??
    null
  );
}

function raceExpOnDate(character: CharacterHistory, date: string) {
  const total = targetLevelExp(character);
  const override = FINISH_OVERRIDES[character.name];
  if (override && date >= override.date) return total;

  const snapshot = snapshotOnOrBefore(character, date);
  if (!snapshot || snapshot.level < FINISH_LEVEL - 1) return 0n;
  if (snapshot.level >= FINISH_LEVEL) return total;

  const current = BigInt(snapshot.expCurrent);
  return current < 0n ? 0n : current > total ? total : current;
}

function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function dayDifference(start: string, end: string) {
  return Math.max(
    0,
    Math.round(
      (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
        86_400_000,
    ),
  );
}

export function shortRaceDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${value}T12:00:00Z`))
    .toLowerCase();
}

function finishLabel(character: CharacterHistory) {
  const date = finishDate(character);
  if (!date) return null;
  return shortRaceDate(date);
}

function compareFinishers(left: CharacterHistory, right: CharacterHistory) {
  const leftOverride = FINISH_OVERRIDES[left.name];
  const rightOverride = FINISH_OVERRIDES[right.name];
  const leftDate = finishDate(left);
  const rightDate = finishDate(right);
  const leftFinish = firstDetectedFinish(left);
  const rightFinish = firstDetectedFinish(right);
  if (leftDate && rightDate) {
    const dateOrder = leftDate.localeCompare(rightDate);
    if (dateOrder) return dateOrder;
    if (leftOverride && rightOverride) {
      return leftOverride.place - rightOverride.place;
    }
  }
  if (leftFinish && rightFinish) {
    const leftExp = BigInt(leftFinish.expCurrent);
    const rightExp = BigInt(rightFinish.expCurrent);
    return leftExp === rightExp ? 0 : leftExp > rightExp ? -1 : 1;
  }
  if (leftDate) return -1;
  if (rightDate) return 1;
  return 0;
}

function standardDeviation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function formatGain(value: bigint | number) {
  return `+${formatExp(String(Math.round(Number(value))))}`;
}

function buildStats(
  data: LeaderboardData,
  frames: RaceFrame[],
  standings: RaceStanding[],
): RaceStat[] {
  const dailyEntries = frames
    .slice(1)
    .flatMap((frame) =>
      frame.entries
        .filter((entry) => entry.gainXp > 0n)
        .map((entry) => ({ ...entry, date: frame.date })),
    );
  const largestSpike = [...dailyEntries].sort((left, right) =>
    left.gainXp === right.gainXp ? 0 : left.gainXp > right.gainXp ? -1 : 1,
  )[0];

  const finalPushes = data.characters
    .map((character) => {
      const date = finishDate(character);
      const finishIndex = date
        ? frames.findIndex((frame) => frame.date === date)
        : -1;
      if (finishIndex < 0) return null;
      const firstIndex = Math.max(1, finishIndex - 2);
      let total = 0n;
      for (let index = firstIndex; index <= finishIndex; index += 1) {
        const entry = frames[index].entries.find(
          (candidate) => candidate.name === character.name,
        );
        total += entry?.gainXp ?? 0n;
      }
      return { name: character.name, total };
    })
    .filter((entry): entry is { name: string; total: bigint } => entry !== null)
    .sort((left, right) =>
      left.total === right.total ? 0 : left.total > right.total ? -1 : 1,
    );

  const combinedDays = frames
    .slice(1)
    .map((frame) => ({
      date: frame.date,
      total: frame.entries.reduce((sum, entry) => sum + entry.gainXp, 0n),
    }))
    .filter((entry) => entry.total > 0n);
  const busiestDay = [...combinedDays].sort((left, right) =>
    left.total === right.total ? 0 : left.total > right.total ? -1 : 1,
  )[0];
  const biggestClimber = [...standings].sort((left, right) => {
    const leftGain = left.startRank - left.place;
    const rightGain = right.startRank - right.place;
    return rightGain - leftGain || left.place - right.place;
  })[0];

  const consistency = data.characters
    .map((character) => {
      const gains = dailyEntries
        .filter((entry) => entry.name === character.name)
        .map((entry) => Number(entry.gainXp) / 1e12);
      return gains.length > 2
        ? {
            activeDays: gains.length,
            deviation: standardDeviation(gains),
            name: character.name,
          }
        : null;
    })
    .filter(
      (
        entry,
      ): entry is { activeDays: number; deviation: number; name: string } =>
        entry !== null,
    )
    .sort((left, right) => left.deviation - right.deviation)[0];

  const averagePaces = data.characters
    .map((character) => {
      const date = finishDate(character);
      if (!date) return null;
      const elapsedDays = Math.max(1, dayDifference(RACE_START_DATE, date));
      const total = targetLevelExp(character);
      const start = raceExpOnDate(character, RACE_START_DATE);
      return {
        average: Number(total - start) / elapsedDays,
        days: elapsedDays,
        name: character.name,
      };
    })
    .filter(
      (
        entry,
      ): entry is { average: number; days: number; name: string } =>
        entry !== null,
    )
    .sort((left, right) => right.average - left.average)[0];

  const winner = standings[0];
  const biggestFinalPush = finalPushes[0];
  return [
    {
      detail: winner.finishLabel ?? "first to level 295",
      label: "winner",
      value: winner.name,
    },
    {
      detail: largestSpike
        ? `${formatGain(largestSpike.gainXp)} · ${shortRaceDate(largestSpike.date)}`
        : "waiting for race data",
      label: "largest daily spike",
      value: largestSpike?.name ?? "—",
    },
    {
      detail: biggestFinalPush
        ? `${formatGain(biggestFinalPush.total)} over the final 3 days`
        : "waiting for a finish",
      label: "biggest final push",
      value: biggestFinalPush?.name ?? "—",
    },
    {
      detail: busiestDay
        ? `${formatGain(busiestDay.total)} combined`
        : "waiting for race data",
      label: "busiest race day",
      value: busiestDay ? shortRaceDate(busiestDay.date) : "—",
    },
    {
      detail:
        biggestClimber && biggestClimber.startRank > biggestClimber.place
          ? `#${biggestClimber.startRank} → #${biggestClimber.place} · gained ${
              biggestClimber.startRank - biggestClimber.place
            } places`
          : "starting order held",
      label: "biggest rank climb",
      value: biggestClimber?.name ?? "—",
    },
    {
      detail: consistency
        ? `σ ${consistency.deviation.toFixed(2)}t · ${consistency.activeDays} active days`
        : "waiting for race data",
      label: "most consistent",
      value: consistency?.name ?? "—",
    },
    {
      detail: averagePaces
        ? `${formatGain(averagePaces.average)}/day · ${averagePaces.days} days raced`
        : "waiting for a finish",
      label: "highest race xp/day",
      value: averagePaces?.name ?? "—",
    },
  ];
}

export function buildRaceSummary(data: LeaderboardData): RaceSummary {
  const characters = data.characters.filter(
    (character) => snapshotOnOrBefore(character, RACE_START_DATE) !== undefined,
  );
  const finishDates = characters.map(finishDate);
  const allFinished = finishDates.every((date) => date !== null);
  const endDate = allFinished
    ? ([...finishDates].sort().at(-1) as string)
    : data.updatedOn;
  const dates = dateRange(RACE_START_DATE, endDate);

  const frames = dates.map((date, frameIndex) => {
    const previousDate = frameIndex > 0 ? dates[frameIndex - 1] : null;
    const entries = characters.map((character) => {
      const total = targetLevelExp(character);
      const current = raceExpOnDate(character, date);
      const previous = previousDate
        ? raceExpOnDate(character, previousDate)
        : current;
      const gainXp = current > previous ? current - previous : 0n;
      const progress =
        total > 0n ? Math.min(100, (Number(current) / Number(total)) * 100) : 0;
      const previousProgress =
        total > 0n ? Math.min(100, (Number(previous) / Number(total)) * 100) : 0;
      return {
        color: character.color,
        finished: progress >= 100,
        gainPercent: Math.max(0, progress - previousProgress),
        gainXp,
        justFinished: progress >= 100 && previousProgress < 100,
        name: character.name,
        progress,
      };
    });
    return { date, entries };
  });

  const startEntries = frames[0].entries;
  const startOrder = [...startEntries].sort(
    (left, right) => right.progress - left.progress,
  );
  const startRanks = new Map(
    startOrder.map((entry, index) => [entry.name, index + 1]),
  );
  const latestEntries = frames.at(-1)?.entries ?? [];
  const latestProgress = new Map(
    latestEntries.map((entry) => [entry.name, entry.progress]),
  );
  const orderedCharacters = [...characters].sort((left, right) => {
    const finishOrder = compareFinishers(left, right);
    if (finishOrder) return finishOrder;
    return (
      (latestProgress.get(right.name) ?? 0) -
      (latestProgress.get(left.name) ?? 0)
    );
  });
  const standings = orderedCharacters.map((character, index) => ({
    color: character.color,
    finishLabel: finishLabel(character),
    finished: finishDate(character) !== null,
    name: character.name,
    place: index + 1,
    progress: latestProgress.get(character.name) ?? 0,
    startRank: startRanks.get(character.name) ?? index + 1,
  }));

  return {
    allFinished,
    endDate,
    frames,
    standings,
    stats: buildStats(data, frames, standings),
  };
}
