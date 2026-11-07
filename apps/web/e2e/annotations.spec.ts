import type {Page} from '@playwright/test';

import {expect, test} from '@playwright/test';
import {allowEmail} from '../../../scripts/emulator-admin.ts';
import {createTestUser, signInWithGoogle} from './support/auth';

const VERSE_1 = 'In the beginning was the Word';
const VERSE_2 = 'He was with God in the beginning.';
const VERSE_3 = 'Through Him all things were made';
const VERSE_4 = 'In Him was life';

/** Signs in a new allowlisted user, who has no annotations, and opens John 1. */
async function openChapterAsNewUser(page: Page) {
  const user = createTestUser();

  await allowEmail(user.email);
  await signInWithGoogle(page, user);
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();
  await page.goto('/read/john/1');
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();
  await expect(page.getByText(VERSE_1)).toBeVisible();

  return user;
}

test('someone signed out can read, and is told how to annotate', async ({page}) => {
  await page.goto('/read/john/1');

  await expect(page.getByText('to highlight, bookmark and add notes to verses.')).toBeVisible();

  await page.getByText(VERSE_1).click();

  await expect(page.getByRole('button', {name: 'Highlight'})).toHaveCount(0);
});

test('a verse range can be highlighted, survives a reload, and can be removed', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByText(VERSE_1).click();
  await expect(page.getByText('John 1:1 selected. Select another verse to make a range.')).toBeVisible();

  await page.getByText(VERSE_3).click();
  await expect(page.getByText('John 1:1–3 selected.')).toBeVisible();

  await page.getByRole('button', {name: 'Highlight', exact: true}).click();

  await expect(page.locator('#v1 mark')).toBeVisible();
  await expect(page.locator('#v2 mark')).toBeVisible();
  await expect(page.locator('#v3 mark')).toBeVisible();
  await expect(page.locator('#v4 mark')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('#v2 mark')).toBeVisible();

  // Selecting any part of it offers to remove the highlight.
  await page.getByText(VERSE_2).click();
  await page.getByRole('button', {name: 'Remove highlight'}).click();

  await expect(page.locator('mark')).toHaveCount(0);
});

test('a range selected backwards works too', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByText(VERSE_3).click();
  await page.getByText(VERSE_2).click();

  await expect(page.getByText('John 1:2–3 selected.')).toBeVisible();
});

test('a verse range can be bookmarked, showing the ribbon', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByText(VERSE_2).click();
  await page.getByText(VERSE_4).click();
  await page.getByRole('button', {name: 'Bookmark', exact: true}).click();

  await expect(page.locator('#v2').getByRole('img', {name: 'Bookmarked'})).toBeVisible();

  await page.reload();
  await expect(page.locator('#v2').getByRole('img', {name: 'Bookmarked'})).toBeVisible();

  await page.getByText(VERSE_3).click();
  await page.getByRole('button', {name: 'Remove bookmark'}).click();

  await expect(page.getByRole('img', {name: 'Bookmarked'})).toHaveCount(0);
});

test('a note can be added, edited and deleted', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByText(VERSE_1).click();
  await page.getByRole('button', {name: 'Add note'}).click();
  await expect(page.getByRole('button', {name: 'Save note'})).toBeDisabled();

  await page.getByRole('textbox', {name: 'Note'}).fill('My first thought.');
  await page.getByRole('button', {name: 'Save note'}).click();

  // The dialog closes once the save finishes, and its open text box would also match the note's words.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('My first thought.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', {name: 'Edit note on John 1:1'}).click();
  await page.getByRole('textbox', {name: 'Note'}).fill('A better thought.');
  await page.getByRole('button', {name: 'Save note'}).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('A better thought.')).toBeVisible();
  await expect(page.getByText('My first thought.')).toHaveCount(0);

  await page.getByRole('button', {name: 'Edit note on John 1:1'}).click();
  await page.getByRole('button', {name: 'Delete note'}).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('A better thought.')).toHaveCount(0);
});

test('annotations appear in every translation', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByText(VERSE_2).click();
  await page.getByRole('button', {name: 'Highlight', exact: true}).click();
  await expect(page.locator('#v2 mark')).toBeVisible();

  await page.getByLabel('Translation').selectOption('kjv');

  await expect(page.locator('#v2 mark')).toHaveText('The same was in the beginning with God.');
});

test('a keyboard user can select verses with the number buttons', async ({page}) => {
  await openChapterAsNewUser(page);

  await page.getByRole('button', {name: 'Select verse 2', exact: true}).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('John 1:2 selected.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Select verse 2', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('one user never sees another user\'s annotations', async ({browser}) => {
  const firstContext = await browser.newContext();
  const first = await firstContext.newPage();

  await openChapterAsNewUser(first);
  await first.getByText(VERSE_1).click();
  await first.getByRole('button', {name: 'Highlight', exact: true}).click();
  await expect(first.locator('#v1 mark')).toBeVisible();
  await firstContext.close();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();

  await openChapterAsNewUser(second);
  await expect(second.getByRole('button', {name: 'Select verse 1', exact: true})).toBeVisible();
  await expect(second.locator('mark')).toHaveCount(0);
  await secondContext.close();
});

test('an account not on the allowlist cannot annotate', async ({page}) => {
  await signInWithGoogle(page, createTestUser());
  await expect(page.getByRole('heading', {name: 'Accounts are invite-only for now'})).toBeVisible();

  await page.goto('/read/john/1');
  await expect(page.getByText(VERSE_1)).toBeVisible();
  await page.getByText(VERSE_1).click();

  await expect(page.getByRole('button', {name: 'Highlight'})).toHaveCount(0);
});

test('a signed-in user\'s translation follows them to another browser', async ({browser}) => {
  const firstContext = await browser.newContext();
  const first = await firstContext.newPage();
  const user = await openChapterAsNewUser(first);

  await first.getByLabel('Translation').selectOption('kjv');
  await expect(first.getByLabel('Translation')).toHaveValue('kjv');
  // Give the save a moment to reach the emulator before leaving.
  await first.waitForTimeout(500);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();

  await signInWithGoogle(second, user);
  await expect(second.getByRole('button', {name: 'Account menu'})).toBeVisible();
  await second.getByRole('banner').getByRole('link', {name: 'Read'}).click();

  await expect(second.getByLabel('Translation')).toHaveValue('kjv');
  await secondContext.close();
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('a range can be highlighted, and the page does not scroll sideways', async ({page}) => {
    await openChapterAsNewUser(page);

    await page.getByText(VERSE_1).click();
    await page.getByText(VERSE_2).click();
    await page.getByRole('button', {name: 'Highlight', exact: true}).click();

    await expect(page.locator('#v2 mark')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
