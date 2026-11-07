import {initializeApp} from 'firebase/app';
import {connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {activateAppCheck} from './appCheck';
import {appCheckDebugToken, appCheckSiteKey, emulatorHosts, firebaseOptions, useEmulators} from './config';

export const firebaseApp = initializeApp(firebaseOptions);

// App Check attests that requests come from this web app, so Firebase can reject scripts that only have
// the config. It must start before any Auth or Firestore call. The emulators do not check it, so it stays off there.
if (!useEmulators && appCheckSiteKey) {
  activateAppCheck(firebaseApp, {siteKey: appCheckSiteKey, debugToken: appCheckDebugToken});
}

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

if (useEmulators) {
  connectAuthEmulator(auth, emulatorHosts.auth, {disableWarnings: true});
  connectFirestoreEmulator(db, emulatorHosts.firestore.host, emulatorHosts.firestore.port);
}
