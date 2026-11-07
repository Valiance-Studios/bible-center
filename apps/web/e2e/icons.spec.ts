import {expect, test} from '@playwright/test';

/** The tab and bookmark icons the page links to, and the type each must be served as. */
const ICONS = [
  {selector: 'link[rel="icon"][type="image/svg+xml"]', href: '/favicon.svg', type: 'image/svg+xml'},
  {selector: 'link[rel="icon"][type="image/png"]', href: '/favicon-32.png', type: 'image/png'},
  {selector: 'link[rel="apple-touch-icon"]', href: '/apple-touch-icon.png', type: 'image/png'},
];

for (const icon of ICONS) {
  test(`links and serves ${icon.href}`, async ({page, request}) => {
    await page.goto('/');

    await expect(page.locator(icon.selector)).toHaveAttribute('href', icon.href);

    const response = await request.get(icon.href);

    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain(icon.type);
  });
}
