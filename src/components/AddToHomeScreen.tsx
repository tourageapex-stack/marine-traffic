import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type PlatformTab = 'ios' | 'android';
type TriggerVariant = 'header' | 'footer';

interface AddToHomeScreenProps {
  variant?: TriggerVariant;
}

const isStandaloneDisplay = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
};

const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isAndroidDevice = () => /Android/i.test(navigator.userAgent);

const ShareIcon = () => (
  <span className="add-home-share-icon" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  </span>
);

export function AddToHomeScreen({ variant = 'header' }: AddToHomeScreenProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState<PlatformTab>(() =>
    isAndroidDevice() && !isIosDevice() ? 'android' : 'ios'
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
      setShowGuide(false);
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

  const dismissGuide = useCallback(() => setShowGuide(false), []);

  useEffect(() => {
    if (!showGuide) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissGuide();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showGuide, dismissGuide]);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleClick = () => {
    setShowGuide(true);
  };

  if (installed) return null;

  const trigger =
    variant === 'footer' ? (
      <button className="footer-install-link" type="button" onClick={() => setShowGuide(true)}>
        Add to Home Screen
      </button>
    ) : (
      <button className="refresh-button add-home-button" type="button" onClick={handleClick}>
        Add to Home Screen
      </button>
    );

  return (
    <>
      {trigger}

      {showGuide && (
        <div className="notice-overlay" onClick={dismissGuide} role="presentation">
          <div
            className="notice-dialog add-home-dialog"
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
              Save River Watch as an app on your phone. Pick your device, then follow the steps.
            </p>

            <div className="add-home-tabs" role="tablist" aria-label="Device instructions">
              <button
                className={`add-home-tab ${platform === 'ios' ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={platform === 'ios'}
                onClick={() => setPlatform('ios')}
              >
                iPhone / iPad
              </button>
              <button
                className={`add-home-tab ${platform === 'android' ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={platform === 'android'}
                onClick={() => setPlatform('android')}
              >
                Android
              </button>
            </div>

            {platform === 'ios' ? (
              <ol className="add-home-steps" role="tabpanel">
                <li>
                  Open this site in <strong>Safari</strong> (not Chrome or an in-app browser).
                </li>
                <li>
                  Tap the <strong>Share</strong> button <ShareIcon /> at the bottom of Safari.
                </li>
                <li>
                  Scroll and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to confirm. River Watch will appear with the other apps.
                </li>
              </ol>
            ) : (
              <div role="tabpanel">
                {deferredPrompt && (
                  <button
                    className="notice-button add-home-install-now"
                    type="button"
                    onClick={handleNativeInstall}
                  >
                    Install now
                  </button>
                )}
                <ol className="add-home-steps">
                  <li>
                    Open this site in <strong>Chrome</strong>.
                  </li>
                  <li>
                    Tap the <strong>⋮</strong> menu in the top-right corner.
                  </li>
                  <li>
                    Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                  <li>Confirm, then open River Watch from your home screen like any other app.</li>
                </ol>
              </div>
            )}

            <button
              ref={closeButtonRef}
              className="notice-button"
              type="button"
              onClick={dismissGuide}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
