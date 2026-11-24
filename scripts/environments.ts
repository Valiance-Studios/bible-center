/**
 * The hosted Firebase projects, and the Vite mode each one's site is built with (`apps/web/.env.<mode>`).
 * Deploy scripts look a project up here, so a deploy can only build the config that belongs to it.
 */
export type HostedMode = 'staging' | 'production';

export const HOSTED_PROJECTS: ReadonlyMap<string, HostedMode> = new Map([
  ['vs-bible-center-dev', 'staging'],
  ['vs-bible-center-prod', 'production'],
]);

/** The mode a hosted project builds with, or null for a project that is not one of ours (such as a `demo-` one). */
export function hostedMode(projectId: string | undefined): HostedMode | null {
  return projectId === undefined ? null : (HOSTED_PROJECTS.get(projectId) ?? null);
}
