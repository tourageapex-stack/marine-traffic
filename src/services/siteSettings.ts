export type SiteTheme = 'default' | 'spring' | 'summer' | 'fall' | 'winter' | 'holiday';

export interface Announcement {
  id: string;
  title: string;
  date: string;
  href: string;
  cta: string;
  kicker: string;
  logo: string;
  logoAlt: string;
  published: boolean;
}

export interface SiteSettings {
  theme: SiteTheme;
  banner: string;
  subtitle: string;
  announcements: Announcement[];
  persistence?: 'blob' | 'file' | 'ephemeral';
}

export const THEMES: { id: SiteTheme; label: string; description: string; mark: string }[] = [
  { id: 'default', label: 'Default', description: 'Navy header, clean slate dashboard', mark: '⚓' },
  { id: 'spring', label: 'Spring', description: 'Fresh greens for the river season', mark: '🌸' },
  { id: 'summer', label: 'Summer', description: 'Bright water blues and sun', mark: '☀️' },
  { id: 'fall', label: 'Fall', description: 'Amber harvest tones', mark: '🍂' },
  { id: 'winter', label: 'Winter', description: 'Icy blues and frost', mark: '❄️' },
  { id: 'holiday', label: 'Holiday', description: 'Evergreen and gold', mark: '🎄' },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  theme: 'default',
  banner: '',
  subtitle: '',
  announcements: [],
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
    published: true,
  };
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
