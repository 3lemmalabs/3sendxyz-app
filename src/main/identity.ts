import keytar from 'keytar';
import { type Hex, isHex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const SERVICE_NAME = '3sendxyz-app';
const ACCOUNT_NAME = 'identity-private-key';

let cachedPrivateKey: Hex | null = null;
let cachedAddress: string | null = null;

function assertPrivateKey(value: string | null): Hex | null {
  if (!value) return null;
  if (!isHex(value, { strict: true }) || value.length !== 66) {
    return null;
  }
  return value as Hex;
}

async function loadOrCreatePrivateKey(): Promise<Hex> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const stored = assertPrivateKey(await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME));
  if (stored) {
    cachedPrivateKey = stored;
    return stored;
  }

  const generated = generatePrivateKey();
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, generated);
  cachedPrivateKey = generated;
  return generated;
}

export async function getAddress(): Promise<string> {
  if (cachedAddress) return cachedAddress;
  const privateKey = await loadOrCreatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  cachedAddress = account.address;
  return account.address;
}

export async function signMessage(message: string): Promise<Hex> {
  const trimmed = typeof message === 'string' ? message : '';
  if (!trimmed) {
    throw new Error('Message is required for signature.');
  }
  const privateKey = await loadOrCreatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return account.signMessage({ message: trimmed });
}
