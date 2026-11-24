/**
 * What someone can do. Each role can do everything the ones before it can.
 * Keep in sync with `roles` in `firestore.rules`, where only reviewers and admins have an entry.
 */
export const ROLES = ['member', 'reviewer', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Record<Role, string> = {
  member: 'Member',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

/** The roles an admin can give, each stored as an entry in `roles`. Everyone else is a member. */
export const STAFF_ROLES = ['reviewer', 'admin'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** The role in someone's `roles` entry. Without one, they are a member. */
export function parseRole(value: unknown): Role {
  return ROLES.find((role) => role === value) ?? 'member';
}

/** A role read from a `roles` entry, which only holds staff roles; anything else defaults to reviewer, the lesser. */
export function parseStaffRole(value: unknown): StaffRole {
  return STAFF_ROLES.find((role) => role === value) ?? 'reviewer';
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

/** An email as `roles` keys it: trimmed and lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Whether a normalized email has the shape `roles` accepts. */
export function isEmailAddress(email: string): boolean {
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);
}
