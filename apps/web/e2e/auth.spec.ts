import {expect, test} from '@playwright/test';
import {confirmEmail} from '../../../scripts/emulator-admin.ts';
import {createTestUser, register, signInWithGoogle} from './support/auth';

const PASSWORD = 'a-long-test-password';

test('anyone with a new Google account reaches the app straight away, and can sign out', async ({page}) => {
  const user = createTestUser();

  await signInWithGoogle(page, user);

  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', {name: 'Account menu'}).click();
  await expect(page.getByText(user.displayName)).toBeVisible();

  await page.getByRole('menuitem', {name: 'Sign out'}).click();
  await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();
});

test('closing the Google popup leaves the page ready without an error', async ({page}) => {
  await page.goto('/sign-in');

  const popupPromise = page.waitForEvent('popup');

  await page.getByRole('button', {name: 'Continue with Google'}).click();

  const popup = await popupPromise;

  await popup.waitForLoadState('load');
  await popup.close();

  await expect(page.getByRole('button', {name: 'Continue with Google'})).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a registered account must confirm its email before it counts', async ({page}) => {
  const user = createTestUser();

  // An unverified password account could claim anyone's email, so it counts for nothing until confirmed.
  await register(page, user, PASSWORD);

  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();

  await page.getByRole('button', {name: 'I confirmed my email'}).click();
  await expect(page.getByText('Your email is not confirmed yet.')).toBeVisible();

  await confirmEmail(user.email);
  await page.getByRole('button', {name: 'I confirmed my email'}).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();
});

test('registering rejects a short password', async ({page}) => {
  await register(page, createTestUser(), 'short');

  await expect(page.getByText('Use at least 10 characters for your password.')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Create an account'})).toBeVisible();
});

test('a wrong password shows an error that does not reveal which field was wrong', async ({page}) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(createTestUser().email);
  await page.getByRole('textbox', {name: 'Password'}).fill(PASSWORD);
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();

  await expect(page.getByText('That email or password is incorrect.')).toBeVisible();
});
