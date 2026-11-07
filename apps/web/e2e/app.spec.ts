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

  await expect(page.getByText('Verse of the day')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();
  expect(recaptchaRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the theme toggle switches modes and remembers the choice', async ({page}) => {
  await page.emulateMedia({colorScheme: 'light'});
  await page.goto('/');

  const html = page.locator('html');

  await expect(html).toHaveAttribute('data-mantine-color-scheme', 'light');
  await page.getByRole('button', {name: 'Switch to dark mode'}).click();
  await expect(html).toHaveAttribute('data-mantine-color-scheme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-mantine-color-scheme', 'dark');
});

for (const {scheme, background, text, onAccent} of [
  {scheme: 'light', background: 'rgb(246, 247, 245)', text: 'rgb(22, 33, 58)', onAccent: 'rgb(255, 255, 255)'},
  {scheme: 'dark', background: 'rgb(15, 24, 48)', text: 'rgb(232, 234, 240)', onAccent: 'rgb(15, 24, 48)'},
] as const) {
  test(`${scheme} mode uses the design's colors, not Mantine's defaults`, async ({page}) => {
    await page.emulateMedia({colorScheme: scheme});
    await page.goto('/sign-in');

    const signIn = page.getByRole('button', {name: 'Sign in', exact: true});

    await expect(signIn).toHaveCSS('color', onAccent);
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await expect(page.locator('body')).toHaveCSS('color', text);
  });
}

test.describe('on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('the thumb index moves into a menu that lists each section\'s books', async ({page}) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', {name: 'Browse by section of the Bible'})).toBeHidden();

    await page.getByRole('button', {name: 'Open menu'}).click();
    await page.getByRole('button', {name: 'Wisdom'}).click();
    await page.getByRole('link', {name: 'Psalms'}).click();

    await expect(page).toHaveURL(/\/read\/psalms\/1$/);
    await expect(page.getByRole('heading', {name: 'Psalm 1'})).toBeVisible();
  });

  test('the page does not scroll sideways', async ({page}) => {
    await page.goto('/');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
