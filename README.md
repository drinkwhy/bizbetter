# BizBetter

BizBetter is an independent local project for reviewing contractor financial evidence and guiding follow-up. Production screens show “Insufficient data to determine this reliably.” until source records are available. Fictional examples live only on `/demo`, which displays a persistent demo warning.

## Current production behavior

- The evidence workspace saves normalized source records and owner decisions in the ignored local `.bizbetter-data` directory. Each material calculation links to its source records, sync/import ID, reporting period, currency, formula, confidence criteria, assumptions and limitations.
- QuickBooks Online now has a sandbox OAuth 2.0 authorization-code connection scaffold with single-use state, encrypted token storage, refresh, revocation, and a company-identity check. The accounting scope is read-only; full historical ingestion and scheduled sync are not yet implemented. Stripe retains its server-side read-only adapter. The remaining catalog providers are not yet implemented.
- Financials accepts normalized owner-entered CSV records. The older transaction CSV route is preview-only and cannot create findings.
- Available analyses include accounting losses, payment-fee review, negative direct job contribution, matched invoice overpayment and definition-matched cross-system discrepancies. Each result includes recovery and prevention steps. Potential savings and realized results are kept separate.
- The optional server-side AI analyst uses only minimized evidence from the selected business workspace. OpenAI is the default; xAI Grok can be selected with `BIZBETTER_AI_PROVIDER=grok`. Both use the same structured-output, evidence-ID, quantitative-claim and deterministic Money Found safeguards. Analysis is user-triggered and falls back to deterministic evidence when a provider is unavailable. API-key configuration is not proof that a provider is reachable. xAI says API inputs and outputs are not used for training without explicit permission and are retained for up to 30 days for abuse monitoring. Trends and correlations run only when the sample, time periods, currencies and accounting definitions meet the documented rules; they do not establish causes.
- This is local single-user software, not an authenticated hosted product. Browser polling is optional and only runs while the Integrations page remains open.

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for the implementation audit, verification evidence, connector setup limits and next work.

## Run locally

Requirements: Node.js 18 or newer and npm.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The current workspace can run without a provider account and will report insufficient data. Do not run a database reset or the demo seeder against business data.

For a production build:

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

## QuickBooks sandbox OAuth setup

1. Copy `.env.example` to the ignored local `.env`. Set the Intuit app client ID, client secret, exact redirect URI, and a generated 32-byte base64 encryption key. Do not paste secrets into chat or the browser.
2. Register the exact `BIZBETTER_QBO_REDIRECT_URI` in the Intuit app's redirect URI settings. The default is `http://127.0.0.1:3000/api/integrations/qbo/callback`; the Intuit QuickStart redirect URL is not BizBetter's callback.
3. Keep `BIZBETTER_QBO_ENV=sandbox`, restart the dev server, and use **Connect sandbox with OAuth** on the Integrations page.
4. Tokens are stored encrypted in the local SQLite database. OAuth callback and company verification require valid app credentials and a reachable Intuit sandbox; no live account was connected during local validation.

The current OAuth grant requests only `com.intuit.quickbooks.accounting`, which is sufficient for the read-only accounting connection scaffold. Payments, OpenID userinfo, test charges, full 24-month entity ingestion, and durable scheduled sync are not enabled in BizBetter.

Stripe uses `BIZBETTER_STRIPE_SECRET_KEY`, restricted to read permissions for balance transactions. Never configure provider credentials in client-side code.

## Optional Grok analyst setup

1. Create an API key in the xAI API Console and set `XAI_API_KEY` in the ignored local `.env`. This is separate from a Grok consumer subscription and requires xAI API access/billing.
2. Set `BIZBETTER_AI_PROVIDER=grok` and restart BizBetter. The default model is `grok-4.7`; optionally override it with `BIZBETTER_AI_GROK_MODEL`.
3. The analyst result displays the provider and model used. The Grok request passes through the same Evidence Gateway and claim validation as OpenAI. OpenAI remains the default when the provider setting is omitted.

See [xAI structured outputs](https://docs.x.ai/developers/model-capabilities/text/structured-outputs), [API security FAQ](https://docs.x.ai/console/faq/security), and [model documentation](https://docs.x.ai/developers/grok-4-7). A successful local build does not verify xAI credentials, model access or account quota.

## Optional demo-only Gemini analyst

For temporary testing with the fictional Apex Comfort Solutions data only:

1. Get a Google AI / Gemini API key and set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) in the ignored local `.env`.
2. Default model is `gemini-3.1-flash-lite`. Override with `BIZBETTER_DEMO_GEMINI_MODEL` if needed.
3. This path lives exclusively under `lib/demo/engines/gemini-analyst.ts` and is never imported by production routes. It is exercised by `npm run test:demo` when a key is present.

## Guided smart analysis (/smart-analysis)

Owners start at **Smart Analysis** (sidebar, Overview banner, and step 2 of the setup guide). The page walks through each item the engines can use, explains why it is needed, the accepted formats and the columns to include, and shows a checklist with progress (Provided / Partly provided / Missing):

| Step | Required | Used by |
| --- | --- | --- |
| Business profile (name + industry) | yes | scoping; saved on the current workspace |
| Profit & loss (3+ months) | yes | reported-loss finding; revenue trend at 8+ months |
| Bank & credit card statements | no | expense/vendor evidence for the AI analyst (no dedicated engine yet) |
| Invoices & A/R | no | payment-vs-invoice mismatch checks |
| Job costing (job ID, revenue, labor, materials) | no | negative job contribution findings |
| Payroll & time | no | labor evidence for the AI analyst (no overtime engine yet) |
| Payment processor fees | no | processing-fee review findings (map a fee column to "Processing fee") |

Each step links to Data Intake (`/data-intake?step=<id>`) for CSV/XLSX upload or manual entry; a banner there repeats the guidance and links back. PDF statements are not parsed: download the CSV version from the bank/processor portal.

**Run smart analysis** (`POST /api/smart-analysis`, logic in `lib/smart-analysis/`):
1. `assessSufficiency` (pure, deterministic) decides READY or NEED_MORE_DATA. If required items are missing, the response is "Insufficient data to determine this reliably." plus an exact list of what to provide, each linked to its step. **No AI call is made** in that case.
2. Otherwise the deterministic engines produce findings, the Evidence Gateway builds the minimized evidence package, and the configured provider (xAI Grok, `grok-4.7` by default) explains it. The answer still passes `validateAnswer`: every claim must cite evidence IDs and no number may appear that is not in the evidence. If the model fails, times out or is rejected, deterministic findings and fixes are shown instead.
3. Results reuse the finding cards (what happened, likely causes, step-by-step fix, prevention). Money amounts come only from engine calculations. If no engine produced a finding, the result says so and names the step that would unlock one.

Grok responses typically take 1-3 minutes; the smart analysis timeout is `BIZBETTER_SMART_ANALYSIS_TIMEOUT_MS` (default 270000).

Tests: `npx tsx scripts/verify-smart-analysis.ts` (offline). Live check with fictional in-memory data (nothing is written to `.bizbetter-data`): `npx tsx --env-file=.env scripts/check-smart-analysis-live.ts`.

## Verification

```powershell
npm run test:integrity
npm run test:connections
npm run test:demo
```

`test:demo` runs fictional demo-engine regression fixtures (including an optional live Gemini call when `GEMINI_API_KEY` is set). Its output is not a BizBetter production finding. The integrity suite keeps test data in a temporary workspace.

## Guided setup

Choose **Setup walkthrough** in the header. The 11-step guide highlights navigation, opens each relevant screen, and supports Back, Next, Minimize, Save & close, and Restart. It remembers progress in this browser. The guide explains that production findings require cited records and does not certify provider setup.

## Upload any document and find money leaks (/smart-analysis)

1. **Your business** - enter the business name and pick an industry (or "Other" + free text). Tick "Create this as a separate new workspace" to keep a new business apart from the current one.
2. **Upload all your documents** - drop any number of files (up to 20 per batch, 10 MB each). Each file gets a card showing the detected type, how it was read, row count, warnings and a row-by-row review table where rows can be excluded or the type changed before "Confirm & import".

| File | How it is read |
|---|---|
| CSV / TSV / TXT tables | Deterministic parser; header row auto-detected; columns mapped by alias |
| XLSX / XLS | SheetJS; wide P&L layouts (accounts x months) are pivoted to one row per account per month |
| PDF | Text extracted with `unpdf`; statement lines (date, description, amount, balance) parsed deterministically with page/line provenance |
| DOCX | `mammoth` text; tables and statement lines parsed, prose kept as business context |
| JSON | Arrays of objects treated as tables |
| OFX / QBO | Bank/card transactions parsed deterministically |
| Images (PNG/JPG/WebP/GIF) | Grok vision (`BIZBETTER_AI_EXTRACT_MODEL`); always marked "needs review" and requires the owner to confirm values |
| Anything else | Stored and marked unsupported; never guessed |

Grok is used only to classify a table the deterministic scorer is unsure about (confidence < 0.6) and to pull rows out of unstructured text. Every AI-extracted value must appear literally on the cited source line or it is dropped. Files are typed by magic bytes before extension. Originals are stored under `.bizbetter-data/documents/<businessId>/`.

3. **Money-leak report** - deterministic engines in `lib/leaks/engine.ts` calculate every dollar amount from cited rows: losing months, cost categories rising faster than revenue, unprofitable jobs, underpriced jobs, processor fees above `BIZBETTER_FEE_TARGET_RATE` (default 2.9%), overdue invoices, possible duplicate charges, subscription/vendor price creep, overlapping subscriptions and overtime premium. Leaks are ranked by dollar impact with likely causes, step-by-step fixes and prevention. Each check that lacks data reports "Insufficient data" instead of a number. Grok (`BIZBETTER_SMART_ANALYSIS_MODEL`, default `grok-4.20-0309-reasoning`) writes the commentary; any statement with a number not in the evidence is removed. The last report is saved and shown on reload.

### Mock business: Northstar Plumbing & Heating

`mock-business/northstar/` holds a fictional St. Cloud, MN contractor (P&L XLSX, bank PDF, card CSV, invoices/AR, job costing, payroll XLSX, Stripe payouts, DOCX notes, receipt PNG) generated by `mock-business/generate_northstar.py`, with planted leaks in `northstar_expected_leaks.json`.

- `npx tsx scripts/verify-document-intake.ts` - offline: detection, extraction and exact leak amounts.
- `npx tsx scripts/e2e-northstar.ts` - live, against the running dev server: creates/reuses the "Northstar Plumbing & Heating (mock)" workspace, uploads, imports, runs Grok and compares planted vs found. Screenshots are in `mock-business/screenshots/`.

### Analysis readiness (Data Intake checklist) and the analyses that run

The Data Intake "Business data request checklist" lists each analysis as **Ready** (with matched records and months) or **Recommended / Optional later** with a specific "Why not yet" (the missing fields, history or sample size). Every analysis is backed by a deterministic engine in `lib/leaks/engine.ts` and runs in Smart Analysis:

| Analysis | Needs | Engine check |
|---|---|---|
| Revenue trend | 8+ months of P&L income | first 3 vs last 3 months (context, not added to the recoverable total) |
| Expense category review | 3+ months of P&L expense lines | cost lines rising faster than revenue |
| Vendor concentration | bank/card charges from 5+ suppliers | largest supplier share (payroll, tax, transfers excluded; no dollar saving claimed) |
| Job profitability | job revenue, labor, materials | losing and underpriced jobs |
| Technician contribution | jobs with a Technician column | technicians 10+ points below the median margin |
| Labor utilization | timesheets with billable / non-billable hours | hours below `BIZBETTER_UTILIZATION_TARGET` (70%) x payroll hourly rate |
| Callback economics | jobs with a Callback column | labor + materials of return visits |
| Marketing return | spend by lead source + Lead Source on jobs | sources whose job contribution is below their spend |
| Receivables follow-up | invoices with due date and amount paid | overdue balances as of the run date |
| Overtime decomposition | payroll with employee, overtime hours/pay | overtime premium, per employee |

All pages (Overview, Profit Leaks, Opportunities, Money Found, Recommendations, Decisions, Results, Financials, Settings) follow `?businessId=` and the sidebar keeps it, so any workspace can be reviewed; decisions and Money Found stages are saved to that workspace. The findings on those pages include the money-leak findings (`lib/leaks/merge.ts`).

UI end-to-end test (headless Chromium via Playwright, against the running dev server; creates its own mock workspace through the UI):

```
PLAYWRIGHT_MODULE=<path>/node_modules/playwright node scripts/e2e-ui-northstar.cjs
```

It uploads all mock files (plus an unknown binary that is discarded), confirms the vision-read receipt, imports, saves the profile, runs Smart Analysis with live Grok, exports CSV/JSON, loads every page checking console errors / failed requests / 5xx, checks the readiness checklist, records a decision, starts Money Found tracking, asks the AI Analyst, parses a CSV, saves Settings, walks the setup guide and probes every API route. Results go to `mock-business/e2e-ui-results.json`.
