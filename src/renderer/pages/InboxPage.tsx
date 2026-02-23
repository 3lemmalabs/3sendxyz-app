import { useCallback, useEffect, useState } from 'react';
import { decryptFileFromEnvelope, decryptNoteFromEnvelope, decodeBase64 } from '../lib/protocol/encryption';
import { downloadBlob } from '../lib/download';
import { getInbox, downloadInboxFile, getVaultPrivateKey } from '../lib/api/client';
import { formatBytes, formatDate, shortAddress } from '../lib/format';
import type { StoredUploadRecord } from '../lib/protocol/types';

type InboxPageProps = {
  address: string;
  reloadToken: number;
};

export function InboxPage({ address, reloadToken }: InboxPageProps) {
  const [records, setRecords] = useState<StoredUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const signMessage = async (message: string): Promise<`0x${string}`> => {
    const signed = await window.threeSend.identity.signMessage({ message });
    return signed.signature;
  };

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getInbox(address);
      setRecords(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inbox';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadInbox().catch(() => {});
  }, [loadInbox, reloadToken]);

  const onDownload = async (record: StoredUploadRecord) => {
    const recordId = `${record.txHash}:${record.initiator}`;
    setBusyId(recordId);
    try {
      const payload = await downloadInboxFile(record.cid, record.recipient, record.filename);
      const b64 = payload.base64.startsWith('data:')
        ? payload.base64.slice(payload.base64.indexOf(',') + 1)
        : payload.base64;

      if (record.encryption) {
        const keySource = record.encryption.keySource ?? 'vault';
        if (keySource !== 'vault') {
          throw new Error(`This app supports only vault-mode decrypt for now (got ${keySource}).`);
        }

        const vaultPrivateKey = await getVaultPrivateKey(address, signMessage);
        const plaintext = await decryptFileFromEnvelope({
          ciphertext: decodeBase64(b64),
          metadata: record.encryption,
          recipientPrivateKey: vaultPrivateKey,
        });
        const mimeType = record.originalMimeType || 'application/octet-stream';
        const plainBuffer = plaintext.buffer.slice(
          plaintext.byteOffset,
          plaintext.byteOffset + plaintext.byteLength
        ) as ArrayBuffer;
        downloadBlob(new Blob([plainBuffer], { type: mimeType }), record.originalFilename || payload.filename);
        return;
      }

      const bytes = decodeBase64(b64);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      downloadBlob(
        new Blob([buffer], { type: record.originalMimeType || 'application/octet-stream' }),
        payload.filename
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const onDecryptNote = async (record: StoredUploadRecord) => {
    if (!record.encryption?.noteCiphertext || !record.encryption.noteIv) {
      return;
    }
    const recordId = `${record.txHash}:${record.initiator}`;
    setBusyId(recordId);
    try {
      const keySource = record.encryption.keySource ?? 'vault';
      if (keySource !== 'vault') {
        throw new Error(`This app supports only vault-mode decrypt for notes (got ${keySource}).`);
      }
      const privateKey = await getVaultPrivateKey(address, signMessage);
      const note = await decryptNoteFromEnvelope({
        metadata: record.encryption,
        recipientPrivateKey: privateKey,
      });
      setNoteMap((prev) => ({ ...prev, [recordId]: note }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to decrypt note';
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card">
      <div className="sectionHeader">
        <h2>Inbox</h2>
        <button type="button" onClick={() => loadInbox().catch(() => {})}>
          Refresh
        </button>
      </div>

      {loading ? <p className="muted">Loading inbox...</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
      {!loading && !error && records.length === 0 ? <p className="muted">No received files yet.</p> : null}

      {!loading && !error && records.length > 0 ? (
        <ul className="list">
          {records.map((record) => {
            const recordId = `${record.txHash}:${record.initiator}`;
            const canDecryptNote = Boolean(record.encryption?.noteCiphertext && record.encryption.noteIv);
            return (
              <li key={recordId} className="listItem">
                <div className="listTop">
                  <strong>{record.filename}</strong>
                  <span className="pill">{record.paymentType ?? 'paid'}</span>
                </div>
                <div className="metaLine">From: {shortAddress(record.initiator)}</div>
                <div className="metaLine">Size: {formatBytes(record.filesize)}</div>
                <div className="metaLine">Received: {formatDate(record.sentAt)}</div>

                <div className="actions compact">
                  <button
                    type="button"
                    onClick={() => onDownload(record).catch(() => {})}
                    disabled={busyId === recordId}
                  >
                    {busyId === recordId ? 'Working...' : 'Download & decrypt'}
                  </button>
                  {canDecryptNote ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onDecryptNote(record).catch(() => {})}
                      disabled={busyId === recordId}
                    >
                      Decrypt note
                    </button>
                  ) : null}
                </div>

                {noteMap[recordId] ? <p className="note">{noteMap[recordId]}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
