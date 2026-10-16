import type { DatasetType, Metric } from '@/lib/evidence/model';

export type GuidedStepId = 'profile' | 'pnl' | 'bank_card' | 'invoices_ar' | 'job_costing' | 'payroll' | 'processor_fees';

/**
 * One item in the guided intake. `engineUse` is honest about what the deterministic
 * engines do with the item today:
 *  - FINDINGS: a validated engine can produce cited findings from it.
 *  - CONTEXT: stored as evidence and passed to the AI analyst, but no dedicated engine yet.
 */
export interface GuidedStep {
  id: GuidedStepId;
  title: string;
  why: string;
  formats: string[];
  columns: string[];
  examples: string[];
  datasets: DatasetType[];
  metrics: Metric[];
  /** Required before the smart analysis will run at all. */
  required: boolean;
  /** Distinct calendar months needed for this item to count as fully provided. */
  minMonths: number;
  engineUse: 'FINDINGS' | 'CONTEXT';
  /** When true, an imported record only counts if its source sheet is one of `datasets` (manual entries always count). */
  strictDatasets?: boolean;
  unlocks: string;
  /** Pre-selected record type for manual entry on the Data Intake page. */
  manualMetric?: string;
}

export const GUIDED_STEPS: readonly GuidedStep[] = [
  { id: 'profile', title: 'Business profile', required: true, minMonths: 0, datasets: [], metrics: [], engineUse: 'CONTEXT',
    why: 'Your business name and industry tell the analysis which checks apply (for example, job costing for contractors).',
    formats: ['Typed in the app: save your business name and industry below (stored with this workspace).'], columns: ['Business name', 'Industry'],
    examples: ['"Riverside Plumbing" - plumbing contractor'], unlocks: 'Scopes every record and finding to the right business.' },
  { id: 'pnl', title: 'Profit & loss (P&L)', required: true, minMonths: 3, datasets: ['profit_and_loss', 'general_ledger'], metrics: ['revenue', 'net_profit', 'expenses'], engineUse: 'FINDINGS', manualMetric: 'net_profit',
    why: 'The P&L is the baseline: what came in, what went out, and whether you made money each month. Three months separate a trend from a one-off; eight months unlock the revenue trend.',
    formats: ['CSV or XLSX "Profit and Loss by Month" export', 'Manual entry: one dated monthly revenue, expense or net profit total at a time'],
    columns: ['Date (month)', 'Revenue', 'Expenses', 'Net profit', 'Currency (optional)'],
    examples: ['QuickBooks: Reports > Profit and Loss > Customize > Display columns by Month > Export to Excel', 'Xero: Reports > Profit and Loss > Export'],
    unlocks: 'Reported loss detection and (with 8+ months) the revenue trend.' },
  { id: 'bank_card', title: 'Bank & credit card statements', required: false, strictDatasets: true, minMonths: 1, datasets: ['transactions', 'expenses', 'bills', 'vendors'], metrics: ['expenses', 'vendor_spend'], engineUse: 'CONTEXT', manualMetric: 'expenses',
    why: 'Transaction detail shows where money actually went: vendor creep, duplicate subscriptions, spending the P&L lumps together.',
    formats: ['CSV or XLSX transaction download from your bank or card portal', 'PDF statements are not parsed yet: download the CSV version instead'],
    columns: ['Date', 'Description / Vendor', 'Amount', 'Category (optional)'],
    examples: ['Bank portal > Account activity > Download > CSV'], unlocks: 'Expense and vendor evidence for the analyst (dedicated vendor engine not yet implemented).' },
  { id: 'invoices_ar', title: 'Invoices & accounts receivable', required: false, minMonths: 1, datasets: ['invoices', 'payments', 'customers'], metrics: ['invoice_paid', 'invoice_contract', 'receivable'], engineUse: 'FINDINGS',
    why: 'Invoices show who owes you and whether payments match what was billed.',
    formats: ['CSV or XLSX invoice list or A/R aging detail'], columns: ['Invoice ID', 'Customer', 'Invoice date', 'Due date', 'Amount', 'Amount paid'],
    examples: ['QuickBooks: Reports > A/R Aging Detail > Export', 'Jobber / ServiceTitan: Invoices > Export'], unlocks: 'Payment-vs-invoice mismatch checks when invoice and payment rows share an invoice ID.' },
  { id: 'job_costing', title: 'Job costing', required: false, minMonths: 0, datasets: ['jobs', 'materials', 'callbacks'], metrics: ['job_revenue', 'job_labor', 'job_materials'], engineUse: 'FINDINGS',
    why: 'Per-job revenue, labor and materials reveal which jobs lose money - the most common hidden leak for contractors.',
    formats: ['CSV or XLSX completed-jobs export (one row per job)'], columns: ['Job ID', 'Date', 'Revenue', 'Labor cost', 'Material cost'],
    examples: ['ServiceTitan / Housecall Pro / Jobber: Reports > Job costing > Export'], unlocks: 'Negative job contribution findings per job.' },
  { id: 'payroll', title: 'Payroll & time', required: false, minMonths: 1, datasets: ['payroll', 'time_entries', 'technicians'], metrics: ['payroll_cost', 'labor_cost', 'hours', 'overtime_hours'], engineUse: 'CONTEXT', manualMetric: 'labor_cost',
    why: 'Labor is usually the biggest cost. Payroll and hours show overtime and loaded labor cost.',
    formats: ['CSV or XLSX payroll register or time-entry export'], columns: ['Employee', 'Pay date', 'Regular hours', 'Overtime hours', 'Gross wages'],
    examples: ['Gusto / ADP / QuickBooks Payroll: Reports > Payroll register > Export'], unlocks: 'Labor cost evidence for the analyst (overtime engine not yet implemented).' },
  { id: 'processor_fees', title: 'Payment processor fees', required: false, minMonths: 1, datasets: [], metrics: ['fees', 'payment_net'], engineUse: 'FINDINGS', manualMetric: 'processing_fee',
    why: 'Card and ACH fees add up quietly; the fee total shows what you pay to get paid.',
    formats: ['CSV or XLSX payout / fee report (map the fee column to "Processing fee")', 'Or connect Stripe on the Integrations page'],
    columns: ['Date', 'Gross', 'Fee', 'Net'], examples: ['Stripe: Balance > Export', 'Square: Reports > Fees > Export'],
    unlocks: 'Processing-fee review findings.' },
];

export const guidedStepHref = (id: GuidedStepId) => `/smart-analysis?step=${id}#step-${id}`;
export const intakeHref = (id: GuidedStepId, businessId?: string) =>
  `/data-intake?step=${id}${businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''}`;
