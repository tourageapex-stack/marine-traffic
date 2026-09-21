import { useEffect, useMemo, useRef, useState } from 'react';
import { popupFingerprint, type PopupAnnouncement } from '../services/siteSettings';

interface PopupAnnouncementModalProps {
  popup: PopupAnnouncement;
}

const STORAGE_KEY = 'rw-popup-dismissed';

function readDismissedFingerprint(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function PopupAnnouncementModal({ popup }: PopupAnnouncementModalProps) {
  const fingerprint = useMemo(() => popupFingerprint(popup), [popup]);
  const eligible = popup.enabled && Boolean(popup.title.trim()) && Boolean(popup.body.trim());
  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(readDismissedFingerprint);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const open = eligible && dismissedFingerprint !== fingerprint;

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        try {
          window.localStorage.setItem(STORAGE_KEY, fingerprint);
        } catch {
          // Ignore storage failures.
        }
        setDismissedFingerprint(fingerprint);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, fingerprint]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, fingerprint);
    } catch {
      // Ignore storage failures.
    }
    setDismissedFingerprint(fingerprint);
  };

  if (!open) return null;

  return (
    <div className="popup-announcement-overlay" role="presentation" onClick={dismiss}>
      <div
        className="popup-announcement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-announcement-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="popup-announcement-kicker">Important</div>
        <h2 id="popup-announcement-title" className="popup-announcement-title">
          {popup.title}
        </h2>
        <p className="popup-announcement-body">{popup.body}</p>
        <div className="popup-announcement-actions">
          {popup.href.trim() ? (
            <a
              className="submit-button popup-announcement-cta"
              href={popup.href.trim()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
            >
              {popup.cta.trim() || 'Open details'}
            </a>
          ) : null}
          <button
            ref={closeButtonRef}
            className="admin-ghost-button"
            type="button"
            onClick={dismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
