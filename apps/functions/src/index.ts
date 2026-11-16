/**
 * Bible Center's Cloud Functions. Each runs as its own service account with only the roles it needs; the accounts
 * are named in `.env.<project id>` (see docs/DEPLOYMENT.md).
 */
import {onCall} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import {blockAccount as block, parseBlockAccountRequest} from './blockAccount.ts';
import {requireAdmin, requireSignedIn} from './caller.ts';
import {deleteAccount as deleteOwnAccount} from './deleteAccount.ts';

/** The emulators do not check App Check, so requests there carry no token to enforce. */
const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';

/** Admins block an account, by email from the People page or by id from the Review page. */
export const blockAccount = onCall(
  {serviceAccount: defineString('BLOCK_ACCOUNT_SERVICE_ACCOUNT'), enforceAppCheck},
  async (request) => block(await requireAdmin(request.auth), parseBlockAccountRequest(request.data)),
);

/** Anyone signed in deletes their own account and everything kept for it, from the account menu. */
export const deleteAccount = onCall(
  {serviceAccount: defineString('DELETE_ACCOUNT_SERVICE_ACCOUNT'), enforceAppCheck},
  async (request) => deleteOwnAccount(requireSignedIn(request.auth)),
);
