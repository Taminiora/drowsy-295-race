import type { CSSProperties } from "react";
import { useState } from "react";
import history from "./data/history.json";
import { dailyGain, formatExp } from "./format";
import { ProgressChart } from "./ProgressChart";
import {
  compareRaceEntries,
  dailyGainRate,
  firstFinishSnapshot,
  horseStepDuration,
  horseStepSpeed,
  raceProgress,
} from "./rankings";
import type {
  LeaderboardData,
  LeaderboardMember,
  Snapshot,
} from "./types";

function buildMembers(data: LeaderboardData): LeaderboardMember[] {
  const members = data.characters
    .filter((character) => character.snapshots.length > 0)
    .map((character) => {
      const current = character.snapshots.at(-1) as Snapshot;
      const previous = character.snapshots.at(-2) ?? null;
      return {
        ...character,
        current,
        previous,
        finishedOn: firstFinishSnapshot(character, current.date)?.date ?? null,
        movement: null,
        dailyGain: dailyGain(current, previous),
      };
    });

  const currentOrder = [...members].sort((left, right) =>
    compareRaceEntries(left, left.current, right, right.current),
  );
  const previousOrder = [...members].sort((left, right) => {
    if (!left.previous) return 1;
    if (!right.previous) return -1;
    return compareRaceEntries(left, left.previous, right, right.previous);
  });
  const previousRanks = new Map(
    previousOrder.map((member, index) => [member.name, index + 1]),
  );

  return currentOrder.map((member, index) => ({
    ...member,
    movement: previousRanks.has(member.name)
      ? (previousRanks.get(member.name) as number) - (index + 1)
      : null,
  }));
}

const ASCII_HORSE = ["   __/\\", "~-(o  )>"];
const ASCII_HORSE_LEGS = ["  /  \\", "  \\  /"];
const ASCII_TRACK =
  "----------------------------------------------------------------------------------------------------------------------------------------------------------------";

function mapleRanksUrl(name: string) {
  return `https://mapleranks.com/u/${encodeURIComponent(name)}`;
}

export function App() {
  const embedMode = new URLSearchParams(window.location.search).has("embed");
  const [honseMode, setHonseMode] = useState(embedMode);
  const data = history as LeaderboardData;
  const members = buildMembers(data);
  const horseGainRates = new Map(
    members.map((member) => [
      member.name,
      dailyGainRate(
        member.dailyGain,
        member.previous?.expToNext ?? null,
      ),
    ]),
  );
  const measuredGainRates = [...horseGainRates.values()].filter(
    (gainRate): gainRate is number => gainRate !== null,
  );
  const lowestGainRate = Math.min(...measuredGainRates);
  const highestGainRate = Math.max(...measuredGainRates);
  const mainClassName = [
    honseMode ? "honse-mode" : "",
    embedMode ? "embed-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={mainClassName || undefined}>
      {!embedMode && (
        <button
          aria-pressed={honseMode}
          className="honse-toggle"
          onClick={() => setHonseMode((enabled) => !enabled)}
          type="button"
        >
          honse mode
        </button>
      )}
      <div className="board-shell">
        {!honseMode && (
          <div className="leaderboard-grid">
            <div className="rank-list">
              <div aria-hidden="true" className="rank-header">
                <span>rank</span>
                <span>character</span>
                <span>move</span>
                <span style={{ textAlign: "right" }}>level / exp</span>
              </div>
              {members.map((member, index) => (
                <div className="rank-row" key={member.name}>
                  <span className="rank-number">
                    {member.finishedOn ? (
                      <span
                        aria-label="finished"
                        className="rank-crown"
                        title={`finished ${member.finishedOn}`}
                      >
                        ♛
                      </span>
                    ) : null}
                    {index + 1}
                  </span>
                  <div className="character">
                    <a
                      className="character-link"
                      href={mapleRanksUrl(member.name)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <strong>{member.name}</strong>
                      <small>
                        {member.current.job} · {member.current.world}
                      </small>
                    </a>
                  </div>
                  <span
                    className={`movement ${
                      !member.movement
                        ? "same"
                        : member.movement > 0
                          ? "up"
                          : "down"
                    }`}
                  >
                    {!member.movement
                      ? "—"
                      : member.movement > 0
                        ? `↑ ${member.movement}`
                        : `↓ ${Math.abs(member.movement)}`}
                  </span>
                  <div
                    className="gain-cell"
                    style={
                      { "--member-color": member.color } as CSSProperties
                    }
                  >
                    <strong>
                      lv. {member.current.level}
                      {member.current.level < 295
                        ? ` · ${member.current.progress.toFixed(1)}%`
                        : null}
                    </strong>
                    <small>
                      {member.dailyGain !== null
                        ? `+${formatExp(member.dailyGain)} yesterday`
                        : "no prior-day snapshot"}
                    </small>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${Math.max(1, raceProgress(member.current))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chart-panel">
              <ProgressChart members={members} />
            </div>
          </div>
        )}

        <section aria-label="ascii horse race" className="ascii-progress-strip">
          <div className="ascii-race">
            <div aria-hidden="true" className="ascii-axis">
              <span />
              <span>
                <i>0%</i>
                <i>100%</i>
              </span>
              <span />
            </div>
            {members.map((member, index) => {
              const progress = raceProgress(member.current);
              const horseSpeed = horseStepSpeed(
                horseGainRates.get(member.name) ?? null,
                lowestGainRate,
                highestGainRate,
              );
              return (
                <div
                  className={`ascii-lane${member.finishedOn ? " finished" : ""}`}
                  key={member.name}
                  style={
                    {
                      "--member-color": member.color,
                      "--horse-delay": `${index * -70}ms`,
                      "--horse-step-duration": `${horseStepDuration(horseSpeed)}ms`,
                      "--progress": `${progress}%`,
                    } as CSSProperties
                  }
                >
                  <a
                    className="ascii-name-link"
                    href={mapleRanksUrl(member.name)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {member.name}
                  </a>
                  <code className="ascii-track">
                    <span aria-hidden="true">{ASCII_TRACK}</span>
                    <b
                      aria-label={
                        member.finishedOn
                          ? `${member.name} finished on ${member.finishedOn}`
                          : `${member.name} at ${progress.toFixed(1)} percent`
                      }
                      className="ascii-horse"
                    >
                      {ASCII_HORSE.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                      <span aria-hidden="true" className="ascii-horse-legs">
                        {ASCII_HORSE_LEGS.map((legs, frame) => (
                          <i
                            className={`ascii-leg-frame frame-${frame}`}
                            key={legs}
                          >
                            {legs}
                          </i>
                        ))}
                      </span>
                      {member.finishedOn ? (
                        <span aria-hidden="true" className="ascii-horse-crown">
                          👑
                        </span>
                      ) : null}
                    </b>
                  </code>
                  <span>{progress.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
