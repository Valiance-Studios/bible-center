import {expect, test} from '@playwright/test';

test('the home page loads with App Check off against the emulators', async ({page}) => {
  const recaptchaRequests: string[] = [];
  const pageErrors: Error[] = [];

  page.on('pageerror', (error) => pageErrors.push(error));
  page.on('request', (request) => {
    const url = new URL(request.url());

    // Only off-site requests count: the dev server serves the app's own src/firebase/appCheck.ts module.
    if (url.hostname !== 'localhost' && /recaptcha|appcheck/i.test(url.href)) {
      recaptchaRequests.push(request.url());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', {name: 'Bible Center'})).toBeVisible();
  expect(recaptchaRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
