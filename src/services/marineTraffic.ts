export interface MarineTrafficVessel {
  name?: string;
  imo?: string | number | null;
  mmsi?: string | number | null;
}

const ANDROID_PACKAGE = 'com.marinetraffic.android';

const slugifyVesselName = (name: string) =>
  name.trim().replace(/\s+/g, '_').replace(/[^\w.-]/g, '');

const digits = (value: string | number | null | undefined) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw && raw !== '0' ? raw : '';
};

export function getMarineTrafficUrl(vessel?: MarineTrafficVessel | null): string | null {
  if (!vessel) return null;

  const imo = digits(vessel.imo);
  const mmsi = digits(vessel.mmsi);
  const name = (vessel.name || '').trim();
  const slug = name ? slugifyVesselName(name) : '';

  if (imo) {
    return `https://www.marinetraffic.com/en/ais/details/ships/imo:${imo}${slug ? `/vessel:${encodeURIComponent(slug)}` : ''}`;
  }

  if (mmsi) {
    return `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${mmsi}${slug ? `/vessel:${encodeURIComponent(slug)}` : ''}`;
  }

  if (name) {
    return `https://www.marinetraffic.com/en/ais/index/search?keyword=${encodeURIComponent(name)}`;
  }

  return null;
}

/**
 * Android browsers ignore the app links on marinetraffic.com often enough that the
 * plain https URL is unreliable, so hand Chrome an intent it can route to the app
 * with the website as its own fallback. iOS and desktop stay on the https URL:
 * universal links open the app there when it is installed.
 */
export function getMarineTrafficAppUrl(vessel?: MarineTrafficVessel | null): string | null {
  if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent)) return null;

  const url = getMarineTrafficUrl(vessel);
  if (!url) return null;

  const fallback = encodeURIComponent(url);
  return `intent://${url.replace(/^https:\/\//, '')}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}
