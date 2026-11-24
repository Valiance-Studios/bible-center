import {expect, test} from '@playwright/test';
import {uidOf} from '../../../scripts/emulator-admin.ts';
import {signInAsNewUser} from './support/auth';

test("the footer's About and Privacy links sit on the same line", async ({page}) => {
  await page.goto('/');

  const footer = page.getByRole('contentinfo');
  // Where each one's text is drawn, not its box: a button centers its text in its height, a link does not unless told.
  const textTop = (name: string, role: 'button' | 'link') =>
    footer.getByRole(role, {name}).evaluate((element) => {
      const range = document.createRange();

      range.selectNodeContents(element);

      return range.getBoundingClientRect().top;
    });

  expect(Math.abs((await textTop('About Bible Center', 'button')) - (await textTop('Privacy', 'link')))).toBeLessThan(
    1,
  );
});

test('the privacy policy is linked from the footer and the register screen', async ({page}) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', {name: 'Privacy'}).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', {name: 'Privacy policy', level: 1})).toBeVisible();
  await expect(page.getByText('You must be 13 or older to create an account.')).toBeVisible();
  await expect(page.getByRole('link', {name: 'bobbyjuba@gmail.com'})).toHaveAttribute(
    'href',
    'mailto:bobbyjuba@gmail.com',
  );

  await page.goto('/sign-in');
  await page.getByRole('button', {name: 'Create an account'}).click();
  await expect(page.getByText(/^You must be 13 or older\./)).toBeVisible();
  await page.getByRole('link', {name: 'privacy policy'}).click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test('someone deletes their account from the account menu, after typing delete', async ({page}) => {
  const user = await signInAsNewUser(page);

  // Something of theirs to delete.
  await page.goto('/read/john/3');
  await page.getByText('For God so loved the world').click();
  await page.getByRole('button', {name: 'Highlight', exact: true}).click();
  await expect(page.locator('#v16 mark')).toBeVisible();

  await page.getByRole('button', {name: 'Account menu'}).click();
  await page.getByRole('menuitem', {name: 'Delete account'}).click();

  const dialog = page.getByRole('dialog', {name: 'Delete your account?'});

  await expect(dialog).toContainText(`your account, ${user.email}`);
  await expect(dialog.getByRole('button', {name: 'Delete account'})).toBeDisabled();
  await dialog.getByRole('textbox', {name: 'Type delete to confirm'}).fill('delet');
  await expect(dialog.getByRole('button', {name: 'Delete account'})).toBeDisabled();
  await dialog.getByRole('textbox', {name: 'Type delete to confirm'}).fill('delete');
  await dialog.getByRole('button', {name: 'Delete account'}).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status')).toHaveText(
    'Your account and everything kept for it are deleted. You can still read and search, and create a new account at any time.',
  );
  await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();
  await expect(uidOf(user.email)).rejects.toThrow('No account exists');
});

test('the phone menu offers the privacy policy and deleting the account', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await signInAsNewUser(page);
  await page.getByRole('button', {name: 'Open menu'}).click();

  const menu = page.getByRole('dialog', {name: 'Bible Center'});

  await expect(menu.getByRole('link', {name: 'Privacy'})).toBeVisible();
  await menu.getByRole('button', {name: 'Delete account'}).click();
  await expect(page.getByRole('dialog', {name: 'Delete your account?'})).toBeVisible();
});
