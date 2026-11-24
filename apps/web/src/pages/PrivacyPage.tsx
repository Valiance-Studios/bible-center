import {Link} from 'react-router';
import {SUPPORT_EMAIL} from '@/components/SupportContact';
import classes from './PrivacyPage.module.scss';

/** When this policy last changed. Change it with any change to the text below. */
const LAST_UPDATED = 'November 16, 2026';

/** The minimum age to create an account, as the register screen says too. */
export const MINIMUM_AGE = 13;

/** What Bible Center keeps about people, why, who sees it, and how to delete it. */
export function PrivacyPage() {
  return (
    <main className={classes.content}>
      <title>Privacy policy | Bible Center</title>
      <h1 className={classes.title}>Privacy policy</h1>
      <p className={classes.updated}>{`Last updated ${LAST_UPDATED}`}</p>
      <p className={classes.summary}>
        Reading and searching need no account, and nothing about them is stored. With an account, Bible Center keeps
        only what it needs to save your verses and your part in topics. There are no ads, no tracking and nothing is
        sold.
      </p>

      <h2>What is kept, and why</h2>
      <ul>
        <li>
          <strong>Your account:</strong>
          {
            ' your email address and name, how you sign in, and when you joined. Passwords are stored by Firebase as a one-way hash; Bible Center never sees them.'
          }
        </li>
        <li>
          <strong>Your verses:</strong>
          {' your highlights, bookmarks and notes, and your memory list with when you last practiced each verse.'}
        </li>
        <li>
          <strong>Your settings:</strong>
          {' the translation you read in, so it follows you between devices.'}
        </li>
        <li>
          <strong>Your part in topics:</strong>
          {
            " your upvotes, the verses you add, the topics you start and the reports you send, each with your account's id, and the times of your last report and topic, to limit how often they can be sent."
          }
        </li>
        <li>
          <strong>On your device:</strong>
          {' your translation and light or dark mode, kept in your browser.'}
        </li>
      </ul>

      <h2>Who can see it</h2>
      <ul>
        <li>Your highlights, notes, memory list, settings and upvotes are private to you.</li>
        <li>Verses you add and topics you start are shown to everyone, without your name or email.</li>
        <li>
          Reports are read only by reviewers. Admins can see when an account joined, to deal with misuse, and can block
          an account.
        </li>
        <li>
          The people who run Bible Center can reach stored data through Google&apos;s console when they need to fix a
          problem.
        </li>
      </ul>

      <h2>Services Bible Center uses</h2>
      <p>
        {
          "Bible Center runs on Google Firebase, which hosts the site and stores the data above in the United States. Google's reCAPTCHA checks each visit to tell people from automated programs. If you sign in with Google, Google tells Bible Center your name and email. These services follow "
        }
        <a href="https://policies.google.com/privacy">Google&apos;s privacy policy</a>.
      </p>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account at any time from the account menu. That removes your account, your highlights,
        notes, memory list, settings, upvotes and reports at once. Verses you added and topics you started stay for
        others, with nothing linking them to you.
      </p>

      <h2>Age</h2>
      <p>{`You must be ${MINIMUM_AGE} or older to create an account. If we learn that an account belongs to someone younger, we delete it.`}</p>

      <h2>Questions and changes</h2>
      <p>
        {'Write to '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        {
          ' with any question about your data. If this policy changes, the date at the top changes too, and a change that affects what is kept will be shown when you next sign in.'
        }
      </p>
      <p>
        <Link to="/">Back to the home page</Link>
      </p>
    </main>
  );
}
