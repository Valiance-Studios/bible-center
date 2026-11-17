import {expect, test} from '@playwright/test';
import {createGoogleAccount, enrollSmsSecondFactor, setRole} from '../../../scripts/emulator-admin.ts';
import {createTestUser, register, signInWithGoogle} from './support/auth';

test('a sign-up from a temporary email service is refused, and says why', async ({page}) => {
  const user = createTestUser();

  await register(page, {...user, email: user.email.replace('@example.com', '@mailinator.com')}, 'a-long-test-password');

  await expect(page.getByRole('alert')).toHaveText('Bible Center does not accept sign-ups from temporary email services. Use an email address you keep, such as a personal or work one.');
  await expect(page.getByRole('heading', {name: 'Create an account'})).toBeVisible();
});

test('a reviewer without two-step sign-in is asked to set it up, and keeps member features', async ({page}) => {
  const user = createTestUser();

  await setRole(user.email, 'reviewer');
  await signInWithGoogle(page, user);
  await expect(page.getByRole('button', {name: 'Account menu'})).toBeVisible();

  await page.goto('/review');
  await expect(page.getByRole('heading', {name: 'Set up two-step sign-in first'})).toBeVisible();
  await expect(page.getByText('Highlights, notes, your memory list and voting work as before, without it.')).toBeVisible();
  await page.getByRole('button', {name: 'Set it up'}).click();
  await expect(page.getByRole('heading', {name: 'Confirm it is you'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Continue with Google'})).toBeVisible();
});

test('an account with two-step sign-in is asked for its code after Google, and can back out', async ({page}) => {
  const user = createTestUser();

  await enrollSmsSecondFactor(await createGoogleAccount(user), '+15555550199');
  await signInWithGoogle(page, user);

  await expect(page.getByRole('heading', {name: 'Enter your code'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'bobbyjuba@gmail.com'})).toHaveAttribute('href', 'mailto:bobbyjuba@gmail.com');

  await page.getByRole('button', {name: 'Use a different account'}).click();
  await expect(page.getByRole('button', {name: 'Continue with Google'})).toBeVisible();
});
