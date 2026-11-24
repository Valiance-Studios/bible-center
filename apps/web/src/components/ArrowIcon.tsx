const PATHS = {previous: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7'};

/** A chevron for moving back or forward, as between chapters or between selected verses. */
export function ArrowIcon({direction}: {direction: keyof typeof PATHS}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[direction]} />
    </svg>
  );
}
