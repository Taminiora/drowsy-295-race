import type { CharacterHistory, Snapshot } from "./types";

export const FINISH_LEVEL = 295;
const FAST_HORSE_SPEED = 660;
const SLOW_HORSE_SPEED = 340;
const HORSE_STEP_TIME_BUDGET_MS = 1_000;

export function compareSnapshots(left: Snapshot, right: Snapshot) {
  if (left.level !== right.level) return right.level - left.level;
  const leftExp = BigInt(left.expCurrent);
  const rightExp = BigInt(right.expCurrent);
  return leftExp === rightExp ? 0 : leftExp > rightExp ? -1 : 1;
}

export function firstFinishSnapshot(
  character: CharacterHistory,
  asOfDate: string,
) {
  return (
    character.snapshots.find(
      (snapshot) =>
        snapshot.date <= asOfDate && snapshot.level >= FINISH_LEVEL,
    ) ?? null
  );
}

export function compareRaceEntries(
  left: CharacterHistory,
  leftSnapshot: Snapshot,
  right: CharacterHistory,
  rightSnapshot: Snapshot,
) {
  const leftFinish = firstFinishSnapshot(left, leftSnapshot.date);
  const rightFinish = firstFinishSnapshot(right, rightSnapshot.date);

  if (leftFinish && rightFinish) {
    const finishDateOrder = leftFinish.date.localeCompare(rightFinish.date);
    return (
      finishDateOrder ||
      compareSnapshots(leftFinish, rightFinish)
    );
  }
  if (leftFinish) return -1;
  if (rightFinish) return 1;
  return compareSnapshots(leftSnapshot, rightSnapshot);
}

export function raceProgress(snapshot: Snapshot) {
  return snapshot.level >= FINISH_LEVEL ? 100 : snapshot.progress;
}

export function dailyGainRate(
  dailyGain: string | null,
  previousLevelExp: string | null,
) {
  if (!dailyGain || !previousLevelExp || previousLevelExp === "0") {
    return null;
  }

  return Math.max(
    0,
    Number(BigInt(dailyGain)) / Number(BigInt(previousLevelExp)),
  );
}

export function horseStepSpeed(
  gainRate: number | null,
  lowestGainRate: number,
  highestGainRate: number,
) {
  if (gainRate === null) return SLOW_HORSE_SPEED;
  if (highestGainRate <= lowestGainRate) {
    return Math.round((SLOW_HORSE_SPEED + FAST_HORSE_SPEED) / 2);
  }

  const intensity =
    (gainRate - lowestGainRate) / (highestGainRate - lowestGainRate);
  return Math.round(
    SLOW_HORSE_SPEED +
      Math.min(1, Math.max(0, intensity)) *
        (FAST_HORSE_SPEED - SLOW_HORSE_SPEED),
  );
}

export function horseStepDuration(speed: number) {
  return HORSE_STEP_TIME_BUDGET_MS - speed;
}

export function raceReplayGaitDuration(
  gainPercent: number,
  travelDurationMs: number,
) {
  if (gainPercent <= 0) return travelDurationMs;

  const gaitStridePercent = 2.7;
  const durationForDistance =
    (travelDurationMs * gaitStridePercent) / gainPercent;
  return Math.round(
    Math.min(
      travelDurationMs * 0.7,
      Math.max(travelDurationMs * 0.18, durationForDistance),
    ),
  );
}
