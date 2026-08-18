import { useCallback, useEffect, useRef, useState } from 'react';

const NOTICE_KEY = 'riverwatch-rename-notice-v1';
const NOTICE_EXPIRES_AT = new Date('2026-09-01T23:59:59');

const hasSeenNotice = () => {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
};

const markNoticeSeen = () => {
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    // Ignore private-mode storage failures; session state still hides it.
  }
};

const isNoticeActive = () => Date.now() <= NOTICE_EXPIRES_AT.getTime();

export function UpdateNotice() {
  const [open, setOpen] = useState(() => isNoticeActive() && !hasSeenNotice());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    markNoticeSeen();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div className="notice-overlay" onClick={dismiss} role="presentation">
      <div
        className="notice-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="notice-kicker">Site update</div>
        <h2 id="update-notice-title" className="notice-title">
          Welcome to River Watch
        </h2>
        <p className="notice-copy">
          This site has a new name. What used to be called Marine Traffic is now
          {' '}<strong>River Watch</strong> — Columbia River Ship Traffic. Same live
          vessel data for Vancouver, Portland, and Longview.
        </p>
        <button
          ref={closeButtonRef}
          className="notice-button"
          type="button"
          onClick={dismiss}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
