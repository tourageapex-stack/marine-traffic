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

export const isRiverAnchorage = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = (code || '').toUpperCase().trim();
  if (!n && !c) return true;
  if (ANCHORAGE_NAME.test(n)) return true;
  if (ANCHORAGE_CODES.has(c)) return true;
  return ANCHORAGE_CODE_PREFIXES.some((prefix) => c.startsWith(prefix));
};

export const portForWorkingBerth = (
  name?: string,
  code?: string
): SchedulePort | null => {
  if (isRiverAnchorage(name, code)) return null;

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

export const buildPortStays = (data: VesselTraffic[]): PortStay[] => {
  const byVessel = new Map<string, VesselTraffic[]>();

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

export const weekEndExclusive = (weekStart: Date): Date => addDays(weekStart, 7);

export const weekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

export const toWeekParam = (weekStart: Date): string => {
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseWeekParam = (value?: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return startOfWeekMonday(date);
};

export const staysOverlappingWeek = (stays: PortStay[], weekStart: Date): PortStay[] => {
  const start = startOfLocalDay(weekStart).getTime();
  const end = weekEndExclusive(weekStart).getTime();
  return stays.filter((stay) => {
    const berthed = parseTime(stay.berthedAt)?.getTime();
    if (berthed == null) return false;
    const letGo = parseTime(stay.letGoAt)?.getTime() ?? end;
    return berthed < end && letGo > start;
  });
};

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

export const formatWeekLabel = (weekStart: Date): string => {
  const end = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString([], {
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
  weekStart: Date
): { left: string; width: string; continuesBefore: boolean; continuesAfter: boolean } => {
  const weekMs = 7 * MS_DAY;
  const start = startOfLocalDay(weekStart).getTime();
  const end = start + weekMs;
  const berthed = parseTime(stay.berthedAt)?.getTime() ?? start;
  const letGo = parseTime(stay.letGoAt)?.getTime() ?? end;
  const clippedStart = Math.min(Math.max(berthed, start), end);
  const clippedEnd = Math.min(Math.max(letGo, start), end);
  const widthMs = Math.max(clippedEnd - clippedStart, MS_HOUR / 2);
  return {
    left: `${((clippedStart - start) / weekMs) * 100}%`,
    width: `${(widthMs / weekMs) * 100}%`,
    continuesBefore: berthed < start,
    continuesAfter: !stay.letGoAt || letGo > end,
  };
};
