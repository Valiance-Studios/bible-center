/** A date as reviewers see it, such as "November 5, 2026". */
export function formatReviewDate(date: Date): string {
  return date.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
}
