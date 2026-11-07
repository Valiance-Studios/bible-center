# Development Guide

Setting up a machine, running the app, testing, and known quirks. The diagram under "Environments and Delivery" in [ARCHITECTURE.md](../ARCHITECTURE.md#environments-and-delivery) shows which command talks to which backend.

## Setup

- Requires Java 21+ for the Firestore emulator. `firebase-tools` is a dev dependency.
- New machine: `nvm install 26`, `nvm use 26`, `npm ci`, then `npx playwright install chromium`. The first emulator run downloads the emulator binaries.

## Repository Conventions

Run every command from the repository root. The root holds the commands, shared tool config (ESLint, the base `tsconfig`, the Vitest workspace) and Firebase project files. Anything specific to one workspace, such as its Vite and Playwright config, env files and tests, lives in that workspace.

## Running Locally

- `npm run emulators` in one terminal and `npm run dev` in another. The app is at http://localhost:5173 and the Emulator UI at http://127.0.0.1:4000.
- Development runs against the **Firebase Local Emulator Suite** using the `demo-bible-center` project. The `demo-` prefix guarantees no real Firebase resources are touched.
- `npm run dev:staging` runs the dev server against the hosted project (`apps/web/.env.staging`), with the real allowlist. It needs an App Check debug token in `apps/web/.env.staging.local` (see [Debug Token](DEPLOYMENT.md#debug-token)). It must run on port 5173, the only local port allowed on the API key (see [API Key Restrictions](DEPLOYMENT.md#api-key-restrictions)).

### Seed Data

`npm run emulators` seeds **Dev User (`dev@example.com`)**, a verified Google account on the allowlist, on every start, since emulator data is not kept between runs. Pick it under "Choose an account" in the sign-in popup. The rules are not relaxed for local work.

To try another account, add `allowedUsers/<lowercase email>` with no fields in the Emulator UI.

### Emulator Scripts

- `scripts/emulator-admin.ts` holds admin helpers for seeding and tests. It refuses to run against a project id without the `demo-` prefix.
- `scripts/with-emulators.ts` runs a command against the emulators and then stops them. `npm run test:emulator` and `npm run test:e2e` use it, so stop any `npm run emulators` session first, as they share ports.
- `npm run emulators:stop` stops this project's emulators, including leftovers from a crashed run. It never stops an unrelated server on a shared port; it reports it instead.

## Generated Files

Both are committed, so a normal build does not regenerate them.

- `npm run bible-data` rebuilds `apps/web/public/bible` from its online sources. Only add public-domain text; see [Translations](../ARCHITECTURE.md#translations).
- `npm run icons` rebuilds the icon PNGs in `apps/web/public` from `favicon.svg`.

## Environment Files

The files live in `apps/web`, since only the web app reads `VITE_` variables. There is one file per Vite mode and no bare `.env`, since Vite loads that in every mode and could point `npm run dev` and the E2E tests at real Firebase. Vite does not layer modes, so each file holds a complete config.

| File | Committed | Used for |
| --- | --- | --- |
| `.env.development` | Yes | The emulators (`demo-bible-center`): `npm run dev`, the seed, and the E2E tests. Vite's default mode. |
| `.env.staging` | Yes | The hosted project (`vs-bible-center-dev`): `npm run dev:staging`, `npm run build:staging`, and every deploy. Firebase web config is compiled into the public site, so it is not secret. |
| `.env.production` | Yes | Reserved for a future production project. None exists yet, so nothing builds with it. |
| `.env.example` | Yes | Template for a new env file. |
| `.env.<mode>.local` | No | Personal, machine-specific overrides, such as the App Check debug token in `.env.staging.local`. |

Never put real secrets in `VITE_` variables, as they end up in the bundle. The project uses Firestore's `(default)` database because it has its own Firebase project, so there is no `VITE_FIREBASE_DATABASE_ID`.

## Testing

Before opening a pull request, run `npm run lint`, `npm run type-check`, `npm run build`, `npx vitest run`, `npm run test:emulator`, and `npm run test:e2e`.

| Command | Runs | Where |
| --- | --- | --- |
| `npx vitest run` | Unit tests in jsdom (web) or Node (others) | `apps/web/tests`, `packages/core/tests`, `tests/scripts` |
| `npm run test:emulator` | Security rules against the Firestore emulator | `tests/rules` |
| `npm run test:e2e` | Playwright against the dev server and emulators, configured by `apps/web/playwright.config.ts` | `apps/web/e2e` |

**Keep copyrighted text out of tests.** Fixtures must use public-domain translations or invented text. See [ESV Rules](../ARCHITECTURE.md#esv-rules).

## Linting

ESLint (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `@stylistic` (semicolons, single quotes, 1tbs braces, always-parenthesized arrow params, no spaces inside object braces). Run `npm run lint` or `npm run lint:fix`. Other conventions are in [CLAUDE.md](../CLAUDE.md#code-style).

## Known Quirks

- **E2E tests never reuse a running dev server.** They start their own on port 5174 in development mode, so they always use the emulators, even with `npm run dev:staging` running. Reusing a staging server once made them create real accounts in the hosted project.
- **npm audit:** production dependencies are clean, using `overrides` in `package.json` for a newer `@grpc/grpc-js` under the Firestore SDK. Moderate findings remain in dev tooling (`firebase-tools`, `eslint`, `typescript-eslint`), where the only suggested fixes are major downgrades.
- **Install scripts:** npm does not run dependencies' install scripts unless approved. The test suites and build pass without them.
- **TypeScript:** stays on 6.0 until `typescript-eslint` supports 7.
- **Workspace packages:** `packages/core` exports TypeScript source and has no build step, so Vite compiles it as part of the app. Its `tsconfig` has no project reference from `apps/web`, because `tsc --build` rejects references to projects that use `noEmit`.
