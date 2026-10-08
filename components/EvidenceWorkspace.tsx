'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Finding, SourceRecord, Decision, LedgerItem, INSUFFICIENT } from '@/lib/evidence/model';

type Workspace = {
  message: string;
  quality: { score: number | null; formula: string; criteria: Record<string, boolean>; limitations: string[] };
  findings: Finding[];
  records: SourceRecord[];
  decisions: Decision[];
  ledger: LedgerItem[];
  missing: string[];
  audit: unknown[];
  statistics?: unknown[];
  learnings?: unknown;
};

const labels: Record<string, string> = {
  overview: 'Business evidence overview',
  financials: 'Verified financial records',
  leaks: 'Evidence-backed observations',
  opportunities: 'Supported opportunities',
  recommendations: 'Recovery & prevention guides',
  money: 'Money Found — separate stages',
  decisions: 'Owner decisions',
  results: 'Measured outcomes',
  analyst: 'Evidence analyst',
};

const money = (amount: number | null, currency: string, decimals: number) =>
  amount === null
    ? 'UNKNOWN'
    : currency + ' ' + (amount / 10 ** decimals).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

/** Short plain-English description of what the finding means */
function whatHappened(f: Finding): string {
  if (f.title.toLowerCase().includes('accounting loss') || f.title.toLowerCase().includes('reported accounting loss')) {
    return 'The books show a net loss for this period.';
  }
  if (f.title.toLowerCase().includes('processing fees') || f.title.toLowerCase().includes('fees')) {
    return 'Payment-processing fees were charged during this period.';
  }
  if (f.title.toLowerCase().includes('negative direct job')) {
    return 'Labor and materials on this job cost more than the revenue collected.';
  }
  if (f.title.toLowerCase().includes('payment exceeds') || f.title.toLowerCase().includes('overpayment')) {
    return 'More money was paid out than the documented invoice amount.';
  }
  if (f.title.toLowerCase().includes('cross-system')) {
    return 'Two different systems reported different values for the same metric and period.';
  }
  return f.opportunity
    ? 'A quantifiable savings opportunity was identified from the source records.'
    : 'An amount was observed in the source records that deserves review.';
}

/** Likely causes — kept short and practical */
function likelyCauses(f: Finding): string[] {
  if (f.title.toLowerCase().includes('accounting loss')) {
    return ['Higher costs than revenue this period', 'One-time expenses or write-offs', 'Seasonal slowdown'];
  }
  if (f.title.toLowerCase().includes('fees')) {
    return ['Card / payment processor charges', 'Rate changes or volume spikes', 'Refunds or chargebacks'];
  }
  if (f.title.toLowerCase().includes('negative direct job')) {
    return ['Scope creep not billed', 'Material overages', 'More labor hours than estimated'];
  }
  if (f.title.toLowerCase().includes('payment exceeds') || f.title.toLowerCase().includes('overpayment')) {
    return ['Missing change-order documentation', 'Duplicate payment', 'Invoice amount entered incorrectly'];
  }
  if (f.title.toLowerCase().includes('cross-system')) {
    return ['Timing differences (cash vs accrual)', 'Fees or taxes handled differently', 'Missing mapping between systems'];
  }
  return f.confounders?.length ? f.confounders.slice(0, 3) : ['Review the cited source records for context'];
}

export function EvidenceWorkspace({
  section,
  initialBusinessId,
}: {
  section: string;
  initialBusinessId?: string;
}) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [importText, setImportText] = useState('');
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [businessId, setBusinessId] = useState(initialBusinessId || 'local-workspace');
  const [question, setQuestion] = useState('Where am I losing money?');
  const [depth, setDepth] = useState('FAST');
  const [answer, setAnswer] = useState<any>(null);
  const [asking, setAsking] = useState(false);
  const [analystError, setAnalystError] = useState('');

  async function load(id = businessId) {
    try {
      const r =
        section === 'analyst'
          ? await fetch('/api/intake?businessId=' + encodeURIComponent(id), { cache: 'no-store' })
          : await fetch('/api/evidence', { cache: 'no-store' });
      if (!r.ok) throw new Error('Evidence workspace could not be read.');
      const result = await r.json();
      if (section === 'analyst') {
        setData({
          ...result.analysis,
          records: result.sourceRecords,
          decisions: result.decisions,
          ledger: result.ledger,
          audit: [],
        });
        setBusinesses(result.businesses || []);
      } else {
        setData(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Read failed.');
    }
  }

  useEffect(() => {
    if (section === 'analyst') {
      fetch('/api/intake/businesses', { cache: 'no-store' })
        .then(async (r) => {
          const result = await r.json();
          if (!r.ok) throw new Error(result.error || 'Business workspaces could not be read.');
          const available = result.businesses || [];
          setBusinesses(available);
          const chosen = available.some((item: { id: string }) => item.id === initialBusinessId)
            ? initialBusinessId
            : available[0]?.id || 'local-workspace';
          setBusinessId(chosen);
          await load(chosen);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Business workspaces could not be read.'));
    } else {
      load();
    }
  }, []);

  async function importRecords() {
    try {
      const input = importText.trim().startsWith('[')
        ? { records: JSON.parse(importText) }
        : { csvContent: importText };
      const r = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import rejected.');
    }
  }

  async function ask() {
    setAsking(true);
    setAnalystError('');
    try {
      const r = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, depth, businessId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Analysis unavailable.');
      setAnswer(d);
      if (d.status === 'UNAVAILABLE') {
        setAnalystError(d.details || d.error || 'AI is unavailable; deterministic evidence remains available.');
      }
    } catch (e) {
      setAnalystError(e instanceof Error ? e.message : 'Analysis unavailable.');
    } finally {
      setAsking(false);
    }
  }

  const findings = (data?.findings || []).filter((f) =>
    section === 'opportunities' || section === 'money' ? f.opportunity : true
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{labels[section] || labels.overview}</h1>
      <p className="text-slate-400">
        Source-backed observations are separate from hypotheses, savings opportunities and measured outcomes. No
        source means UNKNOWN.
      </p>

      {error && (
        <p role="alert" className="border border-red-700 p-3">
          {error}
        </p>
      )}

      {!data && <p>{error || 'Reading evidence…'}</p>}

      {data && (
        <>
          <p role="status" className="rounded border border-slate-700 p-4">
            {data.message}
          </p>

          <div className="flex gap-4 flex-wrap">
            <Link className="text-emerald-400 underline" href="/integrations">
              Connect data & follow setup steps
            </Link>
            <Link className="text-slate-300 underline" href="/demo">
              Open isolated demonstration
            </Link>
          </div>

          {/* Compact data-quality strip */}
          <section className="rounded border border-slate-700 p-3 text-sm">
            <span className="font-semibold">Data quality: </span>
            {data.quality.score === null ? 'UNKNOWN' : data.quality.score + ' / 100'}
            <details className="mt-1">
              <summary className="cursor-pointer text-slate-400">Show quality details</summary>
              <p className="mt-1">{data.quality.formula}</p>
              <ul className="list-disc pl-5">
                {Object.entries(data.quality.criteria).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v ? 'satisfied' : 'not established'}
                  </li>
                ))}
              </ul>
              {data.quality.limitations.map((s) => (
                <p className="text-slate-400" key={s}>
                  {s}
                </p>
              ))}
            </details>
          </section>

          {/* Analyst section unchanged */}
          {section === 'analyst' && (
            <section className="space-y-3 rounded border border-emerald-800 p-4">
              <h2 className="font-semibold">Ask BizBetter · evidence-gated analysis</h2>
              <p className="text-sm text-slate-400">
                Choose the business workspace whose committed evidence should be analyzed. Only minimized evidence is
                sent; the model cannot write findings or change Money Found.
              </p>
              <label className="block text-sm">
                Business workspace
                <select
                  aria-label="Business workspace for analysis"
                  className="ml-2 rounded bg-slate-900 p-2"
                  value={businessId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBusinessId(id);
                    setAnswer(null);
                    setAnalystError('');
                    load(id);
                  }}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                aria-label="Ask BizBetter"
                className="w-full rounded border border-slate-600 bg-slate-900 p-3"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <div className="flex gap-3">
                <select
                  aria-label="Analysis depth"
                  className="rounded bg-slate-900 p-2"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                >
                  <option value="FAST">FAST</option>
                  <option value="DEEP">DEEP</option>
                  <option value="AUDIT">AUDIT</option>
                </select>
                <button disabled={asking} onClick={ask} className="rounded bg-emerald-700 px-4 py-2">
                  {asking ? 'Investigating…' : 'Investigate evidence'}
                </button>
              </div>
              {analystError && <p role="alert">{analystError}</p>}
              {answer && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                  <p role="status">
                    {answer.status === 'AI_ANALYSIS'
                      ? `${answer.provider} ${answer.model} · ${answer.depth}`
                      : answer.status === 'AI_NOT_CONFIGURED'
                        ? 'AI not configured · deterministic analysis'
                        : answer.status === 'INSUFFICIENT_EVIDENCE'
                          ? 'Insufficient evidence · no provider request made'
                          : 'AI unavailable · deterministic evidence only'}{' '}
                    · Evidence fingerprint {answer.fingerprint?.slice(0, 16)}…
                  </p>
                  <p>{answer.answer.summary}</p>
                  {(
                    [
                      ['Verified facts', answer.answer.facts],
                      ['Patterns', answer.answer.patterns],
                      ['Hypotheses (not proven causes)', answer.answer.hypotheses],
                      ['Recommendations', answer.answer.recommendations],
                    ] as const
                  ).map(([heading, items]) => (
                    <div key={heading}>
                      <h3 className="font-semibold">{heading}</h3>
                      <ul className="list-disc pl-5">
                        {items.map((item: any, i: number) => (
                          <li key={i}>
                            {typeof item === 'string' ? item : item.text}
                            {item.evidenceIds?.length ? ` [${item.evidenceIds.join(', ')}]` : ''}
                            {item.alternatives?.length ? (
                              <span className="block text-sm text-slate-400">
                                Alternatives: {item.alternatives.join('; ')}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <h3 className="font-semibold">Additional data needed / limitations</h3>
                  <ul className="list-disc pl-5">
                    {[...answer.answer.additionalDataNeeded, ...answer.answer.limitations].map((v: string, i: number) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                  <details>
                    <summary>Evidence Gateway package ({answer.evidence?.length || 0})</summary>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(answer.evidence, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </section>
          )}

          {/* Money Found */}
          {section === 'money' && (
            <section>
              <h2 className="font-bold">Opportunity stages</h2>
              <p className="text-sm text-slate-400 mb-3">
                Potential and implemented amounts are never added to realized recovery. Different currencies and periods
                are never combined.
              </p>
              {data.ledger.length === 0 ? (
                <p>{INSUFFICIENT} No validated savings ledger yet.</p>
              ) : (
                data.ledger.map((item) => {
                  const f = data.findings.find((f) => f.id === item.findingId) || item.findingSnapshot;
                  return (
                    <article key={item.id} className="border border-slate-700 rounded-lg p-4 mb-3">
                      <h3 className="font-bold">
                        {f?.title || 'Historical opportunity'} · {item.state}
                      </h3>
                      <p className="text-emerald-400 font-semibold mt-1">
                        {item.state === 'REALIZED' && item.result
                          ? money(item.result.impactMinor, item.result.currency, item.result.decimals)
                          : f
                            ? money(f.impactMinor, f.currency, f.decimals) + ' potential for the stated period'
                            : 'UNKNOWN'}
                      </p>
                      {item.result && <FindingAudit finding={item.result} records={data.records} />}
                    </article>
                  );
                })
              )}
            </section>
          )}

          {/* Decisions / Results */}
          {['decisions', 'results'].includes(section) && (
            <section>
              <h2 className="font-bold">Recorded decisions and outcomes</h2>
              {!data.decisions.length && <p>{INSUFFICIENT} Record an evidence-backed decision first.</p>}
              {data.decisions.map((d) => (
                <article key={d.id} className="border border-slate-700 rounded-lg p-4 mb-3">
                  <h3 className="font-bold">
                    {d.decision} · {d.owner}
                  </h3>
                  <p className="mt-1">{d.notes}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Recorded: {d.createdAt.slice(0, 10)} · Implementation: {d.implementationDate || 'Not recorded'}
                  </p>
                  <p className="text-sm mt-1">
                    Measured result:{' '}
                    {data.ledger.find((i) => i.decisionId === d.id)?.result?.title ||
                      'Insufficient before/after evidence.'}
                  </p>
                </article>
              ))}
            </section>
          )}

          {/* ===== CLEAN FINDING CARDS ===== */}
          {!['decisions', 'results', 'analyst'].includes(section) && (
            <section className="space-y-4">
              <h2 className="font-bold">
                {section === 'opportunities' ? 'Quantifiable potential' : 'Findings'}
              </h2>

              {!findings.length && (
                <p>{INSUFFICIENT} We do not currently have enough evidence to identify a reliable savings opportunity.</p>
              )}

              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  records={data.records}
                  data={data}
                  reload={load}
                />
              ))}
            </section>
          )}

          {/* Collapsed technical sections */}
          <details>
            <summary className="cursor-pointer text-slate-400">
              Inspect normalized source records ({data.records.length})
            </summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Metric / source</th>
                    <th className="text-left">Period</th>
                    <th className="text-left">Recorded value</th>
                    <th className="text-left">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-700">
                      <td>
                        {r.metric}
                        <br />
                        {r.sourceSystem}
                      </td>
                      <td>
                        {r.periodStart} – {r.periodEnd}
                      </td>
                      <td>
                        {['jobs', 'hours', 'customers'].includes(r.metric)
                          ? r.value
                          : money(r.value, r.currency, r.decimals)}
                      </td>
                      <td className="max-w-xs break-all">
                        {r.sourceRecordId}
                        <br />
                        {r.verification}
                        <br />
                        {r.basis}
                        <details>
                          <summary>Full record</summary>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(r, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <details>
            <summary className="cursor-pointer text-slate-400">Missing data and unavailable analyses</summary>
            <ul className="list-disc pl-5 mt-2">
              {data.missing.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="text-sm text-slate-400 mt-2">
              Seasonality, causal inference, forecasting, customer lifetime value and cross-system root-cause
              attribution require additional history and validation.
            </p>
          </details>

          {section === 'financials' && (
            <details>
              <summary className="cursor-pointer text-slate-400">Add owner-entered normalized records</summary>
              <p className="text-sm mt-2">
                Paste a normalized CSV with these headers: SourceRecordId,Metric,ValueMinor,Currency,Decimals,Basis,PeriodStart,PeriodEnd,Complete,EntityId.
                Monetary values use minor units (100 = USD 1.00 with Decimals=2). Complete must be true or false.
              </p>
              <textarea
                aria-label="Owner-entered records"
                className="bg-slate-900 border border-slate-600 w-full h-48 p-3 mt-2"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button className="bg-emerald-700 rounded px-3 py-2 mt-2" onClick={importRecords}>
                Validate & save source records
              </button>
            </details>
          )}

          <details>
            <summary className="cursor-pointer text-slate-400">Outcome learning and limitations</summary>
            <pre className="overflow-auto text-xs mt-2">{JSON.stringify(data.learnings, null, 2)}</pre>
          </details>
          <details>
            <summary className="cursor-pointer text-slate-400">Historical trend analysis and prerequisites</summary>
            <pre className="overflow-auto text-xs mt-2">{JSON.stringify(data.statistics || [], null, 2)}</pre>
          </details>
          <details>
            <summary className="cursor-pointer text-slate-400">Evidence-chain audit events</summary>
            <pre className="overflow-auto text-xs mt-2">{JSON.stringify(data.audit, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}

/* ---------- Clean finding card ---------- */
function FindingCard({
  finding: f,
  records,
  data,
  reload,
}: {
  finding: Finding;
  records: SourceRecord[];
  data: Workspace;
  reload: () => Promise<void>;
}) {
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">{f.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {f.periodStart} → {f.periodEnd}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-emerald-400">
            {money(f.impactMinor, f.currency, f.decimals)}
          </p>
          <p className="text-xs text-slate-500">
            {f.opportunity ? 'Potential (not yet realized)' : 'Observed amount'}
          </p>
        </div>
      </div>

      {/* What happened */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">What happened</h4>
        <p className="mt-1 text-slate-200">{whatHappened(f)}</p>
      </div>

      {/* Likely causes */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Likely causes</h4>
        <ul className="mt-1 list-disc pl-5 text-slate-200 space-y-0.5">
          {likelyCauses(f).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      {/* Step-by-step fix */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Step-by-step fix</h4>
        <ol className="mt-1 list-decimal pl-5 text-slate-200 space-y-1">
          {f.recovery.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      {/* Prevention */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Prevention</h4>
        <ul className="mt-1 list-disc pl-5 text-slate-200 space-y-0.5">
          {f.prevention.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <DecisionActions finding={f} reload={reload} />
        {f.opportunity && <OpportunityActions finding={f} data={data} reload={reload} />}
      </div>

      {/* Everything else stays hidden */}
      <details className="border-t border-slate-700 pt-3">
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
          Technical details & evidence
        </summary>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Classification:</span> {f.classification}
          </p>
          <p>
            <span className="text-slate-500">Confidence:</span> {f.confidence.level}
          </p>
          <p>
            <span className="text-slate-500">Formula:</span> {f.formula}
          </p>
          <p>
            <span className="text-slate-500">Measurement plan:</span> {f.measurementPlan}
          </p>
          <FindingAudit finding={f} records={records} />
        </div>
      </details>
    </article>
  );
}

function FindingAudit({ finding: f, records }: { finding: Finding; records: SourceRecord[] }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-slate-400">Full evidence audit</summary>
      <div className="space-y-2 text-sm mt-2">
        <p>Inputs (minor units): {JSON.stringify(f.inputs)}</p>
        <p>Sources: {f.sourceSystems.join(', ')}</p>
        <p>
          Engine: {f.engineVersion} · {f.method}
        </p>
        <p>Completeness: {f.completeness}</p>
        <p>Timestamp: {f.createdAt}</p>
        <p>Assumptions: {f.assumptions.join('; ') || 'None introduced in the calculation.'}</p>
        <p>Potential confounders: {f.confounders.join('; ')}</p>
        <p>
          Limitations:{' '}
          {f.contradictions.join('; ') ||
            'Not established; absence of contrary evidence is not proof of causality.'}
        </p>
        <ul className="list-disc pl-5">
          {f.confidence.explanation.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <details>
          <summary>Cited source records ({f.sourceRecordIds.length})</summary>
          <pre className="whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(
              {
                findingId: f.id,
                syncIds: f.syncIds,
                records: records.filter((r) => f.sourceRecordIds.includes(r.id)),
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </details>
  );
}

function DecisionActions({ finding, reload }: { finding: Finding; reload: () => Promise<void> }) {
  const [owner, setOwner] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  async function save(decision: string) {
    try {
      const r = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: finding.id, owner, notes, decision }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage('Decision saved.');
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Rejected.');
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5"
      >
        {open ? 'Hide decision form' : 'Record decision'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 p-3 border border-slate-700 rounded">
          <input
            aria-label="Responsible owner"
            placeholder="Responsible owner"
            className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <textarea
            aria-label="Decision rationale"
            placeholder="Rationale and operational change to test"
            className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            {['ACCEPTED', 'MODIFIED', 'REJECTED'].map((d) => (
              <button key={d} className="bg-slate-700 px-3 py-1.5 rounded text-sm" onClick={() => save(d)}>
                {d}
              </button>
            ))}
          </div>
          {message && <p role="status">{message}</p>}
        </div>
      )}
    </div>
  );
}

function OpportunityActions({
  finding,
  data,
  reload,
}: {
  finding: Finding;
  data: Workspace;
  reload: () => Promise<void>;
}) {
  const item = data.ledger.find((i) => i.findingId === finding.id);
  const [validator, setValidator] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [implementationDate, setDate] = useState('');
  const [decisionId, setDecision] = useState('');
  const [baseline, setBaseline] = useState('');
  const [after, setAfter] = useState('');
  const [review, setReview] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  const state = item
    ? ({ POTENTIAL: 'VALIDATED', VALIDATED: 'IMPLEMENTED', IMPLEMENTED: 'REALIZED', REALIZED: '' } as const)[
        item.state
      ]
    : 'POTENTIAL';

  async function advance() {
    try {
      const r = await fetch('/api/money-found', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingId: finding.id,
          state,
          validatedBy: validator,
          validationNotes,
          decisionId,
          implementationDate,
          baselineIds: baseline
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          afterIds: after
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          confounderReview: review ? JSON.parse(review) : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage('Stage recorded.');
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Rejected.');
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm rounded bg-emerald-800/60 hover:bg-emerald-700 px-3 py-1.5"
      >
        {open ? 'Hide tracking' : `Track opportunity (${item?.state || 'new'})`}
      </button>
      {open && (
        <div className="mt-2 space-y-2 p-3 border border-slate-700 rounded text-sm">
          <p className="text-slate-400">
            Advancing to realized requires actual comparable outcome records.
          </p>
          {state === 'VALIDATED' && (
            <>
              <input
                aria-label="Validator"
                placeholder="Who reconciled the numbers?"
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
                value={validator}
                onChange={(e) => setValidator(e.target.value)}
              />
              <textarea
                aria-label="Validation notes"
                placeholder="Reconciliation notes"
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
              />
            </>
          )}
          {state === 'IMPLEMENTED' && (
            <>
              <select
                aria-label="Implementation decision"
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
                value={decisionId}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="">Select recorded decision</option>
                {data.decisions
                  .filter((d) => d.findingId === finding.id && d.decision !== 'REJECTED')
                  .map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.owner}: {d.notes}
                    </option>
                  ))}
              </select>
              <input
                aria-label="Implementation date"
                type="date"
                value={implementationDate}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-900 border border-slate-600 p-2 rounded"
              />
            </>
          )}
          {state === 'REALIZED' && (
            <div className="space-y-2">
              <input
                aria-label="Baseline record IDs"
                placeholder="Baseline record IDs, comma separated"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
              />
              <input
                aria-label="After record IDs"
                placeholder="Post-change record IDs, comma separated"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
              />
              <textarea
                aria-label="Confounder review"
                placeholder="JSON object with documented factor reviews"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="bg-slate-900 border border-slate-600 p-2 w-full rounded"
              />
            </div>
          )}
          {state && (
            <button className="bg-emerald-700 rounded px-3 py-1.5" onClick={advance}>
              Record {state}
            </button>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      )}
    </div>
  );
}
