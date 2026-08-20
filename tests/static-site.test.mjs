import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  compareRaceEntries,
  dailyGainRate,
  firstFinishSnapshot,
  horseStepDuration,
  horseStepSpeed,
  raceReplayGaitDuration,
  raceProgress,
} from "../src/rankings.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the built site is a static Drowsy leaderboard", async () => {
  const [app, html, data, shareImage] = await Promise.all([
    read("src/App.tsx"),
    read("dist/index.html"),
    read("src/data/history.json"),
    access(new URL("../dist/og-horse-track.jpg", import.meta.url)),
  ]);

  assert.doesNotMatch(app, /7-day progress/);
  assert.match(app, /aria-label="ascii horse race"/);
  assert.match(app, /https:\/\/mapleranks\.com\/u\//);
  assert.match(app, /encodeURIComponent\(name\)/);
  assert.match(app, /className="character-link"/);
  assert.match(app, /className="ascii-name-link"/);
  assert.match(app, /target="_blank"/);
  assert.match(app, /ASCII_HORSE/);
  assert.match(app, /ASCII_HORSE_LEGS/);
  assert.match(app, /ASCII_TRACK/);
  assert.match(app, /ascii-horse/);
  assert.match(app, /ascii-horse-legs/);
  assert.match(app, /ascii-horse-crown/);
  assert.match(app, /👑/);
  assert.match(app, /member\.finishedOn \? " finished" : ""/);
  assert.match(app, /finished on \$\{member\.finishedOn\}/);
  assert.match(app, /--horse-delay/);
  assert.match(app, /--horse-step-duration/);
  assert.match(app, /ascii-lane/);
  assert.match(app, /ascii-progress-strip/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.has\("embed"\)/);
  assert.match(app, /const \[honseMode, setHonseMode\] = useState\(embedMode\)/);
  assert.match(app, /\{!embedMode && \(/);
  assert.match(app, /aria-pressed=\{honseMode\}/);
  assert.match(app, />\s*honse mode\s*<\/button>/);
  assert.match(app, /\{!honseMode && \(/);
  assert.match(app, /lv\./);
  assert.match(app, /member\.current\.level < 295/);
  assert.match(app, /className="rank-crown"/);
  assert.match(app, /aria-label="finished"/);
  assert.match(app, /raceProgress\(member\.current\)/);
  const [chart, styles] = await Promise.all([
    read("src/ProgressChart.tsx"),
    read("src/styles.css"),
  ]);
  assert.match(chart, /aria-pressed/);
  assert.match(chart, /project 295/);
  assert.match(
    chart,
    /className="projection-toggle wrapup-link" href="\.\/wrapup\/"/,
  );
  assert.match(chart, />\s*wrapup\s*<\/a>/);
  assert.match(chart, /projected winner/);
  assert.match(chart, /dailyExpPace/);
  assert.match(chart, /CHART_START_DATE = "2026-07-27"/);
  assert.match(chart, /snapshot\.date >= CHART_START_DATE/);
  assert.doesNotMatch(chart, /slice\(-7\)/);
  assert.match(chart, /since july 27/);
  assert.match(chart, /snapshot\.level > TARGET_LEVEL/);
  assert.match(chart, /`lv\. \$\{snapshot\.level\}`/);
  assert.doesNotMatch(chart, /exp-delta pace/);
  assert.doesNotMatch(chart, /trendline controls/);
  assert.doesNotMatch(chart, /chart-trend-line/);
  assert.match(chart, /clipPath="url\(#plot-clip\)"/);
  assert.match(chart, /preserveAspectRatio="xMinYMid meet"/);
  assert.match(chart, /new ResizeObserver\(updateChartWidth\)/);
  assert.match(chart, /Math\.round\(\(HEIGHT \* width\) \/ height\)/);
  assert.match(chart, /viewBox=\{`0 0 \$\{chartWidth\} \$\{HEIGHT\}`\}/);
  assert.match(chart, /x1=\{x\(0\)\}/);
  assert.match(chart, /y1=\{y\(latestValue - dailyPace \* currentDay\)\}/);
  assert.match(chart, /className="chart-projection-hit"/);
  assert.match(chart, /<title>\{projectionLabel\}<\/title>/);
  assert.match(chart, /projectedDate/);
  assert.match(chart, /onClick/);
  assert.match(chart, /onPointerMove=\{handleChartPointerMove\}/);
  assert.match(chart, /createSVGPoint/);
  assert.match(chart, /className="chart-tooltip"/);
  assert.match(chart, /className="chart-point-hit"/);
  assert.match(chart, /history:\$\{member\.name\}:\$\{snapshot\.date\}/);
  assert.match(chart, /· 100% ·/);
  assert.match(chart, /activePoint === projectionKey \? "4" : "2\.5"/);
  assert.match(chart, /activePoint === pointKey \? "4" : "2\.5"/);
  assert.match(styles, /height: 100dvh/);
  assert.match(styles, /\.progress-chart \{\s+flex: 1;\s+min-height: 0;/);
  assert.match(styles, /\.rank-list \{\s+align-self: center;/);
  assert.match(
    styles,
    /\.rank-crown \{[\s\S]*font-size: 14px;[\s\S]*transform: translateY\(-1px\)/,
  );
  assert.match(styles, /\.honse-mode \.ascii-progress-strip/);
  assert.match(
    styles,
    /\.honse-mode \.ascii-progress-strip \{[\s\S]*align-items: safe center/,
  );
  assert.match(
    styles,
    /\.honse-mode \.ascii-progress-strip \{[\s\S]*overflow-y: auto/,
  );
  assert.match(styles, /\.ascii-track \{[\s\S]*height: 100%/);
  assert.match(styles, /\.ascii-track > span \{[\s\S]*repeating-linear-gradient/);
  assert.match(styles, /\.ascii-track > span \{[\s\S]*inset-inline: 0/);
  assert.match(styles, /\.ascii-track > span \{[\s\S]*height: 2px/);
  assert.match(styles, /--horse-width: 48px/);
  assert.match(styles, /\.ascii-track::after/);
  assert.match(styles, /\.ascii-lane\.finished \.ascii-horse/);
  assert.match(styles, /--percent-column-width: 42px/);
  assert.match(styles, /--percent-column-width: 70px/);
  assert.match(
    styles,
    /100% \+ var\(--lane-gap\) \+ var\(--percent-column-width\)/,
  );
  assert.match(styles, /var\(--percent-column-width\) -\s+7ch - 2px/);
  assert.match(styles, /\.ascii-horse-crown/);
  assert.match(styles, /left: 72%/);
  assert.match(styles, /transform: translateX\(-50%\)/);
  assert.match(
    styles,
    /\.ascii-lane\.finished \.ascii-leg-frame \{\s+animation: none/,
  );
  assert.match(
    styles,
    /calc\(var\(--progress\) - var\(--horse-width\)\)/,
  );
  assert.match(styles, /\.embed-mode \{/);
  assert.match(styles, /height: 630px/);
  assert.match(styles, /width: 1200px/);
  assert.match(styles, /\.honse-toggle\[aria-pressed="true"\]/);
  assert.match(styles, /@media \(min-width: 1200px\)/);
  assert.match(
    styles,
    /grid-template-columns: minmax\(420px, 0\.58fr\) minmax\(0, 1\.42fr\)/,
  );
  assert.match(styles, /@keyframes horse-step-a/);
  assert.match(styles, /@keyframes horse-step-b/);
  assert.match(
    styles,
    /animation-duration: var\(--horse-step-duration, 660ms\)/,
  );
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<title>honse<\/title>/);
  assert.match(html, /property="og:title" content="honse"/);
  assert.match(html, /name="description" content="honse"/);
  assert.match(html, /property="og:description" content="honse"/);
  assert.match(html, /name="twitter:description" content="honse"/);
  assert.match(
    html,
    /property="og:image"\s+content="https:\/\/taminiora\.github\.io\/drowsy-295-race\/og-horse-track\.jpg"/,
  );
  assert.match(
    html,
    /name="twitter:image"\s+content="https:\/\/taminiora\.github\.io\/drowsy-295-race\/og-horse-track\.jpg"/,
  );
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.equal(shareImage, undefined);
  const parsed = JSON.parse(data);
  const snapshotOn = (character, date) => {
    const snapshot = character.snapshots.find((entry) => entry.date === date);
    assert.ok(snapshot, `${character.name} is missing its ${date} snapshot`);
    return snapshot;
  };
  assert.equal(parsed.title, "drowsy 295 race");
  assert.deepEqual(
    parsed.characters.map((character) => character.name),
    [
      "karinay",
      "tamitamitami",
      "nelo",
      "edison",
      "Pãck",
      "xZenjiro",
      "RoyaiOrange",
      "Yugameru",
      "Voln",
    ],
  );

  const pack = parsed.characters.find(
    (character) => character.name === "Pãck",
  );
  assert.equal(snapshotOn(pack, "2026-07-25").progress, 95.981);
  assert.equal(snapshotOn(pack, "2026-07-25").level, 293);
  assert.equal(snapshotOn(pack, "2026-07-26").level, 294);
  assert.equal(snapshotOn(pack, "2026-07-28").progress, 5.049);

  const seededPriorDay = new Map([
    ["xZenjiro", [38.744, 55.059]],
    ["RoyaiOrange", [18.003, 29.546]],
    ["Yugameru", [6.972, 22.857]],
  ]);
  for (const [name, [firstProgress, priorDayProgress]] of seededPriorDay) {
    const character = parsed.characters.find((entry) => entry.name === name);
    assert.equal(
      snapshotOn(character, "2026-07-21").progress,
      firstProgress,
    );
    assert.equal(
      snapshotOn(character, "2026-07-27").progress,
      priorDayProgress,
    );
  }

  const yugameru = parsed.characters.find(
    (character) => character.name === "Yugameru",
  );
  assert.equal(yugameru.color, "#9a7585");
  assert.equal(snapshotOn(yugameru, "2026-07-23").progress, 10.597);
  assert.equal(snapshotOn(yugameru, "2026-07-24").progress, 10.597);

  const nelo = parsed.characters.find(
    (character) => character.name === "nelo",
  );
  assert.equal(snapshotOn(nelo, "2026-08-19").level, 295);
  assert.equal(snapshotOn(nelo, "2026-08-19").progress, 0);

  const voln = parsed.characters.find(
    (character) => character.name === "Voln",
  );
  assert.equal(voln.color, "#5673a6");
  assert.deepEqual(
    [
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
    ].map((date) => snapshotOn(voln, date).progress),
    [36.4, 38.6, 41.3, 44.8, 49.8, 51.5, 52.742],
  );
  assert.equal(
    snapshotOn(voln, "2026-07-28").expCurrent,
    "227261512908920",
  );
});

test("the wrapup is a real static page with the full race replay", async () => {
  const [html, app, replay, chart, summary, styles, vite] = await Promise.all([
    read("dist/wrapup/index.html"),
    read("src/WrapupApp.tsx"),
    read("src/RaceReplay.tsx"),
    read("src/WrapupChart.tsx"),
    read("src/race-summary.ts"),
    read("src/wrapup.css"),
    read("vite.config.ts"),
  ]);

  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<title>honse wrapup<\/title>/);
  assert.match(html, /\.\.\/assets\/wrapup-/);
  assert.match(vite, /wrapup\/index\.html/);
  assert.match(app, /<RaceReplay summary=\{summary\}/);
  assert.match(app, />final leaderboard<\/h2>/);
  assert.match(app, />race stats<\/h2>/);
  assert.doesNotMatch(app, /honse facts|horseFacts|horse-fact/);
  assert.match(app, /className="wrapup-summary-grid"/);
  assert.match(app, /final stats lock when everyone reaches 295/);
  assert.match(replay, />\s*start\s*<\/button>/);
  assert.match(replay, />\s*stop\s*<\/button>/);
  assert.match(replay, />\s*reset\s*<\/button>/);
  assert.doesNotMatch(replay, />\s*replay\s*<\/button>/);
  assert.match(replay, /setRunning\(false\);\s+setResetting\(true\);\s+setFrameIndex\(0\)/);
  assert.match(styles, /\.replay-race\.resetting \.replay-horse \{\s+transition: none/);
  assert.doesNotMatch(replay, /playback rate|0\.5x|2x/);
  assert.match(replay, /entry\.progress/);
  assert.match(replay, /day \{frameIndex \+ 1\}/);
  assert.match(replay, /entry\.finished/);
  assert.match(replay, /`#\$\{finishPlaces\.get\(entry\.name\)\}`/);
  assert.match(replay, /raceReplayGaitDuration/);
  assert.match(replay, /entry\.gainPercent > 0 \? " moving" : ""/);
  assert.match(chart, /summary\.frames/);
  assert.match(chart, /full race progress graph/);
  assert.match(summary, /RACE_START_DATE = "2026-07-27"/);
  assert.match(summary, /xZenjiro: \{ date: "2026-08-05", place: 1 \}/);
  assert.match(summary, /edison: \{ date: "2026-08-05", place: 2/);
  assert.match(summary, /date: "2026-08-05",\s+place: 3/);
  assert.doesNotMatch(summary, /timeLabel|5:00 pm|8:39 pm/);
  for (const stat of [
    "winner",
    "largest daily spike",
    "biggest final push",
    "busiest race day",
    "biggest rank climb",
    "most consistent",
    "highest race xp/day",
  ]) {
    assert.match(summary, new RegExp(`label: "${stat}"`));
  }
  assert.doesNotMatch(summary, /quietest race day/);
  assert.match(summary, /filter\(\(entry\) => entry\.gainXp > 0n\)/);
  assert.doesNotMatch(summary, /HorseFact|buildHorseFacts|horseFacts/);
  assert.match(
    styles,
    /\.replay-horse \{[\s\S]*transition: left var\(--horse-travel-duration, 1500ms\) linear/,
  );
  assert.match(replay, /--horse-travel-duration/);
  assert.match(replay, /FRAME_TIME_MS = 1_500/);
  assert.match(
    replay,
    /ASCII_HORSE_LEGS = \[[^\]]+,[^\]]+,[^\]]+,[^\]]+\]/,
  );
  assert.match(styles, /@keyframes wrap-horse-step-d/);
  assert.match(
    styles,
    /\.replay-crown \{[\s\S]*animation: reveal-replay-crown 1ms linear var\(--horse-travel-duration, 1500ms\)/,
  );
  assert.match(styles, /@keyframes reveal-replay-crown/);
  assert.match(
    styles,
    /\.replay-gain\.finish-order \{[\s\S]*animation: reveal-replay-crown/,
  );
  assert.match(
    styles,
    /\.replay-gain\.finish-order \{[\s\S]*padding-left: 56px/,
  );
  assert.match(styles, /\.wrap-stats \{[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(
    styles,
    /\.wrapup-summary-grid \{[\s\S]*grid-template-columns: minmax\(360px, 0\.5fr\) minmax\(0, 1\.5fr\)/,
  );
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /horse-fact/);
});

test("finished characters keep their race placement", () => {
  const makeSnapshot = (date, level, expCurrent, progress) => ({
    date,
    level,
    expCurrent,
    expToNext: level >= 295 ? "870403132500699" : "430892639851831",
    progress,
    world: "Kronos",
    job: "Beginner",
  });
  const characters = [
    {
      name: "early",
      region: "NA",
      color: "#fff",
      snapshots: [
        makeSnapshot("2026-07-28", 294, "400000000000000", 92),
        makeSnapshot("2026-07-29", 295, "10000000000000", 1),
        makeSnapshot("2026-07-30", 295, "12000000000000", 1.2),
      ],
    },
    {
      name: "later",
      region: "NA",
      color: "#fff",
      snapshots: [
        makeSnapshot("2026-07-28", 294, "410000000000000", 95),
        makeSnapshot("2026-07-29", 294, "425000000000000", 99),
        makeSnapshot("2026-07-30", 295, "50000000000000", 5),
      ],
    },
    {
      name: "racing",
      region: "NA",
      color: "#fff",
      snapshots: [
        makeSnapshot("2026-07-28", 294, "420000000000000", 97),
        makeSnapshot("2026-07-29", 294, "428000000000000", 99.3),
        makeSnapshot("2026-07-30", 294, "430000000000000", 99.8),
      ],
    },
  ];

  const ranked = [...characters].sort((left, right) =>
    compareRaceEntries(
      left,
      left.snapshots.at(-1),
      right,
      right.snapshots.at(-1),
    ),
  );

  assert.deepEqual(
    ranked.map((character) => character.name),
    ["early", "later", "racing"],
  );
  assert.equal(
    firstFinishSnapshot(characters[0], "2026-07-30")?.date,
    "2026-07-29",
  );
  assert.equal(raceProgress(characters[0].snapshots.at(-1)), 100);
});

test("horse leg speed scales with the latest daily gain", () => {
  const lowestGain = dailyGainRate("10", "1000");
  const middleGain = dailyGainRate("25", "1000");
  const highestGain = dailyGainRate("40", "1000");
  const lowSpeed = horseStepSpeed(lowestGain, lowestGain, highestGain);
  const middleSpeed = horseStepSpeed(
    middleGain,
    lowestGain,
    highestGain,
  );
  const highSpeed = horseStepSpeed(
    highestGain,
    lowestGain,
    highestGain,
  );

  assert.equal(lowSpeed, 340);
  assert.equal(middleSpeed, 500);
  assert.equal(highSpeed, 660);
  assert.equal(horseStepDuration(lowSpeed), 660);
  assert.equal(horseStepDuration(highSpeed), 340);
});

test("replay gait cadence follows actual distance and travel time", () => {
  assert.equal(raceReplayGaitDuration(6, 1_800), 810);
  assert.equal(raceReplayGaitDuration(12, 1_800), 405);
  assert.equal(raceReplayGaitDuration(6, 900), 405);
  assert.equal(raceReplayGaitDuration(0, 1_800), 1_800);
});

test("the project has no server or database runtime", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const packages = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const removed of ["next", "vinext", "drizzle-orm", "wrangler"]) {
    assert.equal(packages[removed], undefined);
  }

  await assert.rejects(
    access(new URL("../.openai/hosting.json", import.meta.url)),
  );
});

test("the updater is slow and the Pages workflow is configured", async () => {
  const [updater, roster, workflow] = await Promise.all([
    read("scripts/update-rankings.mjs"),
    read("scripts/roster.mjs"),
    read(".github/workflows/pages.yml"),
  ]);

  assert.match(updater, /MIN_REQUEST_INTERVAL_MS = 3_000/);
  assert.match(updater, /nexon\.com\/api\/maplestory\/no-auth\/ranking/);
  assert.match(
    updater,
    /nexon\.com\/maplestory\/rankings\/overall-ranking\/legendary/,
  );
  assert.match(roster, /tamitamitami/);
  assert.match(roster, /Voln/);
  assert.match(workflow, /cron: "10 18 \* \* \*"/);
  assert.match(workflow, /cron: "10 19 \* \* \*"/);
  assert.match(workflow, /TZ=America\/Los_Angeles date \+%F/);
  assert.match(workflow, /jq -r '\.updatedOn' src\/data\/history\.json/);
  assert.doesNotMatch(workflow, /date \+%H/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
