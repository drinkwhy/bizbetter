import type { DatasetType } from '@/lib/evidence/model';
import type { GuidedStepId } from '@/lib/smart-analysis/steps';

export type DocKind = 'pnl' | 'bank_statement' | 'card_statement' | 'invoices' | 'job_costing' | 'payroll' | 'processor_fees' | 'timesheet' | 'marketing' | 'receipt' | 'business_notes' | 'unknown';
export type DocFormat = 'csv' | 'xlsx' | 'xls' | 'pdf' | 'docx' | 'txt' | 'json' | 'ofx' | 'image' | 'other';
export type ExtractionMethod = 'DETERMINISTIC' | 'GROK_CLASSIFIED' | 'GROK_EXTRACTED' | 'GROK_VISION' | 'NONE';
export type DocStatus = 'READY' | 'NEEDS_REVIEW' | 'CONTEXT_ONLY' | 'UNSUPPORTED' | 'ERROR' | 'COMMITTED' | 'DISCARDED';

export const DOC_KINDS: Record<DocKind, { label: string; dataset: DatasetType; step: GuidedStepId | null; carriesRecords: boolean }> = {
  pnl: { label: 'Profit & loss', dataset: 'profit_and_loss', step: 'pnl', carriesRecords: true },
  bank_statement: { label: 'Bank statement', dataset: 'transactions', step: 'bank_card', carriesRecords: true },
  card_statement: { label: 'Credit card statement', dataset: 'transactions', step: 'bank_card', carriesRecords: true },
  invoices: { label: 'Invoices / A/R', dataset: 'invoices', step: 'invoices_ar', carriesRecords: true },
  job_costing: { label: 'Job costing', dataset: 'jobs', step: 'job_costing', carriesRecords: true },
  payroll: { label: 'Payroll', dataset: 'payroll', step: 'payroll', carriesRecords: true },
  processor_fees: { label: 'Payment processor fees', dataset: 'payments', step: 'processor_fees', carriesRecords: true },
  timesheet: { label: 'Timesheets / time entries', dataset: 'time_entries', step: 'payroll', carriesRecords: true },
  marketing: { label: 'Marketing spend by source', dataset: 'marketing', step: 'job_costing', carriesRecords: true },
  receipt: { label: 'Receipt', dataset: 'expenses', step: 'bank_card', carriesRecords: true },
  business_notes: { label: 'Business notes', dataset: 'generic', step: 'profile', carriesRecords: false },
  unknown: { label: 'Unrecognized', dataset: 'generic', step: null, carriesRecords: false },
};
export const DOC_KIND_IDS = Object.keys(DOC_KINDS) as DocKind[];

/** Canonical field names every extractor maps into. Values are always copied from the file. */
export const CANONICAL_FIELDS = ['date', 'due_date', 'description', 'vendor', 'category', 'amount', 'debit', 'credit', 'balance', 'invoice_id', 'customer', 'amount_paid',
  'open_balance', 'status', 'job_id', 'job_type', 'revenue', 'labor_cost', 'material_cost', 'employee', 'regular_hours', 'overtime_hours', 'hourly_rate', 'gross_wages',
  'overtime_pay', 'gross', 'fee', 'net', 'expenses', 'net_profit', 'line', 'section', 'currency',
  'technician', 'labor_hours', 'billable_hours', 'nonbillable_hours', 'lead_source', 'callback', 'spend', 'leads'] as const;
export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export type CellValue = string | number | null;
export interface CanonicalRow { index: number; loc: string; sheet?: string; page?: number; row?: number; values: Partial<Record<CanonicalField, CellValue>>; sourceText?: string }

export interface ExtractedDocument {
  id: string; businessId: string; fileName: string; storedAs: string; sha256: string; size: number; format: DocFormat; mime?: string;
  kind: DocKind; kindConfidence: number; kindReason: string; method: ExtractionMethod; status: DocStatus;
  rows: CanonicalRow[]; columns: string[]; warnings: string[]; textExcerpt?: string; currency: string; createdAt: string;
  importId?: string; committedAt?: string; recordsCreated?: number;
}
