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

export function getMarineTrafficUrlFromSearchParams(params: URLSearchParams): string | null {
  return getMarineTrafficUrl({
    imo: params.get('imo'),
    mmsi: params.get('mmsi'),
    name: params.get('name'),
  });
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function getMarineTrafficLinkProps(vessel?: MarineTrafficVessel | null) {
  const href = getMarineTrafficUrl(vessel);
  if (!href || !vessel) return null;

  // iOS Universal Links send every marinetraffic.com URL into the app,
  // but the app does not open the ship from an IMO link. Go through our
  // own page first so Safari can show the correct vessel page.
  if (isIOS()) {
    const query = new URLSearchParams();
    const imo = digits(vessel.imo);
    const mmsi = digits(vessel.mmsi);
    const name = (vessel.name || '').trim();
    if (imo) query.set('imo', imo);
    if (mmsi) query.set('mmsi', mmsi);
    if (name) query.set('name', name);

    return {
      href: `/open-ship.html?${query.toString()}`,
      target: '_self' as const,
      rel: 'noopener noreferrer' as const,
      title: 'Open this ship in MarineTraffic',
    };
  }

  return {
    href,
    target: isMobileDevice() ? '_self' : '_blank',
    rel: 'noopener noreferrer' as const,
    title: 'Open this ship in MarineTraffic',
  };
}
