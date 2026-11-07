import {expect, test} from '@playwright/test';
import {createTestUser, signInAsNewAllowedUser} from './support/auth';

test('an admin adds a person, changes their role and removes them, but cannot change their own role', async ({page}) => {
  const me = await signInAsNewAllowedUser(page, 'admin');
  const person = createTestUser().email;

  await page.getByRole('button', {name: 'Account menu'}).click();
  await page.getByRole('menuitem', {name: 'People'}).click();
  await expect(page).toHaveURL(/\/people$/);

  // Their own row shows their role, with nothing to change it.
  await expect(page.getByText(me.email, {exact: true})).toBeVisible();
  await expect(page.getByRole('combobox', {name: `Role for ${me.email}`})).toHaveCount(0);
  await expect(page.getByRole('button', {name: `Remove ${me.email}`})).toHaveCount(0);

  await page.getByRole('textbox', {name: 'Email'}).fill(person.toUpperCase());
  await page.getByRole('combobox', {name: 'Role', exact: true}).selectOption('reviewer');
  await page.getByRole('button', {name: 'Add person'}).click();
  await expect(page.getByRole('status')).toHaveText(`Added ${person} as reviewer.`);
  await expect(page.getByRole('combobox', {name: `Role for ${person}`})).toHaveValue('reviewer');

  await page.getByRole('textbox', {name: 'Email'}).fill(person);
  await page.getByRole('button', {name: 'Add person'}).click();
  await expect(page.getByRole('alert')).toHaveText(`${person} can already sign in.`);

  await page.getByRole('combobox', {name: `Role for ${person}`}).selectOption('member');
  await expect(page.getByRole('status')).toHaveText(`${person} is now member.`);

  await page.reload();
  await expect(page.getByRole('combobox', {name: `Role for ${person}`})).toHaveValue('member');

  await page.getByRole('button', {name: `Remove ${person}`}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Remove'}).click();
  await expect(page.getByRole('status')).toHaveText(`Removed ${person}.`);
  await expect(page.getByText(person, {exact: true})).toHaveCount(0);
});

test('an admin is told when an email is not one', async ({page}) => {
  await signInAsNewAllowedUser(page, 'admin');
  await page.goto('/people');

  await page.getByRole('textbox', {name: 'Email'}).fill('not an email');
  await page.getByRole('button', {name: 'Add person'}).click();
  await expect(page.getByRole('alert')).toHaveText('Enter an email address, such as name@example.com.');
});

test('a reviewer cannot see the People page', async ({page}) => {
  await signInAsNewAllowedUser(page, 'reviewer');

  await page.goto('/people');
  await expect(page.getByText('This page is only for admins.')).toBeVisible();
});

test('someone signed out is asked to sign in', async ({page}) => {
  await page.goto('/people');
  await expect(page.getByText('This page is for admins. Sign in to see it.')).toBeVisible();
});
