import { useEffect, useState, useMemo } from 'react';
import { fetchVesselTraffic, filterByPorts } from './services/api';
import type { VesselTraffic } from './services/api';
import { VesselTable } from './components/VesselTable';
import './App.css';

function App() {
  const [data, setData] = useState<VesselTraffic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  
  const PORTS = ['Vancouver', 'Portland', 'Longview'];
  const [activePort, setActivePort] = useState(PORTS[0]);
  
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const loadData = async () => {
    try {
      const result = await fetchVesselTraffic();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Data loading error:', err);
      setError('Failed to fetch live vessel traffic data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => filterByPorts(data, PORTS), [data]);

  const portGroups = useMemo(() => {
    return PORTS.reduce((acc, port) => {
      acc[port] = filteredData.filter(item => {
        const to = item.toLocationName?.toLowerCase() || '';
        const toShort = item.toLocationShortCode?.toLowerCase() || '';
        const searchPort = port.toLowerCase();
        return to.includes(searchPort) || toShort.includes(searchPort);
      });
      return acc;
    }, {} as Record<string, VesselTraffic[]>);
  }, [filteredData]);

  // Search filtering logic
  const searchFilteredVessels = useMemo(() => {
    const activeVessels = portGroups[activePort] || [];
    if (!searchTerm.trim()) return activeVessels;
    
    const term = searchTerm.toLowerCase();
    return activeVessels.filter(v => 
      v.vessel.name.toLowerCase().includes(term) ||
      v.fromLocationName.toLowerCase().includes(term) ||
      v.toLocationName.toLowerCase().includes(term) ||
      v.status.toLowerCase().includes(term)
    );
  }, [portGroups, activePort, searchTerm]);

  if (loading && data.length === 0) {
    return (
      <div className="loading-container" style={{ background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader" style={{ border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 500 }}>Connecting to Marine Traffic System...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      <header>
        <div className="header-content">
          <div className="header-title-group">
            <h1>
              <span style={{ fontSize: '1.5rem' }}>⚓</span>
              Marine Traffic
            </h1>
            <div className="header-subtitle">Vancouver, Portland & Longview Ports</div>
          </div>
          
          <div className="refresh-section">
            <div className="timestamp">Updated {lastUpdated.toLocaleTimeString()}</div>
            <button className="refresh-button" onClick={() => loadData()}>
               <span>🔄</span> Refresh
            </button>
          </div>
        </div>
      </header>
      
      {error && <div className="error-message" style={{ margin: '1rem 2rem' }}>⚠️ {error}</div>}

      <main className="main-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-icon stats-van">🚢</div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Vancouver']?.length || 0}</div>
              <div className="stats-label">Vancouver</div>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon stats-pdx">⚓</div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Portland']?.length || 0}</div>
              <div className="stats-label">Portland</div>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon stats-cob">📍</div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Longview']?.length || 0}</div>
              <div className="stats-label">Longview</div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Card */}
        <div className="dashboard-card">
          <nav className="card-tabs">
            {PORTS.map(port => (
              <button 
                key={port} 
                className={`tab-pill ${activePort === port ? 'active' : ''}`}
                onClick={() => setActivePort(port)}
                data-short={port.substring(0, 3).toUpperCase()}
              >
                 <span>{port}</span> ({portGroups[port]?.length || 0})
              </button>
            ))}
          </nav>

          <div className="search-container">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search vessels by name, port, or status..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            {searchFilteredVessels.length > 0 ? (
              <VesselTable data={searchFilteredVessels} />
            ) : (
              <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚢</div>
                <div>No vessels match your search "{searchTerm}" in {activePort}.</div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
        <p>© 2026 Marine Traffic Monitor | Data via ColRip Portal</p>
      </footer>
    </div>
  );
}

export default App;
