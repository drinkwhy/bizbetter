'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bizbetter:selected-business-id';
const REQUIRED_DOCUMENTS = [
  {
    title: 'Profit-and-loss report',
    note: 'Shows revenue, expenses, and net income for the period you are checking.',
  },
  {
    title: 'General ledger or transaction export',
    note: 'Lists the individual money movements behind the totals.',
  },
  {
    title: 'Invoices and payment records',
    note: 'Helps explain unpaid balances and payment mismatches.',
  },
  {
    title: 'Completed-job report',
    note: 'Shows revenue, labor cost, and material cost on jobs that lost money.',
  },
  {
    title: 'Payroll or time report',
    note: 'Explains labor costs and hours that need review.',
  },
  {
    title: 'Bank or card statement',
    note: 'Confirms what actually moved in and out of the business.',
  },
];

const ACCEPTED_FORMATS = ['CSV', 'XLSX', 'Text PDF', 'Scanned PDF', 'JPG', 'PNG'];

export function MainExperience() {
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploads, setUploads] = useState<Array<{ uploadId: string; fileName: string; fileType: string; businessId: string }>>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analysisDetails, setAnalysisDetails] = useState<any[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelectedBusinessId(saved);
    }

    void loadBusinesses(saved || undefined);
  }, []);

  useEffect(() => {
    if (selectedBusinessId) {
      window.localStorage.setItem(STORAGE_KEY, selectedBusinessId);
      void refreshUploads(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  async function loadBusinesses(preferredId?: string) {
    try {
      const response = await fetch('/api/intake/businesses', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load business workspaces.');
      }

      const list = Array.isArray(payload.businesses) ? payload.businesses : [];
      setBusinesses(list);

      if (list.length === 0) {
        setSelectedBusinessId('');
        return;
      }

      const nextId = preferredId && list.some((item) => item.id === preferredId)
        ? preferredId
        : list[0].id;

      setSelectedBusinessId(nextId);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBusinesses(false);
    }
  }

  async function refreshUploads(businessId: string) {
    if (!businessId) return;
    try {
      const response = await fetch(`/api/intake?businessId=${encodeURIComponent(businessId)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load uploads.');
      }
      setUploads(Array.isArray(payload.uploads) ? payload.uploads : []);
    } catch (error) {
      setUploads([]);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBusinessId) {
      setUploadMessage('Choose a business workspace first.');
      return;
    }

    if (!files || files.length === 0) {
      setUploadMessage('Choose at least one document to upload.');
      return;
    }

    const allowed = ['csv', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'txt'];
    const rejected = Array.from(files).filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      return !allowed.includes(extension);
    });

    if (rejected.length > 0) {
      setUploadMessage(`Some files were not accepted: ${rejected.map((file) => file.name).join(', ')}. Accepted files: ${ACCEPTED_FORMATS.join(', ')}.`);
      return;
    }

    setUploading(true);
    setUploadMessage('');
    setAnalysisError('');

    try {
      const formData = new FormData();
      formData.set('businessId', selectedBusinessId);
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/intake', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Document upload could not be completed.');
      }

      const uploaded = Array.isArray(payload.uploads) ? payload.uploads : [];
      setUploads(uploaded);
      setUploadMessage(
        uploaded.length > 0
          ? `${uploaded.length} document${uploaded.length > 1 ? 's were' : ' was'} staged for review.`
          : 'Documents were received and are ready for review.'
      );
      setFiles(null);
      const input = document.getElementById('document-upload-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedBusinessId) {
      setAnalysisError('Select a business before analyzing.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisSummary('');
    setAnalysisDetails([]);

    try {
      const response = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          query: 'Review the available evidence for this business and identify verified losses, unpaid receivables, and likely causes based on the uploaded records.',
          depth: 'FAST',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'AI analysis could not run.');
      }

      const answer = payload.answer || {};
      setAnalysisSummary(answer.summary || 'Review complete. We need more evidence to calculate a reliable total.');
      setAnalysisDetails(Array.isArray(answer.facts) ? answer.facts : []);

      if (payload.status === 'UNAVAILABLE' || payload.provider === 'DETERMINISTIC') {
        setAnalysisError('AI is unavailable right now. The app kept the deterministic evidence-based result instead of inventing findings.');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The analysis could not finish.');
    } finally {
      setAnalyzing(false);
    }
  }

  const businessSummary = useMemo(() => {
    const current = businesses.find((business) => business.id === selectedBusinessId);
    return current?.name || 'My Business';
  }, [businesses, selectedBusinessId]);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">BizBetter</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Find where money is leaking.</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-col text-sm font-medium text-slate-200">
              Business workspace
              <select
                value={selectedBusinessId}
                onChange={(event) => setSelectedBusinessId(event.target.value)}
                disabled={loadingBusinesses || businesses.length === 0}
                className="mt-1 min-w-[220px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-0 transition focus:border-emerald-500"
              >
                {businesses.length === 0 ? (
                  <option value="">No business workspaces yet</option>
                ) : (
                  businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Business name');
                if (!name || !name.trim()) return;
                fetch('/api/intake/businesses', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: name.trim() }),
                })
                  .then(async (response) => {
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error || 'Unable to create business.');
                    await loadBusinesses(payload.business?.id || undefined);
                  })
                  .catch((error) => setUploadMessage(error instanceof Error ? error.message : 'Unable to create business.'));
              }}
              className="rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
            >
              New business
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-300">1</span>
            <h2 className="text-xl font-semibold text-white">Upload documents</h2>
          </div>
          <p className="text-sm text-slate-300">
            Start with the records that explain income, spending, and jobs. If a document is missing, we’ll tell you exactly what would help next.
          </p>

          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <label className="block rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
              <span className="mb-2 block font-medium text-slate-200">Choose files</span>
              <input
                id="document-upload-input"
                type="file"
                multiple
                accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.txt"
                onChange={(event) => setFiles(event.target.files)}
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-200"
              />
            </label>

            <button
              type="submit"
              disabled={uploading || !selectedBusinessId}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Upload files'}
            </button>
          </form>

          {uploadMessage && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              {uploadMessage}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-200">Accepted formats</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACCEPTED_FORMATS.map((format) => (
                <span key={format} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                  {format}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-lg font-bold text-amber-300">2</span>
            <h2 className="text-xl font-semibold text-white">Review anything uncertain</h2>
          </div>

          <ul className="space-y-3 text-sm text-slate-300">
            {REQUIRED_DOCUMENTS.map((item) => (
              <li key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-slate-300">{item.note}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">If a report is missing detail</p>
            <p className="mt-2">
              We may ask for a supporting export when the totals do not reconcile. We do not guess missing values or silently treat unknown numbers as zero.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-lg font-bold text-indigo-300">3</span>
            <h2 className="text-xl font-semibold text-white">AI Analyze</h2>
          </div>

          <p className="text-sm text-slate-300">
            We review the documents for this business and separate verified losses from unpaid receivables, potential savings, and follow-up questions.
          </p>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !selectedBusinessId}
            className="mt-5 w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing ? 'Analyzing…' : 'AI Analyze'}
          </button>

          {analysisError && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {analysisError}
            </p>
          )}

          {analysisSummary && (
            <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <p className="text-sm font-semibold text-indigo-100">Latest assessment</p>
              <p className="mt-2 text-sm text-slate-100">{analysisSummary}</p>
            </div>
          )}

          {analysisDetails.length > 0 && (
            <div className="mt-4 space-y-2">
              {analysisDetails.map((item) => (
                <div key={item.id || item.text || Math.random()} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-200">
                  {item.text || item.summary || 'Evidence-based finding'}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Current workspace</p>
            <h2 className="mt-1 text-2xl font-bold text-white">{businessSummary}</h2>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-200">
            {uploads.length} staged document{uploads.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-200">Checklist</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>• Profit-and-loss report</li>
              <li>• General ledger or transaction export</li>
              <li>• Invoices and payment records</li>
              <li>• Completed-job report</li>
              <li>• Payroll or time report</li>
              <li>• Bank or card statements</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-200">What to expect</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>• We keep each workspace separate and secure.</li>
              <li>• We only ask for additional detail when the numbers are unclear.</li>
              <li>• We keep original documents and source references with each finding.</li>
              <li>• We do not invent amounts when evidence is incomplete.</li>
            </ul>
          </div>
        </div>
      </section>

      <details className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        <summary className="cursor-pointer list-none text-base font-semibold text-white">Details</summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-medium text-slate-100">Supported document handling</p>
            <p className="mt-1">CSV, XLSX, text PDFs, scanned PDFs, JPG, and PNG are supported. We reject unsupported file types early and explain why.</p>
          </div>
          <div>
            <p className="font-medium text-slate-100">Data safeguards</p>
            <p className="mt-1">Duplicates, overlapping exports, and uncertain totals are flagged. We keep original records, source references, and the selected business isolated from other workspaces.</p>
          </div>
          <div>
            <p className="font-medium text-slate-100">AI safety</p>
            <p className="mt-1">Any AI output is gated by the supported evidence. We keep verified calculations separate from AI interpretation and do not overwrite confirmed totals.</p>
          </div>
        </div>
      </details>
    </div>
  );
}

export default MainExperience;
