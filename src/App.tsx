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

function asciiBar(progress: number) {
  const width = 16;
  const position = Math.min(
    width,
    Math.max(1, Math.round((Math.min(100, Math.max(0, progress)) / 100) * width)),
  );

  return `[${"=".repeat(position - 1)}>${".".repeat(width - position)}]`;
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
            <ProgressChart members={members} />
          </div>
        </div>

        <section aria-label="ascii progress" className="ascii-progress-strip">
          {members.map((member) => (
            <div
              className="ascii-progress"
              key={member.name}
              style={{ "--member-color": member.color } as CSSProperties}
            >
              <span className="ascii-progress-label">
                <strong>{member.name}</strong>
                <span>{member.current.progress.toFixed(1)}%</span>
              </span>
              <code>{asciiBar(member.current.progress)}</code>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
