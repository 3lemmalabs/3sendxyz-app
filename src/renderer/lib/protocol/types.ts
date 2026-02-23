export type EncryptionMetadata = {
  version: string;
  algorithm: string;
  keyDerivation?: string;
  ephemeralPublicKey: string;
  iv: string;
  recipientPublicKey?: string;
  plaintextLength?: number;
  ciphertextLength?: number;
  recipient?: string;
  keySource?: 'vault' | 'passkey' | 'seed';
  noteCiphertext?: string;
  noteIv?: string;
  noteEncoding?: 'utf-8';
  noteLength?: number;
};

export type StoredUploadRecord = {
  cid: string;
  filename: string;
  recipient: string;
  initiator: string;
  note?: string;
  txHash: string;
  filesize: number;
  sentAt: number;
  tierId: number;
  usdcAmount: string;
  r1Amount: string;
  paymentType?: 'free' | 'paid';
  paymentAsset?: string;
  originalFilename?: string;
  originalMimeType?: string;
  originalFilesize?: number;
  encryptedFilesize?: number;
  encryption?: EncryptionMetadata;
};

export type FreeSendAllowance = {
  month: string;
  used: number;
  remaining: number;
  limit: number;
  resetsAt: number;
};

export type TierConfig = {
  id: number;
  label: string;
  description: string;
  minBytes: number;
  maxBytes: number;
  usd: number;
};

export type ReceiverKeyResult = {
  publicKey: string;
  type: 'vault' | 'passkey' | 'seed';
};
