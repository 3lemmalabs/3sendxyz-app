import { VAULT_ACCESS_MESSAGE_PREFIX } from './constants';

export function buildVaultAccessMessage(address: string): string {
  return `${VAULT_ACCESS_MESSAGE_PREFIX} ${address}`;
}
