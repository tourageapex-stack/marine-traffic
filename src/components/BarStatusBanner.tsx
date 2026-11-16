import type { BarStatus } from '../services/barStatus';

interface BarStatusBannerProps {
  status: BarStatus | null;
  loading: boolean;
  error: boolean;
}

export const BarStatusBanner = ({ status, loading, error }: BarStatusBannerProps) => {
  if (loading && !status) {
    return (
      <div className="bar-status-strip bar-status-pending" role="status">
        <div className="bar-status">
          <span className="bar-status-kicker">Columbia Bar</span>
          <span className="bar-status-pending-copy">Checking bar status…</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <a
        className="bar-status-strip bar-status-pending"
        href="https://www.columbiariverbarpilots.com/bar-status/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="bar-status">
          <span className="bar-status-kicker">Columbia Bar</span>
          <span className="bar-status-pending-copy">
            {error ? 'Could not load the Columbia Bar status.' : 'Bar status unavailable'}
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      className={`bar-status-strip bar-status-${status.color}`}
      href={status.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-color={status.color}
    >
      <div className="bar-status">
        <span className={`bar-status-badge bar-status-badge-${status.color}`}>{status.rating}</span>
        <div className="bar-status-copy">
          <div className="bar-status-label">{status.label}</div>
          {status.detail ? <div className="bar-status-detail">{status.detail}</div> : null}
          <div className="bar-status-meta">
            Columbia Bar{status.date ? ` · ${status.date}` : ''}
          </div>
        </div>
      </div>
    </a>
  );
};
