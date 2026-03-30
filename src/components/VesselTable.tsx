import React, { useState } from 'react';
import type { VesselTraffic } from '../services/api';

interface VesselTableProps {
  data: VesselTraffic[];
}

type SortKey = keyof VesselTraffic | 'vessel.name';

export const VesselTable: React.FC<VesselTableProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof VesselTraffic];
        let bValue: any = b[sortConfig.key as keyof VesselTraffic];

        if (sortConfig.key === 'vessel.name') {
          aValue = a.vessel.name;
          bValue = b.vessel.name;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('dispatched')) return 'status-dispatched';
    if (s.includes('order')) return 'status-order';
    if (s.includes('priority')) return 'status-priority';
    if (s.includes('confirmed')) return 'status-confirmed';
    return '';
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="vessel-display-container">
      {/* Desktop Table View */}
      <div className="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Status</th>
              <th onClick={() => requestSort('orderTime')} style={{ cursor: 'pointer' }}>Set Time</th>
              <th onClick={() => requestSort('vessel.name')} style={{ cursor: 'pointer' }}>Vessel</th>
              <th>From</th>
              <th>To</th>
              <th>L.From</th>
              <th>L.To</th>
              <th>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((vessel, index) => (
              <tr key={`${vessel.vessel.name}-${index}`}>
                <td>
                  <span className={`status-badge ${getStatusClass(vessel.status)}`}>
                    {vessel.status}
                  </span>
                </td>
                <td>{formatTime(vessel.orderTime)}</td>
                <td style={{ fontWeight: 600 }}>{vessel.vessel.name}</td>
                <td>{vessel.fromLocationName}</td>
                <td>{vessel.toLocationName}</td>
                <td>
                  <span className="port-badge">{vessel.fromLocationShortCode}</span>
                </td>
                <td>
                  <span className="port-badge">{vessel.toLocationShortCode}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {vessel.status === 'Confirmed' ? '✅' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only mobile-cards">
        {sortedData.map((vessel, index) => (
          <div className="vessel-card" key={`${vessel.vessel.name}-card-${index}`}>
            <div className="card-header">
              <span className={`status-badge ${getStatusClass(vessel.status)}`}>
                {vessel.status}
              </span>
              <span className="card-time">{formatTime(vessel.orderTime)}</span>
            </div>
            <h3 className="card-vessel-name">{vessel.vessel.name}</h3>
            <div className="card-route">
              <div className="route-stop">
                <span className="route-label">FROM</span>
                <span className="route-name">{vessel.fromLocationName}</span>
                <span className="port-badge">{vessel.fromLocationShortCode}</span>
              </div>
              <div className="route-arrow">↓</div>
              <div className="route-stop">
                <span className="route-label">TO</span>
                <span className="route-name">{vessel.toLocationName}</span>
                <span className="port-badge">{vessel.toLocationShortCode}</span>
              </div>
            </div>
            <div className="card-footer">
               {vessel.status === 'Confirmed' && <span className="conf-indicator">✅ Confirmed</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
