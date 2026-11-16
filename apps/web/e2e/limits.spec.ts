import type {Page} from '@playwright/test';
import type {SeedUserRecord} from '../../../scripts/emulator-admin.ts';

import {expect, test} from '@playwright/test';
import {uidOf, updateUserRecord} from '../../../scripts/emulator-admin.ts';
import {signInAsNewUser} from './support/auth';

/** Signs in a new user whose record already has these fields, as though they had used up a limit. */
async function signInWithRecord(page: Page, record: SeedUserRecord): Promise<void> {
  const user = await signInAsNewUser(page);

  await updateUserRecord(await uidOf(user.email), record);
}

const A_MOMENT_AGO = () => new Date(Date.now() - 5_000);

test('a second report within a minute says when another can be sent', async ({page}) => {
  await signInWithRecord(page, {lastReportAt: A_MOMENT_AGO()});
  await page.goto('/topics/peace');
  await page.getByRole('article').first().getByRole('button', {name: /^Report /}).click();

  const dialog = page.getByRole('dialog');

  await dialog.getByRole('radio', {name: 'It does not fit this topic'}).check();
  await dialog.getByRole('button', {name: 'Send report'}).click();
  await expect(dialog.getByText(/^You sent a report a moment ago\. You can send another at \d{1,2}:\d{2} [AP]M\.$/)).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Send report'})).toBeDisabled();
});

test('starting a second topic within ten minutes says when another can be started', async ({page}) => {
  await signInWithRecord(page, {lastTopicAt: A_MOMENT_AGO()});
  await page.goto(`/topics/limits-${Date.now().toString(36)}`);
  await page.getByRole('button', {name: 'Add a verse to this topic'}).click();
  await page.getByLabel('Verse or passage').fill('Romans 12:15');
  await expect(page.getByRole('dialog').getByText('Rejoice with those who rejoice')).toBeVisible();
  await page.getByRole('button', {name: 'Add verse'}).click();

  await expect(page.getByText(/^You started a topic a few minutes ago\. You can start another at \d{1,2}:\d{2} [AP]M\./)).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add verse'})).toBeDisabled();
});

test('a full account is told to remove annotations before adding more', async ({page}) => {
  await signInWithRecord(page, {annotationCount: 5000});
  await page.goto('/read/john/3');
  await page.getByText('For God so loved the world').click();
  await page.getByRole('button', {name: 'Highlight', exact: true}).click();

  await expect(page.getByRole('alert')).toHaveText('You have 5,000 highlights, bookmarks and notes, the most one account can keep. Remove some in My verses to add more.');
  await expect(page.getByRole('alert').getByRole('link', {name: 'My verses'})).toHaveAttribute('href', '/my-verses');
});

test('a full memory list says so, and practice still works', async ({page}) => {
  await signInWithRecord(page, {memoryVerseCount: 500});
  await page.goto('/memorize/practice?passage=Psalm%2023%3A1');
  await page.getByRole('button', {name: 'Add to my memory list'}).click();

  await expect(page.getByRole('alert')).toHaveText('Your memory list has 500 verses, the most it can hold. Remove some from your list to add this one. You can still practice it.');
});
