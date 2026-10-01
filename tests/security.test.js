import { test } from 'node:test';
import assert from 'node:assert/strict';
import { password, verifyPassword, location, visibleUser, admin } from '../src/security.js';
test('passwords use distinct salts; wrong passwords fail', () => {
  const a = password('Testing-password-2026'), b = password('Testing-password-2026');
  assert.notEqual(a, b); assert(verifyPassword('Testing-password-2026', a));
  assert(!verifyPassword('wrong-password', a)); assert.throws(() => password('short'));
});
test('location validates pairs and geographic ranges', () => {
  assert.deepEqual(location({ address: 'site', lat: 0, lng: 0 }), { address: 'site', lat: 0, lng: 0 });
  assert.throws(() => location({ lat: 91, lng: 2 })); assert.throws(() => location({ lat: '', lng: 2 }));
  assert.throws(() => location({ lat: 30, lng: '' }));
});
test('password hash excluded and employee cannot perform admin action', () => {
  assert.equal(visibleUser({ name: 'A', passwordHash: 'secret' }).passwordHash, undefined);
  assert.throws(() => admin({ role: 'employee' }));
});
