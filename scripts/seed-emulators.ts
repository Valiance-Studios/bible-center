/**
 * Seeds the local emulators with an account that can use the app.
 *
 * Usage: node scripts/seed-emulators.ts (run by `npm run emulators` once the emulators are ready)
 *
 * Firestore only lets allowlisted accounts in, and emulator data is not kept between runs, so
 * without this every local session would start with an account that has no access. The rules are
 * not relaxed for local work; the account is simply put on the allowlist, as it would be in production.
 */
import type {EmulatorAccount} from './emulator-admin.ts';

import {allowEmail, createGoogleAccount} from './emulator-admin.ts';

const DEV_ACCOUNT: EmulatorAccount = {email: 'dev@example.com', displayName: 'Dev User'};

await createGoogleAccount(DEV_ACCOUNT);
await allowEmail(DEV_ACCOUNT.email);

console.log(`Seeded ${DEV_ACCOUNT.displayName} (${DEV_ACCOUNT.email}): pick it under "Choose an account" in the sign-in popup.`);
