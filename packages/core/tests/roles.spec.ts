import {describe, expect, it} from 'vitest';
import {canReview, isAdmin, isEmailAddress, normalizeEmail, parseRole} from '../src/roles';

describe('parseRole', () => {
  it('reads each role, and treats anything else as a member', () => {
    expect(parseRole('admin')).toBe('admin');
    expect(parseRole('reviewer')).toBe('reviewer');
    expect(parseRole(undefined)).toBe('member');
    expect(parseRole('owner')).toBe('member');
  });
});

describe('what each role can do', () => {
  it('lets reviewers and admins review, and only admins manage people', () => {
    expect([canReview('member'), canReview('reviewer'), canReview('admin')]).toEqual([false, true, true]);
    expect([isAdmin('member'), isAdmin('reviewer'), isAdmin('admin')]).toEqual([false, false, true]);
  });
});

describe('emails', () => {
  it('normalizes to the allowlist\'s keys', () => {
    expect(normalizeEmail('  Grace.Ellis@Example.com ')).toBe('grace.ellis@example.com');
  });

  it('accepts the shape the rules accept', () => {
    expect(isEmailAddress('grace@example.com')).toBe(true);
    expect(isEmailAddress('grace@example')).toBe(false);
    expect(isEmailAddress('grace ellis@example.com')).toBe(false);
    expect(isEmailAddress('grace/x@example.com')).toBe(false);
    expect(isEmailAddress(`${'a'.repeat(250)}@b.co`)).toBe(false);
  });
});
