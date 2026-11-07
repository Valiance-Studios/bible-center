/**
 * What someone on the allowlist can do. Each role can do everything the ones before it can.
 * Keep in sync with `allowedUsers` in `firestore.rules`.
 */
export const ROLES = ['member', 'reviewer', 'admin'] as const;

export type Role = typeof ROLES[number];

export const ROLE_NAMES: Record<Role, string> = {
  member: 'Member',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

/** An allowlist entry's role. Entries made before roles existed have none, and are members. */
export function parseRole(value: unknown): Role {
  return ROLES.find((role) => role === value) ?? 'member';
}

/** Handles reports and topics people start. */
export function canReview(role: Role): boolean {
  return role === 'reviewer' || role === 'admin';
}

/** Manages people and their roles, and sets the verse of the day. */
export function isAdmin(role: Role): boolean {
  return role === 'admin';
}

/** Matches `isEmailKey` in `firestore.rules`: something@something.something, with no spaces or slashes. */
const EMAIL_PATTERN = /^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/;
const EMAIL_MAX_LENGTH = 254;

/** An email as the allowlist keys it: trimmed and lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Whether a normalized email has the shape the allowlist accepts. */
export function isEmailAddress(email: string): boolean {
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);
}
