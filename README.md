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

## Verification

```powershell
npm run test:integrity
npm run test:connections
npm run test:demo
```

`test:demo` runs fictional demo-engine regression fixtures; its output is not a BizBetter production finding. The integrity suite keeps test data in a temporary workspace.

## Guided setup

Choose **Setup walkthrough** in the header. The 11-step guide highlights navigation, opens each relevant screen, and supports Back, Next, Minimize, Save & close, and Restart. It remembers progress in this browser. The guide explains that production findings require cited records and does not certify provider setup.
# bizbetter
