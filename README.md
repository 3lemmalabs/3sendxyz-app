# 3sendxyz App

Desktop app (Electron + React + TypeScript) for free encrypted file transfers on top of existing `https://3send.xyz` APIs.

## Current scope

- App-generated local secp256k1 private key (EVM address) on first run
- Free encrypted send flow (micro tier)
- Inbox list + download + decrypt (vault mode)
- Outbox list
- Settings page with app address

Out of scope in this phase:

- Paid sends (R1/USDC/ETH)
- Key backup/import/export
- Automated tests

## Requirements

- Node.js 20+
- npm
- macOS Keychain or Windows Credential Manager (via `keytar`)

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and Electron together via `vite-plugin-electron`.

## Validate

```bash
npm run lint
npm run build
```

## Packaging (unsigned)

```bash
npm run dist
npm run dist:mac
npm run dist:win
```

Notes:

- Config is set for unsigned artifacts by default (`build.mac.identity = null`).
- `dist` command builds and packages the current platform.
- Cross-platform packaging requirements depend on host environment.

## Website dependency

This app expects `https://3send.xyz` API routes to be reachable cross-origin.
