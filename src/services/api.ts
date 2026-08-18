
export interface Vessel {
  name: string;
  type?: string;
  imo?: string;
  mmsi?: string | number | null;
}

export interface VesselTraffic {
  status: string;
  orderTime: string;
  vessel: Vessel;
  fromLocationName: string;
  toLocationName: string;
  fromLocationShortCode: string;
  toLocationShortCode: string;
  statusId?: number;
  [key: string]: any;
}

export type MovementType = 'tie-ups' | 'let-go';

export const isPortMatch = (name?: string, code?: string, port: string = ''): boolean => {
  const n = (name || '').toLowerCase();
  const c = (code || '').toLowerCase();
  const p = port.toLowerCase();

  if (p === 'vancouver') {
    return (
      n.includes('vancouver') ||
      c.includes('van') ||
      c.startsWith('vu') ||
      c.startsWith('vl') ||
      c === 'ugc' ||
      c === 'glacr' ||
      c === 'relvl' ||
      c === 'vnbuoy' ||
      n.includes('united grain') ||
      n.includes('glacier northwest')
    );
  }
  if (p === 'portland') {
    return (
      n.includes('portland') ||
      c.includes('pdx') ||
      ['204', '206', '312', '314', '411', '601', '603', '605', '607', 'dd5', 'dd6', 'col', 'ashgr', 'usg'].includes(c) ||
      n.includes('swan isl') ||
      n.includes('columbia grain') ||
      n.includes('ashgrove') ||
      n.includes('us gypsum')
    );
  }
  if (p === 'longview') {
    return (
      n.includes('longview') ||
      c.includes('lgv') ||
      c.startsWith('la ') ||
      c === 'la 1' ||
      ['egt', 'wlogb', 'tmkal', 'kalex', 'ka ch', 'kal a', 'ra b1', 'rain a', 'ci 1', 'ci 2'].includes(c) ||
      n.includes('kalama') ||
      n.includes('rainier') ||
      n.includes('crims') ||
      n.includes('weyer')
    );
  }
  return n.includes(p) || c.includes(p);
};

const MOCK_DATA: VesselTraffic[] = [
  {
    status: "Confirmed",
    orderTime: new Date().toISOString(),
    vessel: { name: "OCEAN VOYAGER", imo: "9592135" },
    fromLocationName: "ASTORIA PILOT STATION (LS)",
    toLocationName: "PORTLAND BERTH 601",
    fromLocationShortCode: "LS",
    toLocationShortCode: "601",
  },
  {
    status: "Order",
    orderTime: new Date(Date.now() + 3600000).toISOString(),
    vessel: { name: "SEA MARINER" },
    fromLocationName: "VANCOUVER BERTH 10",
    toLocationName: "ASTORIA PILOT STATION (SEA)",
    fromLocationShortCode: "VAN 10",
    toLocationShortCode: "SEA",
  }
];

export const fetchVesselTraffic = async (): Promise<VesselTraffic[]> => {
  try {
    const response = await fetch('/vessel-data-api/pdams/GetCurrentVesselTraffic');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const result = await response.json();
    if (result.result === "Succeed" && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Fetch error, using mock data:', error);
    return MOCK_DATA;
  }
};

export const filterByPorts = (
  data: VesselTraffic[],
  ports: string[],
  movementType: MovementType = 'tie-ups'
): VesselTraffic[] => {
  return data.filter(item => {
    return ports.some(port => {
      if (movementType === 'tie-ups') {
        return isPortMatch(item.toLocationName, item.toLocationShortCode, port);
      } else {
        return isPortMatch(item.fromLocationName, item.fromLocationShortCode, port);
      }
    });
  });
};
