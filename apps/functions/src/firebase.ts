import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

/** The project comes from the environment: the deployed function's own, or the emulators' in tests. */
const app = initializeApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
