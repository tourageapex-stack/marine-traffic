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

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function getMarineTrafficLinkProps(vessel?: MarineTrafficVessel | null) {
  const href = getMarineTrafficUrl(vessel);
  if (!href) return null;

  return {
    href,
    // Stay in the same tab on phones so the MarineTraffic app can intercept the link.
    target: isMobileDevice() ? '_self' : '_blank',
    rel: 'noopener noreferrer' as const,
    title: 'Open this ship in MarineTraffic',
  };
}
