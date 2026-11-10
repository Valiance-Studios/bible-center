import type {Browser, Page} from '@playwright/test';
import type {ChapterText, DailyVerseList} from '@bible-center/core';

import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';
import {automaticDailyVerse, formatReference, referenceOf} from '@bible-center/core';
import {signInAsNewAllowedUser} from './support/auth';

const publicDir = new URL('../public/', import.meta.url);
const automaticList = JSON.parse(readFileSync(new URL('daily-verses.json', publicDir), 'utf8')) as DailyVerseList;

/** The automatic pick for a date, as the home page shows it in the BSB. */
function automaticVerse(date: string) {
  const reference = referenceOf(automaticDailyVerse(automaticList, date));

  if (!reference || reference.startVerse === null || reference.endVerse === null) {
    throw new Error(`No automatic verse for ${date}.`);
  }

  const {startVerse, endVerse} = reference;
  const chapter = JSON.parse(readFileSync(new URL(`bible/bsb/${reference.book.slug}/${reference.startChapter}.json`, publicDir), 'utf8')) as ChapterText;
  const text = chapter.verses.filter(({verse}) => verse >= startVerse && verse <= endVerse).map(({text}) => text).join(' ');

  return {text, label: `${formatReference(reference)}, BSB`, chapter: `${reference.book.name} ${reference.startChapter}`};
}

/** The home page as a signed-out visitor sees it at midday on the date, in their own time zone. */
async function visitHomeOn(browser: Browser, date: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();

  await page.clock.setFixedTime(new Date(`${date}T12:00:00`));
  await page.goto('/');

  return page;
}

// Each test uses its own dates, so tests running at the same time never see each other's choices.

test('the home page shows the automatic verse for the visitor\'s date, linked to its chapter', async ({browser}) => {
  const expected = automaticVerse('2027-03-01');
  const page = await visitHomeOn(browser, '2027-03-01');

  await expect(page.locator('blockquote')).toHaveText(expected.text);
  await expect(page.getByRole('button', {name: 'Set verse of the day'})).toHaveCount(0);

  await page.getByRole('link', {name: expected.label}).click();
  await expect(page.getByRole('heading', {name: expected.chapter})).toBeVisible();
});

test('the verse follows the visitor\'s translation', async ({browser}) => {
  const page = await visitHomeOn(browser, '2027-03-03');

  await page.evaluate(() => localStorage.setItem('bible-center-translation', JSON.stringify({state: {translationId: 'kjv'}, version: 0})));
  await page.reload();

  await expect(page.getByRole('link', {name: /, KJV$/})).toBeVisible();
});

test('an admin chooses a verse for a date, and leaves it to the automatic list again', async ({page, browser}) => {
  const date = '2027-03-02';

  await signInAsNewAllowedUser(page, 'admin');
  await page.goto('/');
  await page.getByRole('button', {name: 'Set verse of the day'}).click();

  const dialog = page.getByRole('dialog', {name: 'Set verse of the day'});

  await dialog.getByLabel('Date').fill(date);
  await expect(dialog.getByRole('radio', {name: /Choose automatically/})).toBeChecked();
  await expect(dialog.getByText(automaticVerse(date).label)).toBeVisible();

  await dialog.getByRole('radio', {name: /Choose a verse/}).click();
  await dialog.getByRole('textbox', {name: 'Verse or passage'}).fill('Lamentations 3:22-99');
  await expect(dialog.getByText('There is no Lamentations 3:22–99 in the Berean Standard Bible.')).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Save verse'})).toBeDisabled();

  await dialog.getByRole('textbox', {name: 'Verse or passage'}).fill('Lamentations 3:22-23');
  await expect(dialog.getByText('Lamentations 3:22–23, BSB')).toBeVisible();
  await dialog.getByRole('button', {name: 'Save verse'}).click();
  await expect(dialog).toBeHidden();

  const visitor = await visitHomeOn(browser, date);

  await expect(visitor.locator('blockquote')).toContainText('His mercies never fail');
  await expect(visitor.getByRole('link', {name: 'Lamentations 3:22–23, BSB'})).toBeVisible();

  // Opening the date again starts from the chosen verse.
  await page.getByRole('button', {name: 'Set verse of the day'}).click();
  await dialog.getByLabel('Date').fill(date);
  await expect(dialog.getByRole('radio', {name: /Choose a verse/})).toBeChecked();
  await expect(dialog.getByRole('textbox', {name: 'Verse or passage'})).toHaveValue('Lamentations 3:22–23');

  await dialog.getByRole('radio', {name: /Choose automatically/}).click();
  await dialog.getByRole('button', {name: 'Save verse'}).click();
  await expect(dialog).toBeHidden();

  await visitor.reload();
  await expect(visitor.locator('blockquote')).toHaveText(automaticVerse(date).text);
});

test('only admins can set the verse', async ({page}) => {
  await signInAsNewAllowedUser(page, 'reviewer');
  await page.goto('/');

  await expect(page.locator('blockquote')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Set verse of the day'})).toHaveCount(0);
});
