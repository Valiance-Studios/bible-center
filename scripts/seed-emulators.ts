/**
 * Seeds the local emulators with an admin account that can use the whole app.
 *
 * Usage: node scripts/seed-emulators.ts (run by `npm run emulators` once the emulators are ready)
 *
 * Emulator data is not kept between runs, so without this every local session would start with no admin
 * to try the People and Review pages with. The rules are not relaxed for local work; the account is simply given
 * the admin role, as it would be in production.
 */
import type {EmulatorAccount} from './emulator-admin.ts';

import {createGoogleAccount, setRole} from './emulator-admin.ts';

const DEV_ACCOUNT: EmulatorAccount = {email: 'dev@example.com', displayName: 'Dev User'};

await createGoogleAccount(DEV_ACCOUNT);
await setRole(DEV_ACCOUNT.email, 'admin');

console.log(`Seeded ${DEV_ACCOUNT.displayName} (${DEV_ACCOUNT.email}), an admin: pick it under "Choose an account" in the sign-in popup.`);
