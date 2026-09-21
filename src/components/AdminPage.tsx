import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnnouncementTile } from './AnnouncementTile';
import {
  THEMES,
  adminLogin,
  adminLogout,
  emptyAnnouncement,
  fetchAdminSession,
  generateAnnouncementArt,
  saveSiteSettings,
  type Announcement,
  type SiteSettings,
  type SiteTheme,
} from '../services/siteSettings';

type AdminTab = 'announcements' | 'themes' | 'popup' | 'site';

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
  const [generatingArt, setGeneratingArt] = useState(false);
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

  const seasonThemes = THEMES.filter((theme) => theme.group === 'season');
  const holidayThemes = THEMES.filter((theme) => theme.group === 'holiday');

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
      accent: form.accent.trim(),
    };

    const announcements = editingId
      ? draft.announcements.map((item) => (item.id === editingId ? nextItem : item))
      : [nextItem, ...draft.announcements];

    await persist({ ...draft, announcements }, editingId ? 'Announcement updated.' : 'Announcement published.');
    setForm(blankForm());
    setEditingId(null);
  };

  const handleGenerateArt = async () => {
    if (!form.title.trim()) {
      setError('Add a title before generating art.');
      return;
    }

    setGeneratingArt(true);
    setError(null);
    setStatus(null);
    try {
      const art = await generateAnnouncementArt({
        title: form.title.trim(),
        date: form.date.trim(),
        kicker: form.kicker.trim(),
      });
      setForm((current) => ({
        ...current,
        logo: art.imageUrl,
        logoAlt: `${current.title.trim() || 'Announcement'} artwork`,
        accent: art.accent || current.accent,
      }));
      setStatus(`Gemini art ready (${art.model}). Review the preview, then save.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate art.');
      if (err instanceof Error && err.message.includes('session')) {
        setAuthenticated(false);
      }
    } finally {
      setGeneratingArt(false);
    }
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
    await persist({ ...draft, theme }, `${THEMES.find((entry) => entry.id === theme)?.label || 'Theme'} applied for everyone.`);
  };

  const handleSiteExtras = async (event: FormEvent) => {
    event.preventDefault();
    await persist(draft, 'Site extras saved.');
  };

  const handlePopupSave = async (event: FormEvent) => {
    event.preventDefault();
    if (draft.popup.enabled && (!draft.popup.title.trim() || !draft.popup.body.trim())) {
      setError('Popup needs a title and message when it is turned on.');
      return;
    }
    await persist(draft, draft.popup.enabled ? 'Important popup is live for everyone.' : 'Important popup turned off.');
  };

  const switchTab = (next: AdminTab) => {
    setTab(next);
    setStatus(null);
    setError(null);
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
          Manage live seasonal themes, announcements under the feedback button, and important popups for every visitor.
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
          <p className="admin-copy">
            Themes and announcements are site-wide — once you save, every visitor sees them.
          </p>
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
          onClick={() => switchTab('announcements')}
        >
          Announcements
        </button>
        <button
          className={`tab-pill ${tab === 'popup' ? 'active' : ''}`}
          type="button"
          onClick={() => switchTab('popup')}
        >
          Important popup
        </button>
        <button
          className={`tab-pill ${tab === 'themes' ? 'active' : ''}`}
          type="button"
          onClick={() => switchTab('themes')}
        >
          Themes
        </button>
        <button
          className={`tab-pill ${tab === 'site' ? 'active' : ''}`}
          type="button"
          onClick={() => switchTab('site')}
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
            <p className="admin-copy">
              These tiles stay live on the main page under the Give Feedback button.
            </p>
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
                <label htmlFor="ann-logo">Image URL (optional)</label>
                <input
                  id="ann-logo"
                  value={form.logo}
                  onChange={(event) => setForm({ ...form, logo: event.target.value })}
                  placeholder="Paste a URL or generate with Gemini"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ann-accent">Accent color (optional)</label>
                <input
                  id="ann-accent"
                  value={form.accent}
                  onChange={(event) => setForm({ ...form, accent: event.target.value })}
                  placeholder="#2563eb"
                />
              </div>
              <div className="admin-actions">
                <button
                  className="admin-ghost-button"
                  type="button"
                  onClick={handleGenerateArt}
                  disabled={generatingArt || saving}
                >
                  {generatingArt ? 'Generating with Gemini…' : 'Generate art with Gemini'}
                </button>
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
                <button className="submit-button" type="submit" disabled={saving || generatingArt}>
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

      {tab === 'popup' && (
        <div className="admin-card">
          <h3 className="admin-section-title">Important popup</h3>
          <p className="admin-copy">
            Use this for urgent notices. When the toggle is on, every visitor sees a modal until they dismiss it.
          </p>
          <form className="admin-form" onSubmit={handlePopupSave}>
            <label className="admin-check admin-toggle-row">
              <input
                type="checkbox"
                checked={draft.popup.enabled}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    popup: { ...draft.popup, enabled: event.target.checked },
                  })
                }
              />
              <span>
                <strong>{draft.popup.enabled ? 'Popup is ON' : 'Popup is OFF'}</strong>
                <span className="admin-muted"> — site-wide for all visitors</span>
              </span>
            </label>
            <div className="form-group">
              <label htmlFor="popup-title">Title</label>
              <input
                id="popup-title"
                value={draft.popup.title}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    popup: { ...draft.popup, title: event.target.value },
                  })
                }
                placeholder="River closure tonight"
              />
            </div>
            <div className="form-group">
              <label htmlFor="popup-body">Message</label>
              <textarea
                id="popup-body"
                value={draft.popup.body}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    popup: { ...draft.popup, body: event.target.value },
                  })
                }
                placeholder="Spell out what people need to know right away."
              />
            </div>
            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="popup-cta">Button text</label>
                <input
                  id="popup-cta"
                  value={draft.popup.cta}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      popup: { ...draft.popup, cta: event.target.value },
                    })
                  }
                  placeholder="Read more"
                />
              </div>
              <div className="form-group">
                <label htmlFor="popup-href">Button link</label>
                <input
                  id="popup-href"
                  type="url"
                  value={draft.popup.href}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      popup: { ...draft.popup, href: event.target.value },
                    })
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
            <button className="submit-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save popup settings'}
            </button>
          </form>
        </div>
      )}

      {tab === 'themes' && (
        <div className="admin-card">
          <h3 className="admin-section-title">Seasonal themes</h3>
          <p className="admin-copy">Weather seasons for everyday river ops. Changes apply to the whole site immediately.</p>
          <div className="theme-grid">
            {seasonThemes.map((theme) => (
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

          <h3 className="admin-section-title" style={{ marginTop: '1.75rem' }}>Holiday themes</h3>
          <p className="admin-copy">Flip these on for the holiday stretch — Halloween through New Year and more.</p>
          <div className="theme-grid">
            {holidayThemes.map((theme) => (
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
            Optional header subtitle and a slim banner under the header.
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
