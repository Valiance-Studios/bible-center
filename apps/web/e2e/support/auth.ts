import type {Page} from '@playwright/test';
import type {EmulatorRole} from '../../../../scripts/emulator-admin.ts';

import {expect} from '@playwright/test';
import {createGoogleAccount, enrollSmsSecondFactor, googleIdTokenOf, latestSmsCode, setAccountAge, setRole, uidOf} from '../../../../scripts/emulator-admin.ts';

export interface TestUser {
  email: string;
  displayName: string;
}

const POPUP_CLOSE_TIMEOUT_MS = 5_000;

/** A user unique to this call, so tests never affect each other. */
export function createTestUser(name = 'Test User'): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {email: `user-${id}@example.com`, displayName: `${name} ${id}`};
}

/** One pass through the Auth emulator's Google popup. Throws if the popup does not complete. */
async function attemptPopupSignIn(page: Page, user: TestUser): Promise<void> {
  const popupPromise = page.waitForEvent('popup');

  await page.getByRole('button', {name: 'Continue with Google'}).click();

  const popup = await popupPromise;

  // Clicks before the emulator's script has loaded are silently ignored.
  await popup.waitForLoadState('load');

  const closed = popup.waitForEvent('close', {timeout: POPUP_CLOSE_TIMEOUT_MS});
  // An account made beforehand is listed under "Choose an account". Pick it there, as a person would: adding it
  // again gives it a second Google id, and the Auth emulator then breaks every later popup once the account is
  // deleted (firebase-tools 15.35.0 leaves the extra id pointing at the deleted account).
  const existing = popup.locator('.js-reuse-account').filter({hasText: user.email});

  if (await existing.count() > 0) {
    await existing.first().click();
  } else {
    await popup.getByRole('button', {name: 'Add new account'}).click();
    // The emulator's inputs have no accessible names, so select by id.
    await popup.locator('#email-input').fill(user.email);
    await popup.locator('#display-name-input').fill(user.displayName);
    await popup.getByRole('button', {name: 'Sign in with Google.com'}).click();
  }

  try {
    await closed;
  } catch (error) {
    // Closing the popup makes the app's sign-in fail cleanly, so the attempt can be retried.
    await popup.close();
    throw error;
  }
}

/**
 * Signs in through the Auth emulator's Google popup. On a freshly started emulator a popup
 * occasionally ignores the submit, so stuck attempts are retried with a new popup.
 */
export async function signInWithGoogle(page: Page, user: TestUser): Promise<void> {
  await page.goto('/sign-in');

  await expect(async () => {
    await attemptPopupSignIn(page, user);
  }).toPass({timeout: 30_000});
}

/** The test-only module that signs staff in with a second step, as the dev server serves it to the browser. */
const BROWSER_SIGN_IN_MODULE = '/e2e/support/browserSignIn.ts';

interface BrowserSignIn {
  startStaffSignIn: (googleIdToken: string) => Promise<void>;
  finishStaffSignIn: (code: string) => Promise<void>;
}

/** A phone number unique to this call, for the emulator's SMS second factor. */
function testPhoneNumber(): string {
  return `+1555${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
}

/**
 * Signs a staff account in with a second step, as the rules require of reviewers and admins. The Auth emulator offers
 * only SMS, so this enrolls an SMS second factor and signs in through the app's own Auth instance, where the hosted
 * app asks for an authenticator app's code instead.
 */
async function signInAsStaff(page: Page, user: TestUser, accountAgeDays: number): Promise<void> {
  const phoneNumber = testPhoneNumber();

  await enrollSmsSecondFactor(await createGoogleAccount(user), phoneNumber);
  await setAccountAge(await uidOf(user.email), accountAgeDays);
  await page.goto('/');
  await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();
  await page.evaluate(async ({path, token}) => (await import(/* @vite-ignore */ path) as BrowserSignIn).startStaffSignIn(token), {path: BROWSER_SIGN_IN_MODULE, token: googleIdTokenOf(user)});

  const code = await latestSmsCode(phoneNumber);

  await page.evaluate(async ({path, smsCode}) => (await import(/* @vite-ignore */ path) as BrowserSignIn).finishStaffSignIn(smsCode), {path: BROWSER_SIGN_IN_MODULE, smsCode: code});
}

/** Old enough to vote; see `VOTER_MIN_ACCOUNT_DAYS`. */
const ESTABLISHED_ACCOUNT_DAYS = 30;

/**
 * Signs in a new user, who has no annotations, with a role, and waits until the app knows they are
 * signed in. The account is made beforehand and recorded as a month old, so it can vote, unless `accountAgeDays`
 * says otherwise. Reviewers and admins sign in with a second step, as the rules require.
 */
export async function signInAsNewUser(page: Page, role: EmulatorRole = 'member', accountAgeDays = ESTABLISHED_ACCOUNT_DAYS): Promise<TestUser> {
  const user = createTestUser();

  await setRole(user.email, role);

  if (role === 'member') {
    await createGoogleAccount(user);
    await setAccountAge(await uidOf(user.email), accountAgeDays);
    await signInWithGoogle(page, user);
  } else {
    await signInAsStaff(page, user, accountAgeDays);
  }

  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();

  return user;
}

export async function register(page: Page, user: TestUser, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', {name: 'Create an account'}).click();
  await page.getByLabel('Name').fill(user.displayName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(password);
  await page.getByRole('button', {name: 'Create account'}).click();
}
