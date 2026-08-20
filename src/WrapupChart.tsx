import { shortRaceDate } from "./race-summary";
import type { RaceSummary } from "./race-summary";

const WIDTH = 1000;
const HEIGHT = 330;
const PAD_X = 30;
const PAD_TOP = 22;
const PAD_BOTTOM = 28;

export function WrapupChart({ summary }: { summary: RaceSummary }) {
  const drawableWidth = WIDTH - PAD_X * 2;
  const drawableHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const x = (index: number) =>
    PAD_X +
    (index / Math.max(1, summary.frames.length - 1)) * drawableWidth;
  const y = (progress: number) =>
    PAD_TOP + ((100 - progress) / 100) * drawableHeight;
  const names = summary.frames[0].entries.map((entry) => entry.name);
  const colorByName = new Map(
    summary.frames[0].entries.map((entry) => [entry.name, entry.color]),
  );

  return (
    <section aria-labelledby="chart-title" className="wrap-section chart-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">jul 27 — {shortRaceDate(summary.endDate)}</p>
          <h2 id="chart-title">race graph</h2>
        </div>
      </div>
      <div className="wrap-chart-legend">
        {names.map((name) => (
          <span key={name} style={{ color: colorByName.get(name) }}>
            <i /> {name}
          </span>
        ))}
      </div>
      <div className="wrap-chart-scroll">
        <svg
          aria-label="full race progress graph"
          className="wrap-chart"
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              className="wrap-chart-grid"
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={y(value)}
              y2={y(value)}
            />
            <text className="wrap-chart-axis" x={PAD_X} y={y(value) - 4}>
              {value}%
            </text>
          </g>
        ))}
        {names.map((name) => {
          const points = summary.frames
            .map((frame, index) => {
              const entry = frame.entries.find(
                (candidate) => candidate.name === name,
              );
              return `${x(index)},${y(entry?.progress ?? 0)}`;
            })
            .join(" ");
          return (
            <polyline
              className="wrap-chart-line"
              key={name}
              points={points}
              style={{ stroke: colorByName.get(name) }}
            />
          );
        })}
        <text className="wrap-chart-axis" x={PAD_X} y={HEIGHT - 5}>
          {shortRaceDate(summary.frames[0].date)}
        </text>
        <text
          className="wrap-chart-axis"
          textAnchor="end"
          x={WIDTH - PAD_X}
          y={HEIGHT - 5}
        >
          {shortRaceDate(summary.endDate)}
        </text>
        </svg>
      </div>
    </section>
  );
}
