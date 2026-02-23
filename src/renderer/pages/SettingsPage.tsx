import { useState } from 'react';

type SettingsPageProps = {
  address: string;
};

export function SettingsPage({ address }: SettingsPageProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card">
      <h2>Settings</h2>
      <p className="muted">
        This app uses a local EVM private key generated on first run and stored in your OS keychain.
      </p>

      <div className="fieldGroup">
        <label>Your 3send address</label>
        <div className="rowWrap">
          <input value={address} readOnly />
          <button type="button" onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="warningBox">
        <strong>No backup in v1.</strong>
        <p>If this device is lost, your app identity and continuity for that address are lost.</p>
      </div>
    </section>
  );
}
