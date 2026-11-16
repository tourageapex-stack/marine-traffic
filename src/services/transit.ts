import { isPortMatch, type VesselTraffic } from './api';

/** Astoria, the bar (LS), and LU are about six hours from Portland and Vancouver. */
export const ASTORIA_TRANSIT_HOURS = 6;
/** Longview is about two hours from Portland and Vancouver. */
export const LONGVIEW_TRANSIT_HOURS = 2;

const compactCode = (code?: string) => (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isAstoriaOrigin = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = compactCode(code);
  if (c === 'LS' || c === 'AST' || c === 'ASTAN' || c.startsWith('AST')) return true;
  return n.includes('ASTORIA') || n.includes('LIGHTSHIP');
};

/** LU is a downriver origin with the same run to Portland and Vancouver as Astoria. */
export const isLuOrigin = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = compactCode(code);
  if (c === 'LU') return true;
  return /\bLU\b/.test(n);
};

export const isLongviewOrigin = (name?: string, code?: string): boolean => {
  const n = (name || '').toUpperCase();
  const c = compactCode(code);
  if (n.includes('LONGVIEW')) return true;
  if (c.startsWith('LGV') || /^LA\d/.test(c)) return true;
  if (c === 'EGT' || n.includes('EGT TERMINAL')) return true;
  if (c.startsWith('WLOG') || n.includes('WEYER')) return true;
  if (n.includes('MILLENNIUM')) return true;
  return false;
};

export const isPortlandOrVancouver = (name?: string, code?: string): boolean =>
  isPortMatch(name, code, 'Portland') || isPortMatch(name, code, 'Vancouver');

export type TieUpEstimate = {
  at: Date;
  hours: number;
  note: string;
};

export const estimateTieUp = (vessel: VesselTraffic): TieUpEstimate | null => {
  if (!isPortlandOrVancouver(vessel.toLocationName, vessel.toLocationShortCode)) return null;

  const ordered = new Date(vessel.orderTime);
  if (Number.isNaN(ordered.getTime())) return null;

  const fromName = vessel.fromLocationName;
  const fromCode = vessel.fromLocationShortCode;
  let hours = 0;
  let note = '';

  if (isAstoriaOrigin(fromName, fromCode)) {
    hours = ASTORIA_TRANSIT_HOURS;
    note = 'About 6 hours from Astoria';
  } else if (isLuOrigin(fromName, fromCode)) {
    hours = ASTORIA_TRANSIT_HOURS;
    note = 'About 6 hours from LU';
  } else if (isLongviewOrigin(fromName, fromCode)) {
    hours = LONGVIEW_TRANSIT_HOURS;
    note = 'About 2 hours from Longview';
  } else {
    return null;
  }

  return {
    at: new Date(ordered.getTime() + hours * 60 * 60 * 1000),
    hours,
    note,
  };
};
