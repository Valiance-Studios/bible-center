import type {Page} from '@playwright/test';
import type {EmulatorRole} from '../../../scripts/emulator-admin.ts';

import {expect, test} from '@playwright/test';
import {blockAccount, uidOf} from '../../../scripts/emulator-admin.ts';
import {signInAsNewAllowedUser} from './support/auth';

/** Signs in a new account with a role, then blocks it and reloads, so the app learns at sign-in that it is blocked. */
async function signInBlocked(page: Page, role: EmulatorRole = 'member'): Promise<void> {
  const user = await signInAsNewAllowedUser(page, role);

  await blockAccount(await uidOf(user.email), user.email);
}

test('a blocked account is told on a topic why it cannot vote, add verses or report', async ({page}) => {
  await signInBlocked(page);
  await page.goto('/topics/kindness');

  await expect(page.getByText('Your account is blocked, so you cannot upvote, add verses or report.')).toBeVisible();
  await expect(page.getByRole('link', {name: 'bobbyjuba@gmail.com'})).toHaveAttribute('href', 'mailto:bobbyjuba@gmail.com');
  await expect(page.getByRole('button', {name: /^Upvote .*, not available$/}).first()).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Add a verse to this topic'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Report /})).toHaveCount(0);
});

test('a blocked account sees why the reader has no highlight tools, and can still memorize', async ({page}) => {
  await signInBlocked(page);
  await page.goto('/read/john/3');
  await page.getByText('For God so loved the world').click();

  await expect(page.getByText('Your account is blocked, so you cannot highlight, bookmark or add notes.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Highlight', exact: true})).toHaveCount(0);
  await expect(page.getByRole('group', {name: /^Actions for /}).getByRole('link', {name: 'Memorize'})).toBeVisible();
});

test('a blocked account can practice, but its memory list cannot change', async ({page}) => {
  await signInBlocked(page);
  await page.goto('/memorize/practice?passage=Psalm%2023%3A1');

  await expect(page.getByText('Your account is blocked, so your memory list cannot change. You can still practice any verse.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to my memory list'})).toHaveCount(0);
});

test('a blocked admin cannot use the People or Review pages', async ({page}) => {
  await signInBlocked(page, 'admin');

  for (const path of ['/people', '/review']) {
    await page.goto(path);
    await expect(page.getByText('Your account is blocked, so you cannot use this page.')).toBeVisible();
  }
});

test('an account blocked during a visit is told why its report was refused', async ({page}) => {
  const user = await signInAsNewAllowedUser(page);

  await page.goto('/topics/kindness');
  await page.getByRole('button', {name: /^Report /}).first().click();
  await blockAccount(await uidOf(user.email), user.email);

  const dialog = page.getByRole('dialog');

  await dialog.getByRole('radio', {name: 'It does not fit this topic'}).check();
  await dialog.getByRole('button', {name: 'Send report'}).click();
  await expect(dialog.getByRole('alert')).toHaveText('Your account has been blocked, so this could not be sent. If you think this is a mistake, write to bobbyjuba@gmail.com.');
  await expect(dialog.getByRole('button', {name: 'Send report'})).toBeDisabled();

  // The page behind it now shows the blocked notice too.
  await dialog.getByRole('button', {name: 'Cancel'}).click();
  await expect(page.getByText('Your account is blocked, so you cannot upvote, add verses or report.')).toBeVisible();
});
