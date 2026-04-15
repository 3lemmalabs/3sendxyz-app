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

## Packaging

```bash
npm run dist
npm run dist:mac
npm run dist:win
npm run dist:release
```

Notes:

- `dist` command builds and packages the current platform.
- `dist:mac` builds a universal macOS binary (`arm64` + `x64`).
- Cross-platform packaging requirements depend on host environment.
- Builds are signed automatically when signing credentials are available in environment variables.

## Signing setup

macOS signing + notarization (build on macOS):

- `APPLE_API_KEY`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`
- `CSC_LINK` and `CSC_KEY_PASSWORD` for the Developer ID Application certificate (or certificate installed in Keychain discoverable by electron-builder)

Alternative macOS notarization auth is also supported by electron-builder:

- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`

Windows code signing:

- `CSC_LINK` (path/URL/base64 to `.p12`/`.pfx` certificate)
- `CSC_KEY_PASSWORD`

When these variables are present, `electron-builder` signs Windows artifacts and signs/notarizes macOS artifacts using the config in `package.json`.

## GitHub Release Workflow

Workflow: `/Users/alessandro/programmazione/3send/3sendxyz-app/.github/workflows/release.yml`

- Trigger: push a tag matching `v*` (example: `v0.2.0`)
- Jobs:
  - build signed/notarized macOS artifacts
  - build signed Windows artifacts
  - publish all artifacts into a GitHub Release for that tag

Required repository secrets:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- macOS notarization:
  - `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`
  - or `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- Optional Windows-specific override:
  - `WIN_CSC_LINK`
  - `WIN_CSC_KEY_PASSWORD`

## Website dependency

This app expects `https://3send.xyz` API routes to be reachable cross-origin.

```bibtex
@software{butusina2025_3sendxyz_app,
  author       = {Butusina, Petrica and Defranceschi, Alessandro},
  title        = {{3sendxyz App}: End-to-end encrypted, decentralized file transfer downloadable app},
  year         = {2025},
  url          = {https://github.com/3lemmalabs/3sendxyz-app},
  organization = {3lemma Labs},
  note         = {Software library}
}
```
