import type {Page} from '@playwright/test';

import {expect, test} from '@playwright/test';

function panel(page: Page) {
  return page.getByRole('complementary');
}

async function selectVerse(page: Page, verse: number) {
  await page.getByRole('button', {name: `Select verse ${verse}`, exact: true}).click();
}

test('selecting a verse shows its Hebrew words, and a word its meaning, without signing in', async ({page}) => {
  await page.goto('/read/psalms/23');

  await expect(panel(page).getByText('Select a verse to see its Hebrew words.')).toBeVisible();

  await selectVerse(page, 1);
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 1'})).toBeVisible();
  // The title "A Psalm of David" is part of verse 1, as the BSB numbers it.
  await expect(panel(page).getByRole('button', {name: /^מִזְמוֹר, mizmor/})).toHaveAttribute('aria-pressed', 'true');

  await panel(page).getByRole('button', {name: /, ro'i, /}).click();
  await expect(panel(page).getByRole('definition').filter({hasText: 'to pasture, tend, graze, feed'})).toBeVisible();
  await expect(panel(page).getByText('Verb, Qal, participle, masculine, singular, construct')).toBeVisible();
  await expect(panel(page).getByRole('link', {name: 'H7462'})).toHaveAttribute('href', /strong=H7462B/);
  await expect(panel(page).getByRole('link', {name: 'STEP Bible'})).toBeVisible();

  // Deselecting the verse empties the panel again.
  await selectVerse(page, 1);
  await expect(panel(page).getByText('Select a verse to see its Hebrew words.')).toBeVisible();
});

test('arrows step through the words of each selected verse', async ({page}) => {
  await page.goto('/read/psalms/23');
  await selectVerse(page, 1);
  await selectVerse(page, 3);

  const previous = panel(page).getByRole('button', {name: 'Previous verse'});
  const next = panel(page).getByRole('button', {name: 'Next verse'});

  // The panel starts on the first verse of the range, whose number is marked in the text.
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 1'})).toBeVisible();
  await expect(panel(page).getByText('Verse 1 of the 3 selected.')).toBeVisible();
  await expect(previous).toBeDisabled();

  await next.click();
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 2'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Select verse 2', exact: true})).toHaveCSS('text-decoration-line', 'underline');

  await next.click();
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 3'})).toBeVisible();
  await expect(next).toBeDisabled();

  await previous.click();
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 2'})).toBeVisible();

  // A single verse has no arrows.
  await selectVerse(page, 5);
  await expect(panel(page).getByRole('heading', {name: 'Hebrew words in verse 5'})).toBeVisible();
  await expect(next).toHaveCount(0);
});

test('Daniel\'s Aramaic is labeled as Aramaic', async ({page}) => {
  await page.goto('/read/daniel/3');
  await selectVerse(page, 1);

  await expect(panel(page).getByRole('heading', {name: 'Aramaic words in verse 1'})).toBeVisible();
});

test('the Greek follows the translation being read', async ({page}) => {
  await page.goto('/read/john/1');
  await selectVerse(page, 18);

  await expect(panel(page).getByRole('heading', {name: 'Greek words in verse 18'})).toBeVisible();
  await expect(panel(page).getByRole('button', {name: /, theos, “God”/})).toBeVisible();
  await expect(panel(page).getByRole('button', {name: /, huios, /})).toHaveCount(0);

  // The panel follows the translation without selecting the verse again.
  await page.getByLabel('Translation').selectOption('kjv');
  await expect(panel(page).getByRole('button', {name: /, huios, “son”/})).toBeVisible();
  await expect(panel(page).getByRole('button', {name: /, theos, “God”/})).toHaveCount(0);
});

test('the panel stays in view beside a verse far down the chapter', async ({page}) => {
  await page.goto('/read/john/1');
  await selectVerse(page, 51);

  await expect(panel(page).getByRole('heading', {name: 'Greek words in verse 51'})).toBeInViewport();
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('a verse\'s tools open its words in a sheet, and the page does not scroll sideways', async ({page}) => {
    await page.goto('/read/john/1');
    await expect(page.getByRole('complementary')).toHaveCount(0);

    await selectVerse(page, 1);
    await page.getByRole('button', {name: 'Greek words'}).click();

    const sheet = page.getByRole('dialog', {name: 'Greek words'});

    await expect(sheet.getByRole('heading', {name: 'Greek words in verse 1'})).toBeVisible();
    await sheet.getByRole('button', {name: /, archē, /}).click();
    await expect(sheet.getByRole('definition').filter({hasText: 'beginning'}).first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
