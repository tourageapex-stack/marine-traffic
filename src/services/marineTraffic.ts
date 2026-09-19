export interface MarineTrafficVessel {
  name?: string;
  imo?: string | number | null;
  mmsi?: string | number | null;
}

const slugifyVesselName = (name: string) =>
  name.trim().replace(/\s+/g, '_').replace(/[^\w.-]/g, '');

const digits = (value: string | number | null | undefined) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw && raw !== '0' ? raw : '';
};

const isMobileOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS Safari reports a macOS user agent, so touch support is the only tell.
  const isIpadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod/i.test(ua) || isIpadOS;
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
 * On a phone, tapping a marinetraffic.com link opens the MarineTraffic app
 * (its apple-app-site-association and assetlinks.json claim every path on the
 * domain). The app only resolves links carrying MarineTraffic's internal
 * shipid, which the pilot feed does not give us, so an IMO link drops the user
 * on the app home screen with no vessel. Sending the tap through our own
 * redirect keeps it in the browser, which does follow IMO to the right vessel.
 */
export function getMarineTrafficHref(vessel?: MarineTrafficVessel | null): string | null {
  const url = getMarineTrafficUrl(vessel);
  if (!url) return null;
  return isMobileOS() ? `/api/marinetraffic?url=${encodeURIComponent(url)}` : url;
}
