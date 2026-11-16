/** A moment in the viewer's own time zone, such as "November 23 at 2:15 PM". */
export function formatDayAndTime(date: Date): string {
  const day = date.toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
  const time = date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

  return `${day} at ${time}`;
}
