export interface Announcement {
  id: string;
  title: string;
  date: string;
  href: string;
  cta: string;
  logo: string;
  logoAlt: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'local-4-golf',
    title: 'Local 4 Golf Tournament',
    date: 'September 3',
    href: 'https://localfore.vercel.app',
    cta: 'Register',
    logo: '/img/ilwu-golf-logo.png',
    logoAlt: 'ILWU Local 4 golf tournament logo',
  },
];

export function AnnouncementTile({ announcement }: { announcement: Announcement }) {
  return (
    <a
      className="announcement-tile"
      href={announcement.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        className="announcement-logo"
        src={announcement.logo}
        alt={announcement.logoAlt}
      />
      <div className="announcement-info">
        <div className="announcement-kicker">Upcoming event</div>
        <div className="announcement-title">{announcement.title}</div>
        <div className="announcement-date">{announcement.date}</div>
      </div>
      <span className="announcement-cta">{announcement.cta}</span>
    </a>
  );
}
