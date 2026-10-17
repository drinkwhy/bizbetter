import path from 'path';

/**
 * Root folder for every file BizBetter writes (evidence store, staged uploads, original documents,
 * saved reports, integration snapshots). Defaults to ./.bizbetter-data for local use; hosted
 * deployments point BIZBETTER_DATA_DIR at a persistent volume (for example /data/bizbetter).
 */
export function dataDir(...parts: string[]) {
  const root = process.env.BIZBETTER_DATA_DIR?.trim() || path.join(process.cwd(), '.bizbetter-data');
  return path.join(root, ...parts);
}
