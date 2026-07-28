import type { CSSProperties } from "react";
import { useState } from "react";
import history from "./data/history.json";
import { compareSnapshots, dailyGain, formatExp } from "./format";
import { ProgressChart } from "./ProgressChart";
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
        movement: null,
        dailyGain: dailyGain(current, previous),
      };
    });

  const currentOrder = [...members].sort((left, right) =>
    compareSnapshots(left.current, right.current),
  );
  const previousOrder = [...members].sort((left, right) => {
    if (!left.previous) return 1;
    if (!right.previous) return -1;
    return compareSnapshots(left.previous, right.previous);
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

export function App() {
  const [honseMode, setHonseMode] = useState(false);
  const data = history as LeaderboardData;
  const members = buildMembers(data);

  return (
    <main className={honseMode ? "honse-mode" : undefined}>
      <button
        aria-pressed={honseMode}
        className="honse-toggle"
        onClick={() => setHonseMode((enabled) => !enabled)}
        type="button"
      >
        honse mode
      </button>
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
                  <span className="rank-number">{index + 1}</span>
                  <div className="character">
                    <span>
                      <strong>{member.name}</strong>
                      <small>
                        {member.current.job} · {member.current.world}
                      </small>
                    </span>
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
                      lv. {member.current.level} ·{" "}
                      {member.current.progress.toFixed(1)}%
                    </strong>
                    <small>
                      {member.dailyGain !== null
                        ? `+${formatExp(member.dailyGain)} yesterday`
                        : "no prior-day snapshot"}
                    </small>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${Math.max(1, member.current.progress)}%`,
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
            {members.map((member, index) => (
              <div
                className="ascii-lane"
                key={member.name}
                style={
                  {
                    "--member-color": member.color,
                    "--horse-delay": `${index * -70}ms`,
                    "--progress": `${member.current.progress}%`,
                  } as CSSProperties
                }
              >
                <strong>{member.name}</strong>
                <code className="ascii-track">
                  <span aria-hidden="true">{ASCII_TRACK}</span>
                  <b
                    aria-label={`${member.name} at ${member.current.progress.toFixed(1)} percent`}
                    className="ascii-horse"
                  >
                    {ASCII_HORSE.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                    <span aria-hidden="true" className="ascii-horse-legs">
                      {ASCII_HORSE_LEGS.map((legs, frame) => (
                        <i className={`ascii-leg-frame frame-${frame}`} key={legs}>
                          {legs}
                        </i>
                      ))}
                    </span>
                  </b>
                </code>
                <span>{member.current.progress.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
