import { useMemo } from 'react';
import type { SchedulePort } from '../services/weekSchedule';
import {
  SCHEDULE_PORTS,
  formatWeekLabel,
  toWeekParam,
} from '../services/weekSchedule';

interface WeekScheduleBuilderProps {
  weekStart: Date;
  weeks: Date[];
  ports: SchedulePort[];
  stayCount: number;
  onWeekChange: (weekStart: Date) => void;
  onPortsChange: (ports: SchedulePort[]) => void;
  onBuild: () => void;
  buildLabel?: string;
}

export function WeekScheduleBuilder({
  weekStart,
  weeks,
  ports,
  stayCount,
  onWeekChange,
  onPortsChange,
  onBuild,
  buildLabel = 'Build schedule',
}: WeekScheduleBuilderProps) {
  const weekOptions = useMemo(() => {
    const selected = toWeekParam(weekStart);
    if (weeks.some((week) => toWeekParam(week) === selected)) return weeks;
    return [weekStart, ...weeks];
  }, [weekStart, weeks]);

  const togglePort = (port: SchedulePort) => {
    if (ports.includes(port)) {
      const next = ports.filter((item) => item !== port);
      onPortsChange(next.length > 0 ? next : ports);
      return;
    }
    onPortsChange([...SCHEDULE_PORTS].filter((item) => item === port || ports.includes(item)));
  };

  return (
    <section className="week-builder-card" aria-label="Build a week in port">
      <div className="week-builder-copy">
        <h2>Week in port</h2>
        <p>
          Build a 7-day working timeline of ships at named berths — from tie-up to let-go.
          River anchorage and buoys are left off.
        </p>
      </div>

      <div className="week-builder-controls">
        <label className="week-builder-field">
          <span>Week</span>
          <select
            value={toWeekParam(weekStart)}
            onChange={(event) => {
              const match = weekOptions.find((week) => toWeekParam(week) === event.target.value);
              if (match) onWeekChange(match);
            }}
          >
            {weekOptions.map((week) => (
              <option key={toWeekParam(week)} value={toWeekParam(week)}>
                {formatWeekLabel(week)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="week-builder-field week-builder-ports">
          <legend>Ports</legend>
          <div className="week-port-pills">
            {SCHEDULE_PORTS.map((port) => {
              const checked = ports.includes(port);
              return (
                <label key={port} className={`week-port-pill ${checked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePort(port)}
                  />
                  {port}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="week-builder-actions">
        <div className="week-builder-count">
          {stayCount} ship{stayCount === 1 ? '' : 's'} at berth this week
        </div>
        <button type="button" className="feedback-button week-build-button" onClick={onBuild}>
          {buildLabel}
        </button>
      </div>
    </section>
  );
}
