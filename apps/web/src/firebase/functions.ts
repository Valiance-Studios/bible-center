import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import {emulatorHosts, useEmulators} from './config';
import {firebaseApp} from './index';

/**
 * Bible Center's Cloud Functions, in `apps/functions`, for the features that call one. Calls carry the App Check
 * token, since App Check starts with the app.
 */
export const functions = getFunctions(firebaseApp);

if (useEmulators) {
  connectFunctionsEmulator(functions, emulatorHosts.functions.host, emulatorHosts.functions.port);
}
