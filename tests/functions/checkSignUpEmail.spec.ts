import {describe, expect, it} from 'vite-plus/test';
import {checkSignUpEmail} from '../../apps/functions/src/checkSignUpEmail.ts';

describe('checkSignUpEmail', () => {
  it('refuses temporary email services, and their subdomains', () => {
    for (const email of ['sam@mailinator.com', 'sam@sub.mailinator.com', 'sam@guerrillamail.com']) {
      expect(() => checkSignUpEmail(email), email).toThrow(expect.objectContaining({code: 'invalid-argument', message: 'temporary-email-service'}));
    }
  });

  it('lets everyone else through, including plus addresses and accounts with no email', () => {
    for (const email of ['grace@gmail.com', 'bobbyjuba+test1@gmail.com', 'pastor@church.org', undefined]) {
      expect(() => checkSignUpEmail(email), String(email)).not.toThrow();
    }
  });
});
