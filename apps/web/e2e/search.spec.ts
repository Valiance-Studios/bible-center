import type {Page} from '@playwright/test';

import {expect, test} from '@playwright/test';

async function search(page: Page, query: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('searchbox', {name: 'Find a verse, a phrase or a topic'}).fill(query);
  await page.getByRole('button', {name: 'Search', exact: true}).click();
}

test('searching several references from the home page shows each passage', async ({page}) => {
  await search(page, 'John 1:1-3; Acts 2:3-4; Rev 22:13');

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('3 passages')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'John 1:1–3'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Acts 2:3–4'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Revelation 22:13'})).toBeVisible();
  await expect(page.getByText('He was with God in the beginning.')).toBeVisible();
  await expect(page.getByText('Through Him all things were made')).toBeVisible();
  // The verse after the range is left out.
  await expect(page.getByText('In Him was life')).toBeHidden();

  await page.getByRole('link', {name: 'Read Acts 2'}).click();
  await expect(page).toHaveURL(/\/read\/acts\/2$/);
});

test('a passage across chapters labels each chapter', async ({page}) => {
  await search(page, 'John 1:51-2:1');

  await expect(page.getByRole('heading', {name: 'John 1', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'John 2', exact: true})).toBeVisible();
});

test('a verse that does not exist says so', async ({page}) => {
  await search(page, 'John 1:999');

  await expect(page.getByText('Berean Standard Bible has no verses at this reference.')).toBeVisible();
});

test('a remembered paraphrase finds its verse first, and opens it in the reader', async ({page}) => {
  await search(page, 'I do not consider my life of any value nor as precious to myself');

  await expect(page.getByText('Closest matches, best first')).toBeVisible();

  const first = page.getByRole('main').getByRole('article').first();

  await expect(first.getByRole('link')).toHaveText('Acts 20:24');

  await first.getByRole('link').click();

  await expect(page).toHaveURL(/\/read\/acts\/20#v24$/);
  await expect(page.locator('#v24')).toBeInViewport();
});

test('exact wording comes first, with the matched words marked', async ({page}) => {
  await search(page, 'mercies never fail');

  await expect(page.getByText('Exact wording first, then the closest matches')).toBeVisible();

  const first = page.getByRole('main').getByRole('article').first();

  await expect(first.getByRole('link')).toHaveText('Lamentations 3:22');
  await expect(first.locator('mark')).toHaveText(['mercies', 'never', 'fail']);
});

test('search covers the selected translation, which can be changed on the results', async ({page}) => {
  await search(page, 'love is patient');
  await expect(page.getByRole('main').getByRole('article').first().getByRole('link')).toHaveText('1 Corinthians 13:4');

  await page.getByLabel('Translation').selectOption('kjv');

  await expect(page.getByRole('main').getByRole('article').first().getByRole('link')).not.toHaveText('1 Corinthians 13:4');
});

test('no matches explains what to try, including the other translation', async ({page}) => {
  await search(page, 'xylophone');

  await expect(page.getByRole('heading', {name: 'No verses match “xylophone”'})).toBeVisible();
  await expect(page.getByText('This searched the Berean Standard Bible.')).toBeVisible();

  await page.getByRole('button', {name: 'Search the King James Version'}).click();

  await expect(page.getByText('This searched the King James Version.')).toBeVisible();
});

test('a failed search says so and can be retried', async ({page}) => {
  let shouldFail = true;

  await page.route('**/bible/bsb/verses.json', (route) => shouldFail ? route.abort() : route.continue());
  await page.goto('/search?q=mercies%20never%20fail');

  await expect(page.getByText('Could not load these results')).toBeVisible();

  shouldFail = false;
  await page.getByRole('button', {name: 'Try again'}).click();

  await expect(page.getByRole('link', {name: 'Lamentations 3:22'})).toBeVisible();
});

test('search is reachable from every page, and an empty search stays put', async ({page}) => {
  await page.goto('/read/john/1');
  await page.getByRole('banner').getByRole('link', {name: 'Search'}).click();

  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByText('Search by reference')).toBeVisible();

  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect(page).toHaveURL(/\/search$/);
});

test('the back button restores the previous search in the box', async ({page}) => {
  await search(page, 'John 3:16');
  await expect(page.getByRole('heading', {name: 'John 3:16'})).toBeVisible();
  await page.getByRole('searchbox').fill('Romans 8:28');
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Romans 8:28'})).toBeVisible();

  await page.goBack();

  await expect(page.getByRole('heading', {name: 'John 3:16'})).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('John 3:16');
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('search opens from the menu, and results do not scroll sideways', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('link', {name: 'Search'}).click();
    // The URL changes just before the page does, so wait for the search page's own box.
    await expect(page.getByText('Search by reference')).toBeVisible();

    await page.getByRole('searchbox').fill('mercies never fail');
    await page.getByRole('button', {name: 'Search', exact: true}).click();

    await expect(page.getByRole('link', {name: 'Lamentations 3:22'})).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
