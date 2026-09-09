import type { Announcement } from '../services/siteSettings';

interface AnnouncementTileProps {
  announcement: Announcement;
}

export function AnnouncementTile({ announcement }: AnnouncementTileProps) {
  const content = (
    <>
      {announcement.logo ? (
        <img
          className="announcement-logo"
          src={announcement.logo}
          alt={announcement.logoAlt || announcement.title}
        />
      ) : (
        <div className="announcement-logo announcement-logo-fallback" aria-hidden="true">
          📣
        </div>
      )}
      <div className="announcement-info">
        <div className="announcement-kicker">{announcement.kicker || 'Announcement'}</div>
        <div className="announcement-title">{announcement.title}</div>
        {announcement.date && <div className="announcement-date">{announcement.date}</div>}
      </div>
      {announcement.cta && <span className="announcement-cta">{announcement.cta}</span>}
    </>
  );

  if (announcement.href) {
    return (
      <a
        className="announcement-tile"
        href={announcement.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return <div className="announcement-tile announcement-tile-static">{content}</div>;
}
