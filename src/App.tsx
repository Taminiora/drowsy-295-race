import type { CSSProperties } from "react";
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

export function App() {
  const data = history as LeaderboardData;
  const members = buildMembers(data);

  return (
    <main>
      <div className="board-shell">
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
            <div className="chart-heading">
              <h2>7-day progress</h2>
              <span>%</span>
            </div>
            <ProgressChart members={members} />
          </div>
        </div>
      </div>
    </main>
  );
}
