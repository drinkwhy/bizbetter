import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret } from '../lib/integrations/qbo/crypto';

const original = process.env.BIZBETTER_SECRET_ENCRYPTION_KEY;
try {
  delete process.env.BIZBETTER_SECRET_ENCRYPTION_KEY;
  assert.throws(() => encryptSecret('test-token', 'test'), /not configured/);
  process.env.BIZBETTER_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const token = 'sandbox-token-fixture-only';
  const first = encryptSecret(token, 'qbo-access:company-1');
  const second = encryptSecret(token, 'qbo-access:company-1');
  assert.notEqual(first, second, 'fresh nonces should make ciphertext distinct');
  assert.equal(decryptSecret(first, 'qbo-access:company-1'), token);
  assert.throws(() => decryptSecret(first, 'qbo-refresh:company-1'));
  const tampered = JSON.parse(first);
  tampered.data = Buffer.from('altered').toString('base64');
  assert.throws(() => decryptSecret(JSON.stringify(tampered), 'qbo-access:company-1'));
  console.log('PASS encrypted token round-trip, nonce uniqueness, purpose binding, and tamper rejection');
} finally {
  if (original === undefined) delete process.env.BIZBETTER_SECRET_ENCRYPTION_KEY;
  else process.env.BIZBETTER_SECRET_ENCRYPTION_KEY = original;
}
