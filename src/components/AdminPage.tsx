import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnnouncementTile } from './AnnouncementTile';
import {
  THEMES,
  adminLogin,
  adminLogout,
  emptyAnnouncement,
  fetchAdminSession,
  saveSiteSettings,
  type Announcement,
  type SiteSettings,
  type SiteTheme,
} from '../services/siteSettings';

type AdminTab = 'announcements' | 'themes' | 'site';

interface AdminPageProps {
  settings: SiteSettings;
  onSettingsChange: (settings: SiteSettings) => void;
}

const blankForm = (): Announcement => ({
  ...emptyAnnouncement(),
  kicker: 'Upcoming event',
  cta: 'Details',
});

export function AdminPage({ settings, onSettingsChange }: AdminPageProps) {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [tab, setTab] = useState<AdminTab>('announcements');
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [form, setForm] = useState<Announcement>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminSession()
      .then((ok) => {
        if (active) setAuthenticated(ok);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const previewAnnouncement = useMemo(() => {
    return {
      ...form,
      title: form.title.trim() || 'Announcement title',
      date: form.date.trim() || 'Date or details',
      cta: form.cta.trim() || 'Details',
      kicker: form.kicker.trim() || 'Upcoming event',
    };
  }, [form]);

  const persist = async (next: SiteSettings, message: string) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSiteSettings(next);
      setDraft(saved);
      onSettingsChange(saved);
      setStatus(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
      if (err instanceof Error && err.message.includes('session')) {
        setAuthenticated(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setSigningIn(true);
    try {
      await adminLogin(username.trim(), password);
      setAuthenticated(true);
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const handleSaveAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('Give the announcement a title.');
      return;
    }

    const nextItem: Announcement = {
      ...form,
      title,
      date: form.date.trim(),
      href: form.href.trim(),
      cta: form.cta.trim() || 'Details',
      kicker: form.kicker.trim() || 'Announcement',
      logo: form.logo.trim(),
      logoAlt: form.logoAlt.trim() || title,
    };

    const announcements = editingId
      ? draft.announcements.map((item) => (item.id === editingId ? nextItem : item))
      : [nextItem, ...draft.announcements];

    await persist({ ...draft, announcements }, editingId ? 'Announcement updated.' : 'Announcement published.');
    setForm(blankForm());
    setEditingId(null);
  };

  const startEdit = (item: Announcement) => {
    setForm(item);
    setEditingId(item.id);
    setTab('announcements');
    setStatus(null);
    setError(null);
  };

  const togglePublished = async (item: Announcement) => {
    const announcements = draft.announcements.map((entry) =>
      entry.id === item.id ? { ...entry, published: !entry.published } : entry
    );
    await persist(
      { ...draft, announcements },
      item.published ? 'Announcement hidden from the dashboard.' : 'Announcement is visible again.'
    );
  };

  const removeAnnouncement = async (item: Announcement) => {
    const announcements = draft.announcements.filter((entry) => entry.id !== item.id);
    await persist({ ...draft, announcements }, 'Announcement removed.');
    if (editingId === item.id) {
      setForm(blankForm());
      setEditingId(null);
    }
  };

  const applyTheme = async (theme: SiteTheme) => {
    await persist({ ...draft, theme }, `${THEMES.find((entry) => entry.id === theme)?.label || 'Theme'} applied.`);
  };

  const handleSiteExtras = async (event: FormEvent) => {
    event.preventDefault();
    await persist(draft, 'Site extras saved.');
  };

  if (checkingSession) {
    return (
      <div className="admin-card">
        <p className="admin-muted">Checking admin session…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-card admin-login-card">
        <div className="admin-kicker">Restricted</div>
        <h2 className="admin-title">Admin sign in</h2>
        <p className="admin-copy">
          Manage announcements, seasonal themes, and other site extras for River Watch.
        </p>
        <form className="admin-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {loginError && <div className="form-error">{loginError}</div>}
          <button className="submit-button" type="submit" disabled={signingIn}>
            {signingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-card admin-header-card">
        <div>
          <div className="admin-kicker">River Watch</div>
          <h2 className="admin-title">Admin</h2>
          <p className="admin-copy">Add announcements and switch seasonal themes. More extras can land here later.</p>
          {draft.persistence === 'ephemeral' && (
            <p className="admin-muted">
              This host may forget settings after a cold start. Add a Vercel Blob store to keep them for every visitor.
            </p>
          )}
        </div>
        <button className="admin-ghost-button" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        <button
          className={`tab-pill ${tab === 'announcements' ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setTab('announcements');
            setStatus(null);
            setError(null);
          }}
        >
          Announcements
        </button>
        <button
          className={`tab-pill ${tab === 'themes' ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setTab('themes');
            setStatus(null);
            setError(null);
          }}
        >
          Themes
        </button>
        <button
          className={`tab-pill ${tab === 'site' ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setTab('site');
            setStatus(null);
            setError(null);
          }}
        >
          Site extras
        </button>
      </nav>

      {status && <div className="admin-status">{status}</div>}
      {error && <div className="form-error">{error}</div>}

      {tab === 'announcements' && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="admin-section-title">{editingId ? 'Edit announcement' : 'New announcement'}</h3>
            <form className="admin-form" onSubmit={handleSaveAnnouncement}>
              <div className="form-group">
                <label htmlFor="ann-title">Title</label>
                <input
                  id="ann-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Local 4 Golf Tournament"
                  required
                />
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="ann-date">Date or details</label>
                  <input
                    id="ann-date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    placeholder="September 3"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ann-kicker">Kicker</label>
                  <input
                    id="ann-kicker"
                    value={form.kicker}
                    onChange={(event) => setForm({ ...form, kicker: event.target.value })}
                    placeholder="Upcoming event"
                  />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="ann-href">Link URL</label>
                  <input
                    id="ann-href"
                    type="url"
                    value={form.href}
                    onChange={(event) => setForm({ ...form, href: event.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ann-cta">Button text</label>
                  <input
                    id="ann-cta"
                    value={form.cta}
                    onChange={(event) => setForm({ ...form, cta: event.target.value })}
                    placeholder="Register"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="ann-logo">Logo URL (optional)</label>
                <input
                  id="ann-logo"
                  type="url"
                  value={form.logo}
                  onChange={(event) => setForm({ ...form, logo: event.target.value })}
                  placeholder="https://…/logo.png"
                />
              </div>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => setForm({ ...form, published: event.target.checked })}
                />
                Show on the dashboard
              </label>
              <div className="admin-actions">
                <button className="submit-button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update announcement' : 'Add announcement'}
                </button>
                {editingId && (
                  <button
                    className="admin-ghost-button"
                    type="button"
                    onClick={() => {
                      setForm(blankForm());
                      setEditingId(null);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-card">
            <h3 className="admin-section-title">Preview</h3>
            <div className="announcement-row admin-preview">
              <AnnouncementTile announcement={previewAnnouncement} />
            </div>
            <h3 className="admin-section-title">Current announcements</h3>
            {draft.announcements.length === 0 ? (
              <p className="admin-muted">None yet. Add one and it will show on the dashboard.</p>
            ) : (
              <ul className="admin-list">
                {draft.announcements.map((item) => (
                  <li key={item.id} className="admin-list-item">
                    <div>
                      <strong>{item.title}</strong>
                      <div className="admin-muted">
                        {item.published ? 'Visible' : 'Hidden'}
                        {item.date ? ` · ${item.date}` : ''}
                      </div>
                    </div>
                    <div className="admin-item-actions">
                      <button type="button" onClick={() => startEdit(item)}>Edit</button>
                      <button type="button" onClick={() => togglePublished(item)}>
                        {item.published ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" className="danger" onClick={() => removeAnnouncement(item)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'themes' && (
        <div className="admin-card">
          <h3 className="admin-section-title">Seasonal themes</h3>
          <p className="admin-copy">Pick a look for the season. It applies to the whole site right away.</p>
          <div className="theme-grid">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-card theme-card-${theme.id} ${draft.theme === theme.id ? 'active' : ''}`}
                onClick={() => applyTheme(theme.id)}
                disabled={saving}
              >
                <span className="theme-mark" aria-hidden="true">{theme.mark}</span>
                <span className="theme-label">{theme.label}</span>
                <span className="theme-description">{theme.description}</span>
                {draft.theme === theme.id && <span className="theme-active-tag">Active</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'site' && (
        <div className="admin-card">
          <h3 className="admin-section-title">Site extras</h3>
          <p className="admin-copy">
            A few extra knobs for now. This is a good place to add more customizations later.
          </p>
          <form className="admin-form" onSubmit={handleSiteExtras}>
            <div className="form-group">
              <label htmlFor="site-subtitle">Header subtitle</label>
              <input
                id="site-subtitle"
                value={draft.subtitle}
                onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}
                placeholder="Columbia River Ship Traffic"
              />
            </div>
            <div className="form-group">
              <label htmlFor="site-banner">Dashboard banner</label>
              <textarea
                id="site-banner"
                value={draft.banner}
                onChange={(event) => setDraft({ ...draft, banner: event.target.value })}
                placeholder="Optional notice under the header, like a river closure or holiday reminder."
              />
            </div>
            <button className="submit-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save extras'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
