/**
 * Reads a JSON file a data script wrote to `apps/web/public`, or null if there is none. Hosting and the dev
 * server answer a missing file with the app's HTML page, so anything that is not JSON means it does not exist.
 */
export async function fetchStaticJson<T>(path: string): Promise<T | null> {
  const response = await fetch(path);

  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }

  const isJson = response.headers.get('content-type')?.includes('json') ?? false;

  return response.ok && isJson ? await response.json() as T : null;
}
