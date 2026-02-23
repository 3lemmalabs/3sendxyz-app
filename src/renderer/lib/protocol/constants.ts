import type { TierConfig } from './types';

export const API_BASE_URL = 'https://3send.xyz';

export const VAULT_ACCESS_MESSAGE_PREFIX = '3send vault private key access for';
export const FREE_MICRO_SENDS_PER_MONTH = 3;
export const FREE_MICRO_TIER_ID = 0;
export const FREE_PAYMENT_REFERENCE_PREFIX = 'free:';
export const FILE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
export const REQUIRED_CHAIN_ID = 8453;
export const REQUIRED_CHAIN_NAME = 'Base';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const TIER_CONFIG: TierConfig[] = [
  {
    id: 0,
    label: 'Micro Send',
    description: 'Best for quick transfers up to 50 MB.',
    minBytes: 0,
    maxBytes: 50 * MB - 1,
    usd: 0.05,
  },
  {
    id: 1,
    label: 'Standard Send',
    description: 'Recommended for documents and medium files.',
    minBytes: 50 * MB,
    maxBytes: 500 * MB - 1,
    usd: 0.1,
  },
  {
    id: 2,
    label: 'Big Send',
    description: 'Great for large media or project bundles.',
    minBytes: 500 * MB,
    maxBytes: 2 * GB - 1,
    usd: 0.4,
  },
  {
    id: 3,
    label: 'Archive Send',
    description: 'For archives and heavy payloads up to 5 GB.',
    minBytes: 2 * GB,
    maxBytes: 5 * GB,
    usd: 1,
  },
];

export const FREE_MICRO_MAX_BYTES = TIER_CONFIG[0].maxBytes;

export function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
