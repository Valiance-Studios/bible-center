import {expect, test} from '@playwright/test';

test('the footer opens About, which credits the translations and data', async ({page}) => {
  await page.goto('/read/john/1');
  await page.getByRole('button', {name: 'About Bible Center'}).click();

  const dialog = page.getByRole('dialog', {name: 'About Bible Center'});

  await expect(dialog.getByRole('link', {name: 'Berean Standard Bible'})).toHaveAttribute('href', 'https://berean.bible');
  await expect(dialog.getByRole('link', {name: 'OpenBible.info'})).toBeVisible();
  await expect(dialog.getByRole('link', {name: 'STEP Bible'})).toBeVisible();
  await expect(dialog.getByRole('link', {name: 'Source code and suggestions on GitHub'})).toHaveAttribute('href', 'https://github.com/Valiance-Studios/bible-center');

  await dialog.getByRole('button', {name: 'Close'}).last().click();
  await expect(dialog).toBeHidden();
});

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('the menu opens About', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('button', {name: 'About', exact: true}).click();

    await expect(page.getByRole('dialog', {name: 'About Bible Center'})).toBeVisible();
  });
});
