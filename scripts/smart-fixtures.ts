import { createHash } from 'node:crypto';
import type { Metric, SourceRecord } from '@/lib/evidence/model';
/** Fictional, in-memory sample data only. Never written to the evidence repository. */
export const TEST_BUSINESS = 'smart-analysis-test-workspace';
export function rec(metric: Metric, date: string, value: number, entityId?: string, complete = true): SourceRecord {
  const sourceRecordId = `fixture:${metric}:${date}:${entityId || ''}`;
  return { id: createHash('sha256').update(sourceRecordId).digest('hex'), businessId: TEST_BUSINESS, environment: 'REAL', sourceSystem: 'Fictional fixture', sourceRecordId,
    syncId: 'fixture-import', periodStart: date, periodEnd: date, importedAt: new Date().toISOString(), metric, value, currency: 'USD', decimals: 2,
    basis: 'fictional test data', entityId, complete, verification: 'OWNER_ENTERED' };
}
const ym = (offset: number) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - offset); return d.toISOString().slice(0, 10); };
/** Three months of P&L (one loss month), one money-losing job, and processor fees. */
export function completeDataset(): SourceRecord[] {
  return [
    rec('revenue', ym(3), 4_210_000), rec('expenses', ym(3), 3_905_000), rec('net_profit', ym(3), 305_000),
    rec('revenue', ym(2), 3_880_000), rec('expenses', ym(2), 4_020_000), rec('net_profit', ym(2), -140_000),
    rec('revenue', ym(1), 4_050_000), rec('expenses', ym(1), 3_870_000), rec('net_profit', ym(1), 180_000),
    rec('job_revenue', ym(1), 850_000, 'JOB-1042'), rec('job_labor', ym(1), 610_000, 'JOB-1042'), rec('job_materials', ym(1), 395_000, 'JOB-1042'),
    rec('fees', ym(1), 118_900),
  ];
}
export const profile = { name: 'Fictional Ridge Roofing', industry: 'Roofing contractor' };
