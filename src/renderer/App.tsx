import { useEffect, useMemo, useState } from 'react';
import { shortAddress } from './lib/format';
import { InboxPage } from './pages/InboxPage';
import { OutboxPage } from './pages/OutboxPage';
import { SendPage } from './pages/SendPage';
import { SettingsPage } from './pages/SettingsPage';
import { WelcomeModal } from './components/WelcomeModal';
import './styles.css';

type TabKey = 'send' | 'inbox' | 'outbox' | 'settings';
const BRAND_LOGO_SRC = `${import.meta.env.BASE_URL}3sendClear.svg`;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('send');
  const [address, setAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    window.threeSend.identity
      .getAddress()
      .then((result) => {
        if (!mounted) return;
        setAddress(result.address);
        setAddressError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load app identity.';
        setAddressError(message);
      })
      .finally(() => {
        if (mounted) {
          setLoadingAddress(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navItems = useMemo(
    () => [
      { key: 'send' as const, label: 'Send' },
      { key: 'inbox' as const, label: 'Inbox' },
      { key: 'outbox' as const, label: 'Outbox' },
      { key: 'settings' as const, label: 'Settings' },
    ],
    []
  );

  const onUploadCompleted = () => {
    setRefreshTick((prev) => prev + 1);
    setActiveTab('outbox');
  };

  const onCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 1200);
    } catch {
      setCopiedAddress(false);
    }
  };

  return (
    <div className="appRoot">
      <header className="topbar">
        <div className="brandMark">
          <img src={BRAND_LOGO_SRC} alt="3send" className="brandLogo" />
          <span className="brandSuffix">desktop</span>
        </div>
        <button
          type="button"
          className="identityTag identityCopy"
          onClick={() => onCopyAddress().catch(() => {})}
          disabled={loadingAddress || !address}
          title={address ? 'Copy full address' : 'No identity available'}
        >
          {loadingAddress
            ? 'Preparing identity...'
            : copiedAddress
              ? 'Address copied'
              : address
                ? shortAddress(address, 6)
                : 'No identity'}
        </button>
      </header>

      <nav className="tabs">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tabButton ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="pageBody">
        {addressError ? <div className="errorBanner">{addressError}</div> : null}
        {!loadingAddress && !addressError ? (
          <>
            {activeTab === 'send' ? (
              <SendPage address={address} onUploadCompleted={onUploadCompleted} />
            ) : null}
            {activeTab === 'inbox' ? <InboxPage address={address} reloadToken={refreshTick} /> : null}
            {activeTab === 'outbox' ? <OutboxPage address={address} reloadToken={refreshTick} /> : null}
            {activeTab === 'settings' ? <SettingsPage address={address} /> : null}
          </>
        ) : null}
      </main>
      <WelcomeModal />
    </div>
  );
}
