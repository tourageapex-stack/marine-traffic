import { useMemo, useState } from 'react';
import type { SchedulePort } from '../services/weekSchedule';
import {
  SCHEDULE_PORTS,
  daysBetweenInclusive,
  formatRangeLabel,
} from '../services/weekSchedule';
import { DateRangeCalendar } from './DateRangeCalendar';

interface WeekScheduleBuilderProps {
  rangeStart: Date;
  rangeEnd: Date;
  weeks: Date[];
  ports: SchedulePort[];
  stayCount: number;
  onRangeChange: (start: Date, end: Date) => void;
  onPortsChange: (ports: SchedulePort[]) => void;
  onBuild: () => void;
  buildLabel?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function WeekScheduleBuilder({
  rangeStart,
  rangeEnd,
  weeks,
  ports,
  stayCount,
  onRangeChange,
  onPortsChange,
  onBuild,
  buildLabel = 'Build schedule',
  collapsible = false,
  defaultOpen = true,
}: WeekScheduleBuilderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const dayCount = daysBetweenInclusive(rangeStart, rangeEnd);
  const expanded = !collapsible || open;

  const togglePort = (port: SchedulePort) => {
    if (ports.includes(port)) {
      const next = ports.filter((item) => item !== port);
      onPortsChange(next.length > 0 ? next : ports);
      return;
    }
    onPortsChange([...SCHEDULE_PORTS].filter((item) => item === port || ports.includes(item)));
  };

  const summary = useMemo(
    () => `${stayCount} ship${stayCount === 1 ? '' : 's'} · ${formatRangeLabel(rangeStart, rangeEnd)}`,
    [stayCount, rangeStart, rangeEnd]
  );

  return (
    <section className={`week-builder-card ${collapsible && !expanded ? 'collapsed' : ''}`} aria-label="Build a week in port">
      {collapsible ? (
        <button
          type="button"
          className="week-builder-toggle"
          aria-expanded={expanded}
          aria-controls="week-builder-panel"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="week-builder-toggle-copy">
            <strong>Week in port</strong>
            <span>{summary}</span>
          </span>
          <span className="week-builder-chevron" aria-hidden="true">
            {expanded ? '▴' : '▾'}
          </span>
        </button>
      ) : (
        <div className="week-builder-copy">
          <h2>Week in port</h2>
          <p>
            Build a working timeline of ships at named berths — from tie-up to let-go.
            River anchorage and buoys are left off.
          </p>
        </div>
      )}

      {expanded && (
        <div id="week-builder-panel" className="week-builder-panel">
          {collapsible && (
            <p className="week-builder-intro">
              Build a working timeline of ships at named berths — from tie-up to let-go.
              River anchorage and buoys are left off.
            </p>
          )}

          <div className="week-builder-controls">
            <div className="week-builder-field">
              <span>Dates</span>
              <DateRangeCalendar
                start={rangeStart}
                end={rangeEnd}
                weeks={weeks}
                onChange={onRangeChange}
              />
            </div>

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
              {stayCount} ship{stayCount === 1 ? '' : 's'} at berth
              {dayCount === 7 ? ' this week' : ` across ${dayCount} days`}
            </div>
            <button type="button" className="feedback-button week-build-button" onClick={onBuild}>
              {buildLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
