import type {TopicFile} from '@bible-center/core';

import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';
import {formatReference, referenceOf} from '@bible-center/core';

/** The committed data, so these tests follow it when it is refreshed from OpenBible. */
function readTopic(slug: string): TopicFile {
  return JSON.parse(readFileSync(new URL(`../public/topic-data/${slug}.json`, import.meta.url), 'utf8')) as TopicFile;
}

const grief = readTopic('grief');
const [firstStart = '', firstEnd = '', firstVotes = 0] = grief.verses[0] ?? [];
const firstReference = formatReference(referenceOf({startVerse: firstStart, endVerse: firstEnd})!);

test('a common topic on the home page lists its verses, most-voted first', async ({page}) => {
  await page.goto('/');
  await page.getByRole('link', {name: 'grief', exact: true}).click();

  await expect(page).toHaveURL(/\/topics\/grief$/);
  await expect(page.getByRole('heading', {name: 'grief'})).toBeVisible();

  const first = page.getByRole('article').first();

  await expect(first.getByRole('link', {name: firstReference, exact: true})).toBeVisible();
  await expect(first).toContainText(`on Bible Center, ${firstVotes.toLocaleString('en-US')} on OpenBible`);
  await expect(first.locator('p').first()).not.toBeEmpty();
  await expect(page.getByText('Topic votes from')).toContainText('licensed CC BY');
});

test('a long topic shows 20 verses at a time', async ({page}) => {
  await page.goto('/topics/grief');

  await expect(page.getByRole('article')).toHaveCount(20);
  await page.getByRole('button', {name: 'Show more'}).click();
  await expect(page.getByRole('article')).toHaveCount(Math.min(40, grief.verses.length));
});

test('a verse links to its place in the reader', async ({page}) => {
  await page.goto('/topics/grief');
  await page.getByRole('article').first().getByRole('link', {name: firstReference, exact: true}).click();

  await expect(page).toHaveURL(/\/read\/[a-z0-9-]+\/\d+#v\d+$/);
});

test('a topic nobody has added a verse to says so', async ({page}) => {
  await page.goto('/topics/screen-time');

  await expect(page.getByRole('heading', {name: 'screen time'})).toBeVisible();
  await expect(page.getByText('No one has added a verse to this topic yet.')).toBeVisible();
});

test('the Topics page finds topics by name and lists them by letter', async ({page}) => {
  await page.goto('/');
  await page.getByRole('link', {name: 'more topics'}).click();
  await expect(page.getByRole('heading', {name: 'Topics', exact: true})).toBeVisible();

  await page.getByLabel('Find a topic').fill('Grie');
  await page.getByRole('list', {name: 'Matching topics'}).getByRole('link', {name: 'grief', exact: true}).click();
  await expect(page).toHaveURL(/\/topics\/grief$/);
  await page.goBack();

  await page.getByLabel('Find a topic').fill('screen time');
  await expect(page.getByText('No topic is named “screen time” yet.')).toBeVisible();

  await page.getByRole('link', {name: 'G', exact: true}).click();
  await expect(page.getByText(/^\d+ topics starting with G$/)).toBeVisible();
  await page.getByRole('link', {name: 'gambling', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'gambling'})).toBeVisible();
});

test('a search that names a topic links to it', async ({page}) => {
  await page.goto('/search?q=Marriage');

  await page.getByRole('link', {name: /What does the Bible say about\s*marriage/}).click();
  await expect(page).toHaveURL(/\/topics\/marriage$/);
});

test('a search that is not a topic shows no topic link', async ({page}) => {
  await page.goto('/search?q=mercies never fail');

  await expect(page.getByRole('article').first()).toBeVisible();
  await expect(page.getByText('What does the Bible say about')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('the topic and Topics pages do not scroll sideways', async ({page}) => {
    for (const path of ['/topics/grief', '/topics?letter=s']) {
      await page.goto(path);
      await expect(page.getByRole('main').getByRole('link').first()).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
