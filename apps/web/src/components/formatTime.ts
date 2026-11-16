/** A time of day in the viewer's own time zone, such as "3:42 PM". */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
}

/** A moment in the viewer's own time zone, such as "November 23 at 2:15 PM". */
export function formatDayAndTime(date: Date): string {
  return `${date.toLocaleDateString('en-US', {month: 'long', day: 'numeric'})} at ${formatTime(date)}`;
}
