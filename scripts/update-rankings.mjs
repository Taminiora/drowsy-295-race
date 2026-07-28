import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./roster.mjs";

const HISTORY_PATH = fileURLToPath(
  new URL("../src/data/history.json", import.meta.url),
);
const OFFICIAL_RANKINGS_API =
  "https://www.nexon.com/api/maplestory/no-auth/ranking/v2";
const OFFICIAL_RANKINGS_PAGE =
  "https://www.nexon.com/maplestory/rankings/overall-ranking/legendary";
const MIN_REQUEST_INTERVAL_MS = 3_000;

const WORLD_NAMES = {
  1: "Bera",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  70: "Hyperion",
};

const EXP_TO_NEXT = {
  290: "294305470836577",
  291: "323736017920234",
  292: "356109619712257",
  293: "391720581683483",
  294: "430892639851831",
  295: "870403132500699",
  296: "957443445750769",
  297: "1053187790325845",
  298: "1158506569358425",
  299: "1737759854037637",
  300: "0",
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function progressPercent(expCurrent, expToNext) {
  if (expToNext === "0") return 100;
  const thousandths = (BigInt(expCurrent) * 100_000n) / BigInt(expToNext);
  return Number(thousandths) / 1_000;
}

async function fetchCharacter(character, previousRequestStartedAt) {
  const remainingDelay =
    previousRequestStartedAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (remainingDelay > 0) await wait(remainingDelay);

  const requestStartedAt = Date.now();
  const endpoint = new URL(
    `${OFFICIAL_RANKINGS_API}/${character.region.toLowerCase()}`,
  );
  endpoint.searchParams.set("type", "overall");
  endpoint.searchParams.set("id", "legendary");
  endpoint.searchParams.set("reboot_index", "0");
  endpoint.searchParams.set("page_index", "1");
  endpoint.searchParams.set("character_name", character.name);

  console.log(`Fetching ${character.name}...`);
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      referer: OFFICIAL_RANKINGS_PAGE,
    },
  });
  if (!response.ok) {
    throw new Error(
      `${character.name} lookup failed with status ${response.status}`,
    );
  }

  const payload = await response.json();
  const ranking = payload.ranks?.find(
    (entry) =>
      entry.characterName?.toLowerCase() === character.name.toLowerCase(),
  );
  if (!ranking) {
    throw new Error(`${character.name} was not found in the rankings`);
  }

  const level = Number(ranking.level);
  const expCurrent = String(ranking.exp ?? "");
  const expToNext = EXP_TO_NEXT[level];
  if (!Number.isInteger(level) || !/^\d+$/.test(expCurrent) || !expToNext) {
    throw new Error(`${character.name} returned unsupported ranking data`);
  }

  return {
    requestStartedAt,
    snapshot: {
      level,
      expCurrent,
      expToNext,
      progress: progressPercent(expCurrent, expToNext),
      world: WORLD_NAMES[Number(ranking.worldID)] ?? "Unknown",
      job: ranking.jobName || "Unknown",
    },
  };
}

const data = JSON.parse(await readFile(HISTORY_PATH, "utf8"));
const histories = new Map(
  data.characters.map((character) => [character.name.toLowerCase(), character]),
);
const date = new Date().toISOString().slice(0, 10);
const freshSnapshots = new Map();
let previousRequestStartedAt = 0;

// Fetch every character successfully before touching the history file.
for (const character of ROSTER) {
  const result = await fetchCharacter(character, previousRequestStartedAt);
  previousRequestStartedAt = result.requestStartedAt;
  freshSnapshots.set(character.name.toLowerCase(), {
    date,
    ...result.snapshot,
  });
}

data.updatedOn = date;
data.characters = ROSTER.map((character) => {
  const existing = histories.get(character.name.toLowerCase());
  const snapshots = [...(existing?.snapshots ?? [])].filter(
    (snapshot) => snapshot.date !== date,
  );
  snapshots.push(freshSnapshots.get(character.name.toLowerCase()));
  snapshots.sort((left, right) => left.date.localeCompare(right.date));

  return {
    name: character.name,
    region: character.region,
    color: character.color,
    snapshots,
  };
});

await writeFile(HISTORY_PATH, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Saved ${ROSTER.length} snapshots for ${date}.`);
