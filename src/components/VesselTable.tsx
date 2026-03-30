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
    if (s.includes('dispatched') || s.includes('away')) return 'status-emerald';
    if (s.includes('order') || s.includes('est') || s.includes('priority')) return 'status-amber';
    if (s.includes('confirmed') || s.includes('set')) return 'status-blue';
    return 'status-slate';
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) return <span style={{ color: '#cbd5e1', marginLeft: '0.5rem' }}>↕</span>;
    return <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="vessel-display-container">
      {/* Unified Table View - Responsive via CSS overflow */}
      <div className="table-responsive-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('status')}>Status <SortIndicator column="status" /></th>
              <th onClick={() => requestSort('orderTime')}>Set Time <SortIndicator column="orderTime" /></th>
              <th onClick={() => requestSort('vessel.name')}>Vessel <SortIndicator column="vessel.name" /></th>
              <th>From</th>
              <th>To</th>
              <th className="hide-on-compact">L.From</th>
              <th className="hide-on-compact">L.To</th>
              <th style={{ textAlign: 'center' }}>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((vessel, index) => (
              <tr key={`${vessel.vessel.name}-${index}`}>
                <td>
                  <span className={`status-pill ${getStatusClass(vessel.status)}`}>
                    {vessel.status}
                  </span>
                </td>
                <td style={{ color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatTime(vessel.orderTime)}</td>
                <td className="vessel-name" style={{ whiteSpace: 'nowrap' }}>{vessel.vessel.name}</td>
                <td style={{ color: '#475569', minWidth: '150px' }}>{vessel.fromLocationName}</td>
                <td style={{ color: '#475569', minWidth: '150px' }}>{vessel.toLocationName}</td>
                <td className="hide-on-compact">
                  <span className="port-code">{vessel.fromLocationShortCode}</span>
                </td>
                <td className="hide-on-compact">
                  <span className="port-code">{vessel.toLocationShortCode}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {vessel.status === 'Confirmed' ? <span title="Confirmed">✅</span> : <span style={{ color: '#e2e8f0' }}>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
