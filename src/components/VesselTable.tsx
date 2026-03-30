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
      {/* Desktop Table View */}
      <div className="desktop-only">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('status')}>Status <SortIndicator column="status" /></th>
              <th onClick={() => requestSort('orderTime')}>Set Time <SortIndicator column="orderTime" /></th>
              <th onClick={() => requestSort('vessel.name')}>Vessel <SortIndicator column="vessel.name" /></th>
              <th>From</th>
              <th>To</th>
              <th>L.From</th>
              <th>L.To</th>
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
                <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{formatTime(vessel.orderTime)}</td>
                <td className="vessel-name">{vessel.vessel.name}</td>
                <td style={{ color: '#475569' }}>{vessel.fromLocationName}</td>
                <td style={{ color: '#475569' }}>{vessel.toLocationName}</td>
                <td>
                  <span className="port-code">{vessel.fromLocationShortCode}</span>
                </td>
                <td>
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

      {/* Mobile Card View */}
      <div className="mobile-only mobile-cards" style={{ padding: '1rem' }}>
        {sortedData.map((vessel, index) => (
          <div className="vessel-card" key={`${vessel.vessel.name}-card-${index}`} style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <span className={`status-pill ${getStatusClass(vessel.status)}`}>
                {vessel.status}
              </span>
              <span className="card-time" style={{ color: '#64748b' }}>{formatTime(vessel.orderTime)}</span>
            </div>
            <h3 className="card-vessel-name" style={{ color: '#0f172a', fontWeight: 800 }}>{vessel.vessel.name}</h3>
            
            <div className="card-route" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div className="route-stop" style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 900, color: '#94a3b8', width: '40px' }}>FROM</span>
                <span className="route-name" style={{ color: '#334155', fontWeight: 500 }}>{vessel.fromLocationName}</span>
                <span className="port-code" style={{ marginLeft: 'auto' }}>{vessel.fromLocationShortCode}</span>
              </div>
              <div style={{ paddingLeft: '48px', color: '#cbd5e1', fontSize: '0.75rem', marginBottom: '0.75rem' }}>↓</div>
              <div className="route-stop">
                <span style={{ fontSize: '0.625rem', fontWeight: 900, color: '#94a3b8', width: '40px' }}>TO</span>
                <span className="route-name" style={{ color: '#334155', fontWeight: 500 }}>{vessel.toLocationName}</span>
                <span className="port-code" style={{ marginLeft: 'auto' }}>{vessel.toLocationShortCode}</span>
              </div>
            </div>
            
            {vessel.status === 'Confirmed' && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✅ Confirmed Entry</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
