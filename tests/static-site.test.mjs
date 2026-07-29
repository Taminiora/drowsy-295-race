import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  compareRaceEntries,
  dailyGainRate,
  firstFinishSnapshot,
  horseStepDuration,
  horseStepSpeed,
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
  assert.match(app, /ASCII_HORSE/);
  assert.match(app, /ASCII_HORSE_LEGS/);
  assert.match(app, /ASCII_TRACK/);
  assert.match(app, /ascii-horse/);
  assert.match(app, /ascii-horse-legs/);
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
  assert.match(app, /className="rank-crown"/);
  assert.match(app, /aria-label="finished"/);
  assert.match(app, /raceProgress\(member\.current\)/);
  const [chart, styles] = await Promise.all([
    read("src/ProgressChart.tsx"),
    read("src/styles.css"),
  ]);
  assert.match(chart, /aria-pressed/);
  assert.match(chart, /project 295/);
  assert.match(chart, /projected winner/);
  assert.match(chart, /dailyExpPace/);
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
  assert.match(styles, /\.honse-mode \.ascii-progress-strip/);
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
  assert.equal(pack.snapshots.length, 8);
  assert.equal(pack.snapshots[4].progress, 95.981);
  assert.equal(pack.snapshots[4].level, 293);
  assert.equal(pack.snapshots[5].level, 294);
  assert.equal(pack.snapshots.at(-1).progress, 5.049);

  const seededPriorDay = new Map([
    ["xZenjiro", [38.744, 55.059]],
    ["RoyaiOrange", [18.003, 29.546]],
    ["Yugameru", [6.972, 22.857]],
  ]);
  for (const [name, [firstProgress, priorDayProgress]] of seededPriorDay) {
    const character = parsed.characters.find((entry) => entry.name === name);
    assert.equal(character.snapshots.length, 8);
    assert.equal(character.snapshots[0].date, "2026-07-21");
    assert.equal(character.snapshots[0].progress, firstProgress);
    assert.equal(character.snapshots[6].date, "2026-07-27");
    assert.equal(character.snapshots[6].progress, priorDayProgress);
  }

  const yugameru = parsed.characters.find(
    (character) => character.name === "Yugameru",
  );
  assert.equal(yugameru.color, "#9a7585");
  assert.equal(yugameru.snapshots[2].progress, 10.597);
  assert.equal(yugameru.snapshots[3].progress, 10.597);

  const voln = parsed.characters.find(
    (character) => character.name === "Voln",
  );
  assert.equal(voln.color, "#5673a6");
  assert.equal(voln.snapshots.length, 7);
  assert.deepEqual(
    voln.snapshots.map((snapshot) => snapshot.progress),
    [36.4, 38.6, 41.3, 44.8, 49.8, 51.5, 52.742],
  );
  assert.equal(voln.snapshots.at(-1).expCurrent, "227261512908920");
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
  assert.match(workflow, /cron: "0 19 \* \* \*"/);
  assert.match(workflow, /cron: "0 20 \* \* \*"/);
  assert.match(workflow, /TZ=America\/Los_Angeles date \+%H/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
