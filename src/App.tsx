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
        const from = item.fromLocationName?.toLowerCase() || '';
        const to = item.toLocationName?.toLowerCase() || '';
        return from.includes(port.toLowerCase()) || to.includes(port.toLowerCase());
      });
      return acc;
    }, {} as Record<string, VesselTraffic[]>);
  }, [filteredData]);

  if (loading && data.length === 0) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Connecting to Marine Traffic System...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      <header>
        <div className="header-content">
          <h1>Marine Traffic</h1>
          <div className="meta-info">
            <div className="live-indicator">
              <span className="dot"></span> LIVE
            </div>
            <span className="timestamp">Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>
      
      {error && <div className="error-message">⚠️ {error}</div>}

      <main>
        <nav className="tab-nav">
          {PORTS.map(port => (
            <button 
              key={port} 
              className={`tab-button ${activePort === port ? 'active' : ''}`}
              onClick={() => setActivePort(port)}
            >
              {port}
              <span className="count-badge">
                {portGroups[port]?.length || 0}
              </span>
            </button>
          ))}
        </nav>

        <section className="port-section active">
          <div className="section-header">
            <h2>{activePort} Traffic</h2>
            <div className="vessel-count">
              {portGroups[activePort]?.length || 0} Vessels Detected
            </div>
          </div>
          
          {portGroups[activePort] && portGroups[activePort].length > 0 ? (
            <VesselTable data={portGroups[activePort]} />
          ) : (
            <div className="empty-state">No current activity reported for {activePort}.</div>
          )}
        </section>
      </main>

      <footer>
        <p>© 2026 Marine Traffic Monitor | Data via ColRip Portal</p>
      </footer>
    </div>
  );
}

export default App;
