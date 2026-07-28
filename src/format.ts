import type { Snapshot } from "./types";

export function formatExp(value: string | null): string {
  if (!value) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (number >= 1e15) return `${(number / 1e15).toFixed(2)}Q`;
  if (number >= 1e12) return `${(number / 1e12).toFixed(2)}T`;
  if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
  return Intl.NumberFormat("en-US").format(number);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function dailyGain(
  current: Snapshot,
  previous: Snapshot | null,
): string | null {
  if (!previous) return null;
  if (current.level === previous.level) {
    return String(BigInt(current.expCurrent) - BigInt(previous.expCurrent));
  }
  if (current.level === previous.level + 1) {
    return String(
      BigInt(previous.expToNext) -
        BigInt(previous.expCurrent) +
        BigInt(current.expCurrent),
    );
  }
  return null;
}
