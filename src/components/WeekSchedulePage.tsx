import { useMemo, useRef, useState } from 'react';
import type { VesselTraffic } from '../services/api';
import type { PortStay, SchedulePort } from '../services/weekSchedule';
import {
  SCHEDULE_PORTS,
  addDays,
  buildPortStays,
  formatRangeLabel,
  formatWeekdayDateTime,
  formatWorkingHours,
  normalizeRange,
  parseDateParam,
  parseWeekParam,
  rangeDays,
  stayBarPosition,
  staysOverlappingRange,
  startOfWeekMonday,
  toDateParam,
  weeksCoveringStays,
} from '../services/weekSchedule';
import { WeekScheduleBuilder } from './WeekScheduleBuilder';

interface WeekSchedulePageProps {
  data: VesselTraffic[];
  initialStart?: string | null;
  initialEnd?: string | null;
  initialWeek?: string | null;
  initialPorts?: string | null;
}

const portClass: Record<SchedulePort, string> = {
  Vancouver: 'port-vancouver',
  Portland: 'port-portland',
  Longview: 'port-longview',
};

const readPorts = (value?: string | null): SchedulePort[] => {
  if (!value) return [...SCHEDULE_PORTS];
  const selected = value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is SchedulePort =>
      SCHEDULE_PORTS.includes(item as SchedulePort)
    );
  return selected.length > 0 ? selected : [...SCHEDULE_PORTS];
};

const readInitialRange = (
  initialStart?: string | null,
  initialEnd?: string | null,
  initialWeek?: string | null,
  fallbackWeeks: Date[] = []
) => {
  const start = parseDateParam(initialStart);
  const end = parseDateParam(initialEnd);
  if (start && end) return normalizeRange(start, end);
  const week = parseWeekParam(initialWeek) || fallbackWeeks[0] || startOfWeekMonday(new Date());
  return { start: week, end: addDays(week, 6) };
};

export function WeekSchedulePage({
  data,
  initialStart,
  initialEnd,
  initialWeek,
  initialPorts,
}: WeekSchedulePageProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const allStays = useMemo(() => buildPortStays(data), [data]);
  const weeks = useMemo(() => weeksCoveringStays(allStays), [allStays]);
  const [range, setRange] = useState(() =>
    readInitialRange(initialStart, initialEnd, initialWeek, weeks)
  );
  const [ports, setPorts] = useState<SchedulePort[]>(() => readPorts(initialPorts));
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const weekStays = useMemo(() => {
    return staysOverlappingRange(allStays, range.start, range.end).filter((stay) =>
      ports.includes(stay.port)
    );
  }, [allStays, range, ports]);

  const visibleStays = useMemo(
    () => weekStays.filter((stay) => !hiddenIds.has(stay.id)),
    [weekStays, hiddenIds]
  );

  const days = rangeDays(range.start, range.end);
  const [generatedAt] = useState(() => formatWeekdayDateTime(new Date().toISOString()));

  const toggleStay = (id: string) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showAll = () => setHiddenIds(new Set());

  const downloadPng = async () => {
    if (!sheetRef.current || visibleStays.length === 0) return;
    setExporting(true);
    setStatusMessage(null);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(sheetRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `river-watch-week-in-port-${toDateParam(range.start)}-to-${toDateParam(range.end)}.png`;
      link.href = dataUrl;
      link.click();
      setStatusMessage('Schedule image downloaded.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Could not download the image. Use Print or take a screenshot of the schedule.');
    } finally {
      setExporting(false);
    }
  };

  const copyImage = async () => {
    if (!sheetRef.current || visibleStays.length === 0) return;
    if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') {
      setStatusMessage('Copy image is not supported here. Download the PNG or take a screenshot.');
      return;
    }
    setExporting(true);
    setStatusMessage(null);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(sheetRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
      });
      if (!blob) throw new Error('No image created');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatusMessage('Schedule image copied. Paste it into a message or document.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Could not copy the image. Download the PNG or take a screenshot.');
    } finally {
      setExporting(false);
    }
  };

  const printSchedule = () => {
    window.print();
  };

  return (
    <div className="schedule-page">
      <WeekScheduleBuilder
        rangeStart={range.start}
        rangeEnd={range.end}
        weeks={weeks}
        ports={ports}
        stayCount={weekStays.length}
        onRangeChange={(start, end) => {
          setRange(normalizeRange(start, end));
          setHiddenIds(new Set());
        }}
        onPortsChange={(next) => {
          setPorts(next);
          setHiddenIds(new Set());
        }}
        onBuild={() => {
          sheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        buildLabel="Show schedule"
      />

      {weekStays.length > 0 && (
        <section className="schedule-picker" aria-label="Ships to include">
          <div className="schedule-picker-head">
            <h3>Ships at berth</h3>
            <button type="button" className="schedule-text-button" onClick={showAll}>
              Include all
            </button>
          </div>
          <ul className="schedule-picker-list">
            {weekStays.map((stay) => (
              <li key={stay.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={!hiddenIds.has(stay.id)}
                    onChange={() => toggleStay(stay.id)}
                  />
                  <span className="schedule-picker-name">{stay.vesselName}</span>
                  <span className="schedule-picker-meta">
                    {stay.berthCode} · {formatWeekdayDateTime(stay.berthedAt)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="schedule-toolbar">
        <button type="button" className="feedback-button" onClick={downloadPng} disabled={exporting || visibleStays.length === 0}>
          {exporting ? 'Preparing…' : 'Download PNG'}
        </button>
        <button type="button" className="schedule-secondary-button" onClick={copyImage} disabled={exporting || visibleStays.length === 0}>
          Copy image
        </button>
        <button type="button" className="schedule-secondary-button" onClick={printSchedule} disabled={visibleStays.length === 0}>
          Print / PDF
        </button>
        <p className="schedule-toolbar-hint">
          Download a PNG, print a PDF, or screenshot the schedule card below.
        </p>
      </div>
      {statusMessage && (
        <div className="schedule-status" role="status">
          {statusMessage}
        </div>
      )}

      <div ref={sheetRef} className="schedule-sheet">
        <div className="schedule-sheet-header">
          <div>
            <div className="schedule-kicker">River Watch</div>
            <h2>Week in port</h2>
            <p className="schedule-range">{formatRangeLabel(range.start, range.end)}</p>
          </div>
          <div className="schedule-sheet-meta">
            <div>{ports.join(' · ')}</div>
            <div>Working berths only</div>
            <div>Built {generatedAt}</div>
          </div>
        </div>

        {visibleStays.length === 0 ? (
          <div className="schedule-empty">
            No ships are at a named berth for these dates. Try another range or include more ports.
          </div>
        ) : (
          <>
            <div
              className="schedule-gantt"
              role="img"
              aria-label="Timeline of ships working at berth"
              style={{ ['--day-count' as string]: String(days.length) }}
            >
              <div className="schedule-gantt-head">
                <div className="schedule-gantt-ship-col">Ship / berth</div>
                <div className="schedule-gantt-days">
                  {days.map((day) => (
                    <div key={day.toISOString()} className="schedule-gantt-day">
                      <span>{day.toLocaleDateString([], { weekday: 'short' })}</span>
                      <strong>{day.toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong>
                    </div>
                  ))}
                </div>
              </div>
              {visibleStays.map((stay) => (
                <GanttRow key={stay.id} stay={stay} rangeStart={range.start} rangeEnd={range.end} />
              ))}
            </div>

            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Vessel</th>
                  <th>Port</th>
                  <th>Berth</th>
                  <th>Berthed</th>
                  <th>Let go</th>
                  <th>Working</th>
                </tr>
              </thead>
              <tbody>
                {visibleStays.map((stay) => (
                  <tr key={`${stay.id}-row`}>
                    <td className="vessel-name">{stay.vesselName}</td>
                    <td>{stay.port}</td>
                    <td>
                      <span className="port-code" title={stay.berthName}>
                        {stay.berthCode}
                      </span>
                    </td>
                    <td className="vessel-datetime">{formatWeekdayDateTime(stay.berthedAt)}</td>
                    <td className="vessel-datetime">
                      {stay.letGoAt ? formatWeekdayDateTime(stay.letGoAt) : 'In port / TBD'}
                    </td>
                    <td>{formatWorkingHours(stay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function GanttRow({
  stay,
  rangeStart,
  rangeEnd,
}: {
  stay: PortStay;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const bar = stayBarPosition(stay, rangeStart, rangeEnd);
  const title = `${stay.vesselName} at ${stay.berthName}: ${formatWeekdayDateTime(stay.berthedAt)} to ${
    stay.letGoAt ? formatWeekdayDateTime(stay.letGoAt) : 'in port'
  }`;

  return (
    <div className="schedule-gantt-row">
      <div className="schedule-gantt-ship-col">
        <div className="schedule-gantt-vessel">{stay.vesselName}</div>
        <div className="schedule-gantt-berth">{stay.berthName}</div>
      </div>
      <div className="schedule-gantt-track">
        <div
          className={`schedule-gantt-bar ${portClass[stay.port]} ${bar.continuesBefore ? 'clip-start' : ''} ${
            bar.continuesAfter ? 'clip-end' : ''
          }`}
          style={{ left: bar.left, width: bar.width }}
          title={title}
        >
          <span>{stay.berthCode}</span>
        </div>
      </div>
    </div>
  );
}
