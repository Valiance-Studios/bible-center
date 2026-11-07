import type {Page} from '@playwright/test';

import {expect} from '@playwright/test';
import {allowEmail} from '../../../../scripts/emulator-admin.ts';

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
  await popup.getByRole('button', {name: 'Add new account'}).click();
  // The emulator's inputs have no accessible names, so select by id.
  await popup.locator('#email-input').fill(user.email);
  await popup.locator('#display-name-input').fill(user.displayName);

  const closed = popup.waitForEvent('close', {timeout: POPUP_CLOSE_TIMEOUT_MS});

  await popup.getByRole('button', {name: 'Sign in with Google.com'}).click();

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

/** Signs in a new allowlisted user, who has no annotations, and waits until the app knows they are signed in. */
export async function signInAsNewAllowedUser(page: Page): Promise<TestUser> {
  const user = createTestUser();

  await allowEmail(user.email);
  await signInWithGoogle(page, user);
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
