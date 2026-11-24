import {beforeEach, describe, expect, it} from 'vite-plus/test';
import {blockAccount, parseBlockAccountRequest} from '../../apps/functions/src/blockAccount.ts';
import {requireAdmin} from '../../apps/functions/src/caller.ts';
import {db} from '../../apps/functions/src/firebase.ts';
import {callerAuth, createAccount, makeAdmin, useCleanEmulators} from './support.ts';

useCleanEmulators();

describe('requireAdmin', () => {
  let adminUid: string;

  beforeEach(async () => {
    adminUid = await createAccount('ada');
    await makeAdmin('ada@example.com');
  });

  it('lets a verified admin through, by their lowercase email', async () => {
    await expect(requireAdmin(callerAuth(adminUid, 'Ada@Example.com'))).resolves.toEqual({
      uid: adminUid,
      email: 'ada@example.com',
    });
  });

  it('turns away an admin who signed in without a second step', async () => {
    await expect(requireAdmin(callerAuth(adminUid, 'ada@example.com', true, false))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('turns away the signed out, the unverified, members and blocked admins', async () => {
    await expect(requireAdmin(undefined)).rejects.toMatchObject({code: 'unauthenticated'});
    await expect(requireAdmin(callerAuth(adminUid, 'ada@example.com', false))).rejects.toMatchObject({
      code: 'unauthenticated',
    });
    await expect(requireAdmin(callerAuth('someone', 'member@example.com'))).rejects.toMatchObject({
      code: 'permission-denied',
    });

    await db.doc(`blockedUsers/${adminUid}`).set({email: 'ada@example.com'});
    await expect(requireAdmin(callerAuth(adminUid, 'ada@example.com'))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('parseBlockAccountRequest', () => {
  it('takes an email or an id, and whether to remove content', () => {
    expect(parseBlockAccountRequest({email: 'x@example.com', removeContent: true})).toEqual({
      email: 'x@example.com',
      removeContent: true,
    });
    expect(parseBlockAccountRequest({uid: 'abc', removeContent: false})).toEqual({uid: 'abc', removeContent: false});
  });

  it.each([
    ['nothing', undefined],
    ['neither an email nor an id', {removeContent: true}],
    ['both an email and an id', {email: 'x@example.com', uid: 'abc', removeContent: true}],
    ['no choice about content', {email: 'x@example.com'}],
  ])('refuses %s', (_, data) => {
    expect(() => parseBlockAccountRequest(data)).toThrow(expect.objectContaining({code: 'invalid-argument'}));
  });
});

describe('blockAccount', () => {
  const admin = {uid: '', email: 'ada@example.com'};
  let spammer: string;
  let bystander: string;

  beforeEach(async () => {
    admin.uid = await createAccount('ada');
    spammer = await createAccount('spammer');
    bystander = await createAccount('grace');

    // The spammer added one verse, which the bystander also upvoted, voted on another, started a topic and reported.
    await db
      .doc('topics/grief/verses/40005004')
      .set({startVerse: '40005004', endVerse: '40005004', upvotes: 2, createdBy: spammer});
    await db.doc(`topics/grief/verses/40005004/votes/${spammer}`).set({uid: spammer, topic: 'grief'});
    await db.doc(`topics/grief/verses/40005004/votes/${bystander}`).set({uid: bystander, topic: 'grief'});
    await db
      .doc('topics/grief/verses/19147003')
      .set({startVerse: '19147003', endVerse: '19147003', upvotes: 2, createdBy: bystander});
    await db.doc(`topics/grief/verses/19147003/votes/${spammer}`).set({uid: spammer, topic: 'grief'});
    await db.doc(`topics/grief/verses/19147003/votes/${bystander}`).set({uid: bystander, topic: 'grief'});
    await db.doc('topics/junk').set({name: 'junk', status: 'pending', createdBy: spammer});
    await db.doc('topics/hope').set({name: 'hope', status: 'approved', createdBy: bystander});
    await db.doc('reports/one').set({topic: 'grief', verseKey: '19147003', reportedBy: spammer, status: 'open'});
    await db.doc('reports/two').set({topic: 'grief', verseKey: '40005004', reportedBy: bystander, status: 'open'});
  });

  it('blocks by email, recording who blocked it, and leaves its content when asked', async () => {
    await expect(blockAccount(admin, {email: ' Spammer@Example.com ', removeContent: false})).resolves.toEqual({
      uid: spammer,
      email: 'spammer@example.com',
    });

    const record = await db.doc(`blockedUsers/${spammer}`).get();

    expect(record.data()).toMatchObject({
      email: 'spammer@example.com',
      blockedBy: admin.uid,
      blockedByEmail: 'ada@example.com',
      contentRemoved: false,
    });
    expect(record.get('blockedAt')).toBeDefined();
    expect((await db.doc('reports/one').get()).exists).toBe(true);
  });

  it("removes its votes, verses, topics and reports, and nobody else's", async () => {
    await blockAccount(admin, {uid: spammer, removeContent: true});

    // Its verse is gone, with every vote on it.
    expect((await db.doc('topics/grief/verses/40005004').get()).exists).toBe(false);
    expect((await db.doc(`topics/grief/verses/40005004/votes/${bystander}`).get()).exists).toBe(false);
    // Its vote on someone else's verse is gone, and the count with it.
    expect((await db.doc(`topics/grief/verses/19147003/votes/${spammer}`).get()).exists).toBe(false);
    expect((await db.doc('topics/grief/verses/19147003').get()).get('upvotes')).toBe(1);
    expect((await db.doc(`topics/grief/verses/19147003/votes/${bystander}`).get()).exists).toBe(true);
    // Its topic is rejected, which hides it; the bystander's stays.
    expect((await db.doc('topics/junk').get()).data()).toMatchObject({status: 'rejected', reviewedBy: admin.uid});
    expect((await db.doc('topics/hope').get()).get('status')).toBe('approved');
    // Its report is deleted; the bystander's stays.
    expect((await db.doc('reports/one').get()).exists).toBe(false);
    expect((await db.doc('reports/two').get()).exists).toBe(true);
  });

  it('says when no account uses the email, and refuses to block the admin themselves', async () => {
    await expect(blockAccount(admin, {email: 'nobody@example.com', removeContent: false})).rejects.toMatchObject({
      code: 'not-found',
      message: 'No account uses that email.',
    });
    await expect(blockAccount(admin, {uid: 'gone', removeContent: false})).rejects.toMatchObject({
      code: 'not-found',
      message: 'That account no longer exists.',
    });
    await expect(blockAccount(admin, {uid: admin.uid, removeContent: false})).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect((await db.collection('blockedUsers').get()).size).toBe(0);
  });
});
