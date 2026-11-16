import {expect, test} from '@playwright/test';
import {createTestUser, signInAsNewUser} from './support/auth';

test('an admin gives a role by email, changes it and makes them a member again, but cannot change their own', async ({page}) => {
  const me = await signInAsNewUser(page, 'admin');
  const person = createTestUser().email;

  await page.getByRole('button', {name: 'Account menu'}).click();
  await page.getByRole('menuitem', {name: 'People'}).click();
  await expect(page).toHaveURL(/\/people$/);

  const staff = page.getByRole('region', {name: 'Reviewers and admins'});
  const form = staff.getByRole('form', {name: 'Give a role'});

  // Their own row shows their role, with nothing to change it.
  await expect(staff.getByText(me.email, {exact: true})).toBeVisible();
  await expect(staff.getByRole('combobox', {name: `Role for ${me.email}`})).toHaveCount(0);
  await expect(staff.getByRole('button', {name: `Make ${me.email} a member`})).toHaveCount(0);

  // The person need not have an account yet.
  await form.getByRole('textbox', {name: 'Email'}).fill(person.toUpperCase());
  await form.getByRole('combobox', {name: 'Role'}).selectOption('reviewer');
  await form.getByRole('button', {name: 'Give role'}).click();
  await expect(staff.getByRole('status')).toHaveText(`${person} is now reviewer.`);
  await expect(staff.getByRole('combobox', {name: `Role for ${person}`})).toHaveValue('reviewer');

  await form.getByRole('textbox', {name: 'Email'}).fill(person);
  await form.getByRole('button', {name: 'Give role'}).click();
  await expect(staff.getByRole('alert')).toHaveText(`${person} already has a role. Change it in the list.`);

  await staff.getByRole('combobox', {name: `Role for ${person}`}).selectOption('admin');
  await expect(staff.getByRole('status')).toHaveText(`${person} is now admin.`);

  await page.reload();
  await expect(staff.getByRole('combobox', {name: `Role for ${person}`})).toHaveValue('admin');

  await staff.getByRole('button', {name: `Make ${person} a member`}).click();
  await expect(staff.getByRole('status')).toHaveText(`${person} is now a member.`);
  await expect(staff.getByText(person, {exact: true})).toHaveCount(0);
});

test('an admin is told when an email is not one', async ({page}) => {
  await signInAsNewUser(page, 'admin');
  await page.goto('/people');

  const form = page.getByRole('form', {name: 'Give a role'});

  await form.getByRole('textbox', {name: 'Email'}).fill('not an email');
  await form.getByRole('button', {name: 'Give role'}).click();
  await expect(page.getByRole('region', {name: 'Reviewers and admins'}).getByRole('alert')).toHaveText('Enter an email address, such as name@example.com.');
});

test('a reviewer cannot see the People page', async ({page}) => {
  await signInAsNewUser(page, 'reviewer');

  await page.goto('/people');
  await expect(page.getByText('This page is only for admins.')).toBeVisible();
});

test('someone signed out is asked to sign in', async ({page}) => {
  await page.goto('/people');
  await expect(page.getByText('This page is for admins. Sign in to see it.')).toBeVisible();
});
