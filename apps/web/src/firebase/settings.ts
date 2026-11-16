import {getDoc, runTransaction, serverTimestamp, setDoc, Timestamp} from 'firebase/firestore';
import {db} from './index';
import {userRecordRef as userRef} from './userRecord';

/** Mirrors `users/{uid}` in `firestore.rules`. */
export interface UserSettings {
  translationId?: string;
}

export async function loadUserSettings(uid: string): Promise<UserSettings | null> {
  const snapshot = await getDoc(userRef(uid));

  return snapshot.exists() ? {translationId: snapshot.get('translationId') as string | undefined} : null;
}

/** Merges, so the rest of the user's record, such as `createdAt`, stays. */
export async function saveTranslationChoice(uid: string, translationId: string): Promise<void> {
  await setDoc(userRef(uid), {translationId}, {merge: true});
}

/**
 * When this account was first seen, recording it as now on its first sign-in. The server sets the time, so for a
 * new record this returns the browser's clock, which is close enough for the interface.
 */
export async function recordFirstSignIn(uid: string): Promise<Date> {
  return runTransaction(db, async (transaction) => {
    const createdAt: unknown = (await transaction.get(userRef(uid))).get('createdAt');

    if (createdAt instanceof Timestamp) {
      return createdAt.toDate();
    }

    transaction.set(userRef(uid), {createdAt: serverTimestamp()}, {merge: true});

    return new Date();
  });
}
