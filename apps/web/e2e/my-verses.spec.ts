import type {Page} from '@playwright/test';

import {expect, test} from '@playwright/test';
import {addAnnotations, uidOf} from '../../../scripts/emulator-admin.ts';
import {signInAsNewAllowedUser} from './support/auth';

/** Opens a chapter in the reader and waits until it can be annotated. */
async function openChapter(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();
  await expect(page.locator('#v1')).toBeVisible();
}

/** Selects verses in the open chapter, then highlights or bookmarks them. */
async function mark(page: Page, verses: number[], action: 'Highlight' | 'Bookmark') {
  for (const verse of verses) {
    await page.locator(`#v${verse}`).click();
  }

  await page.getByRole('button', {name: action, exact: true}).click();
  await expect(page.getByRole('button', {name: action, exact: true})).toHaveCount(0);
}

async function addNote(page: Page, verse: number, text: string) {
  await page.locator(`#v${verse}`).click();
  await page.getByRole('button', {name: 'Add note'}).click();
  await page.getByRole('textbox', {name: 'Note'}).fill(text);
  await page.getByRole('button', {name: 'Save note'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function openMyVerses(page: Page) {
  await page.getByRole('button', {name: 'Account menu'}).click();
  await page.getByRole('menuitem', {name: 'My verses'}).click();
  await expect(page.getByRole('heading', {name: 'My verses'})).toBeVisible();
}

function references(page: Page) {
  return page.getByRole('article').getByRole('link');
}

test('someone signed out is asked to sign in', async ({page}) => {
  await page.goto('/my-verses');

  await expect(page.getByText('Sign in to see the verses you highlight, bookmark and add notes to.')).toBeVisible();
  await page.getByRole('main').getByRole('link', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('with nothing saved, it explains how to start', async ({page}) => {
  await signInAsNewAllowedUser(page);
  await openMyVerses(page);

  await expect(page.getByText('Verses you highlight, bookmark or add notes to will appear here.')).toBeVisible();
  await page.getByRole('link', {name: 'Read the Bible'}).click();
  await expect(page).toHaveURL(/\/read\/genesis\/1$/);
});

test('it lists highlights, bookmarks and notes, filtered and ordered, in the selected translation', async ({page}) => {
  await signInAsNewAllowedUser(page);
  await openChapter(page, '/read/genesis/1');
  await addNote(page, 1, 'A thought on creation.');
  await openChapter(page, '/read/psalms/23');
  await mark(page, [1], 'Bookmark');
  await openChapter(page, '/read/john/1');
  await mark(page, [1, 3], 'Highlight');

  await openMyVerses(page);

  await expect(references(page)).toHaveText(['John 1:1–3', 'Psalm 23:1', 'Genesis 1:1']);
  await expect(page.getByRole('article').filter({hasText: 'John 1:1–3'}).locator('mark')).toContainText('Through Him all things were made');
  await expect(page.getByText('A thought on creation.')).toBeVisible();

  await page.getByLabel('Order').selectOption('bible');
  await expect(references(page)).toHaveText(['Genesis 1:1', 'Psalm 23:1', 'John 1:1–3']);

  await page.getByRole('button', {name: 'Notes', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Notes', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(references(page)).toHaveText(['Genesis 1:1']);
  await expect(page.getByText('In the beginning God created the heavens and the earth.')).toBeVisible();

  await page.getByLabel('Translation').selectOption('kjv');
  await expect(page.getByText('In the beginning God created the heaven and the earth.')).toBeVisible();

  // The filter and order are kept in the URL, so they survive a reload or a trip to the reader.
  await page.reload();
  await expect(references(page)).toHaveText(['Genesis 1:1']);

  await page.getByRole('button', {name: 'Highlights', exact: true}).click();
  await page.getByRole('link', {name: 'John 1:1–3'}).click();
  await expect(page).toHaveURL(/\/read\/john\/1#v1$/);
  await page.goBack();
  await expect(references(page)).toHaveText(['John 1:1–3']);
});

test('removing asks first, then takes it off the list and out of the reader', async ({page}) => {
  await signInAsNewAllowedUser(page);
  await openChapter(page, '/read/psalms/23');
  await mark(page, [1], 'Bookmark');
  await mark(page, [2], 'Highlight');

  await openMyVerses(page);
  await expect(references(page)).toHaveText(['Psalm 23:2', 'Psalm 23:1']);

  await page.getByRole('button', {name: 'Remove bookmark on Psalm 23:1'}).click();
  await expect(page.getByRole('dialog', {name: 'Remove bookmark?'})).toContainText('This removes the bookmark on Psalm 23:1. It cannot be undone.');
  await page.getByRole('button', {name: 'Cancel'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(references(page)).toHaveText(['Psalm 23:2', 'Psalm 23:1']);

  await page.getByRole('button', {name: 'Remove bookmark on Psalm 23:1'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Remove bookmark'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(references(page)).toHaveText(['Psalm 23:2']);

  await page.getByRole('button', {name: 'Bookmarks', exact: true}).click();
  await expect(page.getByText('You have no bookmarks yet.')).toBeVisible();

  await page.getByRole('button', {name: 'All', exact: true}).click();
  await page.getByRole('link', {name: 'Psalm 23:2'}).click();
  await expect(page.locator('#v2 mark')).toBeVisible();
  await expect(page.getByRole('img', {name: 'Bookmarked'})).toHaveCount(0);
});

test('it shows 20 at a time, in the chosen order and filter', async ({page}) => {
  const user = await signInAsNewAllowedUser(page);
  const start = Date.UTC(2026, 0, 1);
  // Psalm 119:1-25 as highlights, each added a minute after the last, and one note on Psalm 119:105.
  const highlights = Array.from({length: 25}, (_, index) => {
    const verseId = `19119${String(index + 1).padStart(3, '0')}`;

    return {type: 'highlight' as const, startVerse: verseId, endVerse: verseId, createdAt: new Date(start + index * 60_000)};
  });

  await addAnnotations(await uidOf(user.email), [
    ...highlights,
    {type: 'note', startVerse: '19119105', endVerse: '19119105', text: 'A lamp.', createdAt: new Date(start - 60_000)},
  ]);
  await openMyVerses(page);

  await expect(references(page)).toHaveCount(20);
  await expect(references(page).first()).toHaveText('Psalm 119:25');
  await expect(references(page).last()).toHaveText('Psalm 119:6');

  await page.getByRole('button', {name: 'Show more'}).click();
  await expect(references(page)).toHaveCount(26);
  await expect(references(page).last()).toHaveText('Psalm 119:105');
  await expect(page.getByRole('button', {name: 'Show more'})).toHaveCount(0);

  await page.getByLabel('Order').selectOption('bible');
  await expect(references(page)).toHaveCount(20);
  await expect(references(page).first()).toHaveText('Psalm 119:1');

  await page.getByRole('button', {name: 'Notes', exact: true}).click();
  await expect(references(page)).toHaveText(['Psalm 119:105']);
  await expect(page.getByRole('button', {name: 'Show more'})).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('it opens from the menu, and the page does not scroll sideways', async ({page}) => {
    await signInAsNewAllowedUser(page);
    await openChapter(page, '/read/john/1');
    await mark(page, [1, 2], 'Highlight');

    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('link', {name: 'My verses'}).click();

    await expect(references(page)).toHaveText(['John 1:1–2']);
    // The full translation names do not fit beside the order picker, so they become initialisms.
    await expect(page.getByLabel('Translation').locator('option:checked')).toHaveText('BSB');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
