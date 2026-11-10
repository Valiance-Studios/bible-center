import {expect, test} from '@playwright/test';
import {addMemoryVerses, uidOf} from '../../../scripts/emulator-admin.ts';
import {signInAsNewAllowedUser} from './support/auth';

const PSALM_23_2 = 'He makes me lie down in green pastures; He leads me beside quiet waters.';

test('anyone can practice a verse from the reader with a flash card, then fading words', async ({page}) => {
  await page.goto('/read/psalms/23');
  await page.getByText('He makes me lie down').click();
  await page.getByRole('group', {name: 'Actions for Psalm 23:2'}).getByRole('link', {name: 'Memorize'}).click();

  await expect(page).toHaveURL(/\/memorize\/practice\?passage=Psalm\+23%3A2$/);
  await expect(page.getByRole('heading', {name: 'Psalm 23:2'})).toBeVisible();

  // The flash card shows the reference, then the verse.
  const card = page.getByRole('region', {name: 'Flash card'});

  await expect(card).not.toContainText('green pastures');
  await page.getByRole('button', {name: 'Show the verse'}).click();
  await expect(card).toContainText('green pastures');
  await page.getByRole('button', {name: 'I knew it'}).click();
  await expect(page.getByRole('status')).toHaveText('You knew it 1 of 1 time this session.');

  // Signed out, the list is offered through signing in.
  await expect(page.getByText('Sign in to keep this verse on a memory list')).toBeVisible();

  // Mantine hides the radio itself, so select its label.
  await page.getByText('Fading words', {exact: true}).click();
  await expect(page).toHaveURL(/mode=fading/);
  await expect(page.getByText('Step 1 of 5: read it through')).toBeVisible();
  await expect(page.getByRole('button', {name: /Show hidden word/})).toHaveCount(0);

  await page.getByRole('button', {name: 'Hide more words'}).click();
  await expect(page.getByRole('button', {name: /Show hidden word/})).not.toHaveCount(0);

  for (let step = 3; step <= 5; step++) {
    await page.getByRole('button', {name: 'Hide more words'}).click();
  }

  await expect(page.getByText('Every word is hidden. If you said it all')).toBeVisible();
  await expect(page.getByRole('button', {name: /Show hidden word/})).toHaveCount(PSALM_23_2.split(' ').length);

  await page.getByRole('button', {name: 'Show hidden word 2'}).click();
  await expect(page.getByRole('button', {name: /Show hidden word/})).toHaveCount(PSALM_23_2.split(' ').length - 1);
  await expect(page.getByRole('region', {name: /with some words hidden/})).toContainText('makes');

  await page.getByText('Flash card', {exact: true}).click();
  await expect(page).not.toHaveURL(/mode=/);
  await expect(page.getByRole('button', {name: 'Show the verse'})).toBeVisible();
});

test('the start form and the practice page refuse a verse that is not one', async ({page}) => {
  await page.goto('/memorize');
  await page.getByRole('textbox', {name: 'Verse or passage'}).fill('the shepherd psalm');
  await page.getByRole('button', {name: 'Start'}).click();
  await expect(page.getByText('Enter one reference, such as Psalm 23:1-2.')).toBeVisible();

  await page.getByRole('textbox', {name: 'Verse or passage'}).fill('Psalm 23:1-2');
  await page.getByRole('button', {name: 'Start'}).click();
  await expect(page.getByRole('heading', {name: 'Psalm 23:1–2'})).toBeVisible();

  await page.goto('/memorize/practice?passage=John%201%3A99');
  await expect(page.getByText('There is no John 1:99 in the Berean Standard Bible.')).toBeVisible();
});

test('a signed-in user adds a verse to their memory list, marks it memorized, and removes it', async ({page}) => {
  await signInAsNewAllowedUser(page);
  await page.goto('/memorize/practice?passage=Psalm%2023%3A1-2');

  await page.getByRole('button', {name: 'Add to my memory list'}).click();
  await expect(page.getByText('On your memory list, learning.')).toBeVisible();

  await page.getByRole('button', {name: 'Mark as memorized'}).click();
  await expect(page.getByText('On your memory list, memorized.')).toBeVisible();

  await page.getByRole('link', {name: 'My memory list'}).click();

  const memorized = page.getByRole('region', {name: 'Memorized'});

  await expect(memorized.getByRole('link', {name: 'Psalm 23:1–2', exact: true})).toBeVisible();
  await expect(memorized.getByText('Memorized, practiced today')).toBeVisible();

  await memorized.getByRole('button', {name: 'Remove Psalm 23:1–2 from my memory list'}).click();
  await expect(page.getByText('Verses you add will appear here.')).toBeVisible();
});

test('a memorized verse comes back for review after a week', async ({page}) => {
  const user = await signInAsNewAllowedUser(page);
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);

  await addMemoryVerses(await uidOf(user.email), [
    {startVerse: '43003016', endVerse: '43003016', status: 'memorized', createdAt: tenDaysAgo, practicedAt: tenDaysAgo},
    {startVerse: '19023001', endVerse: '19023001', status: 'learning', createdAt: tenDaysAgo, practicedAt: tenDaysAgo},
  ]);
  await page.goto('/memorize');

  const due = page.getByRole('region', {name: 'Ready to review'});

  await expect(due.getByRole('link', {name: 'John 3:16', exact: true})).toBeVisible();
  await expect(due.getByText('Memorized, practiced 10 days ago')).toBeVisible();
  await expect(page.getByRole('region', {name: 'Learning'}).getByRole('link', {name: 'Psalm 23:1', exact: true})).toBeVisible();

  // Practicing it moves it back among the memorized verses.
  await due.getByRole('link', {name: 'Practice John 3:16'}).click();
  await page.getByRole('button', {name: 'Show the verse'}).click();
  await page.getByRole('button', {name: 'I knew it'}).click();
  await expect(page.getByRole('status')).toHaveText('You knew it 1 of 1 time this session.');

  await page.getByRole('link', {name: 'My memory list'}).click();
  await expect(page.getByRole('region', {name: 'Memorized'}).getByRole('link', {name: 'John 3:16', exact: true})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Ready to review'})).toHaveCount(0);
});

test('the verse of the day links to practicing it', async ({page}) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', {name: 'Memorize'}).click();

  await expect(page).toHaveURL(/\/memorize\/practice\?passage=/);
  await expect(page.getByRole('button', {name: 'Show the verse'})).toBeVisible();
});
