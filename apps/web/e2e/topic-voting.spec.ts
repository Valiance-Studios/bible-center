import type {Page} from '@playwright/test';
import type {TopicFile} from '@bible-center/core';

import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';
import {formatReference, referenceOf} from '@bible-center/core';
import {signInAsNewAllowedUser} from './support/auth';

/** The most-voted verse of a topic in the committed data. Each test uses its own topic, so tests never share counts. */
function topVerseOf(slug: string): string {
  const topic = JSON.parse(readFileSync(new URL(`../public/topic-data/${slug}.json`, import.meta.url), 'utf8')) as TopicFile;
  const [startVerse = '', endVerse = ''] = topic.verses[0] ?? [];

  return formatReference(referenceOf({startVerse, endVerse})!);
}

/** The row of a verse on the open topic. */
function rowOf(page: Page, reference: string) {
  return page.getByRole('article').filter({has: page.getByRole('link', {name: reference, exact: true})});
}

async function openTopic(page: Page, slug: string) {
  await page.goto(`/topics/${slug}`);
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add a verse to this topic'})).toBeVisible();
}

test('someone signed out sees the counts, and is asked to sign in to vote', async ({page}) => {
  const reference = topVerseOf('patience');

  await page.goto('/topics/patience');

  await expect(page.getByText('to upvote, add a verse or report one.')).toBeVisible();
  await expect(rowOf(page, reference)).toContainText('0 on Bible Center');
  await rowOf(page, reference).getByRole('link', {name: `Sign in to upvote ${reference}`}).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('an upvote counts, survives a reload, and can be removed', async ({page}) => {
  const reference = topVerseOf('kindness');

  await signInAsNewAllowedUser(page);
  await openTopic(page, 'kindness');

  await rowOf(page, reference).getByRole('button', {name: `Upvote ${reference}`}).click();
  await expect(rowOf(page, reference).getByRole('button', {name: `Remove your upvote from ${reference}`})).toHaveAttribute('aria-pressed', 'true');
  await expect(rowOf(page, reference)).toContainText('1 on Bible Center');

  await page.reload();
  await expect(rowOf(page, reference)).toContainText('1 on Bible Center');

  await rowOf(page, reference).getByRole('button', {name: `Remove your upvote from ${reference}`}).click();
  await expect(rowOf(page, reference).getByRole('button', {name: `Upvote ${reference}`})).toHaveAttribute('aria-pressed', 'false');
  await expect(rowOf(page, reference)).toContainText('0 on Bible Center');
});

test('a verse can be added, counting as an upvote, but not twice or one that does not exist', async ({page}) => {
  const listed = topVerseOf('hope');

  await signInAsNewAllowedUser(page);
  await openTopic(page, 'hope');
  await page.getByRole('button', {name: 'Add a verse to this topic'}).click();

  const dialog = page.getByRole('dialog', {name: 'Add a verse to hope'});
  const box = dialog.getByLabel('Verse or passage');

  await box.fill(listed);
  await expect(dialog.getByText(`${listed} is already on this topic. Upvote it there instead.`)).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Add verse'})).toBeDisabled();

  await box.fill('John 1:99');
  await expect(dialog.getByText('There is no John 1:99 in the Berean Standard Bible.')).toBeVisible();

  await box.fill('banana');
  await expect(dialog.getByText('Enter one reference, such as Romans 12:15 or Psalm 23:1-4.')).toBeVisible();

  await box.fill('John 11:35');
  await expect(dialog.getByText('Jesus wept.')).toBeVisible();
  await dialog.getByRole('button', {name: 'Add verse'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect(rowOf(page, 'John 11:35')).toContainText('1 on Bible Center');
  await expect(rowOf(page, 'John 11:35')).not.toContainText('OpenBible');
  await expect(rowOf(page, 'John 11:35').getByRole('button', {name: 'Remove your upvote from John 11:35'})).toBeVisible();
});

test('adding the first verse to a topic nobody has starts it', async ({page}) => {
  const slug = `screen-time-${Date.now().toString(36)}`;

  await signInAsNewAllowedUser(page);
  await page.goto(`/topics/${slug}`);
  await expect(page.getByText('No one has added a verse to this topic yet. Add one that speaks to it')).toBeVisible();

  await page.getByRole('button', {name: 'Add a verse to this topic'}).click();
  await page.getByLabel('Verse or passage').fill('Romans 12:15');
  await expect(page.getByRole('dialog').getByText('Rejoice with those who rejoice')).toBeVisible();
  await page.getByRole('button', {name: 'Add verse'}).click();

  await expect(rowOf(page, 'Romans 12:15')).toContainText('1 on Bible Center');
  await page.reload();
  await expect(page.getByRole('heading', {name: slug.replaceAll('-', ' ')})).toBeVisible();
  await expect(rowOf(page, 'Romans 12:15')).toBeVisible();
});

test('a verse can be reported for review', async ({page}) => {
  const reference = topVerseOf('joy');

  await signInAsNewAllowedUser(page);
  await openTopic(page, 'joy');
  await rowOf(page, reference).getByRole('button', {name: `Report ${reference}`}).click();

  const dialog = page.getByRole('dialog', {name: `Report ${reference} on joy`});

  await expect(dialog.getByRole('button', {name: 'Send report'})).toBeDisabled();
  await dialog.getByRole('radio', {name: 'It does not fit this topic'}).check();
  await dialog.getByLabel('Details (optional)').fill('A test report.');
  await dialog.getByRole('button', {name: 'Send report'}).click();
  await expect(dialog.getByText('Thank you. Someone will review this report.')).toBeVisible();
  await dialog.getByRole('button', {name: 'Done'}).click();

  await expect(rowOf(page, reference).getByText('Reported')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('voting works, and the page does not scroll sideways', async ({page}) => {
    const reference = topVerseOf('peace');

    await signInAsNewAllowedUser(page);
    await openTopic(page, 'peace');
    await rowOf(page, reference).getByRole('button', {name: `Upvote ${reference}`}).click();
    await expect(rowOf(page, reference)).toContainText('1 on Bible Center');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
