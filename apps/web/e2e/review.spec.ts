import type {Page} from '@playwright/test';

import {expect, test} from '@playwright/test';
import {addReport, startTopic} from '../../../scripts/emulator-admin.ts';
import {signInAsNewAllowedUser} from './support/auth';

/** Psalm 34:8, the verse each test's topic starts with. */
const VERSE_ID = '19034008';
const REFERENCE = 'Psalm 34:8';

/** A topic someone started, pending review, unique to this test so tests never see each other's. */
async function startUniqueTopic(label: string): Promise<{name: string; slug: string}> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `e2e ${label} ${id}`;
  const slug = name.replaceAll(/[^a-z0-9]+/g, '-');

  await startTopic(slug, name, VERSE_ID, new Date());

  return {name, slug};
}

async function openAccountMenu(page: Page) {
  await page.getByRole('button', {name: 'Account menu'}).click();
}

test('a reviewer removes a reported verse from its topic', async ({page}) => {
  const {name, slug} = await startUniqueTopic('remove');

  await addReport({topic: slug, verseKey: VERSE_ID, reason: 'reference', details: 'I meant Psalm 34:18.', createdAt: new Date()});
  await signInAsNewAllowedUser(page, 'reviewer');

  await openAccountMenu(page);
  await page.getByRole('menuitem', {name: /^Review/}).click();
  await expect(page).toHaveURL(/\/review$/);

  const item = page.getByRole('article', {name: `${REFERENCE} on ${name}`});

  await expect(item).toContainText('The reference points to the wrong verse');
  await expect(item).toContainText('I meant Psalm 34:18.');
  await expect(item).toContainText('Taste and see that the LORD is good');

  await item.getByRole('button', {name: 'Remove from topic'}).click();
  await expect(item.getByRole('status')).toHaveText(`Removed from ${name}. Its reports are closed.`);

  await page.goto(`/topics/${slug}`);
  await expect(page.getByText('No one has added a verse to this topic yet.')).toBeVisible();

  // Its reports are closed, so it is not waiting any more.
  await page.goto('/review');
  await expect(page.getByRole('button', {name: /^Reports/}).or(page.getByText('Nothing to review'))).toBeVisible();
  await expect(item).toHaveCount(0);
});

test('a reviewer keeps a reported verse', async ({page}) => {
  const {name, slug} = await startUniqueTopic('keep');

  await addReport({topic: slug, verseKey: VERSE_ID, reason: 'fit', createdAt: new Date()});
  await signInAsNewAllowedUser(page, 'reviewer');
  await page.goto('/review');

  const item = page.getByRole('article', {name: `${REFERENCE} on ${name}`});

  await item.getByRole('button', {name: 'Keep it'}).click();
  await expect(item.getByRole('status')).toHaveText(`Kept on ${name}. Its reports are closed.`);

  await page.goto(`/topics/${slug}`);
  await expect(page.getByRole('link', {name: REFERENCE, exact: true})).toBeVisible();
});

test('a reviewer approves one topic, which is then listed, and rejects another, which is hidden', async ({page}) => {
  const approved = await startUniqueTopic('approve');
  const rejected = await startUniqueTopic('reject');

  await signInAsNewAllowedUser(page, 'reviewer');
  await page.goto('/review');
  await page.getByRole('button', {name: /^New topics/}).click();
  await expect(page).toHaveURL(/\?show=topics$/);

  const approvedItem = page.getByRole('article', {name: approved.name});

  await expect(approvedItem).toContainText(REFERENCE);
  await expect(approvedItem).toContainText('1 verse');
  await approvedItem.getByRole('button', {name: 'Approve'}).click();
  await expect(approvedItem.getByRole('status')).toHaveText('Approved. It is now listed on the Topics page.');

  const rejectedItem = page.getByRole('article', {name: rejected.name});

  await rejectedItem.getByRole('button', {name: 'Reject'}).click();
  await expect(rejectedItem.getByRole('status')).toHaveText('Rejected. Its page is hidden.');

  await page.goto('/topics');
  await page.getByLabel('Find a topic').fill(approved.name);
  await expect(page.getByRole('list', {name: 'Matching topics'}).getByRole('link', {name: approved.name})).toBeVisible();

  await page.goto(`/topics/${rejected.slug}`);
  await expect(page.getByText('This topic is not available.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add a verse to this topic'})).toHaveCount(0);
});

test('a member has no Review link and cannot see the page', async ({page}) => {
  await signInAsNewAllowedUser(page);

  await openAccountMenu(page);
  await expect(page.getByRole('menuitem', {name: 'My verses'})).toBeVisible();
  await expect(page.getByRole('menuitem', {name: /^Review/})).toHaveCount(0);
  await expect(page.getByRole('menuitem', {name: 'People'})).toHaveCount(0);

  await page.goto('/review');
  await expect(page.getByText('This page is only for reviewers.')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('Review and People open from the menu, and neither page scrolls sideways', async ({page}) => {
    const {name, slug} = await startUniqueTopic('phone');

    await addReport({topic: slug, verseKey: VERSE_ID, reason: 'fit', details: 'x'.repeat(200), createdAt: new Date()});
    await signInAsNewAllowedUser(page, 'admin');

    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('link', {name: /^Review/}).click();
    await expect(page.getByRole('article', {name: `${REFERENCE} on ${name}`})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('link', {name: 'People'}).click();
    await expect(page.getByRole('heading', {name: 'People'})).toBeVisible();
    await expect(page.getByText('You', {exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
