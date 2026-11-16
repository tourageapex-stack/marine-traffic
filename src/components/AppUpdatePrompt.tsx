import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { applyAppUpdate, dismissAppUpdate, dismissedUpdateId, subscribeToAppUpdate } from '../appUpdate';

export function AppUpdatePrompt() {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(dismissedUpdateId);
  const [updating, setUpdating] = useState(false);
  const open = updateId !== null && updateId !== dismissedId;

  useEffect(() => subscribeToAppUpdate((update) => setUpdateId(update?.id ?? null)), []);

  const dismiss = useCallback(() => {
    if (!updateId) return;
    dismissAppUpdate(updateId);
    setDismissedId(updateId);
  }, [updateId]);

  const update = useCallback(() => {
    setUpdating(true);
    void applyAppUpdate();
    window.setTimeout(() => setUpdating(false), 3000);
  }, []);

  useEffect(() => {
    if (!open) return;

    updateButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updating) {
        event.preventDefault();
        dismiss();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismiss, updating]);

  if (!open) return null;

  return (
    <div className="notice-overlay app-update-overlay" role="presentation">
      <div
        ref={dialogRef}
        className="notice-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={updating}
        data-app-update-prompt="open"
      >
        <div className="notice-kicker">App update</div>
        <h2 id={titleId} className="notice-title">
          Update available
        </h2>
        <p id={descriptionId} className="notice-copy">
          A new version of River Watch is ready. Update now to load the latest version.
        </p>
        <div className="notice-actions">
          <button
            ref={updateButtonRef}
            className="notice-button"
            type="button"
            onClick={update}
            disabled={updating}
          >
            {updating ? 'Updating…' : 'Update now'}
          </button>
          <button
            className="notice-button notice-button-secondary"
            type="button"
            onClick={dismiss}
            disabled={updating}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
