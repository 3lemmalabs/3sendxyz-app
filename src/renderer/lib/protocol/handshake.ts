import { FREE_PAYMENT_REFERENCE_PREFIX } from './constants';
import type { EncryptionMetadata } from './types';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

const SEND_HANDSHAKE_HEADER = 'ratio1 handshake (send)';
const SEND_HANDSHAKE_INTRO = 'I authorize sending an encrypted file via 3send.xyz.';

type CanonicalPrimitive = string | number | boolean;

export type BuildSendHandshakeMessageParams = {
  initiator: string;
  recipient: string;
  chainId: number;
  paymentTxHash: string;
  sentAt: number;
  tierId: number;
  plaintextBytes: number;
  ciphertextBytes: number;
  originalFilename?: string;
  encryption: EncryptionMetadata;
};

function normalizeAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('0x')) {
    return `0x${trimmed.toLowerCase()}`;
  }
  return `0x${trimmed.slice(2).toLowerCase()}`;
}

function sanitizeDisplayValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').replace(/:/g, '-').replace(/\s+/g, ' ').trim();
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('0x')) {
    return `0x${trimmed.toLowerCase()}`;
  }
  return `0x${trimmed.slice(2).toLowerCase()}`;
}

function normalizePaymentReference(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith(FREE_PAYMENT_REFERENCE_PREFIX)) {
    return trimmed.toLowerCase();
  }
  return normalizeHex(trimmed);
}

function toSafeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Handshake value must be a finite number');
  }
  return Math.max(0, Math.floor(value));
}

function canonicalizeEncryptionMetadata(metadata: EncryptionMetadata): Record<string, CanonicalPrimitive> {
  const canonical: Record<string, CanonicalPrimitive> = {};
  const keys = Object.keys(metadata) as (keyof EncryptionMetadata)[];
  keys.sort();
  for (const key of keys) {
    const value = metadata[key];
    if (value === undefined || value === null) {
      continue;
    }
    canonical[key as string] = value as CanonicalPrimitive;
  }
  return canonical;
}

export function computeEncryptionMetadataDigest(metadata: EncryptionMetadata): string {
  const canonical = canonicalizeEncryptionMetadata(metadata);
  const encoded = utf8ToBytes(JSON.stringify(canonical));
  const digest = sha256(encoded);
  return `0x${bytesToHex(digest)}`;
}

export function buildSendHandshakeMessage(params: BuildSendHandshakeMessageParams): string {
  const sender = normalizeAddress(params.initiator);
  const recipient = normalizeAddress(params.recipient);
  const paymentTx = normalizePaymentReference(params.paymentTxHash);
  const sentAt = toSafeInteger(params.sentAt);
  const plaintextBytes = toSafeInteger(params.plaintextBytes);
  const ciphertextBytes = toSafeInteger(params.ciphertextBytes);
  const metadataDigest = computeEncryptionMetadataDigest(params.encryption);
  const filename =
    typeof params.originalFilename === 'string' ? sanitizeDisplayValue(params.originalFilename) : '';
  const lines = [
    SEND_HANDSHAKE_HEADER,
    SEND_HANDSHAKE_INTRO,
    '',
    `Sender: ${sender}`,
    `Recipient: ${recipient}`,
    `Chain ID: ${params.chainId}`,
    `Payment Tx: ${paymentTx}`,
    `Sent At (ms): ${sentAt}`,
    `Tier ID: ${toSafeInteger(params.tierId)}`,
    `Plaintext Bytes: ${plaintextBytes}`,
    `Ciphertext Bytes: ${ciphertextBytes}`,
  ];
  if (filename.length > 0) {
    lines.push(`Original Filename: ${filename}`);
  }
  lines.push(`Encryption Metadata SHA-256: ${metadataDigest}`);
  return lines.join('\n');
}
