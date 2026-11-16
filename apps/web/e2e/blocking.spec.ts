import {expect, test} from '@playwright/test';
import {addReport, createGoogleAccount, setAccountAge, startTopic, uidOf} from '../../../scripts/emulator-admin.ts';
import {createTestUser, signInAsNewUser} from './support/auth';

/** Psalm 34:8, the verse each test's topic starts with. */
const VERSE_ID = '19034008';

/** An account that exists, a month old, for an admin to block. Returns its email and id. */
async function createTarget(): Promise<{email: string; uid: string}> {
  const target = createTestUser('Target');

  await createGoogleAccount(target);

  const uid = await uidOf(target.email);

  await setAccountAge(uid, 30);

  return {email: target.email, uid};
}

/** A topic someone started, pending review, unique to this test. */
async function startUniqueTopic(): Promise<string> {
  const slug = `e2e-block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  await startTopic(slug, slug.replaceAll('-', ' '), VERSE_ID, new Date());

  return slug;
}

test('an admin blocks an account by email, and unblocks it', async ({page}) => {
  const target = await createTarget();

  await signInAsNewUser(page, 'admin');
  await page.goto('/people');

  const section = page.getByRole('region', {name: 'Blocked accounts'});

  await section.getByRole('form', {name: 'Block an account'}).getByRole('textbox', {name: 'Email'}).fill('nobody-here@example.com');
  await section.getByRole('button', {name: 'Block account'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Block'}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('No account uses nobody-here@example.com.');
  await page.getByRole('dialog').getByRole('button', {name: 'Cancel'}).click();

  await section.getByRole('form', {name: 'Block an account'}).getByRole('textbox', {name: 'Email'}).fill(target.email.toUpperCase());
  await section.getByRole('button', {name: 'Block account'}).click();

  const dialog = page.getByRole('dialog', {name: `Block ${target.email}?`});

  await expect(dialog.getByRole('checkbox', {name: /Also remove its upvotes/})).toBeChecked();
  await dialog.getByRole('button', {name: 'Block'}).click();
  await expect(section.getByRole('status')).toHaveText(`Blocked ${target.email}.`);
  await expect(section.getByText(target.email, {exact: true})).toBeVisible();
  await expect(section.getByText(/^Blocked [A-Z][a-z]+ \d{1,2}, \d{4} by you\. Their content was removed\.$/)).toBeVisible();

  await section.getByRole('button', {name: `Unblock ${target.email}`}).click();
  await expect(section.getByRole('status')).toHaveText(`Unblocked ${target.email}. Anything removed stays removed.`);
  await expect(section.getByText(target.email, {exact: true})).toHaveCount(0);
});

test('an admin blocks the account behind a report from the Review page, which removes the report', async ({page}) => {
  const target = await createTarget();
  const slug = await startUniqueTopic();

  await addReport({topic: slug, verseKey: VERSE_ID, reason: 'other', details: 'Spam from a blocked account.', createdAt: new Date(), reportedBy: target.uid});
  await signInAsNewUser(page, 'admin');
  await page.goto('/review');

  const item = page.getByRole('article', {name: `Psalm 34:8 on ${slug.replaceAll('-', ' ')}`});
  const report = item.getByRole('listitem');

  await expect(report).toContainText(/Reported by an account that joined [A-Z][a-z]+ \d{1,2}, \d{4}/);
  await report.getByRole('button', {name: 'Block this account'}).click();
  await page.getByRole('dialog', {name: 'Block the account that sent this report?'}).getByRole('button', {name: 'Block'}).click();

  // Its report was removed with the rest of its content, so it is no longer waiting.
  await expect(item).toHaveCount(0);
  await page.goto('/people');
  await expect(page.getByRole('region', {name: 'Blocked accounts'}).getByText(target.email, {exact: true})).toBeVisible();
});

test('a reviewer sees no accounts and cannot block', async ({page}) => {
  const slug = await startUniqueTopic();

  await addReport({topic: slug, verseKey: VERSE_ID, reason: 'fit', details: 'Seen by a reviewer.', createdAt: new Date()});
  await signInAsNewUser(page, 'reviewer');
  await page.goto('/review');

  const item = page.getByRole('article', {name: `Psalm 34:8 on ${slug.replaceAll('-', ' ')}`});

  await expect(item.getByText('Seen by a reviewer.')).toBeVisible();
  await expect(item.getByRole('button', {name: 'Block this account'})).toHaveCount(0);
  await expect(item.getByText(/Reported by an account/)).toHaveCount(0);
});
