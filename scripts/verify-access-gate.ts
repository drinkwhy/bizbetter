import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { checkPassword, createSessionToken, gateEnabled, safeNext, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { assertLocal, hostAllowed, originAllowed } from '@/lib/evidence/access';
import { middleware } from '../middleware';

const req = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers });

async function main() {
  delete process.env.BIZBETTER_ACCESS_PASSWORD; delete process.env.BIZBETTER_SESSION_SECRET;
  process.env.RAILWAY_PUBLIC_DOMAIN = 'bizbetter-test.up.railway.app';
  // Gate off: local dev unchanged, hosted hosts still refused.
  assert.equal(gateEnabled(), false);
  assert.equal((await middleware(req('http://127.0.0.1:3000/smart-analysis'))).headers.get('x-middleware-next'), '1');
  assert.equal(hostAllowed('127.0.0.1:3000'), true);
  assert.equal(hostAllowed('bizbetter-test.up.railway.app'), false, 'public host refused without the gate');
  assert.throws(() => assertLocal(req('https://bizbetter-test.up.railway.app/api/evidence', { host: 'bizbetter-test.up.railway.app' })));
  assert.equal(await verifySessionToken('v1.9999999999.' + 'a'.repeat(64)), false);

  process.env.BIZBETTER_ACCESS_PASSWORD = 'correct horse battery staple';
  assert.equal(gateEnabled(), true);
  assert.equal(await checkPassword('correct horse battery staple'), true);
  assert.equal(await checkPassword('wrong'), false);
  assert.equal(await checkPassword(''), false);
  const token = await createSessionToken();
  assert.equal(await verifySessionToken(token), true);
  assert.equal(await verifySessionToken(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')), false, 'tampered signature');
  assert.equal(await verifySessionToken(token.replace(/^v1\.\d+/, 'v1.9999999999')), false, 'tampered expiry');
  assert.equal(await verifySessionToken(await createSessionToken(Date.now() - 8 * 86400_000)), false, 'expired');
  process.env.BIZBETTER_ACCESS_PASSWORD = 'rotated'; assert.equal(await verifySessionToken(token), false, 'rotation signs out');
  process.env.BIZBETTER_ACCESS_PASSWORD = 'correct horse battery staple';

  // Middleware: pages redirect to /login, APIs get 401, login stays reachable, valid cookie passes.
  const host = 'bizbetter-test.up.railway.app', base = 'https://' + host;
  let r = await middleware(req(base + '/smart-analysis?businessId=x', { host }));
  assert.equal(r.status, 307); assert.match(r.headers.get('location') || '', /\/login\?next=%2Fsmart-analysis%3FbusinessId%3Dx$/);
  r = await middleware(req(base + '/api/evidence', { host })); assert.equal(r.status, 401);
  r = await middleware(req(base + '/api/smart-analysis', { host, cookie: SESSION_COOKIE + '=forged' })); assert.equal(r.status, 401);
  assert.equal((await middleware(req(base + '/login', { host }))).headers.get('x-middleware-next'), '1');
  assert.equal((await middleware(req(base + '/api/auth/login', { host }))).headers.get('x-middleware-next'), '1');
  assert.equal((await middleware(req(base + '/', { host, cookie: SESSION_COOKIE + '=' + token }))).headers.get('x-middleware-next'), '1');

  // Host and origin checks for the production host.
  assert.equal(hostAllowed(host), true);
  assert.equal(hostAllowed('evil.example.com'), false);
  assert.doesNotThrow(() => assertLocal(req(base + '/api/evidence', { host }), false));
  assert.doesNotThrow(() => assertLocal(req(base + '/api/decisions', { host, origin: base }), true));
  assert.throws(() => assertLocal(req(base + '/api/decisions', { host, origin: 'https://evil.example.com' }), true), /origin/);
  assert.throws(() => assertLocal(req('https://evil.example.com/api/evidence', { host: 'evil.example.com' })), /local-only/);
  assert.equal(originAllowed(req('http://127.0.0.1:3000/api/x', { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' })), true);
  assert.equal(originAllowed(req('http://127.0.0.1:3000/api/x', { host: '127.0.0.1:3000', origin: 'http://localhost:3000' })), false);

  // Redirect targets stay on this site.
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', '/login?next=/x', '']) assert.equal(safeNext(bad), '/');
  assert.equal(safeNext('/money-found?businessId=a'), '/money-found?businessId=a');
  console.log('Access gate verification passed.');
}
main().catch((e) => { console.error(e); process.exit(1); });
