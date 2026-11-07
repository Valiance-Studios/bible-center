import {expect, test} from '@playwright/test';

const JOHN_1_1_BSB = 'In the beginning was the Word, and the Word was with God, and the Word was God.';
const JOHN_1_1_KJV = 'In the beginning was the Word, and the Word was with God, and the Word was God.';
const GENESIS_1_1_BSB = 'In the beginning God created the heavens and the earth.';
const GENESIS_1_1_KJV = 'In the beginning God created the heaven and the earth.';

test('Read opens Genesis 1 in the Berean Standard Bible for a new visitor', async ({page}) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', {name: 'Read'}).click();

  await expect(page).toHaveURL(/\/read\/genesis\/1$/);
  await expect(page.getByRole('heading', {name: 'Genesis 1'})).toBeVisible();
  await expect(page.getByText(GENESIS_1_1_BSB)).toBeVisible();
  await expect(page.getByLabel('Translation')).toHaveValue('bsb');
  await expect(page).toHaveTitle('Genesis 1 | Bible Center');
});

test('switching translation changes the text and is remembered', async ({page}) => {
  await page.goto('/read/genesis/1');

  await page.getByLabel('Translation').selectOption('kjv');
  await expect(page.getByText(GENESIS_1_1_KJV)).toBeVisible();
  await expect(page.getByText('King James Version, public domain')).toBeVisible();

  await page.goto('/read/john/1');
  await expect(page.getByLabel('Translation')).toHaveValue('kjv');
  await expect(page.getByText(JOHN_1_1_KJV)).toBeVisible();
});

test('the book and chapter pickers navigate', async ({page}) => {
  await page.goto('/read/genesis/1');

  await page.getByLabel('Book').selectOption('john');
  await expect(page).toHaveURL(/\/read\/john\/1$/);
  await expect(page.getByText(JOHN_1_1_BSB)).toBeVisible();

  await page.getByLabel('Chapter', {exact: true}).selectOption('3');
  await expect(page).toHaveURL(/\/read\/john\/3$/);
  await expect(page.getByRole('heading', {name: 'John 3'})).toBeVisible();
});

test('the chapter arrows cross between books and stop at the ends of the Bible', async ({page}) => {
  await page.goto('/read/genesis/50');

  await page.getByRole('link', {name: 'Next chapter: Exodus 1'}).click();
  await expect(page.getByRole('heading', {name: 'Exodus 1'})).toBeVisible();

  await page.getByRole('link', {name: 'Previous chapter: Genesis 50'}).click();
  await expect(page.getByRole('heading', {name: 'Genesis 50'})).toBeVisible();

  await page.goto('/read/genesis/1');
  await expect(page.getByRole('link', {name: /Previous chapter/})).toHaveCount(0);

  await page.goto('/read/revelation/22');
  await expect(page.getByRole('link', {name: /Next chapter/})).toHaveCount(0);
});

test('the thumb index opens a section and marks the current one', async ({page}) => {
  await page.goto('/read/psalms/23');

  const thumb = page.getByRole('navigation', {name: 'Browse by section of the Bible'});

  await expect(thumb.getByRole('link', {name: 'Wisdom'})).toHaveAttribute('aria-current', 'true');

  await thumb.getByRole('link', {name: 'Gospels'}).click();

  await expect(page).toHaveURL(/\/read\/matthew\/1$/);
  await expect(thumb.getByRole('link', {name: 'Gospels'})).toHaveAttribute('aria-current', 'true');
});

test('an unknown chapter leads back to the start of the reader', async ({page}) => {
  await page.goto('/read/genesis/51');

  await expect(page).toHaveURL(/\/read\/genesis\/1$/);
});

test('a chapter that fails to load says so and can be retried', async ({page}) => {
  let shouldFail = true;

  await page.route('**/bible/bsb/ruth/1.json', (route) => shouldFail ? route.abort() : route.continue());
  await page.goto('/read/ruth/1');

  await expect(page.getByText('Could not load Ruth 1')).toBeVisible();

  shouldFail = false;
  await page.getByRole('button', {name: 'Try again'}).click();

  await expect(page.getByText('In the days when the judges ruled')).toBeVisible();
});

test('the home page\'s verse links to its chapter', async ({page}) => {
  await page.goto('/');
  await page.getByRole('link', {name: 'Lamentations 3:22–23, BSB'}).click();

  await expect(page.getByRole('heading', {name: 'Lamentations 3'})).toBeVisible();
});
