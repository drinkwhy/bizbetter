export interface WalkthroughStep {
  id: string;
  title: string;
  page: string;
  pageLabel: string;
  actions: readonly string[];
  tip: string;
}

export const WALKTHROUGH_STEPS: readonly WalkthroughStep[] = [
  { id: 'overview', title: 'Start with your business overview', page: '/', pageLabel: 'Overview', actions: ['Review revenue, expenses, profit, and the reporting context before choosing an action.', 'Use this guide to explore the workflow. Next opens the screen for the following step.'], tip: 'Financial records, decisions and opportunity stages persist in the local evidence repository. Profile edits remain session-local. Keep your original exports.' },
  { id: 'profile', title: 'Set up your business profile', page: '/settings', pageLabel: 'Settings', actions: ['Enter your business name, industry, location, and primary services.', 'Add employee count, annual revenue, average job value, and jobs per month where known, then choose Save Profile Changes.'], tip: 'Profile estimates describe the business; they do not import financial transactions. Treat unknown figures as unavailable, not confirmed zero.' },
  { id: 'data', title: 'Upload and review your exports', page: '/data-intake', pageLabel: 'Upload & analyze', actions: ['Choose your business, then select or drop CSV or XLSX exports to begin review.', 'Review field mappings, currency, reporting basis and source completeness. Save the records, then choose Analyze confirmed records.'], tip: 'Partial exports are saved for review. Confirm completeness later on this same page when you have checked the source period. Missing values stay unknown.' },
  { id: 'financials', title: 'Check the financial baseline', page: '/financials', pageLabel: 'Financials', actions: ['Compare revenue, expenses, gross profit, and net profit with the same period in your books.', 'Review labor, material, marketing, and overhead ratios before interpreting margin changes.'], tip: 'An empty workspace or zero display does not prove zero activity. CSV preview totals are not yet connected to these financials.' },
  { id: 'leaks', title: 'Investigate profit leaks', page: '/leaks', pageLabel: 'Profit Leaks', actions: ['Review the evidence, severity, and confidence behind each available leak.', 'Check the underlying invoices, payroll, or job records before deciding what needs attention.'], tip: 'A benchmark variance is a reason to investigate, not proof of waste. Production findings require cited source records; fictional examples are isolated under /demo.' },
  { id: 'opportunities', title: 'Compare improvement opportunities', page: '/opportunities', pageLabel: 'Opportunities', actions: ['Review the current situation, proposed change, assumptions, and estimated impact.', 'Choose a small, measurable improvement with evidence you can verify.'], tip: 'Estimated upside is not realized cash. Avoid counting two proposals that recover the same dollars.' },
  { id: 'recommendations', title: 'Choose and document an action', page: '/recommendations', pageLabel: 'Recommendations', actions: ['Review a recommendation’s evidence, cost, difficulty, owner, and expected impact.', 'Use Accept, Modify, or Reject when recommendations are available. Record your reasoning and the outcome you will measure.'], tip: 'Start with one action and a clear review date. The tour does not accept recommendations or change business records for you.' },
  { id: 'money', title: 'Track the stage of each opportunity', page: '/money-found', pageLabel: 'Money Found', actions: ['Review Potential, Validated, Implemented, and Realized separately.', 'Use an item’s status selector only when you have evidence that it has reached the next stage.'], tip: 'Implemented means an action has happened; Realized means its financial effect was measured. A potential annual estimate is not money already earned.' },
  { id: 'decisions', title: 'Review the decision record', page: '/decisions', pageLabel: 'Decisions', actions: ['Review the recorded decision, supporting evidence, notes, and expected outcome.', 'Compare outcomes with the original reasoning before repeating an action.'], tip: 'Recorded decisions persist with their evidence reference and audit event. Unknown outcomes remain unknown.' },
  { id: 'results', title: 'Measure what actually improved', page: '/results', pageLabel: 'Results', actions: ['Compare measured outcomes with the baseline for the same reporting period.', 'Review realized impact separately from potential or planned savings.'], tip: 'Verify figures against your books. A realized result requires matched before/after source records and reviewed confounders; a status selection cannot prove recovery.' },
  { id: 'analyst', title: 'Build an efficient weekly routine', page: '/analyst', pageLabel: 'AI Analyst', actions: ['Select the business workspace, ask a specific question such as “Why is labor increasing?”, and review the cited evidence and assumptions.', 'Each week: review the overview, check one leak, choose one action, and revisit its decision and result.'], tip: 'When configured and available, the server-side model analyzes minimized evidence for the selected workspace. Deterministic evidence remains available if the model is unavailable; neither mode can validate or realize savings.' },
];

export const WALKTHROUGH_STORAGE_KEY = 'bizbetter_walkthrough_v1';
export interface WalkthroughProgress { version: 1; step: number; completed: boolean }

export function readWalkthroughProgress(): WalkthroughProgress | null {
  try {
    const raw = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (!raw) return localStorage.getItem('bizbetter_guide_dismissed') === 'true'
      ? { version: 1, step: 0, completed: false } : null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const progress = value as Partial<WalkthroughProgress>;
    if (progress.version !== 1 || typeof progress.step !== 'number' || !Number.isInteger(progress.step) || typeof progress.completed !== 'boolean') return null;
    return { version: 1, step: Math.max(0, Math.min(progress.step, WALKTHROUGH_STEPS.length - 1)), completed: progress.completed };
  } catch { return null; }
}

export function saveWalkthroughProgress(step: number, completed = false): boolean {
  try {
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify({ version: 1, step, completed }));
    return true;
  } catch { return false; }
}
