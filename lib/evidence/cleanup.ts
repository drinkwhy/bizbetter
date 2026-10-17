import { promises as fs } from 'fs';
import path from 'path';
import { dataDir } from '@/lib/paths';

/** Deletes a removed workspace's stored originals, saved report and staged uploads from the data folder. */
export async function removeWorkspaceFiles(businessId: string) {
  if (!/^[-a-zA-Z0-9_]{1,80}$/.test(businessId)) throw new Error('Invalid workspace.');
  await fs.rm(dataDir('documents', businessId), { recursive: true, force: true, maxRetries: 3 });
  await fs.rm(dataDir('reports', businessId + '.json'), { force: true });
  const staging = dataDir('intake-staging'); let names: string[] = [];
  try { names = await fs.readdir(staging); } catch { return; }
  for (const n of names.filter((x) => x.endsWith('.json'))) {
    try { const item = JSON.parse(await fs.readFile(path.join(staging, n), 'utf8')); if (item?.businessId === businessId) await fs.rm(path.join(staging, n), { force: true }); } catch { /* skip unreadable */ }
  }
}
