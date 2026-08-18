import React, { useState } from 'react';
import type { VesselTraffic, MovementType } from '../services/api';

interface VesselTableProps {
  data: VesselTraffic[];
  movementType?: MovementType;
}

type SortKey = keyof VesselTraffic | 'vessel.name';

export const VesselTable: React.FC<VesselTableProps> = ({ data, movementType = 'tie-ups' }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const isTieUps = movementType === 'tie-ups';

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof VesselTraffic];
        let bValue: any = b[sortConfig.key as keyof VesselTraffic];

        if (sortConfig.key === 'vessel.name') {
          aValue = a.vessel?.name || '';
          bValue = b.vessel?.name || '';
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
    const s = (status || '').toLowerCase();
    if (s.includes('dispatched') || s.includes('away')) return 'status-emerald';
    if (s.includes('order') || s.includes('est') || s.includes('priority')) return 'status-amber';
    if (s.includes('confirmed') || s.includes('set')) return 'status-blue';
    return 'status-slate';
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
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
    if (fromCode === 'LS' || fromCode.includes('LS ') || fromName === 'LS' || fromName.includes('LIGHTSHIP') || fromName.includes('ASTORIA PILOT STATION (LS)')) {
      const toName = (vessel.toLocationName || '').toUpperCase();
      const toCode = (vessel.toLocationShortCode || '').toUpperCase();
      
      const isVancouver = toName.includes('VANCOUVER') || toCode.includes('VAN') || toCode.startsWith('VU') || toCode.startsWith('VL') || toCode === 'UGC';
      const isPortland = toName.includes('PORTLAND') || toCode.includes('PDX') || ['204','206','312','314','411','601','603','605','607','DD5','DD6','COL','ASHGR','USG'].includes(toCode);
      
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
              <th onClick={() => requestSort('orderTime')}>
                {isTieUps ? 'Set Time' : 'Let Go Time'} <SortIndicator column="orderTime" />
              </th>
              {isTieUps && <th>Est. Tie Up</th>}
              <th onClick={() => requestSort('vessel.name')}>Vessel <SortIndicator column="vessel.name" /></th>
              <th onClick={() => requestSort('fromLocationShortCode')}>From <SortIndicator column="fromLocationShortCode" /></th>
              <th onClick={() => requestSort('toLocationShortCode')}>To <SortIndicator column="toLocationShortCode" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((vessel, index) => (
              <tr key={`${vessel.vessel?.name || 'vessel'}-${index}`}>
                <td>
                  <span className={`status-pill ${getStatusClass(vessel.status)}`}>
                    {vessel.status}
                  </span>
                </td>
                <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{formatTime(vessel.orderTime)}</td>
                {isTieUps && (
                  <td style={{ color: '#0ea5e9', fontSize: '0.8125rem', fontWeight: 500 }}>
                    {getEstimatedTieUpTime(vessel) || '-'}
                  </td>
                )}
                <td className="vessel-name">{vessel.vessel?.name || 'N/A'}</td>
                <td>
                  <span className="port-code" title={vessel.fromLocationName}>{vessel.fromLocationShortCode || vessel.fromLocationName}</span>
                </td>
                <td>
                  <span className="port-code" title={vessel.toLocationName}>{vessel.toLocationShortCode || vessel.toLocationName}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only mobile-cards">
        {sortedData.map((vessel, index) => (
          <div className="vessel-card" key={`${vessel.vessel?.name || 'vessel'}-card-${index}`}>
            <div className="card-header">
              <span className={`status-pill ${getStatusClass(vessel.status)}`}>
                {vessel.status}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="card-time">
                  {isTieUps ? '' : 'Let Go: '}
                  {formatTime(vessel.orderTime)}
                </span>
                {isTieUps && getEstimatedTieUpTime(vessel) && (
                  <span className="card-time" style={{ color: '#0ea5e9', fontWeight: 500, marginTop: '4px' }}>
                    ETA: {getEstimatedTieUpTime(vessel)}
                  </span>
                )}
              </div>
            </div>
            
            <h3 className="card-vessel-name">{vessel.vessel?.name || 'N/A'}</h3>
            
            <div className="card-route-stack">
              <div className="route-step">
                <div className="route-indicator from"></div>
                <div className="route-details">
                  <span className="route-label">FROM</span>
                  <span className="port-code" title={vessel.fromLocationName}>{vessel.fromLocationShortCode || vessel.fromLocationName}</span>
                </div>
              </div>
              
              <div className="route-line"></div>
              
              <div className="route-step">
                <div className="route-indicator to"></div>
                <div className="route-details">
                  <span className="route-label">TO</span>
                  <span className="port-code" title={vessel.toLocationName}>{vessel.toLocationShortCode || vessel.toLocationName}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

