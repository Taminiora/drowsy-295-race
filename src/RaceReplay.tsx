import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { raceReplayGaitDuration } from "./rankings";
import { shortRaceDate } from "./race-summary";
import type { RaceSummary } from "./race-summary";

const ASCII_HORSE = ["   __/\\", "~-(o  )>"];
const ASCII_HORSE_LEGS = ["  /  \\", "  |  /", "  \\  /", "  \\  |"];
const FRAME_TIME_MS = 1_500;

export function RaceReplay({ summary }: { summary: RaceSummary }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [running, setRunning] = useState(false);
  const frame = summary.frames[frameIndex];
  const finishPlaces = new Map(
    summary.standings
      .filter((standing) => standing.finished)
      .map((standing) => [standing.name, standing.place]),
  );

  useEffect(() => {
    if (!running) return;
    if (frameIndex >= summary.frames.length - 1) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(
      () => setFrameIndex((current) => current + 1),
      FRAME_TIME_MS,
    );
    return () => window.clearTimeout(timer);
  }, [frameIndex, running, summary.frames.length]);

  const start = () => {
    if (frameIndex >= summary.frames.length - 1) setFrameIndex(0);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setResetting(true);
    setFrameIndex(0);
    window.requestAnimationFrame(() => setResetting(false));
  };

  return (
    <section aria-labelledby="replay-title" className="wrap-section replay-section">
      <div className="section-heading replay-heading">
        <div>
          <p className="eyebrow">the whole race</p>
          <h2 id="replay-title">race replay</h2>
        </div>
        <div aria-live="polite" className="replay-date">
          <strong>{shortRaceDate(frame.date)}</strong>
          <span>
            day {frameIndex + 1}/{summary.frames.length}
          </span>
        </div>
      </div>

      <div
        aria-label={`race positions on ${frame.date}`}
        className={`replay-race${resetting ? " resetting" : ""}`}
      >
        <div aria-hidden="true" className="replay-axis">
          <span />
          <span>
            <i>0%</i>
            <i>100%</i>
          </span>
          <span />
        </div>
        {frame.entries.map((entry, index) => {
          const left = entry.finished
            ? "calc(100% + 5px)"
            : `calc(${entry.progress}% - ${(entry.progress / 100) * 48}px)`;
          const stepDuration = raceReplayGaitDuration(
            entry.gainPercent,
            FRAME_TIME_MS,
          );
          return (
            <div
              className={`replay-lane${entry.finished ? " finished" : ""}${
                running && entry.gainPercent > 0 ? " moving" : ""
              }`}
              key={entry.name}
              style={
                {
                  "--horse-delay": `${index * -65}ms`,
                  "--horse-left": left,
                  "--horse-step-duration": `${stepDuration}ms`,
                  "--horse-travel-duration": `${FRAME_TIME_MS}ms`,
                  "--member-color": entry.color,
                } as CSSProperties
              }
            >
              <strong>{entry.name}</strong>
              <div className="replay-track">
                <span aria-hidden="true" className="replay-track-line" />
                <code
                  aria-label={`${entry.name} at ${entry.progress.toFixed(1)} percent`}
                  className="replay-horse"
                >
                  {ASCII_HORSE.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  <span aria-hidden="true" className="replay-horse-legs">
                    {ASCII_HORSE_LEGS.map((legs, legFrame) => (
                      <i className={`replay-leg-frame frame-${legFrame}`} key={legs}>
                        {legs}
                      </i>
                    ))}
                  </span>
                  {entry.finished ? (
                    <span aria-hidden="true" className="replay-crown">
                      👑
                    </span>
                  ) : null}
                </code>
              </div>
              <span
                className={`replay-gain${entry.finished ? " finish-order" : ""}`}
              >
                {entry.finished
                  ? `#${finishPlaces.get(entry.name)}`
                  : entry.gainPercent > 0
                    ? `+${entry.gainPercent.toFixed(1)}%`
                    : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="replay-controls">
        <button disabled={running} onClick={start} type="button">
          start
        </button>
        <button disabled={!running} onClick={() => setRunning(false)} type="button">
          stop
        </button>
        <button onClick={reset} type="button">
          reset
        </button>
      </div>
    </section>
  );
}
