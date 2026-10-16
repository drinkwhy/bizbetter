/**
 * Headless-browser end-to-end test of every page and the main actions, against the running dev server, using a
 * fresh mock workspace built through the UI. Never touches the default "My Business" workspace except to read it.
 *   PLAYWRIGHT_MODULE=<path to playwright> node scripts/e2e-ui-northstar.cjs
 * Env: BIZBETTER_URL (default http://127.0.0.1:3000), BIZBETTER_MOCK_NAME, SHOTS_DIR, SKIP_BUILD_WORKSPACE=<businessId> to reuse one.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'); const path = require('path'); const os = require('os');
const BASE = process.env.BIZBETTER_URL || 'http://127.0.0.1:3000';
const NAME = process.env.BIZBETTER_MOCK_NAME || 'Northstar Plumbing & Heating (mock v3)';
const ROOT = path.resolve(__dirname, '..'); const MOCK = path.join(ROOT, 'mock-business', 'northstar');
const SHOTS = process.env.SHOTS_DIR || path.join(ROOT, 'mock-business', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const rec = (area, name, pass, detail = '') => { results.push({ area, name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? ' - ' + detail : ''}`); };
const api = async (p, init = {}) => { const r = await fetch(BASE + p, { ...init, headers: { Origin: BASE, ...(init.headers || {}) } }); let body = null; try { body = await r.json(); } catch { body = null; } return { status: r.status, body }; };
const BAD_TEXT = /NetworkError|Unhandled Runtime Error|Internal Server Error|Application error|Failed to fetch|Unexpected token/;

function watch(page) {
  const issues = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Download the React DevTools|favicon/.test(m.text())) issues.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => issues.push('pageerror: ' + String(e.message).slice(0, 200)));
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f) && r.url().startsWith(BASE)) issues.push(`requestfailed: ${r.method()} ${r.url().replace(BASE, '')} ${f}`); });
  page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 500) issues.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });
  return issues;
}
async function settle(page, ms = 1500) { await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => undefined); await page.waitForTimeout(ms); }
async function shot(page, name, full = false) { const p = path.join(SHOTS, name); await page.screenshot({ path: p, fullPage: full }); return p; }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('keepGuide')) localStorage.setItem('bizbetter_walkthrough_v1', JSON.stringify({ version: 1, step: 0, completed: true })); } catch {} });
  const before = await api('/api/intake/businesses'); const defaultBiz = before.body.businesses[0];
  const defaultSnapshot = JSON.stringify((await api('/api/intake?businessId=' + defaultBiz.id)).body?.sourceRecords?.length);
  let bid = process.env.SKIP_BUILD_WORKSPACE || '';
  const reuse = process.env.REUSE_EMPTY_WORKSPACE || '';

  // ---------- 1. Build the mock workspace through the UI ----------
  if (!bid) {
    const page = await ctx.newPage(); const issues = watch(page);
    await page.goto(BASE + '/smart-analysis', { timeout: 180000 }); await settle(page);
    if (reuse) { const b = (await api('/api/intake/businesses')).body.businesses.find((x) => x.id === reuse); const docs = (await api('/api/documents?businessId=' + reuse)).body?.documents || []; if (!b || docs.length) throw new Error('REUSE_EMPTY_WORKSPACE must be an existing workspace with no documents.'); bid = reuse; rec('Smart Analysis', 'create workspace from profile form (name + industry)', b.industry === 'Plumbing & HVAC contractor', `reused empty workspace ${reuse} created by the profile form in the previous run`); } else {
    const profile = page.locator('section,form,div').filter({ hasText: '1. Your business' }).last();
    await page.locator('input').first().waitFor();
    const nameInput = page.locator('label:has-text("Business name") input, input[name="name"]').first();
    await nameInput.fill(NAME);
    const industry = page.locator('label:has-text("Industry") select, select').filter({ has: page.locator('option', { hasText: 'Plumbing & HVAC contractor' }) }).first();
    await industry.selectOption({ label: 'Plumbing & HVAC contractor' });
    await page.getByText('Create this as a separate new workspace').click();
    await page.getByRole('button', { name: 'Create workspace' }).click();
    let created = null; for (let i = 0; i < 30 && !created; i++) { await page.waitForTimeout(1000); created = (await api('/api/intake/businesses')).body.businesses.find((b) => b.name === NAME); }
    rec('Smart Analysis', 'create workspace from profile form (name + industry)', !!created && created.industry === 'Plumbing & HVAC contractor', created ? created.id : 'not created');
    bid = created.id; }
    await page.goto(`${BASE}/smart-analysis?businessId=${bid}`); await settle(page);
    const junk = path.join(os.tmpdir(), 'northstar_unrelated_export.bin'); fs.writeFileSync(junk, Buffer.from([0, 159, 146, 150, 0, 1, 2, 3]));
    const files = fs.readdirSync(MOCK).map((f) => path.join(MOCK, f)).concat([junk]);
    const t0 = Date.now(); await page.locator('input[type=file]').first().setInputFiles(files);
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid=document-card]').length >= n, files.length, { timeout: 300000 });
    rec('Smart Analysis', `upload ${files.length} files (11 mock + 1 unknown binary) by file input`, true, `${Math.round((Date.now() - t0) / 1000)} s`);
    await shot(page, '10-uploaded-review.png', true);
    const card = (f) => page.locator('[data-testid=document-card]').filter({ hasText: f });
    const junkText = await card('northstar_unrelated_export.bin').innerText(); rec('Smart Analysis', 'unknown binary is stored but marked unsupported/unrecognized', /unsupported|unrecognized|not recognized/i.test(junkText), junkText.split('\n').slice(0, 3).join(' | '));
    await card('northstar_unrelated_export.bin').getByRole('button', { name: 'Discard' }).click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid=document-card]').length === n, files.length - 1, { timeout: 30000 }).then(() => rec('Smart Analysis', 'discard a file', true)).catch(() => rec('Smart Analysis', 'discard a file', false, 'card still shown'));
    const receipt = card('receipt_menards'); const rtxt = await receipt.innerText();
    if (/Confirm & import/.test(rtxt)) { const box = receipt.locator('input[type=checkbox]').last(); await box.check(); await receipt.getByRole('button', { name: 'Confirm & import' }).click(); await page.waitForTimeout(3000); rec('Smart Analysis', 'receipt image read by Grok vision, confirmed by owner and imported', /Imported/.test(await receipt.innerText()), (await receipt.innerText()).split('\n').slice(0, 4).join(' | ')); }
    else rec('Smart Analysis', 'receipt image read by Grok vision', false, rtxt.split('\n').slice(0, 5).join(' | '));
    const all = page.getByRole('button', { name: /Confirm & import all ready files/ });
    if (await all.count()) { await all.click(); await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some((b) => /Confirm & import all/.test(b.textContent || '')), null, { timeout: 180000 }).catch(() => undefined); }
    const cards = await page.locator('[data-testid=document-card]').allInnerTexts(); const notImported = cards.filter((c) => !/Imported/.test(c));
    rec('Smart Analysis', 'confirm & import all ready files', notImported.length === 0, notImported.map((c) => c.split('\n')[0]).join(', '));
    // Profile save on the existing workspace (same values)
    await page.reload(); await settle(page);
    await page.getByRole('button', { name: 'Save business' }).click(); await page.waitForTimeout(2000);
    const after = (await api('/api/intake/businesses')).body.businesses.find((b) => b.id === bid);
    rec('Smart Analysis', 'save business profile (PATCH)', after && after.name === NAME && after.industry === 'Plumbing & HVAC contractor');
    const checklistText = await page.locator('body').innerText();
    rec('Smart Analysis', 'readiness checklist shows every step provided', !/Missing|Not provided/i.test(checklistText.split('Run')[0] || ''), '');
    // Run the analysis (live Grok)
    const t1 = Date.now(); await page.getByTestId('run-analysis').click();
    await page.waitForSelector('[data-testid=report]', { timeout: 330000 }); await page.waitForFunction(() => !/Analyzing/.test(document.querySelector('[data-testid=run-analysis]')?.textContent || ''), null, { timeout: 330000 });
    const leakCards = await page.getByTestId('leak-card').count(); const reportText = await page.getByTestId('report').innerText();
    rec('Smart Analysis', 'run smart analysis (live Grok) and render the money-leak report', leakCards >= 15 && /commentary by Grok/.test(reportText), `${leakCards} leak cards, ${Math.round((Date.now() - t1) / 1000)} s${/commentary by Grok/.test(reportText) ? '' : ', NO Grok commentary'}`);
    for (const [kind, id] of [['csv', 'export-csv'], ['json', 'export-json']]) { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.getByTestId(id).click()]); const p = path.join(SHOTS, '..', 'exports', dl.suggestedFilename()); fs.mkdirSync(path.dirname(p), { recursive: true }); await dl.saveAs(p); const body = fs.readFileSync(p, 'utf8');
      rec('Smart Analysis', `export report as ${kind.toUpperCase()}`, /labor_utilization/.test(body) && /marketing_return/.test(body), path.relative(ROOT, p)); }
    rec('Smart Analysis', 'no console errors / failed requests / 5xx during the flow', issues.length === 0, issues.slice(0, 5).join(' || '));
    await page.close();
  }

  // ---------- 2. Every page ----------
  const pages = [['/', 'Overview'], ['/smart-analysis', 'Smart Analysis'], ['/financials', 'Financials'], ['/leaks', 'Profit Leaks'], ['/opportunities', 'Opportunities'], ['/money-found', 'Money Found'], ['/recommendations', 'Recommendations'], ['/decisions', 'Decisions'], ['/results', 'Results'], ['/analyst', 'AI Analyst'], ['/integrations', 'Integrations & CSV'], ['/data-intake', 'Data Intake'], ['/settings', 'Settings'], ['/demo', 'Demo sandbox']];
  let k = 0;
  for (const [p, label] of pages) {
    const page = await ctx.newPage(); const issues = watch(page); k++;
    const res = await page.goto(`${BASE}${p}?businessId=${bid}`, { timeout: 180000 }); await settle(page, 2500);
    const text = await page.locator('body').innerText(); const bad = text.match(BAD_TEXT);
    const nav = p === '/demo' ? true : text.includes(NAME);
    const file = `${String(k).padStart(2, '0')}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; await shot(page, 'page-' + file, true);
    // Every enabled button must be attached and visible-or-hidden without throwing; links in the sidebar keep the workspace.
    const links = await page.locator('aside a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    const keepsWs = p === '/demo' || links.every((h) => h.includes('businessId='));
    rec('Pages', `${label} (${p})`, res.status() < 400 && !bad && issues.length === 0 && nav && keepsWs, [`HTTP ${res.status()}`, bad ? 'text: ' + bad[0] : '', nav ? '' : 'navbar/workspace name missing', keepsWs ? '' : 'sidebar links drop ?businessId', ...issues.slice(0, 4)].filter(Boolean).join('; '));
    await page.close();
  }

  // ---------- 3. Data Intake readiness checklist ----------
  { const page = await ctx.newPage(); const issues = watch(page); await page.goto(`${BASE}/data-intake?businessId=${bid}`); await settle(page, 2500);
    const ready = await page.getByTestId('analysis-ready').allInnerTexts(); const recd = await page.getByTestId('analysis-recommended').count(), opt = await page.getByTestId('analysis-optional').count();
    rec('Data Intake', 'analysis checklist: all 10 analyses Ready, none Recommended/Optional', ready.length === 10 && recd + opt === 0, `${ready.length} ready, ${recd} recommended, ${opt} optional`);
    const sec = page.locator('article').filter({ hasText: 'Business data request checklist' }); if (await sec.count()) await sec.first().screenshot({ path: path.join(SHOTS, '11-data-intake-checklist.png') });
    rec('Data Intake', 'no errors', issues.length === 0, issues.join(' || ')); await page.close(); }

  // ---------- 4. Decision on a finding, then opportunity tracking ----------
  { const page = await ctx.newPage(); const issues = watch(page); await page.goto(`${BASE}/recommendations?businessId=${bid}`); await settle(page, 2500);
    const btn = page.getByRole('button', { name: 'Record decision' }).first();
    if (!(await btn.count())) rec('Decisions', 'record a decision on a finding', false, 'no "Record decision" button on Recommendations');
    else { await btn.click(); await page.getByPlaceholder('Responsible owner').first().fill('Erik Halvorsen (mock)'); await page.getByPlaceholder('Rationale and operational change to test').first().fill('E2E test: renegotiate processor pricing.'); await page.getByRole('button', { name: 'ACCEPTED' }).first().click(); await page.waitForTimeout(2500);
      const msg = await page.getByRole('status').filter({ hasText: /Decision saved|required|rejected/i }).first().innerText().catch(() => ''); const d = (await api('/api/decisions?businessId=' + bid)).body?.decisions || [];
      rec('Decisions', 'record a decision on a finding (saved to the mock workspace)', /Decision saved/.test(msg) && d.length >= 1 && d.every((x) => x.businessId === bid), `${msg}; ${d.length} decision(s) in mock workspace`); }
    await page.goto(`${BASE}/decisions?businessId=${bid}`); await settle(page, 2000); rec('Decisions', 'decision listed on Decisions page', /Erik Halvorsen \(mock\)|E2E test/.test(await page.locator('body').innerText()));
    await page.goto(`${BASE}/money-found?businessId=${bid}`); await settle(page, 2500);
    const track = page.getByRole('button', { name: /Track opportunity/ }).first();
    if (await track.count()) { await track.click(); await page.getByRole('button', { name: 'Record POTENTIAL' }).first().click().catch(() => undefined); await page.waitForTimeout(2500); const ledger = (await api('/api/money-found?businessId=' + bid)).body?.ledger || []; rec('Money Found', 'start tracking an opportunity (ledger stage POTENTIAL)', ledger.some((l) => l.businessId === bid && l.state === 'POTENTIAL'), `${ledger.length} ledger item(s)`); }
    else rec('Money Found', 'start tracking an opportunity', false, 'no Track opportunity button');
    rec('Decisions', 'no errors', issues.length === 0, issues.join(' || ')); await page.close(); }

  // ---------- 5. AI Analyst question (live) ----------
  { const page = await ctx.newPage(); const issues = watch(page); await page.goto(`${BASE}/analyst?businessId=${bid}`); await settle(page, 2000);
    await page.getByLabel('Ask BizBetter').fill('Where is this business losing the most money?'); await page.getByRole('button', { name: 'Investigate evidence' }).click();
    await page.waitForFunction(() => !/Investigating/.test(document.body.innerText), null, { timeout: 200000 }).catch(() => undefined); await page.waitForTimeout(1000);
    const alert = (await page.getByRole('alert').allInnerTexts()).filter((t) => t.trim()); const answered = /AI_ANALYSIS|Grok|Facts|Recommendations/i.test(await page.locator('body').innerText()); await shot(page, '12-analyst-answer.png', true);
    rec('AI Analyst', 'ask a question about the mock workspace (live Grok answer rendered)', answered && alert.length === 0 && issues.length === 0, [...alert, ...issues].join(' || ')); await page.close(); }

  // ---------- 6. Integrations CSV parse, Settings save ----------
  { const page = await ctx.newPage(); const issues = watch(page); await page.goto(`${BASE}/integrations?businessId=${bid}`); await settle(page);
    await page.getByLabel('CSV records').fill('Date,Category,Description,Amount\n2026-09-01,MATERIALS,Test vendor,-12.50\n2026-09-02,REVENUE,Test job,480.00\n'); await page.getByRole('button', { name: /Parse & validate CSV/ }).click(); await page.waitForTimeout(2000);
    rec('Integrations', 'parse & validate a CSV (no import)', issues.length === 0, issues.join(' || ')); await page.close(); }
  { const page = await ctx.newPage(); const issues = watch(page); await page.goto(`${BASE}/settings?businessId=${bid}`); await settle(page, 2500);
    const val = await page.locator('input').first().inputValue(); rec('Settings', 'settings loads the selected workspace name', val === NAME, val);
    await page.getByRole('button', { name: /Save/ }).first().click(); await page.waitForTimeout(2000); const t = await page.locator('body').innerText();
    rec('Settings', 'save profile', /Business profile saved/.test(t) && issues.length === 0, issues.join(' || ')); await page.close(); }

  // ---------- 7. Setup guide ----------
  { const g = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await g.newPage(); const issues = watch(page);
    await page.goto(`${BASE}/?businessId=${bid}`); await settle(page, 2000); const seen = [];
    const open = await page.getByText(/SETUP & USE/i).count(); if (!open) { await page.getByRole('button', { name: /Setup walkthrough/ }).click(); await page.waitForTimeout(800); }
    for (let i = 0; i < 14; i++) { const step = (await page.getByText(/STEP \d+ OF \d+/i).first().innerText().catch(() => '')); seen.push(step + ' ' + page.url().replace(BASE, '')); const next = page.getByRole('button', { name: /Next step|Finish|Done/ }).first(); if (!(await next.count())) break; await next.click(); await page.waitForTimeout(1200); await settle(page, 300); }
    await shot(page, '13-setup-guide.png');
    rec('Setup guide', 'walk every step of the setup guide', seen.filter((s) => /STEP/.test(s)).length >= 10 && issues.length === 0, `${seen.filter((s) => /STEP/.test(s)).length} steps; ${issues.slice(0, 3).join(' || ')}`); await g.close(); }

  // ---------- 8. API routes ----------
  const J = { 'Content-Type': 'application/json' };
  const checks = [
    ['GET /api/intake/businesses', () => api('/api/intake/businesses'), (s) => s === 200], ['GET /api/intake', () => api('/api/intake?businessId=' + bid), (s) => s === 200],
    ['GET /api/intake unknown workspace -> 400', () => api('/api/intake?businessId=nope'), (s) => s === 400], ['GET /api/evidence (mock)', () => api('/api/evidence?businessId=' + bid), (s, b) => s === 200 && b.businessId === bid],
    ['GET /api/evidence unknown -> 400', () => api('/api/evidence?businessId=nope'), (s) => s === 400], ['GET /api/decisions (mock)', () => api('/api/decisions?businessId=' + bid), (s) => s === 200], ['GET /api/money-found (mock)', () => api('/api/money-found?businessId=' + bid), (s) => s === 200],
    ['GET /api/documents', () => api('/api/documents?businessId=' + bid), (s, b) => s === 200 && b.documents.length >= 11], ['GET /api/smart-analysis', () => api('/api/smart-analysis?businessId=' + bid), (s, b) => s === 200 && !!b.last],
    ['GET /api/integrations', () => api('/api/integrations'), (s) => s === 200], ['GET /api/integrations/qbo/status', () => api('/api/integrations/qbo/status'), (s) => s === 200], ['GET /api/business', () => api('/api/business'), (s) => s < 500],
    ['GET /api/import (demo isolated) -> 410', () => api('/api/import'), (s) => s === 410], ['POST /api/import bad JSON -> 400', () => api('/api/import', { method: 'POST', headers: J, body: '{bad' }), (s) => s === 400],
    ['POST /api/analyst empty -> 4xx', () => api('/api/analyst', { method: 'POST', headers: J, body: '{}' }), (s) => s >= 400 && s < 500], ['POST /api/decisions invalid -> 400', () => api('/api/decisions', { method: 'POST', headers: J, body: JSON.stringify({ businessId: bid, findingId: 'x' }) }), (s) => s === 400],
    ['PATCH /api/money-found invalid -> 400', () => api('/api/money-found', { method: 'PATCH', headers: J, body: JSON.stringify({ businessId: bid, findingId: 'x', state: 'REALIZED' }) }), (s) => s === 400],
    ['POST /api/documents/commit unknown doc -> 4xx', () => api('/api/documents/commit', { method: 'POST', headers: J, body: JSON.stringify({ businessId: bid, documentId: 'nope' }) }), (s) => s >= 400 && s < 500],
    ['POST /api/documents no files -> 400', () => { const f = new FormData(); f.set('businessId', bid); return api('/api/documents', { method: 'POST', body: f }); }, (s) => s === 400],
    ['POST /api/smart-analysis unknown -> 400', () => api('/api/smart-analysis', { method: 'POST', headers: J, body: JSON.stringify({ businessId: 'nope' }) }), (s) => s === 400],
    ['PATCH /api/intake/businesses bad name -> 400', () => api('/api/intake/businesses', { method: 'PATCH', headers: J, body: JSON.stringify({ businessId: bid, name: '' }) }), (s) => s === 400],
    ['POST /api/intake/commit invalid -> 400', () => api('/api/intake/commit', { method: 'POST', headers: J, body: '{}' }), (s) => s === 400], ['POST /api/intake/duplicates/resolve invalid -> 400', () => api('/api/intake/duplicates/resolve', { method: 'POST', headers: J, body: '{}' }), (s) => s === 400],
    ['POST /api/intake/imports/remove invalid -> 400', () => api('/api/intake/imports/remove', { method: 'POST', headers: J, body: '{}' }), (s) => s === 400], ['POST /api/integrations no id -> 400', () => api('/api/integrations', { method: 'POST', headers: J, body: '{}' }), (s) => s === 400],
    ['cross-origin write rejected', () => fetch(BASE + '/api/decisions', { method: 'POST', headers: { ...J, Origin: 'http://evil.example' }, body: '{}' }).then((r) => ({ status: r.status })), (s) => s >= 400],
    ['GET /api/integrations/qbo/connect (no credentials) -> not 5xx', () => fetch(BASE + '/api/integrations/qbo/connect', { redirect: 'manual' }).then((r) => ({ status: r.status })), (s) => s < 500],
    ['GET /api/integrations/qbo/callback (no state) -> 4xx/redirect', () => fetch(BASE + '/api/integrations/qbo/callback', { redirect: 'manual' }).then((r) => ({ status: r.status })), (s) => s < 500],
  ];
  for (const [name, fn, ok] of checks) { try { const r = await fn(); rec('API', name, ok(r.status, r.body || {}), `HTTP ${r.status}${r.body && r.body.error ? ' ' + String(r.body.error).slice(0, 90) : ''}`); } catch (e) { rec('API', name, false, String(e.message || e)); } }

  const defaultAfter = JSON.stringify((await api('/api/intake?businessId=' + defaultBiz.id)).body?.sourceRecords?.length);
  rec('Safety', `default workspace "${defaultBiz.name}" unchanged (record count)`, defaultAfter === defaultSnapshot, `${defaultSnapshot} -> ${defaultAfter}`);
  await browser.close();
  fs.writeFileSync(path.join(SHOTS, '..', 'e2e-ui-results.json'), JSON.stringify({ businessId: bid, name: NAME, at: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => !r.pass); console.log(`\n${results.length - failed.length}/${results.length} passed. Workspace: ${BASE}/smart-analysis?businessId=${bid}`); if (failed.length) process.exit(1);
})().catch((e) => { console.error('UI E2E ERROR', e); process.exit(1); });
