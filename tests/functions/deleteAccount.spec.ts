import {beforeEach, describe, expect, it} from 'vitest';
import {requireSignedIn} from '../../apps/functions/src/caller.ts';
import {deleteAccount} from '../../apps/functions/src/deleteAccount.ts';
import {auth, db} from '../../apps/functions/src/firebase.ts';
import {callerAuth, createAccount, useCleanEmulators} from './support.ts';

useCleanEmulators();

async function exists(path: string): Promise<boolean> {
  return (await db.doc(path).get()).exists;
}

describe('requireSignedIn', () => {
  it('names the caller, with their email only once verified', () => {
    expect(requireSignedIn(callerAuth('abc', 'Grace@Example.com'))).toEqual({uid: 'abc', verifiedEmail: 'grace@example.com'});
    expect(requireSignedIn(callerAuth('abc', 'grace@example.com', false))).toEqual({uid: 'abc', verifiedEmail: null});
  });

  it('turns away the signed out', () => {
    expect(() => requireSignedIn(undefined)).toThrow(expect.objectContaining({code: 'unauthenticated'}));
  });
});

describe('deleteAccount', () => {
  let grace: string;
  let other: string;

  beforeEach(async () => {
    grace = await createAccount('grace');
    other = await createAccount('other');

    await db.doc(`users/${grace}`).set({translationId: 'kjv', createdAt: new Date(), annotationCount: 1});
    await db.doc(`users/${grace}/annotations/a1`).set({type: 'note', text: 'Private words.'});
    await db.doc(`users/${grace}/memoryVerses/19023001`).set({status: 'learning'});
    await db.doc(`roles/grace@example.com`).set({role: 'reviewer'});
    await db.doc(`blockedUsers/${grace}`).set({email: 'grace@example.com'});
    // A verse Grace added, which someone else also upvoted, and her vote on someone else's verse.
    await db.doc('topics/grief/verses/40005004').set({upvotes: 2, createdBy: grace});
    await db.doc(`topics/grief/verses/40005004/votes/${grace}`).set({uid: grace, topic: 'grief'});
    await db.doc(`topics/grief/verses/40005004/votes/${other}`).set({uid: other, topic: 'grief'});
    await db.doc('topics/grief/verses/19147003').set({upvotes: 1, createdBy: other});
    await db.doc(`topics/grief/verses/19147003/votes/${grace}`).set({uid: grace, topic: 'grief'});
    await db.doc('topics/caring-for-a-parent').set({name: 'caring for a parent', status: 'approved', createdBy: grace});
    await db.doc('reports/mine').set({reportedBy: grace});
    await db.doc('reports/theirs').set({reportedBy: other});
  });

  it('deletes the account and everything kept for it', async () => {
    await deleteAccount({uid: grace, verifiedEmail: 'grace@example.com'});

    await expect(auth.getUser(grace)).rejects.toMatchObject({code: 'auth/user-not-found'});

    for (const path of [
      `users/${grace}`,
      `users/${grace}/annotations/a1`,
      `users/${grace}/memoryVerses/19023001`,
      'roles/grace@example.com',
      `blockedUsers/${grace}`,
      `topics/grief/verses/40005004/votes/${grace}`,
      `topics/grief/verses/19147003/votes/${grace}`,
      'reports/mine',
    ]) {
      expect(await exists(path), path).toBe(false);
    }
  });

  it('keeps what others rely on, with nothing linking it to the account', async () => {
    await deleteAccount({uid: grace, verifiedEmail: 'grace@example.com'});

    const added = (await db.doc('topics/grief/verses/40005004').get()).data();

    expect(added).toEqual({upvotes: 1});
    expect((await db.doc('topics/grief/verses/19147003').get()).get('upvotes')).toBe(0);
    expect((await db.doc('topics/caring-for-a-parent').get()).data()).toEqual({name: 'caring for a parent', status: 'approved'});
    expect(await exists(`topics/grief/verses/40005004/votes/${other}`)).toBe(true);
    expect(await exists('reports/theirs')).toBe(true);
    await expect(auth.getUser(other)).resolves.toBeDefined();
  });

  it('leaves the role alone when the email is not verified', async () => {
    await deleteAccount({uid: grace, verifiedEmail: null});

    expect(await exists('roles/grace@example.com')).toBe(true);
    expect(await exists(`users/${grace}`)).toBe(false);
  });
});
