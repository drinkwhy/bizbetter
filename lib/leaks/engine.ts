import { makeFinding } from '@/lib/evidence/engine';
import type { Finding, NormalizedBusinessRecord, SourceRecord } from '@/lib/evidence/model';
import type { GuidedStepId } from '@/lib/smart-analysis/steps';
import { vendorKey } from '@/lib/documents/records';

export type LeakCategory = 'losing_months' | 'losing_jobs' | 'underpriced_jobs' | 'processor_fees' | 'overdue_invoices' | 'duplicate_charges' | 'price_creep' | 'overlapping_subscriptions' | 'overtime' | 'cost_trend'
  | 'revenue_trend' | 'vendor_concentration' | 'technician_contribution' | 'labor_utilization' | 'marketing_return' | 'callbacks';
export type LeakBasis = 'CALCULATED' | 'ESTIMATE' | 'POSSIBLE';
export interface Leak { category: LeakCategory; label: string; finding: Finding; recoverable: boolean; basis: LeakBasis; details: string[]; causes: string[]; step: GuidedStepId }
export interface LeakCheck { category: LeakCategory; label: string; status: 'FOUND' | 'NONE_FOUND' | 'NOT_ENOUGH_DATA'; note: string; step: GuidedStepId }
export interface LeakReport { leaks: Leak[]; checks: LeakCheck[]; totalRecoverableMinor: number; bookedLossMinor: number; currency: string; asOf: string; overlapNote: string }

const LABEL: Record<LeakCategory, [string, GuidedStepId]> = {
  losing_months: ['Losing months', 'pnl'], losing_jobs: ['Unprofitable jobs', 'job_costing'], underpriced_jobs: ['Underpriced jobs / thin margins', 'job_costing'],
  processor_fees: ['Payment processor fees', 'processor_fees'], overdue_invoices: ['Unpaid and overdue invoices', 'invoices_ar'], duplicate_charges: ['Duplicate charges', 'bank_card'],
  price_creep: ['Rising subscription / vendor prices', 'bank_card'], overlapping_subscriptions: ['Overlapping subscriptions', 'bank_card'], overtime: ['Overtime cost', 'payroll'], cost_trend: ['Cost categories trending up', 'pnl'],
  revenue_trend: ['Revenue trend', 'pnl'], vendor_concentration: ['Vendor concentration', 'bank_card'], technician_contribution: ['Technician contribution', 'job_costing'],
  labor_utilization: ['Labor utilization (billable vs paid hours)', 'payroll'], marketing_return: ['Marketing return by lead source', 'job_costing'], callbacks: ['Callbacks / rework', 'job_costing'],
};
export const usd = (minor: number) => (minor < 0 ? '-' : '') + '$' + (Math.abs(minor) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const cents = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : null);
const str = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));
const day = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 86400000;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

function kindOf(r: NormalizedBusinessRecord): string {
  const k = str(r.normalizedValues.doc_kind); if (k) return k;
  switch (r.datasetType) { case 'profit_and_loss': return 'pnl'; case 'transactions': case 'expenses': case 'bills': return 'bank_statement'; case 'invoices': return 'invoices'; case 'jobs': return 'job_costing'; case 'payroll': return 'payroll'; case 'payments': return 'processor_fees'; default: return 'other'; }
}

export function runLeakEngines(input: { normalized: NormalizedBusinessRecord[]; records: SourceRecord[]; asOf?: string; feeTargetRate?: number }): LeakReport {
  const asOf = input.asOf || new Date().toISOString().slice(0, 10);
  const currency = input.records[0]?.currency || 'USD';
  const records = input.records.filter((r) => r.complete && r.currency === currency);
  const byRow = new Map<string, SourceRecord[]>(); for (const r of records) if (r.normalizedRecordId) byRow.set(r.normalizedRecordId, [...(byRow.get(r.normalizedRecordId) || []), r]);
  const rows = input.normalized.filter((r) => r.quality === 'ACCEPTED' && (!r.sourceComplete || byRow.has(r.id) || true));
  const of = (k: string) => rows.filter((r) => kindOf(r) === k);
  const cite = (rs: NormalizedBusinessRecord[], metrics?: string[], limit = 12) => { const out: SourceRecord[] = []; for (const r of rs) for (const s of byRow.get(r.id) || []) if (!metrics || metrics.includes(s.metric)) { if (!out.includes(s)) out.push(s); } return out.slice(0, limit); };
  const where = (r: NormalizedBusinessRecord) => `${r.sourceFile}, ${r.sourceSheet || 'row ' + r.sourceRow}`;
  const leaks: Leak[] = [], checks: LeakCheck[] = [];
  const check = (category: LeakCategory, status: LeakCheck['status'], note: string) => checks.push({ category, label: LABEL[category][0], status, note, step: LABEL[category][1] });
  const push = (category: LeakCategory, o: { title: string; cited: SourceRecord[]; impact: number | null; formula: string; inputs: Record<string, number>; basis: LeakBasis; recoverable: boolean; details: string[]; causes: string[]; recovery: string[]; prevention: string[]; assumptions?: string[] }) => {
    if (!o.cited.length) return false;
    const finding = makeFinding(o.title, o.cited, o.impact, o.formula, o.inputs, { classification: o.basis === 'ESTIMATE' ? 'ESTIMATE' : o.basis === 'POSSIBLE' ? 'HYPOTHESIS' : 'CALCULATION', recovery: o.recovery, prevention: o.prevention, assumptions: o.assumptions || [], confounders: o.causes, opportunity: o.recoverable, method: 'Deterministic money-leak engine over owner-reviewed document records' });
    leaks.push({ category, label: LABEL[category][0], finding, recoverable: o.recoverable, basis: o.basis, details: o.details, causes: o.causes, step: LABEL[category][1] }); return true;
  };

  // ---- P&L based: losing months and cost trends ----
  const pnl = of('pnl'); const monthly = new Map<string, NormalizedBusinessRecord>(); const income = new Map<string, number>(); const lines = new Map<string, Map<string, { v: number; row: NormalizedBusinessRecord }>>();
  for (const r of pnl) {
    const d = str(r.normalizedValues.date).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(d)) continue; const sec = str(r.normalizedValues.section); const v = cents(r.normalizedValues.amount);
    if ((sec === 'net_income' || (!sec && cents(r.normalizedValues.net_profit) !== null)) && !monthly.has(d)) monthly.set(d, r);
    if (sec === 'total_income' && v !== null) income.set(d, v); else if (!sec && cents(r.normalizedValues.revenue) !== null) income.set(d, cents(r.normalizedValues.revenue)!);
    if (['expense', 'cogs', 'other_expense'].includes(sec) && v !== null) { const name = str(r.normalizedValues.line); const m = lines.get(name) || new Map(); m.set(d, { v, row: r }); lines.set(name, m); }
  }
  if (!monthly.size) check('losing_months', 'NOT_ENOUGH_DATA', 'Upload a monthly profit & loss with a Net Income line.');
  else {
    const net = (r: NormalizedBusinessRecord) => cents(r.normalizedValues.section ? r.normalizedValues.amount : r.normalizedValues.net_profit)!;
    const losing = Array.from(monthly.entries()).filter(([, r]) => net(r) < 0).sort((a, b) => a[0].localeCompare(b[0]));
    if (!losing.length) check('losing_months', 'NONE_FOUND', `All ${monthly.size} months in the P&L were profitable.`);
    else {
      const total = losing.reduce((s, [, r]) => s - net(r), 0);
      const lossRev = losing.map(([m]) => income.get(m)).filter((x): x is number => x !== undefined), okRev = Array.from(monthly.keys()).filter((m) => !losing.some(([l]) => l === m)).map((m) => income.get(m)).filter((x): x is number => x !== undefined);
      const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
      const causes = lossRev.length && okRev.length ? [`Revenue in the loss months averaged ${usd(avg(lossRev))} vs ${usd(avg(okRev))} in profitable months, while most costs stayed fixed.`, 'Fixed costs (rent, insurance, wages) not adjusted for slow months', 'Rising cost categories (see below)'] : ['Costs exceeded revenue in these months', 'Seasonality or one-time expenses'];
      push('losing_months', { title: `Losing months: ${losing.length} of ${monthly.size} months ended in a net loss`, cited: cite(losing.map(([, r]) => r), ['net_profit']), impact: total, formula: 'sum(-net_income) over months with net_income < 0', inputs: { months_reviewed: monthly.size, losing_months: losing.length }, basis: 'CALCULATED', recoverable: false,
        details: losing.map(([m, r]) => `${m}: net loss ${usd(-net(r))}${income.has(m) ? ` on revenue of ${usd(income.get(m)!)}` : ''} (${where(r)})`), causes,
        recovery: ['Open the loss months side by side with your best months and list every cost line that did not shrink with revenue.', 'Set a break-even revenue target per month (fixed costs divided by your gross margin) and track bookings against it weekly.', 'Fill slow months: schedule maintenance-agreement visits, tune-ups and promotions before the slow season starts.'],
        prevention: ['Review the P&L within 10 days of each month-end; act mid-month when bookings run below break-even.', 'Re-bid fixed costs (insurance, software, vehicles) annually with slow-season revenue in mind.'] });
      check('losing_months', 'FOUND', `${losing.length} loss month(s) found.`);
    }
    // Cost trends
    const months = Array.from(monthly.keys()).sort();
    if (months.length < 6) check('cost_trend', 'NOT_ENOUGH_DATA', `Needs at least 6 months of P&L detail; ${months.length} provided.`);
    else {
      const first = months.slice(0, 3), last = months.slice(-3);
      const sum = (m: Map<string, number> | Map<string, { v: number }>, ms: string[]) => ms.reduce((s, k) => { const x = (m as Map<string, number | { v: number }>).get(k); return s + (x === undefined ? NaN : typeof x === 'number' ? x : x.v); }, 0);
      const rf = sum(income, first), rl = sum(income, last); const g = Number.isFinite(rf) && rf > 0 && Number.isFinite(rl) ? (rl - rf) / rf : 0;
      let found = 0;
      for (const [name, m] of Array.from(lines.entries())) {
        const f = sum(m, first), l = sum(m, last); if (!Number.isFinite(f) || !Number.isFinite(l) || f <= 0) continue;
        const gl = (l - f) / f; if (!(gl >= 0.15 && gl >= g + 0.10 && (l - f) / 3 >= 10000)) continue;
        const series = months.filter((k) => m.has(k)).map((k) => `${k} ${usd(m.get(k)!.v)}`);
        if (push('cost_trend', { title: `${name} up ${pct(gl)} while revenue changed ${pct(g)}`, cited: cite(months.filter((k) => m.has(k)).map((k) => m.get(k)!.row), ['expenses', 'cogs']), impact: l - f, formula: 'sum(last 3 months) - sum(first 3 months) for this cost line', inputs: { first3: f, last3: l }, basis: 'ESTIMATE', recoverable: true,
          details: [`First 3 months: ${usd(f)}; last 3 months: ${usd(l)} (+${usd(l - f)}).`, `Monthly: ${series.join(', ')}.`, `Revenue over the same windows: ${usd(rf)} then ${usd(rl)}.`],
          causes: name.toLowerCase().includes('fuel') ? ['Unplanned routing and trips back to the shop', 'Fuel price increases', 'Idling and vehicle condition'] : ['Vendor price increases or added services', 'Unused seats/licenses or overlapping tools', 'Spending not reviewed against revenue'],
          recovery: [`Pull every ${name} transaction for the last 3 months and tag each as necessary, reducible or cancel.`, name.toLowerCase().includes('fuel') ? 'Route calls by area each morning and stock vans to avoid trips back to the shop; use a fuel card with per-vehicle reports.' : 'Cancel unused or duplicate tools and negotiate annual pricing on the ones you keep.', `Set a monthly budget for ${name} tied to revenue and review it at month-end.`],
          prevention: [`Track ${name} as a percent of revenue each month and investigate any month above the prior quarter's average.`, 'Require owner approval for new recurring charges.'], assumptions: ['Excess is measured against the first three months in the file; it is not a guaranteed saving.'] })) found++;
      }
      check('cost_trend', found ? 'FOUND' : 'NONE_FOUND', found ? `${found} cost line(s) rising faster than revenue.` : 'No cost line rose materially faster than revenue.');
    }
  } if (!monthly.size) check('cost_trend', 'NOT_ENOUGH_DATA', 'Upload a monthly profit & loss with expense lines.');

  // ---- Jobs ----
  const jobRows = of('job_costing'); const jobs = new Map<string, { rows: NormalizedBusinessRecord[]; rev: number; lab: number; mat: number; type: string; customer: string; complete: boolean }>();
  for (const r of jobRows) { const id = str(r.normalizedValues.job_id); if (!id) continue; const j = jobs.get(id) || { rows: [], rev: 0, lab: 0, mat: 0, type: '', customer: '', complete: true }; const rv = cents(r.normalizedValues.revenue), lb = cents(r.normalizedValues.labor_cost), mt = cents(r.normalizedValues.material_cost);
    if (rv === null || lb === null || mt === null) j.complete = false; j.rev += rv ?? 0; j.lab += lb ?? 0; j.mat += mt ?? 0; j.type = j.type || str(r.normalizedValues.job_type); j.customer = j.customer || str(r.normalizedValues.customer); j.rows.push(r); jobs.set(id, j); }
  const full = Array.from(jobs.entries()).filter(([, j]) => j.complete && j.rev > 0);
  if (!full.length) { check('losing_jobs', 'NOT_ENOUGH_DATA', 'Upload job costing with job #, revenue, labor cost and material cost.'); check('underpriced_jobs', 'NOT_ENOUGH_DATA', 'Needs at least 8 fully costed jobs.'); }
  else {
    const losing = full.filter(([, j]) => j.rev - j.lab - j.mat < 0);
    if (!losing.length) check('losing_jobs', 'NONE_FOUND', `All ${full.length} costed jobs covered their direct costs.`);
    else { const total = losing.reduce((s, [, j]) => s + (j.lab + j.mat - j.rev), 0);
      push('losing_jobs', { title: `Unprofitable jobs: ${losing.length} of ${full.length} jobs cost more than they billed`, cited: cite(losing.flatMap(([, j]) => j.rows), ['job_revenue', 'job_labor', 'job_materials']), impact: total, formula: 'sum(labor + materials - revenue) over jobs where that is positive', inputs: { jobs_reviewed: full.length, losing_jobs: losing.length }, basis: 'CALCULATED', recoverable: true,
        details: losing.map(([id, j]) => `${id}${j.type ? ` (${j.type}${j.customer ? ', ' + j.customer : ''})` : ''}: billed ${usd(j.rev)}, labor ${usd(j.lab)} + materials ${usd(j.mat)} = loss ${usd(j.lab + j.mat - j.rev)} (${where(j.rows[0])})`),
        causes: ['Quotes built on outdated labor hours or material prices', 'Scope changes done without a signed change order', 'Callbacks / rework on the same job'],
        recovery: ['Review each losing job ticket: compare quoted vs actual hours and materials and note the cause.', 'Bill any unbilled change orders or extra materials where the customer approved the work.', 'Update the price book for these job types so the next quote covers labor, materials and overhead.'],
        prevention: ['Require a change order before extra work starts.', 'Run a job-costing review weekly and flag any job whose costs pass 70% of the quoted price before it is finished.'] });
      check('losing_jobs', 'FOUND', `${losing.length} losing job(s).`); }
    if (full.length < 8) check('underpriced_jobs', 'NOT_ENOUGH_DATA', `Needs at least 8 fully costed jobs; ${full.length} provided.`);
    else {
      const margins = full.map(([, j]) => (j.rev - j.lab - j.mat) / j.rev); const med = median(margins);
      const thin = full.filter(([, j]) => { const mg = (j.rev - j.lab - j.mat) / j.rev; return mg >= 0 && mg < med / 2; });
      if (!thin.length || med <= 0) check('underpriced_jobs', 'NONE_FOUND', `No profitable job earned under half the typical margin (${pct(med)}).`);
      else { const shortfall = thin.reduce((s, [, j]) => s + Math.max(0, Math.round(j.rev * med) - (j.rev - j.lab - j.mat)), 0); const types = Array.from(new Set(thin.map(([, j]) => j.type).filter(Boolean)));
        push('underpriced_jobs', { title: `Underpriced jobs: ${thin.length} jobs earned under half the typical ${pct(med)} margin`, cited: cite(thin.flatMap(([, j]) => j.rows), ['job_revenue', 'job_labor', 'job_materials']), impact: shortfall, formula: 'sum(revenue x median job margin - actual margin) for profitable jobs below half the median margin', inputs: { median_margin_bp: Math.round(med * 10000), jobs: thin.length }, basis: 'ESTIMATE', recoverable: true,
          details: thin.map(([id, j]) => `${id}${j.type ? ` (${j.type})` : ''}: billed ${usd(j.rev)}, margin ${usd(j.rev - j.lab - j.mat)} (${pct((j.rev - j.lab - j.mat) / j.rev)})`),
          causes: [types.length ? `Prices for ${types.join(', ')} have not kept up with labor and material costs` : 'Prices not updated for current costs', 'Flat-rate prices set below the cost of the parts used', 'Discounts given without approval'],
          recovery: [`Re-price ${types.length ? types.join(', ') : 'these job types'} using actual labor hours and current material costs plus your target margin.`, 'Add material price escalators to quotes valid longer than 30 days.', 'Train techs to present good/better/best options instead of discounting.'],
          prevention: ['Review the price book every quarter against job-costing results.', 'Flag any quote below the target margin for owner approval.'], assumptions: [`Target margin is this business's own median job margin (${pct(med)}), not an industry benchmark.`] });
        check('underpriced_jobs', 'FOUND', `${thin.length} thin-margin job(s).`); }
    }
  }

  // ---- Processor fees ----
  const fees = of('processor_fees').filter((r) => cents(r.normalizedValues.fee) !== null);
  if (!fees.length) check('processor_fees', 'NOT_ENOUGH_DATA', 'Upload a payout/fee report from your card processor (gross, fee, net).');
  else {
    const feeTotal = fees.reduce((s, r) => s + Math.abs(cents(r.normalizedValues.fee)!), 0); const withGross = fees.every((r) => cents(r.normalizedValues.gross) !== null);
    const gross = withGross ? fees.reduce((s, r) => s + cents(r.normalizedValues.gross)!, 0) : 0; const target = input.feeTargetRate ?? (Number(process.env.BIZBETTER_FEE_TARGET_RATE) || 0.029);
    const cited = cite(fees, ['fees', 'payment_gross']);
    if (withGross && gross > 0) { const rate = feeTotal / gross; const excess = feeTotal - Math.round(gross * target);
      if (excess > 0) { push('processor_fees', { title: `Card processing fees: ${pct(rate)} effective rate vs ${pct(target)} target`, cited, impact: excess, formula: 'total fees - gross volume x target rate', inputs: { fees: feeTotal, gross, target_bp: Math.round(target * 10000) }, basis: 'ESTIMATE', recoverable: true,
          details: [`Total fees ${usd(feeTotal)} on ${usd(gross)} gross volume across ${fees.length} payout rows.`, `At a ${pct(target)} rate the same volume would cost ${usd(Math.round(gross * target))}.`],
          causes: ['Flat-rate pricing instead of interchange-plus', 'Card-not-present / keyed entries charged at higher rates', 'Per-transaction and monthly fees on many small payments'],
          recovery: ['Request an interchange-plus quote from your current processor and two competitors using the last 12 months of volume.', 'Push large commercial invoices to ACH/bank transfer instead of card.', 'Add a compliant card surcharge or cash-discount program if allowed in your state.'],
          prevention: ['Check the effective rate (fees / gross) on every monthly statement.', 'Review processor pricing once a year.'], assumptions: [`Target rate ${pct(target)} is configurable (BIZBETTER_FEE_TARGET_RATE); it is a negotiating goal, not a guaranteed rate.`] }); check('processor_fees', 'FOUND', `Effective rate ${pct(rate)}.`); }
      else check('processor_fees', 'NONE_FOUND', `Effective rate ${pct(rate)} is at or below the ${pct(target)} target.`);
    } else { push('processor_fees', { title: `Card processing fees paid: ${usd(feeTotal)}`, cited, impact: null, formula: 'sum(fees)', inputs: { fees: feeTotal }, basis: 'CALCULATED', recoverable: false, details: [`Total fees ${usd(feeTotal)}; gross volume missing, so the effective rate cannot be calculated.`], causes: ['Processor pricing unknown without gross volume'], recovery: ['Upload the processor report with gross volume to calculate the effective rate.'], prevention: ['Review the effective rate monthly.'] }); check('processor_fees', 'FOUND', 'Fees found; add gross volume to size the excess.'); }
  }

  // ---- Overdue invoices ----
  const inv = of('invoices'); const known = inv.filter((r) => str(r.normalizedValues.due_date));
  if (!known.length) check('overdue_invoices', 'NOT_ENOUGH_DATA', 'Upload invoices or an A/R aging report with due dates and amounts paid.');
  else {
    const od = known.map((r) => { const amt = cents(r.normalizedValues.amount), paid = cents(r.normalizedValues.amount_paid), open = cents(r.normalizedValues.open_balance); const st = str(r.normalizedValues.status).toLowerCase();
      const outstanding = open !== null ? open : amt !== null && paid !== null ? amt - paid : st === 'paid' ? 0 : null; return { r, outstanding, due: str(r.normalizedValues.due_date) }; })
      .filter((x) => x.outstanding !== null && x.outstanding > 0 && x.due < asOf).sort((a, b) => b.outstanding! - a.outstanding!);
    if (!od.length) check('overdue_invoices', 'NONE_FOUND', `No invoices past due as of ${asOf}.`);
    else { const total = od.reduce((s, x) => s + x.outstanding!, 0);
      push('overdue_invoices', { title: `Overdue invoices: ${od.length} invoices past due as of ${asOf}`, cited: cite(od.map((x) => x.r), ['invoice_contract', 'invoice_paid', 'receivable']), impact: total, formula: 'sum(amount - amount paid) for invoices with due date before the as-of date', inputs: { invoices: od.length }, basis: 'CALCULATED', recoverable: true,
        details: od.map((x) => `${str(x.r.normalizedValues.invoice_id)} ${str(x.r.normalizedValues.customer)}: ${usd(x.outstanding!)} outstanding, due ${x.due} (${Math.round(day(asOf) - day(x.due))} days overdue)`),
        causes: ['No one is assigned to collections', 'No automatic reminders before and after the due date', 'Net terms given to commercial customers without deposits'],
        recovery: ['Call every invoice over 30 days overdue this week, starting with the largest; agree a payment date in writing.', 'Send statements with a pay-now link (card or ACH) and offer a short payment plan for the largest balance.', 'Pause new non-emergency work for accounts more than 60 days overdue until they are current.'],
        prevention: ['Turn on automatic reminders at 3 days before, on, and 7/14/30 days after the due date.', 'Collect deposits on installs and require card-on-file for residential service.', 'Review A/R aging every Monday.'] });
      check('overdue_invoices', 'FOUND', `${od.length} overdue invoice(s).`); }
  }

  // ---- Transactions: duplicates, price creep, overlapping subscriptions ----
  const tx = [...of('bank_statement'), ...of('card_statement')].map((r) => ({ r, amt: cents(r.normalizedValues.amount), date: str(r.normalizedValues.date), key: str(r.normalizedValues.vendor_key) || vendorKey(str(r.normalizedValues.vendor || r.normalizedValues.description)), file: r.sourceFile || '' }))
    .filter((t) => t.amt !== null && t.amt < 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.key);
  if (!tx.length) { for (const c of ['duplicate_charges', 'price_creep', 'overlapping_subscriptions'] as LeakCategory[]) check(c, 'NOT_ENOUGH_DATA', 'Upload bank and credit card statements (CSV, XLSX, PDF or OFX).'); }
  else {
    const sorted = [...tx].sort((a, b) => a.date.localeCompare(b.date)); const dups: typeof tx = []; const used = new Set<string>();
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length && day(sorted[j].date) - day(sorted[i].date) <= 3; j++) { const a = sorted[i], b = sorted[j]; if (!used.has(b.r.id) && !used.has(a.r.id) && a.key === b.key && a.amt === b.amt && a.file === b.file) { dups.push(b); used.add(b.r.id); used.add(a.r.id); } }
    if (!dups.length) check('duplicate_charges', 'NONE_FOUND', `No same-vendor, same-amount charges within 3 days among ${tx.length} charges.`);
    else { const total = dups.reduce((s, d) => s - d.amt!, 0);
      push('duplicate_charges', { title: `Possible duplicate charges: ${dups.length} repeated charge(s)`, cited: cite(dups.map((d) => d.r).concat(sorted.filter((s) => dups.some((d) => d.key === s.key && d.amt === s.amt && d.file === s.file && d.r.id !== s.r.id && Math.abs(day(d.date) - day(s.date)) <= 3)).map((s) => s.r)), ['vendor_spend']), impact: total, formula: 'sum of the second charge in each same-vendor, same-amount pair within 3 days', inputs: { pairs: dups.length }, basis: 'POSSIBLE', recoverable: true,
        details: dups.map((d) => `${str(d.r.normalizedValues.vendor)}: ${usd(-d.amt!)} charged twice around ${d.date} (${where(d.r)})`),
        causes: ['Vendor processed the same payment twice', 'An invoice was paid by ACH and again by card', 'A card terminal retried a transaction'],
        recovery: ['Match each pair to the vendor invoice; if only one invoice exists, request a refund or credit in writing.', 'For card charges, dispute the duplicate with the card issuer if the vendor does not refund within 10 days.'],
        prevention: ['Pay vendors from one method only and record the invoice number in the payment memo.', 'Review bank and card activity weekly for repeated amounts.'] });
      check('duplicate_charges', 'FOUND', `${dups.length} possible duplicate(s).`); }

    const groups = new Map<string, Map<string, { sum: number; rows: NormalizedBusinessRecord[]; name: string }>>();
    for (const t of tx) { const g = groups.get(t.key + '|' + t.file) || new Map(); const m = t.date.slice(0, 7); const cur = g.get(m) || { sum: 0, rows: [], name: str(t.r.normalizedValues.vendor) }; cur.sum += -t.amt!; cur.rows.push(t.r); g.set(m, cur); groups.set(t.key + '|' + t.file, g); }
    const creep: Array<{ name: string; first: number; last: number; excess: number; rows: NormalizedBusinessRecord[]; series: string }> = [];
    const recurring: Array<{ key: string; name: string; months: Map<string, { sum: number; rows: NormalizedBusinessRecord[] }> }> = [];
    for (const [k, g] of Array.from(groups.entries())) { const ms = Array.from(g.keys()).sort(); if (ms.length < 3) continue; const vals = ms.map((m) => g.get(m)!.sum);
      const steady = vals.some((v, i) => i > 0 && v === vals[i - 1]); if (!steady) continue;
      const max = Math.max(...vals), min = Math.min(...vals); if (max - min <= max * 0.1) recurring.push({ key: k.split('|')[0], name: g.get(ms[0])!.name, months: g });
      if (vals[vals.length - 1] > vals[0] * 1.1 && vals[vals.length - 1] - vals[0] >= 1000) creep.push({ name: g.get(ms[0])!.name, first: vals[0], last: vals[vals.length - 1], excess: vals.slice(1).reduce((s, v) => s + Math.max(0, v - vals[0]), 0), rows: ms.flatMap((m) => g.get(m)!.rows), series: ms.map((m) => `${m} ${usd(g.get(m)!.sum)}`).join(', ') }); }
    if (!creep.length) check('price_creep', 'NONE_FOUND', 'No recurring charge increased by more than 10%.');
    else { const total = creep.reduce((s, c) => s + c.excess, 0);
      push('price_creep', { title: `Rising recurring charges: ${creep.length} vendor(s) raised their price`, cited: cite(creep.flatMap((c) => c.rows), ['vendor_spend']), impact: total, formula: 'sum over later months of (monthly charge - first monthly charge)', inputs: { vendors: creep.length }, basis: 'CALCULATED', recoverable: true,
        details: creep.map((c) => `${c.name}: ${usd(c.first)}/mo -> ${usd(c.last)}/mo (+${pct((c.last - c.first) / c.first)}); paid ${usd(c.excess)} more than the starting price. ${c.series}`),
        causes: ['Plan upgrades or added seats nobody approved', 'Introductory pricing ended', 'Annual price increases accepted automatically'],
        recovery: ['Log in to each vendor and check plan, seats and add-ons; remove unused users.', 'Ask for the original price or an annual-prepay discount; get quotes from one alternative to negotiate.'],
        prevention: ['Keep a subscription list with owner, price and renewal date; review it quarterly.', 'Use one company card for subscriptions with alerts for any amount change.'] });
      check('price_creep', 'FOUND', `${creep.length} vendor(s) with rising charges.`); }

    const pairs: Array<{ a: typeof recurring[number]; b: typeof recurring[number]; shared: string; overlap: string[] }> = [];
    for (let i = 0; i < recurring.length; i++) for (let j = i + 1; j < recurring.length; j++) { const a = recurring[i], b = recurring[j]; if (a.key === b.key) continue;
      const ta = new Set(a.key.split(' ').filter((w) => w.length >= 3)), shared = b.key.split(' ').filter((w) => w.length >= 3 && ta.has(w));
      const overlap = Array.from(a.months.keys()).filter((m) => b.months.has(m)); if (shared.length && overlap.length >= 2) pairs.push({ a, b, shared: shared.join(' '), overlap }); }
    if (!pairs.length) check('overlapping_subscriptions', recurring.length ? 'NONE_FOUND' : 'NOT_ENOUGH_DATA', recurring.length ? 'No two recurring vendors look like the same service.' : 'Needs at least 3 months of card/bank charges.');
    else { const total = pairs.reduce((s, p) => { const smaller = p.overlap.reduce((x, m) => x + p.a.months.get(m)!.sum, 0) <= p.overlap.reduce((x, m) => x + p.b.months.get(m)!.sum, 0) ? p.a : p.b; return s + p.overlap.reduce((x, m) => x + smaller.months.get(m)!.sum, 0); }, 0);
      push('overlapping_subscriptions', { title: `Overlapping subscriptions: ${pairs.map((p) => `${p.a.name} and ${p.b.name}`).join('; ')}`, cited: cite(pairs.flatMap((p) => [...p.overlap.flatMap((m) => p.a.months.get(m)!.rows), ...p.overlap.flatMap((m) => p.b.months.get(m)!.rows)]), ['vendor_spend']), impact: total, formula: 'sum of the cheaper subscription in each overlapping pair during overlapping months', inputs: { pairs: pairs.length }, basis: 'POSSIBLE', recoverable: true,
        details: pairs.map((p) => `${p.a.name} and ${p.b.name} (both "${p.shared}") were both charged in ${p.overlap.length} months: ${p.overlap.join(', ')}.`),
        causes: ['A provider was replaced but the old subscription was never cancelled', 'Different staff signed up for similar tools'],
        recovery: ['Confirm which service the team actually uses and cancel the other in writing; ask for a refund of recent months.'], prevention: ['Cancel the old tool on the same day a replacement goes live.', 'Keep a subscription register reviewed quarterly.'] });
      check('overlapping_subscriptions', 'FOUND', `${pairs.length} overlapping pair(s).`); }
  }

  // ---- Payroll overtime ----
  const pay = of('payroll'); const gross = pay.reduce((s, r) => s + (cents(r.normalizedValues.gross_wages) ?? 0), 0);
  const otPay = (r: NormalizedBusinessRecord) => { const p = cents(r.normalizedValues.overtime_pay); if (p !== null) return p; const h = typeof r.normalizedValues.overtime_hours === 'number' ? r.normalizedValues.overtime_hours : null, rate = cents(r.normalizedValues.hourly_rate); return h !== null && rate !== null ? Math.round(h * rate * 1.5) : null; };
  const ot = pay.reduce((s, r) => s + (otPay(r) ?? 0), 0);
  if (!pay.length || gross <= 0 || !pay.some((r) => otPay(r) !== null)) check('overtime', 'NOT_ENOUGH_DATA', 'Upload a payroll register with gross wages and overtime pay or hours.');
  else { const share = ot / gross;
    if (share < 0.05) check('overtime', 'NONE_FOUND', `Overtime is ${pct(share)} of gross wages.`);
    else { const people = new Map<string, { reg: number; ot: number; pay: number; rows: NormalizedBusinessRecord[] }>();
      for (const r of pay) { const e = str(r.normalizedValues.employee) || 'Unknown'; const p = people.get(e) || { reg: 0, ot: 0, pay: 0, rows: [] }; p.reg += typeof r.normalizedValues.regular_hours === 'number' ? r.normalizedValues.regular_hours : 0; p.ot += typeof r.normalizedValues.overtime_hours === 'number' ? r.normalizedValues.overtime_hours : 0; p.pay += otPay(r) ?? 0; p.rows.push(r); people.set(e, p); }
      const heavy = Array.from(people.entries()).filter(([, p]) => p.reg > 0 && p.ot / p.reg > 0.1).sort((a, b) => b[1].pay - a[1].pay); const premium = Math.round(ot / 3);
      push('overtime', { title: `Overtime: ${pct(share)} of gross wages paid as overtime`, cited: cite((heavy.length ? heavy : Array.from(people.entries())).flatMap(([, p]) => p.rows), ['overtime_cost', 'payroll_cost']), impact: premium, formula: 'overtime pay / 3 (the half-time premium at time-and-a-half)', inputs: { overtime_pay: ot, gross_wages: gross }, basis: 'ESTIMATE', recoverable: true,
        details: [`Overtime pay ${usd(ot)} of ${usd(gross)} gross wages; the premium portion above straight time is about ${usd(premium)}.`, ...heavy.map(([e, p]) => `${e}: ${p.ot} overtime hours vs ${p.reg} regular hours (${pct(p.ot / p.reg)}), ${usd(p.pay)} overtime pay`)],
        causes: ['Not enough senior techs for the call volume', 'Jobs scheduled late in the day or poorly routed', 'Overtime not approved in advance'],
        recovery: ['Shift routine maintenance calls to slower days and stop booking non-emergency work after 3 pm for the overloaded techs.', 'Compare the overtime premium with the cost of hiring or subcontracting one more tech.', 'Require approval for overtime beyond 5 hours per week per person.'],
        prevention: ['Review overtime by employee every payroll and set a weekly cap.', 'Track billable hours per tech to spot overload early.'], assumptions: ['Assumes overtime is paid at 1.5x; only the 0.5x premium is counted as avoidable.'] });
      check('overtime', 'FOUND', `Overtime ${pct(share)} of gross wages.`); }
  }

  // ---- Revenue trend (P&L) ----
  { const ms = Array.from(income.keys()).sort();
    if (ms.length < 8) check('revenue_trend', 'NOT_ENOUGH_DATA', `Needs at least 8 months of P&L income totals; ${ms.length} provided.`);
    else { const f3 = ms.slice(0, 3), l3 = ms.slice(-3); const a = f3.reduce((x, m) => x + income.get(m)!, 0), b = l3.reduce((x, m) => x + income.get(m)!, 0); const g = a > 0 ? (b - a) / a : 0;
      const hi = ms.reduce((x, m) => (income.get(m)! > income.get(x)! ? m : x)), lo = ms.reduce((x, m) => (income.get(m)! < income.get(x)! ? m : x));
      const revRows = pnl.filter((r) => str(r.normalizedValues.section) === 'total_income' || (!str(r.normalizedValues.section) && cents(r.normalizedValues.revenue) !== null));
      if (g > -0.10) check('revenue_trend', 'NONE_FOUND', `Revenue changed ${pct(g)} (first 3 vs last 3 of ${ms.length} months); highest ${hi} ${usd(income.get(hi)!)}, lowest ${lo} ${usd(income.get(lo)!)}.`);
      else { push('revenue_trend', { title: `Revenue down ${pct(-g)}: last 3 months vs first 3 months`, cited: cite(revRows.filter((r) => [...f3, ...l3].includes(str(r.normalizedValues.date).slice(0, 7))), ['revenue']), impact: a - b, formula: 'sum(revenue, first 3 months) - sum(revenue, last 3 months)', inputs: { months: ms.length }, basis: 'CALCULATED', recoverable: false,
          details: [`${f3.join(', ')}: ${usd(a)} total revenue; ${l3.join(', ')}: ${usd(b)}.`, `Highest month ${hi} ${usd(income.get(hi)!)}; lowest month ${lo} ${usd(income.get(lo)!)}.`, ...ms.map((m) => `${m} ${usd(income.get(m)!)}`)],
          causes: ['Seasonality (compare with the same months last year before concluding)', 'Fewer jobs booked or lower average ticket', 'Lost maintenance-agreement or commercial customers'],
          recovery: ['Compare job count and average ticket for the weakest months against the strongest months to see which one fell.', 'Run a maintenance-agreement and tune-up campaign aimed at the slow months.'],
          prevention: ['Track monthly revenue against the same month last year and a break-even target.', 'Book seasonal maintenance in advance so slow months have scheduled work.'] });
        check('revenue_trend', 'FOUND', `Revenue down ${pct(-g)} over ${ms.length} months.`); } } }

  // ---- Vendor concentration (bank/card/receipts) ----
  { const spend = rows.filter((r) => ['bank_statement', 'card_statement', 'receipt'].includes(kindOf(r)) && cents(r.normalizedValues.expense) !== null);
    const by = new Map<string, { name: string; sum: number; rows: NormalizedBusinessRecord[] }>();
    // Payroll, taxes, transfers, loans, card payments and owner draws are not suppliers.
    const NOT_SUPPLIER = /payroll|gusto|adp|paychex|\birs\b|eftps|tax|transfer|xfer|loan|card payment|credit card|autopay amex|owner|draw|deposit/i;
    for (const r of spend) { const k = str(r.normalizedValues.vendor_key) || vendorKey(str(r.normalizedValues.vendor)); if (!k || NOT_SUPPLIER.test(str(r.normalizedValues.vendor))) continue; const v = by.get(k) || { name: str(r.normalizedValues.vendor), sum: 0, rows: [] }; v.sum += cents(r.normalizedValues.expense)!; v.rows.push(r); by.set(k, v); }
    const total = Array.from(by.values()).reduce((x, v) => x + v.sum, 0); const top = Array.from(by.values()).sort((a, b) => b.sum - a.sum);
    if (by.size < 5 || total <= 0) check('vendor_concentration', 'NOT_ENOUGH_DATA', `Needs bank or card charges from at least 5 vendors; ${by.size} found.`);
    else { const share = top[0].sum / total; const top3 = top.slice(0, 3);
      const summary = top3.map((v) => `${v.name}: ${usd(v.sum)} (${pct(v.sum / total)})`).join('; ');
      if (share < 0.25) check('vendor_concentration', 'NONE_FOUND', `${by.size} vendors; largest is ${pct(share)} of spend. Top 3: ${summary}.`);
      else { push('vendor_concentration', { title: `Vendor concentration: ${top[0].name} is ${pct(share)} of card/bank spend`, cited: cite(top[0].rows, ['vendor_spend']), impact: null, formula: 'vendor spend / total outflows in uploaded bank, card and receipt records', inputs: { vendors: by.size, total_spend: total }, basis: 'POSSIBLE', recoverable: true,
          details: [`${by.size} vendors, ${usd(total)} total outflows. Top 3: ${summary}.`], causes: ['One supplier used out of habit without competing quotes', 'Volume discounts never negotiated'],
          recovery: ['Ask the top supplier for a contractor volume discount and get one competing quote for your 20 most-used parts.'], prevention: ['Re-quote the top three suppliers once a year.'], assumptions: ['No dollar saving is claimed: it depends on quotes you have not received yet.'] });
        check('vendor_concentration', 'FOUND', `Largest vendor ${pct(share)} of spend.`); } } }

  // ---- Jobs: technician contribution, callbacks, marketing return ----
  const costedJobs = of('job_costing').filter((r) => cents(r.normalizedValues.revenue) !== null && cents(r.normalizedValues.labor_cost) !== null);
  const margin = (r: NormalizedBusinessRecord) => cents(r.normalizedValues.revenue)! - cents(r.normalizedValues.labor_cost)! - (cents(r.normalizedValues.material_cost) ?? 0);
  { const withTech = costedJobs.filter((r) => str(r.normalizedValues.technician)); const by = new Map<string, { rev: number; m: number; rows: NormalizedBusinessRecord[] }>();
    for (const r of withTech) { const t = str(r.normalizedValues.technician); const v = by.get(t) || { rev: 0, m: 0, rows: [] }; v.rev += cents(r.normalizedValues.revenue)!; v.m += margin(r); v.rows.push(r); by.set(t, v); }
    if (!costedJobs.length) check('technician_contribution', 'NOT_ENOUGH_DATA', 'Upload job costing with revenue, labor and material cost per job.');
    else if (by.size < 3) check('technician_contribution', 'NOT_ENOUGH_DATA', by.size ? `Needs jobs from at least 3 technicians; ${by.size} found.` : 'Job costing has no Technician column; add the technician who did each job.');
    else { const rates = Array.from(by.entries()).filter(([, v]) => v.rev > 0).map(([t, v]) => [t, v.m / v.rev] as const); const med = median(rates.map(([, x]) => x));
      const low = rates.filter(([, x]) => x < med - 0.10).map(([t, x]) => ({ t, x, gap: Math.round(by.get(t)!.rev * (med - x)) }));
      const table = rates.map(([t, x]) => `${t}: ${by.get(t)!.rows.length} jobs, revenue ${usd(by.get(t)!.rev)}, contribution ${usd(by.get(t)!.m)} (${pct(x)})`);
      if (!low.length) check('technician_contribution', 'NONE_FOUND', `No technician is more than 10 points below the median contribution margin of ${pct(med)}.`);
      else { push('technician_contribution', { title: `Technician contribution: ${low.map((l) => l.t).join(', ')} below the team median margin`, cited: cite(low.flatMap((l) => by.get(l.t)!.rows), ['job_revenue', 'job_labor', 'job_materials']), impact: low.reduce((x, l) => x + l.gap, 0), formula: 'sum over technicians more than 10 points below median of revenue x (median margin - technician margin)', inputs: { technicians: by.size, median_margin_bp: Math.round(med * 10000) }, basis: 'ESTIMATE', recoverable: true,
          details: [...low.map((l) => `${l.t}: margin ${pct(l.x)} vs team median ${pct(med)}; ${usd(l.gap)} below median on ${usd(by.get(l.t)!.rev)} of revenue.`), ...table],
          causes: ['Assigned the job types that are underpriced (check the underpriced jobs leak)', 'More hours per job than other techs', 'Discounts or free return visits'],
          recovery: ['Review this technician\'s jobs one by one: compare hours and materials with the same job type done by others.', 'Fix pricing on the job types they are assigned before judging the technician.'],
          prevention: ['Report contribution margin by technician monthly.', 'Pair newer techs with a senior tech on the job types where they lose margin.'], assumptions: ['Overlaps with the losing-jobs and underpriced-jobs leaks; uses only uploaded jobs.'] });
        check('technician_contribution', 'FOUND', `${low.length} technician(s) below median margin.`); } } }
  { const flagged = costedJobs.filter((r) => r.normalizedValues.callback_indicator === 'yes'); const hasCol = costedJobs.some((r) => r.normalizedValues.callback_indicator === 'yes' || r.normalizedValues.callback_indicator === 'no');
    if (!hasCol) check('callbacks', 'NOT_ENOUGH_DATA', costedJobs.length ? 'Job costing has no Callback / rework column; mark return visits so their cost can be counted.' : 'Upload job costing with a Callback column.');
    else if (!flagged.length) check('callbacks', 'NONE_FOUND', `No callbacks marked in ${costedJobs.length} jobs.`);
    else { const cost = (r: NormalizedBusinessRecord) => cents(r.normalizedValues.labor_cost)! + (cents(r.normalizedValues.material_cost) ?? 0); const total = flagged.reduce((x, r) => x + cost(r), 0);
      push('callbacks', { title: `Callbacks: ${flagged.length} of ${costedJobs.length} jobs were return visits`, cited: cite(flagged, ['job_labor', 'job_materials']), impact: total, formula: 'sum(labor cost + material cost) of jobs marked as callbacks', inputs: { callbacks: flagged.length, jobs: costedJobs.length }, basis: 'CALCULATED', recoverable: true,
        details: flagged.map((r) => `${str(r.normalizedValues.job_id)} ${str(r.normalizedValues.job_type)}${str(r.normalizedValues.technician) ? ' (' + str(r.normalizedValues.technician) + ')' : ''}: labor ${usd(cents(r.normalizedValues.labor_cost)!)} + materials ${usd(cents(r.normalizedValues.material_cost) ?? 0)} (${where(r)})`),
        causes: ['Installs not commissioned or tested before leaving', 'Wrong or low-quality parts', 'Rushed schedule'],
        recovery: ['Find the original job for each callback and recover warranty parts cost from the supplier where the part failed.', 'Review each callback with the technician and record the root cause.'],
        prevention: ['Use a pre-departure checklist with photos for installs.', 'Track callback rate by technician and job type monthly.'], assumptions: ['Counts the full cost of the return visit; revenue billed on the callback job, if any, is not subtracted.'] });
      check('callbacks', 'FOUND', `${flagged.length} callback job(s).`); } }
  { const mk = of('marketing').filter((r) => cents(r.normalizedValues.marketing_spend) !== null && str(r.normalizedValues.marketing_source));
    const attributed = costedJobs.filter((r) => str(r.normalizedValues.marketing_source));
    if (!mk.length) check('marketing_return', 'NOT_ENOUGH_DATA', 'Upload marketing spend by lead source (month, source, spend).');
    else if (!attributed.length) check('marketing_return', 'NOT_ENOUGH_DATA', 'Job costing has no Lead Source column, so revenue cannot be matched to marketing spend.');
    else { const key = (v: unknown) => str(v).trim().toLowerCase(); const by = new Map<string, { name: string; spend: number; rows: NormalizedBusinessRecord[]; months: Set<string> }>();
      for (const r of mk) { const k = key(r.normalizedValues.marketing_source); const v = by.get(k) || { name: str(r.normalizedValues.marketing_source), spend: 0, rows: [], months: new Set<string>() }; v.spend += cents(r.normalizedValues.marketing_spend)!; v.rows.push(r); v.months.add(str(r.normalizedValues.date).slice(0, 7)); by.set(k, v); }
      const res = Array.from(by.values()).map((v) => { const jobs = attributed.filter((j) => key(j.normalizedValues.marketing_source) === key(v.name) && v.months.has(str(j.normalizedValues.date).slice(0, 7))); const c = jobs.reduce((x, j) => x + margin(j), 0); return { ...v, jobs, contrib: c, short: v.spend - Math.max(0, c) }; });
      const bad = res.filter((x) => x.contrib < x.spend);
      const table = res.map((x) => `${x.name}: spend ${usd(x.spend)}, ${x.jobs.length} attributed job(s), job contribution ${usd(x.contrib)}`);
      if (!bad.length) check('marketing_return', 'NONE_FOUND', `Every paid source returned more job contribution than it cost. ${table.join('; ')}.`);
      else { push('marketing_return', { title: `Marketing return: ${bad.map((b) => b.name).join(', ')} cost more than the jobs they brought in`, cited: cite(bad.flatMap((b) => [...b.rows, ...b.jobs]), ['marketing_cost', 'job_revenue', 'job_labor', 'job_materials']), impact: bad.reduce((x, b) => x + b.short, 0), formula: 'per source: spend - max(0, sum(job revenue - labor - materials) of jobs with that lead source in the same months)', inputs: { sources: res.length }, basis: 'ESTIMATE', recoverable: true,
          details: [...bad.map((b) => `${b.name}: spent ${usd(b.spend)} in ${Array.from(b.months).sort().join(', ')}; ${b.jobs.length} job(s) contributed ${usd(b.contrib)}; shortfall ${usd(b.short)}.`), ...table],
          causes: ['Paying for leads that rarely book or book only small jobs', 'Lead source not recorded on every job (attribution gaps)'],
          recovery: ['Pause or cut the budget on the losing sources for one month and watch booked jobs.', 'Move the budget to the source with the best contribution per dollar.'],
          prevention: ['Record the lead source on every job and review spend vs contribution by source monthly.'], assumptions: ['Assumes the job costing file lists every job from these sources in those months; repeat business from these customers later is not counted.'] });
        check('marketing_return', 'FOUND', `${bad.length} source(s) below break-even.`); } } }

  // ---- Labor utilization (timesheets) ----
  { const ts = of('timesheet').filter((r) => str(r.normalizedValues.employee) && typeof r.normalizedValues.billable_hours === 'number');
    if (!ts.length) check('labor_utilization', 'NOT_ENOUGH_DATA', pay.length ? 'Payroll shows hours paid but not hours billed; upload timesheets with billable and non-billable hours.' : 'Upload timesheets with billable and non-billable hours per employee.');
    else { const target = Number(process.env.BIZBETTER_UTILIZATION_TARGET) || 0.7; const rate = new Map<string, number>(); for (const r of pay) { const c = cents(r.normalizedValues.hourly_rate); if (c !== null) rate.set(str(r.normalizedValues.employee), c); }
      const by = new Map<string, { b: number; t: number; rows: NormalizedBusinessRecord[] }>();
      for (const r of ts) { const e = str(r.normalizedValues.employee); const v = by.get(e) || { b: 0, t: 0, rows: [] }; const b = Number(r.normalizedValues.billable_hours), nb = Number(r.normalizedValues.nonbillable_hours ?? 0); v.b += b; v.t += b + nb; v.rows.push(r); by.set(e, v); }
      const low = Array.from(by.entries()).filter(([, v]) => v.t > 0 && v.b / v.t < target).map(([e, v]) => { const gap = Math.round((target * v.t - v.b) * 10000) / 10000; const rc = rate.get(e); return { e, v, gap, cost: rc === undefined ? null : Math.round(gap * rc) }; });
      const team = Array.from(by.values()).reduce((x, v) => ({ b: x.b + v.b, t: x.t + v.t }), { b: 0, t: 0 });
      const table = Array.from(by.entries()).map(([e, v]) => `${e}: ${v.b.toFixed(1)} billable of ${v.t.toFixed(1)} hours (${pct(v.b / v.t)})`);
      if (!low.length) check('labor_utilization', 'NONE_FOUND', `Everyone is at or above the ${pct(target)} billable target; team ${pct(team.b / team.t)}.`);
      else { const priced = low.filter((l) => l.cost !== null); const total = priced.reduce((x, l) => x + l.cost!, 0);
        push('labor_utilization', { title: `Labor utilization: ${low.map((l) => l.e).join(', ')} below ${pct(target)} billable hours`, cited: cite(low.flatMap((l) => [...l.v.rows, ...pay.filter((p) => str(p.normalizedValues.employee) === l.e)]), ['hours', 'payroll_cost']), impact: priced.length ? total : null, formula: `per employee below target: (${target} x total hours - billable hours) x hourly rate from payroll`, inputs: { employees: by.size, target_bp: Math.round(target * 10000) }, basis: 'ESTIMATE', recoverable: true,
          details: [...low.map((l) => `${l.e}: ${pct(l.v.b / l.v.t)} billable; ${l.gap.toFixed(1)} hours short of target${l.cost !== null ? `, about ${usd(l.cost)} of paid time not billed` : ' (no hourly rate in payroll)'}.`), ...table],
          causes: ['Driving back to the shop between calls (no route planning)', 'Waiting on parts or dispatch', 'Overtime spent on non-billable work'],
          recovery: ['Plan routes so techs go job to job, and stock vans so they do not return to the shop for parts.', 'Review non-billable hours with each tech weekly.'],
          prevention: ['Track billable vs paid hours per tech every pay period with a 70% target.'], assumptions: ['Uses straight-time hourly rate; overtime premium is counted separately in the overtime leak.', 'Overlaps with the overtime and fuel leaks.'] });
        check('labor_utilization', 'FOUND', `${low.length} employee(s) below ${pct(target)} billable.`); } } }

  // Money leaks ranked by dollar impact; the revenue trend is context (not money lost) and goes after them.
  leaks.sort((a, b) => Number(a.category === 'revenue_trend') - Number(b.category === 'revenue_trend') || (b.finding.impactMinor ?? -1) - (a.finding.impactMinor ?? -1));
  const totalRecoverableMinor = leaks.filter((l) => l.recoverable && l.finding.impactMinor !== null).reduce((s, l) => s + l.finding.impactMinor!, 0);
  const bookedLossMinor = leaks.filter((l) => l.category === 'losing_months').reduce((s, l) => s + (l.finding.impactMinor ?? 0), 0);
  return { leaks, checks, totalRecoverableMinor, bookedLossMinor, currency, asOf, overlapNote: 'Leaks can overlap (for example a rising software subscription is also part of the Software Subscriptions cost line), so the total is an upper estimate of money to recover, not a guaranteed saving. Losing months are reported separately because they are the result of the other leaks.' };
}
