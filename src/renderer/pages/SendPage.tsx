import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createFreePaymentReference,
  getFreeAllowance,
  getReceiverPublicKey,
  uploadFreeSend,
} from '../lib/api/client';
import { formatBytes } from '../lib/format';
import { buildSendHandshakeMessage } from '../lib/protocol/handshake';
import {
  FREE_MICRO_MAX_BYTES,
  FREE_MICRO_TIER_ID,
  FREE_MICRO_SENDS_PER_MONTH,
  REQUIRED_CHAIN_ID,
} from '../lib/protocol/constants';
import { encryptFileForRecipient } from '../lib/protocol/encryption';
import { parseIdentityKey } from '../lib/protocol/identityKey';
import type { FreeSendAllowance, ReceiverKeyResult } from '../lib/protocol/types';

type SendPageProps = {
  address: string;
  onUploadCompleted: () => void;
};

export function SendPage({ address, onUploadCompleted }: SendPageProps) {
  const [recipient, setRecipient] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [allowance, setAllowance] = useState<FreeSendAllowance | null>(null);
  const [loadingAllowance, setLoadingAllowance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedRecipientInput = recipient.trim();
  const parsedRecipient = useMemo(
    () => parseIdentityKey(normalizedRecipientInput),
    [normalizedRecipientInput]
  );
  const recipientValue = parsedRecipient?.value ?? '';
  const fileTooLarge = Boolean(selectedFile && selectedFile.size > FREE_MICRO_MAX_BYTES);

  const canSend = useMemo(() => {
    if (busy || !selectedFile) return false;
    if (fileTooLarge) return false;
    if (!recipientValue) return false;
    if (loadingAllowance || !allowance) return false;
    if (allowance.remaining <= 0) return false;
    return true;
  }, [allowance, busy, fileTooLarge, loadingAllowance, recipientValue, selectedFile]);

  const loadAllowance = useCallback(async () => {
    setLoadingAllowance(true);
    try {
      const next = await getFreeAllowance(address);
      setAllowance(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch free allowance';
      setError(message);
    } finally {
      setLoadingAllowance(false);
    }
  }, [address]);

  useEffect(() => {
    loadAllowance().catch(() => {});
  }, [loadAllowance]);

  const signMessage = async (message: string): Promise<`0x${string}`> => {
    const signed = await window.threeSend.identity.signMessage({ message });
    return signed.signature;
  };

  const runUpload = async (
    receiverKey: ReceiverKeyResult,
    paymentTxHash: string,
    sentAt: number,
    original: File
  ) => {
    const { encryptedFile, metadata } = await encryptFileForRecipient({
      file: original,
      recipientPublicKey: receiverKey.publicKey,
      recipientAddress: recipientValue,
      note: note.trim() || undefined,
    });
    metadata.keySource = receiverKey.type;

    const handshakeMessage = buildSendHandshakeMessage({
      initiator: address,
      recipient: recipientValue,
      chainId: REQUIRED_CHAIN_ID,
      paymentTxHash,
      sentAt,
      tierId: FREE_MICRO_TIER_ID,
      plaintextBytes: original.size,
      ciphertextBytes: encryptedFile.size,
      originalFilename: original.name,
      encryption: metadata,
    });

    const signature = await signMessage(handshakeMessage);

    return uploadFreeSend({
      initiator: address,
      recipient: recipientValue,
      originalFile: original,
      encryptedFile,
      encryption: metadata,
      handshakeMessage,
      signature,
      paymentTxHash,
      sentAt,
      paymentAsset: 'FREE',
    });
  };

  const onSend = async () => {
    if (!selectedFile || !canSend) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    setStatus('Resolving recipient key...');

    try {
      const receiverKey = await getReceiverPublicKey(recipientValue);

      let attempts = 0;
      let sent = false;
      while (attempts < 2 && !sent) {
        attempts += 1;
        const paymentTxHash = createFreePaymentReference(address);
        const sentAt = Date.now();

        try {
          setStatus('Encrypting and uploading...');
          await runUpload(receiverKey, paymentTxHash, sentAt, selectedFile);
          sent = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          const isDuplicateRef =
            message.toLowerCase().includes('already used') ||
            message.toLowerCase().includes('already used for upload');
          if (!(attempts < 2 && isDuplicateRef)) {
            throw err;
          }
        }
      }

      setSuccess('Encrypted file sent successfully.');
      setStatus(null);
      setSelectedFile(null);
      setRecipient('');
      setNote('');
      await loadAllowance();
      onUploadCompleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send file';
      setError(message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Send</h2>

      <div className="fieldGroup">
        <label>Recipient email or wallet address</label>
        <input
          placeholder="email@domain.com or 0x..."
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          autoComplete="off"
        />
        {normalizedRecipientInput && !parsedRecipient ? (
          <p className="errorText">Enter a valid email or wallet address.</p>
        ) : null}
      </div>

      <div className="fieldGroup">
        <label>File (free tier only, max {formatBytes(FREE_MICRO_MAX_BYTES)})</label>
        <input
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          disabled={busy}
        />
        {selectedFile ? (
          <p className="muted">
            {selectedFile.name} · {formatBytes(selectedFile.size)}
          </p>
        ) : null}
        {fileTooLarge ? <p className="errorText">Selected file exceeds free tier limit.</p> : null}
      </div>

      <div className="fieldGroup">
        <label>Optional note</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={1500}
          disabled={busy}
        />
      </div>

      <div className="infoBox">
        {loadingAllowance ? (
          <span>Checking free allowance...</span>
        ) : (
          <span>
            Free sends left this month: <strong>{allowance?.remaining ?? 0}</strong> /{' '}
            {allowance?.limit ?? FREE_MICRO_SENDS_PER_MONTH}
          </span>
        )}
      </div>

      <div className="actions">
        <button type="button" disabled={!canSend} onClick={() => onSend().catch(() => {})}>
          {busy ? 'Sending...' : 'Send free encrypted file'}
        </button>
      </div>

      {status ? <p className="muted">{status}</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
      {success ? <p className="successText">{success}</p> : null}
    </section>
  );
}
