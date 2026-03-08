# Swish — Mobile App

## Venmo, but private. Now on Seeker.

Native Android app for **Swish** — private USDC payments on Solana, built for the **dApp Store**.

**Web App:** [swish.cash](https://swish.cash) · **Web Repo:** [privacy-hack](https://github.com/LilFatFrank/privacy-hack)

---

## What is Swish?

Swish is a privacy-preserving payments app. Send and receive USDC on Solana without exposing sender or receiver addresses on-chain. Think Venmo but with zero-knowledge privacy.

This repo is the **mobile app**. It connects to the same backend API as the web app and provides full feature parity.

---

## What You Can Do

- **Send to a wallet address** — Enter an address (or scan a QR code) and send USDC privately through the ZK pool
- **Send to an X (Twitter) handle** — Send USDC to anyone by their Twitter username — no wallet address needed
- **Scan & Send** — Use the built-in QR scanner to scan a wallet address and send instantly
- **Send via Claim Link** — Generate a passphrase-protected claim link; share the link anywhere, share the passphrase privately — receiver claims when ready
- **Request Payment** — Create a payment request and share the link; anyone can fulfil it through the privacy pool
- **Fulfil a Request** — Open a request link and pay it — funds go through the ZK pool
- **Claim Money** — Open a claim link, enter the passphrase, and receive USDC
- **Deposit** — View your wallet QR code and address to receive SOL or USDC from any external wallet
- **Withdraw** — Gas-sponsored USDC transfer out of your embedded wallet (we pay the gas)
- **Export Wallet** — Export your Privy embedded wallet private key (redirects to web for Twitter wallets)
- **View Activity** — Full transaction history on your profile — sends, receives, claims, requests
- **Deep Linking** — Claim links (`swish.cash/c/*`) and request links (`swish.cash/r/*`) open directly in the app
- **Haptic Feedback** — Tactile response on all interactive elements

---

## Wallet Support

### Mobile Wallet Adapter (MWA)
Connect your Seeker's built-in wallet. Transactions are signed natively through MWA — no browser popups.

### Privy Embedded Wallets
Sign in with X (Twitter). No external wallet needed. Privy creates and manages an embedded Solana wallet for you.

Both wallet types work seamlessly across all features.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 54 (React Native) |
| **UI** | NativeWind v4 (Tailwind CSS for RN) |
| **Auth** | Privy (`@privy-io/expo`) — Twitter login + embedded wallets |
| **Wallet** | MWA (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`) |
| **Icons** | react-native-svg-transformer |
| **Build** | EAS Build (development, preview, production profiles) |
| **Backend** | Shared with web app ([swish.cash](https://swish.cash) API) |

---

## Project Structure

```
src/
├── components/       # Shared UI components (modals, buttons, inputs)
├── constants/        # API base URL, config
├── hooks/            # useMWA, useSessionSignature, custom hooks
├── providers/        # AuthProvider (unified Privy + MWA bridge)
├── screens/          # Home, Profile, Claim, Request screens
├── utils/            # haptics, formatError, helpers
└── assets/           # SVG icons, images
```

### Key Files

| File | Purpose |
|------|---------|
| `src/providers/AuthProvider.tsx` | Unified auth bridging Privy + MWA |
| `src/hooks/useMWA.ts` | MWA hook (authorize, sign, disconnect) |
| `src/hooks/useSessionSignature.ts` | Session management with expo-secure-store |
| `src/constants/api.ts` | API_BASE_URL (dev → localhost, prod → swish.cash) |
| `src/utils/haptics.ts` | Vibration feedback (RN Vibration API) |
| `src/utils/formatError.ts` | Maps raw errors to user-friendly messages |
| `metro.config.js` | NativeWind + SVG transformer config |

---

## Deep Linking

Claim and request links open directly in the app:

- `https://swish.cash/c/{id}` → Claim screen
- `https://swish.cash/r/{id}` → Request screen

Android App Links are auto-verified via `assetlinks.json` deployed at `swish.cash/.well-known/assetlinks.json`.

---

## Build & Run

### Prerequisites
- Node.js 20+
- EAS CLI (`npm install -g eas-cli`)
- Android device (Seeker) or emulator

### Environment Variables

Set via EAS Secrets (`eas secret:create`):

```
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_RPC_URL=
```

### Development Build

```bash
npm install
eas build --profile development --platform android
# Install on device, then:
npx expo start
```

### Preview Build (Standalone APK)

```bash
eas build --profile preview --platform android
# Downloads a standalone APK — no dev server needed
```

### Production Build

```bash
eas build --profile production --platform android
```

### Build Profiles

| Profile | Description |
|---------|-------------|
| **development** | Dev client, needs dev server, Node 20.19.4 |
| **preview** | Standalone APK, bundled JS, internal distribution |
| **production** | Auto-increment version, release signing, for dApp Store |

---

## How Privacy Works

Every payment flows through a **zero-knowledge privacy pool** (PrivacyCash):

```
Sender → Privacy Pool → Receiver
         (ZK proof)
```

On-chain, these appear as two unrelated transactions. Off-chain, money moved from sender to receiver. No one can trace the connection.

For claim links, funds go through a **burner wallet** — an ephemeral wallet encrypted with a passphrase. The receiver enters the passphrase to claim. The sender can reclaim anytime.

All ZK proof generation and pool interactions happen server-side. The mobile app signs transactions and communicates with the backend API.

---

## Links

- **Live App:** [swish.cash](https://swish.cash)
- **Web Repo:** [privacy-hack](https://github.com/LilFatFrank/privacy-hack)
- **Privacy Cash Protocol:** [privacy.cash](https://privacy.cash)

---

**Swish: Venmo, but private.**
