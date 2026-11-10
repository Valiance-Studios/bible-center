import type {DailyVerseList} from '../src/dailyVerses';

import {describe, expect, it} from 'vitest';
import {automaticDailyVerse, dateKeyOf, dayOfLeapYear, isDateKey} from '../src/dailyVerses';

describe('dateKeyOf', () => {
  it('writes the local date with padded months and days', () => {
    expect(dateKeyOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKeyOf(new Date(2026, 10, 10, 0, 0))).toBe('2026-11-10');
  });
});

describe('isDateKey', () => {
  it('accepts real dates only', () => {
    expect(isDateKey('2026-11-10')).toBe(true);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('2026-1-5')).toBe(false);
    expect(isDateKey('')).toBe(false);
  });
});

describe('dayOfLeapYear', () => {
  it('gives each date the same place every year, keeping one for February 29', () => {
    expect(dayOfLeapYear('2026-01-01')).toBe(0);
    expect(dayOfLeapYear('2028-02-29')).toBe(59);
    expect(dayOfLeapYear('2026-03-01')).toBe(60);
    expect(dayOfLeapYear('2028-03-01')).toBe(60);
    expect(dayOfLeapYear('2026-12-31')).toBe(365);
  });

  it('refuses something that is not a date', () => {
    expect(() => dayOfLeapYear('tomorrow')).toThrow(RangeError);
  });
});

describe('automaticDailyVerse', () => {
  const list: DailyVerseList = [['01001001', '01001001'], ['43003016', '43003017'], ['19023001', '19023001']];

  it('picks by the date\'s place in the year, wrapping a short list', () => {
    expect(automaticDailyVerse(list, '2026-01-02')).toEqual({startVerse: '43003016', endVerse: '43003017'});
    expect(automaticDailyVerse(list, '2026-01-04')).toEqual({startVerse: '01001001', endVerse: '01001001'});
  });

  it('refuses an empty list', () => {
    expect(() => automaticDailyVerse([], '2026-01-01')).toThrow(RangeError);
  });
});
