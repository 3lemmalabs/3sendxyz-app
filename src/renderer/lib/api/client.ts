import {
  API_BASE_URL,
  FREE_MICRO_TIER_ID,
  FREE_PAYMENT_REFERENCE_PREFIX,
  REQUIRED_CHAIN_ID,
} from '../protocol/constants';
import { decodeBase64 } from '../protocol/encryption';
import { buildVaultAccessMessage } from '../protocol/vaultAccess';
import type {
  EncryptionMetadata,
  FreeSendAllowance,
  ReceiverKeyResult,
  StoredUploadRecord,
} from '../protocol/types';

const vaultKeyCache = new Map<string, Uint8Array>();

type JsonValue = Record<string, unknown>;

type ApiResponse<T extends JsonValue> = {
  success: boolean;
  error?: string;
} & T;

async function parseJson(response: Response): Promise<JsonValue | null> {
  try {
    return (await response.json()) as JsonValue;
  } catch {
    return null;
  }
}

async function requestJson<T extends JsonValue>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const payload = await parseJson(response);

  if (!response.ok) {
    const error =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(error);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Server returned an invalid JSON payload');
  }

  return payload as ApiResponse<T>;
}

export async function getFreeAllowance(identity: string): Promise<FreeSendAllowance> {
  const params = new URLSearchParams({ identity });
  const payload = await requestJson<{ allowance?: FreeSendAllowance }>(
    `/api/send/freeAllowance?${params.toString()}`
  );
  if (!payload.success || !payload.allowance) {
    throw new Error(payload.error || 'Failed to fetch free allowance');
  }
  return payload.allowance;
}

export async function getReceiverPublicKey(identity: string): Promise<ReceiverKeyResult> {
  const params = new URLSearchParams({ identity });
  const payload = await requestJson<{ type?: string; publicKey?: string }>(
    `/api/send/getReceiverPublicKey?${params.toString()}`
  );
  if (!payload.success || typeof payload.publicKey !== 'string') {
    throw new Error(payload.error || 'Failed to fetch receiver public key');
  }
  const rawType = payload.type;
  const type = rawType === 'passkey' || rawType === 'seed' ? rawType : 'vault';
  return {
    type,
    publicKey: payload.publicKey,
  };
}

export type UploadFreeSendInput = {
  initiator: string;
  recipient: string;
  originalFile: File;
  encryptedFile: File;
  encryption: EncryptionMetadata;
  handshakeMessage: string;
  signature: `0x${string}`;
  paymentTxHash: string;
  sentAt: number;
  paymentAsset: 'FREE';
};

export async function uploadFreeSend(input: UploadFreeSendInput): Promise<StoredUploadRecord> {
  const formData = new FormData();
  formData.append('initiator', input.initiator);
  formData.append('recipient', input.recipient);
  formData.append('handshakeMessage', input.handshakeMessage);
  formData.append('signature', input.signature);
  formData.append('sentAt', String(input.sentAt));
  formData.append('paymentTxHash', input.paymentTxHash);
  formData.append('chainId', String(REQUIRED_CHAIN_ID));
  formData.append('tierId', String(FREE_MICRO_TIER_ID));
  formData.append('paymentAsset', input.paymentAsset);
  formData.append('paymentType', 'FREE');
  formData.append('originalFilename', input.originalFile.name);
  formData.append('originalMimeType', input.originalFile.type || 'application/octet-stream');
  formData.append('originalSize', String(input.originalFile.size));
  formData.append('encryption', JSON.stringify(input.encryption));
  formData.append('file', input.encryptedFile);

  const response = await fetch(`${API_BASE_URL}/api/send/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = await parseJson(response);
  if (!response.ok || !payload || payload.success !== true) {
    const error =
      payload && typeof payload.error === 'string' ? payload.error : 'Failed to upload encrypted file';
    throw new Error(error);
  }

  const record = payload.record;
  if (!record || typeof record !== 'object') {
    throw new Error('Upload response is missing record payload');
  }
  return record as StoredUploadRecord;
}

export function createFreePaymentReference(address: string, now = Date.now()): string {
  const nonce = Math.random().toString(16).slice(2, 10);
  return `${FREE_PAYMENT_REFERENCE_PREFIX}${address.toLowerCase()}:${now}:${nonce}`;
}

export async function getInbox(address: string): Promise<StoredUploadRecord[]> {
  const params = new URLSearchParams({ recipient: address });
  const payload = await requestJson<{ records?: StoredUploadRecord[] }>(`/api/inbox?${params.toString()}`);
  if (!payload.success) {
    throw new Error(payload.error || 'Failed to fetch inbox records');
  }
  return Array.isArray(payload.records) ? payload.records : [];
}

export async function getOutbox(address: string): Promise<StoredUploadRecord[]> {
  const params = new URLSearchParams({ initiator: address });
  const payload = await requestJson<{ records?: StoredUploadRecord[] }>(`/api/sent?${params.toString()}`);
  if (!payload.success) {
    throw new Error(payload.error || 'Failed to fetch outbox records');
  }
  return Array.isArray(payload.records) ? payload.records : [];
}

export async function downloadInboxFile(
  cid: string,
  recipient: string,
  filename?: string
): Promise<{ base64: string; filename: string }> {
  const payload = await requestJson<{ file?: { base64?: string; filename?: string } }>(
    '/api/inbox/download',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid, recipient, filename }),
    }
  );

  if (!payload.success || !payload.file || typeof payload.file.base64 !== 'string') {
    throw new Error(payload.error || 'Failed to download encrypted file');
  }

  return {
    base64: payload.file.base64,
    filename: payload.file.filename || filename || `${cid}.bin`,
  };
}

export async function getVaultPrivateKey(
  address: string,
  signMessage: (message: string) => Promise<`0x${string}`>
): Promise<Uint8Array> {
  const cacheKey = address.toLowerCase();
  const cached = vaultKeyCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const message = buildVaultAccessMessage(address);
  const signature = await signMessage(message);
  const payload = await requestJson<{ privateKey?: string }>(`/api/vault/getPrivateKey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, message }),
  });

  if (!payload.success || typeof payload.privateKey !== 'string') {
    throw new Error(payload.error || 'Failed to resolve vault private key');
  }

  const privateKey = decodeBase64(payload.privateKey);
  if (privateKey.length !== 32) {
    throw new Error('Vault private key must be 32 bytes');
  }

  vaultKeyCache.set(cacheKey, privateKey);
  return privateKey;
}
