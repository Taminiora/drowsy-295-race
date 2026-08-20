import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LeaderboardMember, Snapshot } from "./types";

const MIN_WIDTH = 600;
const HEIGHT = 520;
const PAD_LEFT = 18;
const PAD_RIGHT = 116;
const PAD_TOP = 18;
const PAD_BOTTOM = 20;
const TARGET_LEVEL = 294;
const END_LABEL_GAP = 14;
const TOOLTIP_WIDTH = 164;
const CHART_START_DATE = "2026-07-27";

function progressIntoTargetLevel(level: number, progress: number) {
  return Math.min(100, Math.max(0, (level - TARGET_LEVEL) * 100 + progress));
}

function expDelta(previous: Snapshot, current: Snapshot) {
  const previousExp = BigInt(previous.expCurrent);
  const currentExp = BigInt(current.expCurrent);

  if (current.level === previous.level) {
    const gain = currentExp - previousExp;
    return gain >= 0n ? gain : null;
  }
  if (current.level === previous.level + 1) {
    return BigInt(previous.expToNext) - previousExp + currentExp;
  }
  return null;
}

function dailyExpPace(snapshots: Snapshot[]) {
  const targetSnapshot = [...snapshots]
    .reverse()
    .find((snapshot) => snapshot.level === TARGET_LEVEL);
  if (!targetSnapshot) return 0;

  const targetLevelExp = BigInt(targetSnapshot.expToNext);
  let totalGain = 0n;
  let totalDays = 0;

  for (let index = 1; index < snapshots.length; index += 1) {
    const previous = snapshots[index - 1];
    const current = snapshots[index];
    const gain = expDelta(previous, current);
    const elapsedDays = Math.max(
      1,
      Math.round(
        (Date.parse(`${current.date}T12:00:00Z`) -
          Date.parse(`${previous.date}T12:00:00Z`)) /
          86_400_000,
      ),
    );
    if (gain === null) continue;
    totalGain += gain;
    totalDays += elapsedDays;
  }

  if (!totalDays || targetLevelExp === 0n) return 0;
  return (Number(totalGain) / Number(targetLevelExp) / totalDays) * 100;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function ProgressChart({
  members,
}: {
  members: LeaderboardMember[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(MIN_WIDTH);
  const [showProjection, setShowProjection] = useState(false);
  const [activePoint, setActivePoint] = useState<string | null>(null);
  useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const updateChartWidth = () => {
      const { height, width } = chart.getBoundingClientRect();
      if (height <= 0 || width <= 0) return;
      const nextWidth = Math.max(
        MIN_WIDTH,
        Math.round((HEIGHT * width) / height),
      );
      setChartWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateChartWidth();
    const observer = new ResizeObserver(updateChartWidth);
    observer.observe(chart);
    return () => observer.disconnect();
  }, []);

  const chartMembers = members
    .map((member) => ({
      ...member,
      snapshots: member.snapshots.filter(
        (snapshot) => snapshot.date >= CHART_START_DATE,
      ),
    }))
    .filter((member) => member.snapshots.length > 1);
  const maxPoints = Math.max(
    0,
    ...chartMembers.map((member) => member.snapshots.length),
  );

  if (!chartMembers.length || maxPoints < 2) {
    return (
      <div className="empty-chart">
        progress lines appear after the second daily snapshot.
      </div>
    );
  }

  const series = chartMembers.map((member) =>
    member.snapshots.map((snapshot) =>
      progressIntoTargetLevel(snapshot.level, snapshot.progress),
    ),
  );
  const min = 0;
  const max = 100;
  const drawableHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotRight = chartWidth - PAD_RIGHT;
  const plotBottom = HEIGHT - PAD_BOTTOM;
  const paceByName = new Map(
    chartMembers.map((member) => [
      member.name,
      dailyExpPace(member.snapshots),
    ]),
  );
  const projections = chartMembers
    .map((member, index) => {
      const values = series[index];
      const latestValue = values.at(-1) ?? 0;
      const dailyPace = paceByName.get(member.name) ?? 0;
      const daysToGoal =
        latestValue >= 100
          ? 0
          : dailyPace > 0
            ? (100 - latestValue) / dailyPace
            : null;
      return {
        member,
        latestValue,
        daysToGoal,
      };
    })
    .filter(
      (
        projection,
      ): projection is typeof projection & { daysToGoal: number } =>
        projection.daysToGoal !== null &&
        Number.isFinite(projection.daysToGoal) &&
        projection.daysToGoal <= 365,
    )
    .sort((left, right) => left.daysToGoal - right.daysToGoal);
  const projectedWinner = projections[0] ?? null;
  const projectionDays = showProjection
    ? Math.ceil(Math.max(0, ...projections.map(({ daysToGoal }) => daysToGoal)))
    : 0;
  const historicalDays = maxPoints - 1;
  const totalDays = historicalDays + projectionDays;
  const x = (day: number) =>
    PAD_LEFT +
    (day / Math.max(1, totalDays)) * (plotRight - PAD_LEFT);
  const y = (value: number) =>
    PAD_TOP + ((max - value) / Math.max(0.001, max - min)) * drawableHeight;
  const endpointLabels = chartMembers
    .map((member, index) => {
      const value = series[index].at(-1) ?? 0;
      return {
        name: member.name,
        lineY: y(value),
        labelY: 0,
      };
    })
    .sort((left, right) => left.lineY - right.lineY);

  let previousLabelY = PAD_TOP - END_LABEL_GAP;
  for (const label of endpointLabels) {
    label.labelY = Math.max(label.lineY, previousLabelY + END_LABEL_GAP);
    previousLabelY = label.labelY;
  }
  const labelOverflow =
    (endpointLabels.at(-1)?.labelY ?? plotBottom) - plotBottom;
  if (labelOverflow > 0) {
    for (const label of endpointLabels) {
      label.labelY -= labelOverflow;
    }
  }
  const labelPositions = new Map(
    endpointLabels.map((label) => [label.name, label.labelY]),
  );
  const latestDate = chartMembers[0].snapshots.at(-1)?.date ?? "";
  const rightDate =
    showProjection && latestDate
      ? shortDate(addDays(latestDate, projectionDays))
      : latestDate.slice(5);
  const winnerDate =
    projectedWinner && latestDate
      ? shortDate(addDays(latestDate, Math.ceil(projectedWinner.daysToGoal)))
      : null;
  const handleChartPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const pointer = event.currentTarget.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const chartPointer = pointer.matrixTransform(matrix.inverse());

    let nearestKey: string | null = null;
    let nearestDistance = 14;
    if (showProjection) {
      for (const { member, daysToGoal } of projections) {
        const memberIndex = chartMembers.findIndex(
          (candidate) => candidate.name === member.name,
        );
        const currentDay = series[memberIndex].length - 1;
        const distance = Math.hypot(
          chartPointer.x - x(currentDay + daysToGoal),
          chartPointer.y - y(100),
        );
        if (distance <= nearestDistance) {
          nearestKey = `projection:${member.name}`;
          nearestDistance = distance;
        }
      }
    }

    chartMembers.forEach((member, memberIndex) => {
      series[memberIndex].forEach((value, pointIndex) => {
        const distance = Math.hypot(
          chartPointer.x - x(pointIndex),
          chartPointer.y - y(value),
        );
        if (distance <= nearestDistance) {
          nearestKey = `history:${member.name}:${member.snapshots[pointIndex].date}`;
          nearestDistance = distance;
        }
      });
    });

    setActivePoint((current) => (current === nearestKey ? current : nearestKey));
  };

  const toggleProjection = () => {
    setActivePoint(null);
    setShowProjection((current) => !current);
  };

  const tooltipX = (pointX: number) =>
    Math.max(
      PAD_LEFT,
      Math.min(pointX - TOOLTIP_WIDTH / 2, plotRight - TOOLTIP_WIDTH),
    );

  const tooltipY = (pointY: number) =>
    pointY < PAD_TOP + 34 ? pointY + 8 : pointY - 28;

  return (
    <>
      <div className="projection-row">
        <button
          aria-pressed={showProjection}
          className={`projection-toggle${showProjection ? " active" : ""}`}
          onClick={toggleProjection}
          type="button"
        >
          project 295
        </button>
        <a className="projection-toggle wrapup-link" href="./wrapup/">
          wrapup
        </a>
        {showProjection && projectedWinner && winnerDate ? (
          <span className="projection-result">
            projected winner{" "}
            <strong style={{ color: projectedWinner.member.color }}>
              {projectedWinner.member.name}
            </strong>{" "}
            · {winnerDate}
          </span>
        ) : null}
      </div>
      <div className="progress-chart" ref={chartRef}>
        <svg
          aria-label="character progress through level 294 since july 27"
          onPointerLeave={() => setActivePoint(null)}
          onPointerMove={handleChartPointerMove}
          preserveAspectRatio="xMinYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
        >
          <defs>
            <clipPath id="plot-clip">
              <rect
                height={drawableHeight}
                width={plotRight - PAD_LEFT}
                x={PAD_LEFT}
                y={PAD_TOP}
              />
            </clipPath>
          </defs>
          {[0, 0.5, 1].map((fraction) => {
            const chartY = PAD_TOP + fraction * drawableHeight;
            const label = max - fraction * (max - min);
            return (
              <g key={fraction}>
                <line
                  className="chart-grid"
                  x1={PAD_LEFT}
                  x2={plotRight}
                  y1={chartY}
                  y2={chartY}
                />
                <text className="chart-axis-label" x={PAD_LEFT} y={chartY - 2}>
                  {label.toFixed(0)}%
                </text>
              </g>
            );
          })}
          {showProjection ? (
            <g>
              <line
                className="chart-today-line"
                x1={x(historicalDays)}
                x2={x(historicalDays)}
                y1={PAD_TOP}
                y2={plotBottom}
              />
              <text
                className="chart-axis-label"
                textAnchor="middle"
                x={x(historicalDays)}
                y={HEIGHT - PAD_BOTTOM + 11}
              >
                today
              </text>
            </g>
          ) : null}
          {showProjection
            ? projections.map(({ member, latestValue, daysToGoal }) => {
                const memberIndex = chartMembers.findIndex(
                  (candidate) => candidate.name === member.name,
                );
                const currentDay = series[memberIndex].length - 1;
                const dailyPace = paceByName.get(member.name) ?? 0;
                const projectedDate = addDays(
                  latestDate,
                  Math.ceil(daysToGoal),
                )
                  .toISOString()
                  .slice(0, 10);
                const projectionLabel = `${member.name} · 100% · ${projectedDate}`;
                const projectionKey = `projection:${member.name}`;
                const endpointX = x(currentDay + daysToGoal);
                return (
                  <g key={`${member.name}-projection`}>
                    <line
                      className="chart-projection-line"
                      clipPath="url(#plot-clip)"
                      style={{ stroke: member.color }}
                      x1={x(0)}
                      x2={x(currentDay + daysToGoal)}
                      y1={y(latestValue - dailyPace * currentDay)}
                      y2={y(100)}
                    />
                    <circle
                      aria-label={projectionLabel}
                      className="chart-projection-hit"
                      cx={endpointX}
                      cy={y(100)}
                      onBlur={() => setActivePoint(null)}
                      onClick={() =>
                        setActivePoint((current) =>
                          current === projectionKey ? null : projectionKey,
                        )
                      }
                      onFocus={() => setActivePoint(projectionKey)}
                      r="10"
                      tabIndex={0}
                    >
                      <title>{projectionLabel}</title>
                    </circle>
                    <circle
                      aria-hidden="true"
                      className="chart-projection-point"
                      cx={endpointX}
                      cy={y(100)}
                      r={activePoint === projectionKey ? "4" : "2.5"}
                      style={{ fill: member.color }}
                    />
                    {activePoint === projectionKey ? (
                      <g aria-hidden="true" className="chart-tooltip">
                        <rect
                          height="20"
                          rx="2"
                          width={TOOLTIP_WIDTH}
                          x={tooltipX(endpointX)}
                          y={PAD_TOP + 8}
                        />
                        <text
                          textAnchor="middle"
                          x={tooltipX(endpointX) + TOOLTIP_WIDTH / 2}
                          y={PAD_TOP + 21}
                        >
                          {projectionLabel}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })
            : null}
          {chartMembers.map((member, memberIndex) => {
            const values = series[memberIndex];
            const latestValue = values.at(-1) ?? 0;
            const lineY = y(latestValue);
            const labelY = labelPositions.get(member.name) ?? lineY;

            return (
              <g key={member.name}>
                <polyline
                  className="chart-line"
                  points={values
                    .map((value, index) => `${x(index)},${y(value)}`)
                    .join(" ")}
                  style={{ stroke: member.color }}
                />
                {values.map((value, index) => {
                  const snapshot = member.snapshots[index];
                  const pointKey = `history:${member.name}:${snapshot.date}`;
                  const pointX = x(index);
                  const pointY = y(value);
                  const valueLabel =
                    snapshot.level > TARGET_LEVEL
                      ? `lv. ${snapshot.level}`
                      : snapshot.level === TARGET_LEVEL
                      ? `${value.toFixed(1)}%`
                      : `lv. ${snapshot.level} ${snapshot.progress.toFixed(1)}%`;
                  const pointLabel = `${member.name} · ${valueLabel} · ${snapshot.date}`;

                  return (
                    <g key={snapshot.date}>
                      <circle
                        aria-label={pointLabel}
                        className="chart-point-hit"
                        cx={pointX}
                        cy={pointY}
                        onBlur={() => setActivePoint(null)}
                        onClick={() =>
                          setActivePoint((current) =>
                            current === pointKey ? null : pointKey,
                          )
                        }
                        onFocus={() => setActivePoint(pointKey)}
                        r="8"
                        tabIndex={0}
                      >
                        <title>{pointLabel}</title>
                      </circle>
                      <circle
                        aria-hidden="true"
                        className="chart-point"
                        cx={pointX}
                        cy={pointY}
                        r={activePoint === pointKey ? "4" : "2.5"}
                        style={{ fill: member.color }}
                      />
                      {activePoint === pointKey ? (
                        <g aria-hidden="true" className="chart-tooltip">
                          <rect
                            height="20"
                            rx="2"
                            width={TOOLTIP_WIDTH}
                            x={tooltipX(pointX)}
                            y={tooltipY(pointY)}
                          />
                          <text
                            textAnchor="middle"
                            x={tooltipX(pointX) + TOOLTIP_WIDTH / 2}
                            y={tooltipY(pointY) + 13}
                          >
                            {pointLabel}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
                {!showProjection ? (
                  <>
                    <line
                      className="chart-label-guide"
                      style={{ stroke: member.color }}
                      x1={plotRight}
                      x2={plotRight + 8}
                      y1={lineY}
                      y2={labelY}
                    />
                    <text
                      className="chart-end-label"
                      style={{ fill: member.color }}
                      x={plotRight + 12}
                      y={labelY + 3}
                    >
                      {member.name} {latestValue.toFixed(1)}%
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
          <text
            className="chart-axis-label"
            x={PAD_LEFT}
            y={HEIGHT - PAD_BOTTOM + 11}
          >
            {chartMembers[0].snapshots[0].date.slice(5)}
          </text>
          <text
            className="chart-axis-label"
            textAnchor="end"
            x={plotRight}
            y={HEIGHT - PAD_BOTTOM + 11}
          >
            {rightDate}
          </text>
        </svg>
      </div>
    </>
  );
}
