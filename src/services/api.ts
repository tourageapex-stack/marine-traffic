
export interface Vessel {
  name: string;
  type?: string;
  imo?: string;
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
}

const MOCK_DATA: VesselTraffic[] = [
  {
    status: "Confirmed",
    orderTime: new Date().toISOString(),
    vessel: { name: "OCEAN VOYAGER" },
    fromLocationName: "VANCOUVER BERTH 10",
    toLocationName: "PORTLAND ANCHORAGE",
    fromLocationShortCode: "VAN B10",
    toLocationShortCode: "PDX ANC",
  },
  {
    status: "Order",
    orderTime: new Date(Date.now() + 3600000).toISOString(),
    vessel: { name: "SEA MARINER" },
    fromLocationName: "LONGVIEW DEEP ANCHOR",
    toLocationName: "VANCOUVER BUOY 4",
    fromLocationShortCode: "LV DANC",
    toLocationShortCode: "VU B4",
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

export const filterByPorts = (data: VesselTraffic[], ports: string[]): VesselTraffic[] => {
  return data.filter(item => {
    const to = (item.toLocationName || '').toLowerCase();
    const toShort = (item.toLocationShortCode || '').toLowerCase();
    return ports.some(port => to.includes(port.toLowerCase()) || toShort.includes(port.toLowerCase()));
  });
};
