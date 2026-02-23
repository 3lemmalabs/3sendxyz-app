import { useCallback, useEffect, useState } from 'react';
import { getOutbox } from '../lib/api/client';
import { formatBytes, formatDate, shortAddress } from '../lib/format';
import type { StoredUploadRecord } from '../lib/protocol/types';

type OutboxPageProps = {
  address: string;
  reloadToken: number;
};

export function OutboxPage({ address, reloadToken }: OutboxPageProps) {
  const [records, setRecords] = useState<StoredUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOutbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getOutbox(address);
      setRecords(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load outbox';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadOutbox().catch(() => {});
  }, [loadOutbox, reloadToken]);

  return (
    <section className="card">
      <div className="sectionHeader">
        <h2>Outbox</h2>
        <button type="button" onClick={() => loadOutbox().catch(() => {})}>
          Refresh
        </button>
      </div>

      {loading ? <p className="muted">Loading sent files...</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
      {!loading && !error && records.length === 0 ? <p className="muted">No sent files yet.</p> : null}

      {!loading && !error && records.length > 0 ? (
        <ul className="list">
          {records.map((record) => (
            <li key={`${record.txHash}:${record.recipient}`} className="listItem">
              <div className="listTop">
                <strong>{record.filename}</strong>
                <span className="pill">{record.paymentType ?? 'paid'}</span>
              </div>
              <div className="metaLine">To: {shortAddress(record.recipient)}</div>
              <div className="metaLine">Size: {formatBytes(record.filesize)}</div>
              <div className="metaLine">Sent: {formatDate(record.sentAt)}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
