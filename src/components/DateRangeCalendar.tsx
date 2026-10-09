import { useMemo, useState } from 'react';
import {
  addDays,
  formatDayLabel,
  formatWeekLabel,
  isSevenDayWeek,
  normalizeRange,
  sameDay,
  startOfLocalDay,
  toDateParam,
} from '../services/weekSchedule';

interface DateRangeCalendarProps {
  start: Date;
  end: Date;
  weeks: Date[];
  onChange: (start: Date, end: Date) => void;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const startOfCalendarGrid = (month: Date): Date => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const weekday = first.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  first.setDate(first.getDate() + diff);
  return startOfLocalDay(first);
};

export function DateRangeCalendar({ start, end, weeks, onChange }: DateRangeCalendarProps) {
  const range = normalizeRange(start, end);
  const [viewMonth, setViewMonth] = useState(() => new Date(range.start.getFullYear(), range.start.getMonth(), 1));
  const [pendingStart, setPendingStart] = useState<Date | null>(null);

  const gridDays = useMemo(() => {
    const first = startOfCalendarGrid(viewMonth);
    return Array.from({ length: 42 }, (_, index) => addDays(first, index));
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const highlightStart = pendingStart ?? range.start;
  const highlightEnd = pendingStart ?? range.end;
  const selectedWeek = weeks.find((week) => isSevenDayWeek(range.start, range.end) && sameDay(week, range.start));

  const selectDay = (day: Date) => {
    if (!pendingStart) {
      setPendingStart(day);
      onChange(day, day);
      return;
    }
    onChange(pendingStart, day);
    setPendingStart(null);
  };

  const inRange = (day: Date) => {
    const a = highlightStart.getTime();
    const b = highlightEnd.getTime();
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const time = day.getTime();
    return time >= min && time <= max;
  };

  return (
    <div className="date-range-picker">
      <div className="date-range-summary">
        <div className={`date-range-bound ${pendingStart ? 'picking' : ''}`}>
          <span>Start</span>
          <strong>{formatDayLabel(range.start)}</strong>
        </div>
        <div className="date-range-bound">
          <span>End</span>
          <strong>{pendingStart ? 'Pick end date' : formatDayLabel(range.end)}</strong>
        </div>
      </div>

      <div className="date-calendar">
        <div className="date-calendar-nav">
          <button
            type="button"
            className="date-calendar-nav-btn"
            aria-label="Previous month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <div className="date-calendar-month">{monthLabel}</div>
          <button
            type="button"
            className="date-calendar-nav-btn"
            aria-label="Next month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>
        <div className="date-calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="date-calendar-grid">
          {gridDays.map((day) => {
            const outside = day.getMonth() !== viewMonth.getMonth();
            const isStart = sameDay(day, highlightStart);
            const isEnd = sameDay(day, highlightEnd);
            const selected = inRange(day);
            return (
              <button
                key={toDateParam(day)}
                type="button"
                className={[
                  'date-calendar-day',
                  outside ? 'outside' : '',
                  selected ? 'in-range' : '',
                  isStart ? 'range-start' : '',
                  isEnd ? 'range-end' : '',
                ].join(' ')}
                onClick={() => selectDay(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {weeks.length > 0 && (
        <div className="date-week-presets">
          <span>7-day weeks</span>
          <div className="date-week-preset-list">
            {weeks.map((week) => {
              const active = selectedWeek ? sameDay(selectedWeek, week) : false;
              return (
                <button
                  key={toDateParam(week)}
                  type="button"
                  className={`date-week-preset ${active ? 'active' : ''}`}
                  onClick={() => {
                    setPendingStart(null);
                    onChange(week, addDays(week, 6));
                    setViewMonth(new Date(week.getFullYear(), week.getMonth(), 1));
                  }}
                >
                  {formatWeekLabel(week)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
