/**
 * Renders the PNG fallbacks of the site icon from `apps/web/public/favicon.svg`.
 *
 * Usage: npm run icons (run again whenever favicon.svg changes, and commit the PNGs)
 *
 * Browsers that skip SVG tab icons (Safari) use `favicon-32.png`, and Safari and iOS use
 * `apple-touch-icon.png` for bookmarks and the home screen.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

interface Icon {
  file: string;
  size: number;
  /** iOS rounds touch icons itself, and shows any transparent corners as black. */
  squareCorners: boolean;
}

const ICONS: Icon[] = [
  {file: 'favicon-32.png', size: 32, squareCorners: false},
  {file: 'apple-touch-icon.png', size: 180, squareCorners: true},
];

const publicDir = new URL('../apps/web/public/', import.meta.url);
const svg = readFileSync(new URL('favicon.svg', publicDir), 'utf8');

function iconSvg({size, squareCorners}: Icon): string {
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);

  return squareCorners ? sized.replace('rx="7"', 'rx="0"') : sized;
}

const browser = await chromium.launch();

try {
  for (const icon of ICONS) {
    const page = await browser.newPage({viewport: {width: icon.size, height: icon.size}});

    await page.setContent(`<body style="margin:0">${iconSvg(icon)}</body>`);
    await page.screenshot({path: fileURLToPath(new URL(icon.file, publicDir)), omitBackground: true});
    await page.close();
    console.log(`Wrote apps/web/public/${icon.file} (${icon.size}x${icon.size}).`);
  }
} finally {
  await browser.close();
}
