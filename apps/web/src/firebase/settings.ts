import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from './index';

/** Mirrors `users/{uid}` in `firestore.rules`. */
export interface UserSettings {
  translationId?: string;
}

export async function loadUserSettings(uid: string): Promise<UserSettings | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));

  return snapshot.exists() ? snapshot.data() as UserSettings : null;
}

export async function saveTranslationChoice(uid: string, translationId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), {translationId});
}
