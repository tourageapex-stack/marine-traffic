import { useEffect, useState, useMemo } from 'react';
import { fetchVesselTraffic, isPortMatch } from './services/api';
import type { VesselTraffic, MovementType } from './services/api';
import { VesselTable } from './components/VesselTable';
import { FeedbackPage } from './components/FeedbackPage';
import { AnnouncementTile, ANNOUNCEMENTS } from './components/AnnouncementTile';
import './App.css';

type Page = 'dashboard' | 'feedback';

const getPageFromHash = (): Page => {
  return window.location.hash.replace(/^#\/?/, '') === 'feedback' ? 'feedback' : 'dashboard';
};

function App() {
  const [data, setData] = useState<VesselTraffic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('tie-ups');
  
  const PORTS = ['Vancouver', 'Portland', 'Longview'] as const;
  const [activePort, setActivePort] = useState<string>(PORTS[0]);
  const [page, setPage] = useState<Page>(getPageFromHash);
  
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

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goTo = (next: Page) => {
    window.location.hash = next === 'feedback' ? 'feedback' : '';
    setPage(next);
  };

  // Compute total counts for badges
  const totalTieUps = useMemo(() => {
    return PORTS.reduce((sum, port) => {
      return sum + data.filter(v => isPortMatch(v.toLocationName, v.toLocationShortCode, port)).length;
    }, 0);
  }, [data]);

  const totalLetGos = useMemo(() => {
    return PORTS.reduce((sum, port) => {
      return sum + data.filter(v => isPortMatch(v.fromLocationName, v.fromLocationShortCode, port)).length;
    }, 0);
  }, [data]);

  const portGroups = useMemo(() => {
    return PORTS.reduce((acc, port) => {
      acc[port] = data.filter(item => {
        if (movementType === 'tie-ups') {
          return isPortMatch(item.toLocationName, item.toLocationShortCode, port);
        } else {
          return isPortMatch(item.fromLocationName, item.fromLocationShortCode, port);
        }
      });
      return acc;
    }, {} as Record<string, VesselTraffic[]>);
  }, [data, movementType]);

  // Search filtering logic
  const searchFilteredVessels = useMemo(() => {
    const activeVessels = portGroups[activePort] || [];
    if (!searchTerm.trim()) return activeVessels;
    
    const term = searchTerm.toLowerCase();
    return activeVessels.filter(v => 
      (v.vessel?.name || '').toLowerCase().includes(term) ||
      (v.fromLocationName || '').toLowerCase().includes(term) ||
      (v.fromLocationShortCode || '').toLowerCase().includes(term) ||
      (v.toLocationName || '').toLowerCase().includes(term) ||
      (v.toLocationShortCode || '').toLowerCase().includes(term) ||
      (v.status || '').toLowerCase().includes(term)
    );
  }, [portGroups, activePort, searchTerm]);

  if (page !== 'feedback' && loading && data.length === 0) {
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
          <div
            className="header-title-group"
            onClick={() => goTo('dashboard')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goTo('dashboard');
              }
            }}
            role="button"
            tabIndex={0}
          >
            <h1>
              <span style={{ fontSize: '1.5rem' }}>⚓</span>
              Marine Traffic
            </h1>
            <div className="header-subtitle">Vancouver, Portland & Longview Ports</div>
          </div>
          
          <div className="refresh-section">
            {page === 'feedback' ? (
              <button className="refresh-button" onClick={() => goTo('dashboard')}>
                ← Dashboard
              </button>
            ) : (
              <>
                <div className="timestamp">Updated {lastUpdated.toLocaleTimeString()}</div>
                <button className="refresh-button" onClick={() => loadData()}>
                  <span>🔄</span> Refresh
                </button>
                <button className="feedback-button" onClick={() => goTo('feedback')}>
                  Give Feedback
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      
      {page !== 'feedback' && error && <div className="error-message" style={{ margin: '1rem 2rem' }}>⚠️ {error}</div>}

      <main className="main-content">
        {page === 'feedback' ? (
          <FeedbackPage onBack={() => goTo('dashboard')} />
        ) : (
          <>
        <div className="announcement-row">
          {ANNOUNCEMENTS.map(announcement => (
            <AnnouncementTile key={announcement.id} announcement={announcement} />
          ))}
        </div>

        {/* Movement Type Toggle Banner */}
        <div className="movement-toggle-container">
          <button 
            className={`movement-toggle-btn ${movementType === 'tie-ups' ? 'active' : ''}`}
            onClick={() => setMovementType('tie-ups')}
          >
            <span className="toggle-btn-icon">⚓</span>
            <span className="toggle-btn-label">Tie Ups</span>
            <span className="toggle-btn-sub">Arrivals</span>
            <span className="toggle-badge">{totalTieUps}</span>
          </button>
          <button 
            className={`movement-toggle-btn ${movementType === 'let-go' ? 'active' : ''}`}
            onClick={() => setMovementType('let-go')}
          >
            <span className="toggle-btn-icon">🚢</span>
            <span className="toggle-btn-label">Let Go</span>
            <span className="toggle-btn-sub">Departures</span>
            <span className="toggle-badge">{totalLetGos}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-icon stats-van">
              <img src="/img/port-round-logo-2.webp" alt="Vancouver Port" className="port-img" />
            </div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Vancouver']?.length || 0}</div>
              <div className="stats-label">
                Vancouver <span className="stats-mode-tag">{movementType === 'tie-ups' ? 'Tie Ups' : 'Let Go'}</span>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon stats-pdx">
              <img src="/img/port-of-portland.PNG" alt="Portland Port" className="port-img" />
            </div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Portland']?.length || 0}</div>
              <div className="stats-label">
                Portland <span className="stats-mode-tag">{movementType === 'tie-ups' ? 'Tie Ups' : 'Let Go'}</span>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon stats-cob">
              <img src="/img/port-of-longview.png" alt="Longview Port" className="port-img" />
            </div>
            <div className="stats-info">
              <div className="stats-count">{portGroups['Longview']?.length || 0}</div>
              <div className="stats-label">
                Longview <span className="stats-mode-tag">{movementType === 'tie-ups' ? 'Tie Ups' : 'Let Go'}</span>
              </div>
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
                placeholder={`Search ${movementType === 'tie-ups' ? 'tie ups' : 'let gos'} by vessel, berth, or status...`}
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            {searchFilteredVessels.length > 0 ? (
              <VesselTable data={searchFilteredVessels} movementType={movementType} />
            ) : (
              <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚢</div>
                <div>No {movementType === 'tie-ups' ? 'tie ups' : 'let gos'} match your search "{searchTerm}" in {activePort}.</div>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>© 2026 Marine Traffic Monitor | Data via ColRip Portal</p>
        {page !== 'feedback' && (
          <button className="footer-feedback-link" onClick={() => goTo('feedback')}>
            Give Feedback
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;

