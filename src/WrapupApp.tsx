import history from "./data/history.json";
import { RaceReplay } from "./RaceReplay";
import { buildRaceSummary } from "./race-summary";
import type { LeaderboardData } from "./types";
import { WrapupChart } from "./WrapupChart";

export function WrapupApp() {
  const summary = buildRaceSummary(history as LeaderboardData);

  return (
    <main className="wrapup-page">
      <header className="wrapup-header">
        <a href="../">← board</a>
        <div>
          <p className="eyebrow">
            {summary.allFinished ? "the race is over" : "race in progress"}
          </p>
          <h1>honse wrapup</h1>
          {!summary.allFinished ? (
            <p className="wrapup-note">
              preview · final stats lock when everyone reaches 295
            </p>
          ) : null}
        </div>
      </header>

      <RaceReplay summary={summary} />

      <div className="wrapup-summary-grid">
        <section aria-labelledby="standings-title" className="wrap-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">finish order</p>
              <h2 id="standings-title">final leaderboard</h2>
            </div>
          </div>
          <div className="wrap-standings">
            <div aria-hidden="true" className="wrap-standing header">
              <span>place</span>
              <span>character</span>
              <span>started</span>
              <span>finish</span>
            </div>
            {summary.standings.map((standing) => (
              <div className="wrap-standing" key={standing.name}>
                <strong className="wrap-place">
                  {standing.finished ? <i aria-label="finished">♛</i> : null}
                  {standing.place}
                </strong>
                <strong style={{ color: standing.color }}>{standing.name}</strong>
                <span>#{standing.startRank}</span>
                <span>
                  {standing.finishLabel ??
                    `${standing.progress.toFixed(1)}% · racing`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <WrapupChart summary={summary} />
      </div>

      <section aria-labelledby="stats-title" className="wrap-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">by the numbers</p>
            <h2 id="stats-title">race stats</h2>
          </div>
        </div>
        <div className="wrap-stats">
          {summary.stats.map((stat) => (
            <article className="wrap-stat" key={stat.label}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span>{stat.detail}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
