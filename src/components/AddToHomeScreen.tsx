import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isStandaloneDisplay = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
};

const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const ios = isIosDevice();

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
      setShowIosGuide(false);
    };

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => setInstalled(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    media.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      media.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const dismissIosGuide = useCallback(() => setShowIosGuide(false), []);

  useEffect(() => {
    if (!showIosGuide) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissIosGuide();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showIosGuide, dismissIosGuide]);

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    if (ios) {
      setShowIosGuide(true);
    }
  };

  if (installed) return null;
  if (!deferredPrompt && !ios) return null;

  return (
    <>
      <button className="refresh-button add-home-button" type="button" onClick={handleClick}>
        Add to Home Screen
      </button>

      {showIosGuide && (
        <div className="notice-overlay" onClick={dismissIosGuide} role="presentation">
          <div
            className="notice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-home-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notice-kicker">Install River Watch</div>
            <h2 id="add-home-title" className="notice-title">
              Add to Home Screen
            </h2>
            <p className="notice-copy">
              On iPhone or iPad, Safari can’t install with one tap. Use these steps:
            </p>
            <ol className="add-home-steps">
              <li>
                Tap the <strong>Share</strong> button{' '}
                <span className="add-home-share-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="M8 7l4-4 4 4" />
                    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                  </svg>
                </span>{' '}
                at the bottom of Safari.
              </li>
              <li>
                Scroll and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> to confirm.
              </li>
            </ol>
            <button
              ref={closeButtonRef}
              className="notice-button"
              type="button"
              onClick={dismissIosGuide}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
