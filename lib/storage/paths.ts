import path from 'path';

/**
 * Persistent server-side storage root.
 * Set BIZBETTER_DATA_DIR to the mounted volume path in hosted environments.
 * Never point this at a public/static directory.
 */
export function dataDirectory(...segments: string[]) {
  const configured = process.env.BIZBETTER_DATA_DIR?.trim();
  const root = configured ? path.resolve(configured) : path.join(process.cwd(), '.bizbetter-data');
  return path.join(root, ...segments);
}
