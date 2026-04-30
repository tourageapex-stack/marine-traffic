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
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    } catch {
      return timeStr;
    }
  };

  const getEstimatedTieUpTime = (vessel: VesselTraffic) => {
    const fromCode = (vessel.fromLocationShortCode || '').toUpperCase();
    const fromName = (vessel.fromLocationName || '').toUpperCase();
    
    // Check if coming from LS
    if (fromCode === 'LS' || fromCode.includes('LS ') || fromName === 'LS') {
      const toName = (vessel.toLocationName || '').toUpperCase();
      const toCode = (vessel.toLocationShortCode || '').toUpperCase();
      
      const isVancouver = toName.includes('VANCOUVER') || toCode.includes('VAN');
      const isPortland = toName.includes('PORTLAND') || toCode.includes('PDX');
      
      if (isVancouver || isPortland) {
        try {
          const date = new Date(vessel.orderTime);
          if (!isNaN(date.getTime())) {
            date.setHours(date.getHours() + 8);
            return formatTime(date.toISOString());
          }
        } catch {
          return null;
        }
      }
    }
    return null;
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
              <th>Est. Tie Up</th>
              <th onClick={() => requestSort('vessel.name')}>Vessel <SortIndicator column="vessel.name" /></th>
              <th>From</th>
              <th>To</th>
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
                <td style={{ color: '#0ea5e9', fontSize: '0.8125rem', fontWeight: 500 }}>{getEstimatedTieUpTime(vessel) || '-'}</td>
                <td className="vessel-name">{vessel.vessel.name}</td>
                <td>
                  <span className="port-code">{vessel.fromLocationShortCode}</span>
                </td>
                <td>
                  <span className="port-code">{vessel.toLocationShortCode}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - "At-a-Glance" Vertical Stacking */}
      <div className="mobile-only mobile-cards">
        {sortedData.map((vessel, index) => (
          <div className="vessel-card" key={`${vessel.vessel.name}-card-${index}`}>
            <div className="card-header">
              <span className={`status-pill ${getStatusClass(vessel.status)}`}>
                {vessel.status}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="card-time">{formatTime(vessel.orderTime)}</span>
                {getEstimatedTieUpTime(vessel) && (
                  <span className="card-time" style={{ color: '#0ea5e9', fontWeight: 500, marginTop: '4px' }}>
                    ETA: {getEstimatedTieUpTime(vessel)}
                  </span>
                )}
              </div>
            </div>
            
            <h3 className="card-vessel-name">{vessel.vessel.name}</h3>
            
            <div className="card-route-stack">
              <div className="route-step">
                <div className="route-indicator from"></div>
                <div className="route-details">
                  <span className="route-label">FROM</span>
                  <span className="port-code">{vessel.fromLocationShortCode}</span>
                </div>
              </div>
              
              <div className="route-line"></div>
              
              <div className="route-step">
                <div className="route-indicator to"></div>
                <div className="route-details">
                  <span className="route-label">TO</span>
                  <span className="port-code">{vessel.toLocationShortCode}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
