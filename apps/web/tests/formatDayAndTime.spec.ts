import {describe, expect, it} from 'vitest';
import {formatDayAndTime} from '@/components/formatDayAndTime';

describe('formatDayAndTime', () => {
  it('gives the day and the time, in the viewer\'s time zone', () => {
    expect(formatDayAndTime(new Date(2026, 10, 23, 14, 15))).toBe('November 23 at 2:15 PM');
    expect(formatDayAndTime(new Date(2026, 0, 2, 9, 5))).toBe('January 2 at 9:05 AM');
  });
});
