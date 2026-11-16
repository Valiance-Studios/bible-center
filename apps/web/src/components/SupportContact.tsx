/** Where people write about their account or data. The privacy policy names it too. */
export const SUPPORT_EMAIL = 'bobbyjuba@gmail.com';

/** "If you think this is a mistake, write to …", for blocked accounts. */
export function SupportContact() {
  return (
    <>
      {' If you think this is a mistake, write to '}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      .
    </>
  );
}
