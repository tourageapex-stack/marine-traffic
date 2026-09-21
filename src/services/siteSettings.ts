export type SiteTheme =
  | 'default'
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter'
  | 'halloween'
  | 'thanksgiving'
  | 'christmas'
  | 'newyear'
  | 'july4'
  | 'valentines'
  | 'stpatricks';

export interface Announcement {
  id: string;
  title: string;
  date: string;
  href: string;
  cta: string;
  kicker: string;
  logo: string;
  logoAlt: string;
  accent: string;
  published: boolean;
}

export interface PopupAnnouncement {
  enabled: boolean;
  title: string;
  body: string;
  cta: string;
  href: string;
}

export interface SiteSettings {
  theme: SiteTheme;
  banner: string;
  subtitle: string;
  announcements: Announcement[];
  popup: PopupAnnouncement;
  persistence?: 'blob' | 'file' | 'ephemeral';
}

export const THEMES: {
  id: SiteTheme;
  label: string;
  description: string;
  mark: string;
  group: 'season' | 'holiday';
}[] = [
  { id: 'default', label: 'Default', description: 'Navy header, clean slate dashboard', mark: '⚓', group: 'season' },
  { id: 'spring', label: 'Spring', description: 'Fresh greens for the river season', mark: '🌸', group: 'season' },
  { id: 'summer', label: 'Summer', description: 'Bright water blues and sun', mark: '☀️', group: 'season' },
  { id: 'fall', label: 'Fall', description: 'Amber harvest tones', mark: '🍂', group: 'season' },
  { id: 'winter', label: 'Winter', description: 'Icy blues and frost', mark: '❄️', group: 'season' },
  { id: 'halloween', label: 'Halloween', description: 'Pumpkin orange and midnight', mark: '🎃', group: 'holiday' },
  { id: 'thanksgiving', label: 'Thanksgiving', description: 'Warm harvest golds', mark: '🦃', group: 'holiday' },
  { id: 'christmas', label: 'Christmas', description: 'Evergreen and gold', mark: '🎄', group: 'holiday' },
  { id: 'newyear', label: 'New Year', description: 'Midnight sparkle and champagne', mark: '🥂', group: 'holiday' },
  { id: 'july4', label: 'Independence Day', description: 'Red, white, and river blue', mark: '🎆', group: 'holiday' },
  { id: 'valentines', label: "Valentine's Day", description: 'Soft rose and heart tones', mark: '💘', group: 'holiday' },
  { id: 'stpatricks', label: "St. Patrick's Day", description: 'Lucky greens on the water', mark: '☘️', group: 'holiday' },
];

export const DEFAULT_POPUP: PopupAnnouncement = {
  enabled: false,
  title: '',
  body: '',
  cta: '',
  href: '',
};

export const DEFAULT_SETTINGS: SiteSettings = {
  theme: 'default',
  banner: '',
  subtitle: '',
  announcements: [],
  popup: { ...DEFAULT_POPUP },
};

export function emptyAnnouncement(): Announcement {
  return {
    id: `ann-${Date.now()}`,
    title: '',
    date: '',
    href: '',
    cta: 'Details',
    kicker: 'Upcoming event',
    logo: '',
    logoAlt: '',
    accent: '',
    published: true,
  };
}

export function popupFingerprint(popup: PopupAnnouncement): string {
  return [popup.title, popup.body, popup.cta, popup.href].join('|');
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const response = await fetch('/api/site-settings', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load site settings.');
  return response.json();
}

export async function saveSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const response = await fetch('/api/site-settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (response.status === 401) {
    throw new Error('Your admin session expired. Sign in again.');
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Failed to save settings.');
  }

  return response.json();
}

export async function fetchAdminSession(): Promise<boolean> {
  const response = await fetch('/api/admin-session', { credentials: 'include' });
  if (!response.ok) return false;
  const result = await response.json();
  return Boolean(result.authenticated);
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Invalid username or password.');
  }
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' });
}

export interface GeneratedAnnouncementArt {
  imageUrl: string;
  accent: string;
  background: string;
  prompt: string;
  model: string;
}

export async function generateAnnouncementArt(input: {
  title: string;
  date?: string;
  kicker?: string;
}): Promise<GeneratedAnnouncementArt> {
  const response = await fetch('/api/generate-announcement-art', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.status === 401) {
    throw new Error('Your admin session expired. Sign in again.');
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Could not generate announcement art.');
  }

  return result as GeneratedAnnouncementArt;
}
