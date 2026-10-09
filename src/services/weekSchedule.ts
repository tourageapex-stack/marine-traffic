import { isPortMatch, type VesselTraffic } from './api';

export const SCHEDULE_PORTS = ['Vancouver', 'Portland', 'Longview'] as const;
export type SchedulePort = (typeof SCHEDULE_PORTS)[number];

export interface PortStay {
  id: string;
  vesselName: string;
  vesselType?: string;
  port: SchedulePort;
  berthCode: string;
  berthName: string;
  berthedAt: string;
  letGoAt: string | null;
  letGoDestination?: string;
  arrivalStatus: string;
}

const ANCHORAGE_CODES = new Set([
  'LS',
  'SEA',
  'ASTAN',
  'RELVL',
  'VAN A',
  'VAN L',
  'VNBUOY',
  'KA 2',
  'LA 1',
  'LA 2',
  'CI 1',
  'CI 2',
]);

const ANCHORAGE_CODE_PREFIXES = ['KA B', 'LA ', 'RICE', 'VU B', 'VL B', 'RA B', 'CI ', 'WI '];

const ANCHORAGE_NAME =
  /ANCHOR|ANCHORAGE|BUOY|PILOT STATION|LIGHTSHIP|\bRELIEF\b/;

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const VAN_PDX_TRANSIT_FROM_LS_MS = 8 * MS_HOUR;
/** Alongside time shorter than this is a template order, not a ship at a berth. */
const MIN_BERTH_STAY_MS = MS_HOUR;
/** Several ships sharing one berth timestamp are still at anchor on a placeholder order. */
const PLACEHOLDER_ARRIVAL_COUNT = 2;
const PLACEHOLDER_LET_GO_COUNT = 3;

export const isRiverAnchorage = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = (code || '').toUpperCase().trim();
  if (!n && !c) return true;
  if (ANCHORAGE_NAME.test(n)) return true;
  if (ANCHORAGE_CODES.has(c)) return true;
  return ANCHORAGE_CODE_PREFIXES.some((prefix) => c.startsWith(prefix));
};

/** Vancouver Berth 5 is not a working berth for this schedule. Longview Berth 5 stays. */
export const isVancouverBerthFive = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = (code || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const compact = c.replace(/\s+/g, '');
  const vancouverCode = /^(VAN|VU|VL)(?=\d|\s|$)/.test(c) || /^(VAN|VU|VL)\d/.test(compact);
  const vancouverName = n.includes('VANCOUVER');
  if (/^(VAN|VU|VL)0*5$/.test(compact)) return true;
  const berthFive = /\bBERTH\s*(?:NO\.?|#)?\s*0*5\b/.test(n);
  return berthFive && (vancouverName || vancouverCode);
};

export const portForWorkingBerth = (
  name?: string,
  code?: string
): SchedulePort | null => {
  if (isRiverAnchorage(name, code) || isVancouverBerthFive(name, code)) return null;

  for (const port of SCHEDULE_PORTS) {
    if (isPortMatch(name, code, port)) return port;
  }

  const n = (name || '').toLowerCase();
  const c = (code || '').toUpperCase().trim();
  if (c === 'KINWU' || n.includes('kinder-morgan') || n.includes('kinder morgan')) {
    return 'Vancouver';
  }
  if (c === 'CHEV' || n.includes('chevron')) return 'Portland';
  if (c === 'SEAPT' || n.includes('seaport')) return 'Longview';
  return null;
};

const parseTime = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const estimateBerthArrival = (movement: VesselTraffic): Date | null => {
  const port = portForWorkingBerth(movement.toLocationName, movement.toLocationShortCode);
  if (!port) return null;

  const ordered = parseTime(movement.orderTime);
  if (!ordered) return null;

  const fromCode = (movement.fromLocationShortCode || '').toUpperCase();
  const fromName = (movement.fromLocationName || '').toUpperCase();
  const fromLightship =
    fromCode === 'LS' ||
    fromCode.includes('LS ') ||
    fromName === 'LS' ||
    fromName.includes('LIGHTSHIP') ||
    fromName.includes('ASTORIA PILOT STATION (LS)');

  if (fromLightship && (port === 'Vancouver' || port === 'Portland')) {
    return new Date(ordered.getTime() + VAN_PDX_TRANSIT_FROM_LS_MS);
  }

  return ordered;
};

const sameBerth = (aCode?: string, aName?: string, bCode?: string, bName?: string) => {
  const ac = (aCode || '').toUpperCase().trim();
  const bc = (bCode || '').toUpperCase().trim();
  if (ac && bc) return ac === bc;
  return (aName || '').trim().toLowerCase() === (bName || '').trim().toLowerCase();
};

const movementInstantKey = (
  movement: VesselTraffic,
  side: 'from' | 'to'
): string | null => {
  const name = side === 'to' ? movement.toLocationName : movement.fromLocationName;
  const code = side === 'to' ? movement.toLocationShortCode : movement.fromLocationShortCode;
  if (!portForWorkingBerth(name, code)) return null;
  const instant = parseTime(movement.orderTime)?.getTime();
  if (instant == null) return null;
  const berth = (code || name || '').toUpperCase().trim();
  return `${berth}|${instant}`;
};

const countBerthInstants = (
  data: VesselTraffic[],
  side: 'from' | 'to'
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const movement of data) {
    if (side === 'to' && !isRiverAnchorage(movement.fromLocationName, movement.fromLocationShortCode)) {
      continue;
    }
    const key = movementInstantKey(movement, side);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
};

export const buildPortStays = (data: VesselTraffic[]): PortStay[] => {
  const byVessel = new Map<string, VesselTraffic[]>();
  const placeholderArrivals = countBerthInstants(data, 'to');
  const placeholderLetGos = countBerthInstants(data, 'from');

  for (const movement of data) {
    const name = (movement.vessel?.name || '').trim();
    if (!name || name === 'N/A') continue;
    const list = byVessel.get(name) || [];
    list.push(movement);
    byVessel.set(name, list);
  }

  const stays: PortStay[] = [];

  for (const [vesselName, jobs] of byVessel) {
    const ordered = [...jobs].sort((a, b) => {
      const at = parseTime(a.orderTime)?.getTime() ?? 0;
      const bt = parseTime(b.orderTime)?.getTime() ?? 0;
      return at - bt;
    });
    const usedLetGo = new Set<number>();

    for (const arrival of ordered) {
      const port = portForWorkingBerth(arrival.toLocationName, arrival.toLocationShortCode);
      if (!port) continue;
      const arrivalKey = movementInstantKey(arrival, 'to');
      if (
        arrivalKey &&
        isRiverAnchorage(arrival.fromLocationName, arrival.fromLocationShortCode) &&
        (placeholderArrivals.get(arrivalKey) || 0) >= PLACEHOLDER_ARRIVAL_COUNT
      ) {
        continue;
      }
      const berthedAt = estimateBerthArrival(arrival);
      if (!berthedAt) continue;

      const berthCode = (arrival.toLocationShortCode || '').trim();
      const berthName = (arrival.toLocationName || berthCode || 'Berth').trim();
      let letGo: VesselTraffic | null = null;

      for (let index = 0; index < ordered.length; index += 1) {
        if (usedLetGo.has(index)) continue;
        const candidate = ordered[index];
        const candidateTime = parseTime(candidate.orderTime);
        if (!candidateTime || candidateTime.getTime() < berthedAt.getTime()) continue;
        const letGoKey = movementInstantKey(candidate, 'from');
        if (letGoKey && (placeholderLetGos.get(letGoKey) || 0) >= PLACEHOLDER_LET_GO_COUNT) continue;
        if (
          sameBerth(
            candidate.fromLocationShortCode,
            candidate.fromLocationName,
            arrival.toLocationShortCode,
            arrival.toLocationName
          ) &&
          !isRiverAnchorage(candidate.fromLocationName, candidate.fromLocationShortCode)
        ) {
          usedLetGo.add(index);
          letGo = candidate;
          break;
        }
      }

      const letGoAt = letGo ? parseTime(letGo.orderTime) : null;
      if (letGoAt && letGoAt.getTime() - berthedAt.getTime() < MIN_BERTH_STAY_MS) continue;

      stays.push({
        id: `${vesselName}|${berthCode}|${berthedAt.toISOString()}`,
        vesselName,
        vesselType: arrival.vessel?.type,
        port,
        berthCode: berthCode || berthName,
        berthName,
        berthedAt: berthedAt.toISOString(),
        letGoAt: letGo ? letGo.orderTime : null,
        letGoDestination: letGo
          ? letGo.toLocationShortCode || letGo.toLocationName
          : undefined,
        arrivalStatus: arrival.status,
      });
    }
  }

  stays.sort((a, b) => {
    const portOrder = SCHEDULE_PORTS.indexOf(a.port) - SCHEDULE_PORTS.indexOf(b.port);
    if (portOrder !== 0) return portOrder;
    return new Date(a.berthedAt).getTime() - new Date(b.berthedAt).getTime();
  });

  return stays;
};

export const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfWeekMonday = (date: Date): Date => {
  const day = startOfLocalDay(date);
  const weekday = day.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + diff);
  return day;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const MAX_RANGE_DAYS = 31;

export const weekEndExclusive = (weekStart: Date): Date => addDays(weekStart, 7);

export const weekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

export const toDateParam = (date: Date): string => {
  const local = startOfLocalDay(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toWeekParam = (weekStart: Date): string => toDateParam(weekStart);

export const parseDateParam = (value?: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return startOfLocalDay(date);
};

export const parseWeekParam = (value?: string | null): Date | null => {
  const date = parseDateParam(value);
  return date ? startOfWeekMonday(date) : null;
};

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const daysBetweenInclusive = (start: Date, end: Date): number => {
  const a = startOfLocalDay(start).getTime();
  const b = startOfLocalDay(end).getTime();
  return Math.floor(Math.abs(b - a) / MS_DAY) + 1;
};

export const normalizeRange = (start: Date, end: Date): { start: Date; end: Date } => {
  let rangeStart = startOfLocalDay(start);
  let rangeEnd = startOfLocalDay(end);
  if (rangeEnd.getTime() < rangeStart.getTime()) {
    const swap = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = swap;
  }
  const maxEnd = addDays(rangeStart, MAX_RANGE_DAYS - 1);
  if (rangeEnd.getTime() > maxEnd.getTime()) rangeEnd = maxEnd;
  return { start: rangeStart, end: rangeEnd };
};

export const rangeDays = (start: Date, end: Date): Date[] => {
  const range = normalizeRange(start, end);
  const days: Date[] = [];
  let cursor = range.start;
  while (cursor.getTime() <= range.end.getTime()) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
};

export const isSevenDayWeek = (start: Date, end: Date): boolean => {
  const range = normalizeRange(start, end);
  return daysBetweenInclusive(range.start, range.end) === 7 && range.start.getDay() === 1;
};

export const rangeEndExclusive = (end: Date): Date => addDays(startOfLocalDay(end), 1);

export const staysOverlappingRange = (stays: PortStay[], start: Date, end: Date): PortStay[] => {
  const range = normalizeRange(start, end);
  const rangeStart = range.start.getTime();
  const rangeEnd = rangeEndExclusive(range.end).getTime();
  return stays.filter((stay) => {
    const berthed = parseTime(stay.berthedAt)?.getTime();
    if (berthed == null) return false;
    const letGo = parseTime(stay.letGoAt)?.getTime() ?? rangeEnd;
    return berthed < rangeEnd && letGo > rangeStart;
  });
};

export const staysOverlappingWeek = (stays: PortStay[], weekStart: Date): PortStay[] =>
  staysOverlappingRange(stays, weekStart, addDays(weekStart, 6));

export const weeksCoveringStays = (stays: PortStay[], fallback = new Date()): Date[] => {
  if (stays.length === 0) return [startOfWeekMonday(fallback)];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const stay of stays) {
    const berthed = parseTime(stay.berthedAt)?.getTime();
    const letGo = parseTime(stay.letGoAt)?.getTime() ?? berthed;
    if (berthed != null) min = Math.min(min, berthed);
    if (letGo != null) max = Math.max(max, letGo);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [startOfWeekMonday(fallback)];

  const weeks: Date[] = [];
  let cursor = startOfWeekMonday(new Date(min));
  const last = startOfWeekMonday(new Date(max));
  while (cursor.getTime() <= last.getTime()) {
    weeks.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }
  return weeks.length > 0 ? weeks : [startOfWeekMonday(fallback)];
};

export const formatWeekdayDateTime = (value?: string | null): string => {
  const date = parseTime(value);
  if (!date) return '—';
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

export const formatWeekLabel = (weekStart: Date): string =>
  formatRangeLabel(weekStart, addDays(weekStart, 6));

export const formatRangeLabel = (start: Date, end: Date): string => {
  const range = normalizeRange(start, end);
  const startLabel = formatDayLabel(range.start);
  const endLabel = range.end.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
};

export const formatWorkingHours = (stay: PortStay): string => {
  const start = parseTime(stay.berthedAt);
  const end = parseTime(stay.letGoAt);
  if (!start || !end) return stay.letGoAt ? '—' : 'In port';
  const hours = Math.max(0, (end.getTime() - start.getTime()) / MS_HOUR);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} d`;
};

export const stayBarPosition = (
  stay: PortStay,
  rangeStart: Date,
  rangeEnd: Date = addDays(rangeStart, 6)
): { left: string; width: string; continuesBefore: boolean; continuesAfter: boolean } => {
  const range = normalizeRange(rangeStart, rangeEnd);
  const start = range.start.getTime();
  const end = rangeEndExclusive(range.end).getTime();
  const rangeMs = Math.max(end - start, MS_HOUR);
  const berthed = parseTime(stay.berthedAt)?.getTime() ?? start;
  const letGo = parseTime(stay.letGoAt)?.getTime() ?? end;
  const clippedStart = Math.min(Math.max(berthed, start), end);
  const clippedEnd = Math.min(Math.max(letGo, start), end);
  const widthMs = Math.max(clippedEnd - clippedStart, MS_HOUR / 2);
  return {
    left: `${((clippedStart - start) / rangeMs) * 100}%`,
    width: `${(widthMs / rangeMs) * 100}%`,
    continuesBefore: berthed < start,
    continuesAfter: !stay.letGoAt || letGo > end,
  };
};
