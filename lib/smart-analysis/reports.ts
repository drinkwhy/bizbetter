import { promises as fs } from 'fs';
import path from 'path';
const dir = () => path.join(process.cwd(), '.bizbetter-data', 'reports');
const file = (id: string) => { if (!/^[-a-zA-Z0-9_]{1,80}$/.test(id)) throw new Error('Invalid workspace.'); return path.join(dir(), `${id}.json`); };
export async function saveReport(businessId: string, value: unknown) { await fs.mkdir(dir(), { recursive: true, mode: 0o700 }); const f = file(businessId); await fs.writeFile(f + '.tmp', JSON.stringify(value), { mode: 0o600 }); await fs.rename(f + '.tmp', f); }
export async function loadReport<T>(businessId: string): Promise<T | null> { try { return JSON.parse(await fs.readFile(file(businessId), 'utf8')) as T; } catch { return null; } }
