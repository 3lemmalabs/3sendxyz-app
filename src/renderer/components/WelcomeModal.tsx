import { useEffect, useState } from 'react';

const WELCOME_STORAGE_KEY = '3send.desktop.welcome.seen';

function getInitialWelcomeOpenState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const seen = window.localStorage.getItem(WELCOME_STORAGE_KEY);
    return !seen;
  } catch {
    return true;
  }
}

export function WelcomeModal() {
  const [open, setOpen] = useState<boolean>(getInitialWelcomeOpenState);

  useEffect(() => {
    if (!open) return;

    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures and keep modal behavior.
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures and just close.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="welcomeOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="card welcomeDialog">
        <button
          type="button"
          className="button secondary welcomeClose"
          aria-label="Close"
          title="Close"
          onClick={dismiss}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div id="welcome-modal-title" className="welcomeTitle">
          Welcome to <span className="welcomeAccent">3send</span>
        </div>
        <div className="muted welcomeSubtitle">
          Send encrypted files from your desktop app identity. Your keys stay local and files are
          encrypted before upload.
        </div>

        <div className="welcomeSteps" aria-label="How it works">
          <div className="welcomeStepCard">
            <span className="welcomeStepNum" aria-hidden>
              1
            </span>
            <img className="welcomeStepIcon" src="/Connect.svg" alt="" />
            <div className="welcomeStepTitle">Identity created on first launch.</div>
            <div className="muted welcomeStepText">
              The app generates your local EVM address automatically.
            </div>
          </div>
          <div className="welcomeStepCard">
            <span className="welcomeStepNum" aria-hidden>
              2
            </span>
            <img className="welcomeStepIcon" src="/Upload.svg" alt="" />
            <div className="welcomeStepTitle">Choose file and recipient.</div>
            <div className="muted welcomeStepText">
              Enter a destination address and optional note, then pick your file.
            </div>
          </div>
          <div className="welcomeStepCard">
            <span className="welcomeStepNum" aria-hidden>
              3
            </span>
            <img className="welcomeStepIcon" src="/Lock.svg" alt="" />
            <div className="welcomeStepTitle">Encrypt locally and send.</div>
            <div className="muted welcomeStepText">
              Encryption happens on your machine before data is uploaded.
            </div>
          </div>
          <div className="welcomeStepCard">
            <span className="welcomeStepNum" aria-hidden>
              4
            </span>
            <img className="welcomeStepIcon" src="/Unlock.svg" alt="" />
            <div className="welcomeStepTitle">Recipient decrypts from inbox.</div>
            <div className="muted welcomeStepText">
              Share your app address to receive files with vault-mode decryption.
            </div>
          </div>
        </div>

        <div className="welcomeActions">
          <button type="button" className="button" onClick={dismiss}>
            Start now
          </button>
        </div>
      </div>
    </div>
  );
}
