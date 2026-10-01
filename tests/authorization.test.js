import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, getInspection, getProject, handleApi } from '../src/api.js';
import { digest } from '../src/security.js';

const raw = 'a'.repeat(64);
function dbFixture({ expired = false, active = true, deletedProject = false } = {}) {
  const user = { _id: 'e1', name: 'Employee', role: 'employee', projectId: 'p1', active, deleted: false };
  return { collection(name) { return { async findOne(filter) {
    if (name === 'sessions') return filter._id === digest(raw) && !expired ? { userId: 'e1' } : null;
    if (name === 'users') return active ? user : null;
    if (name === 'projects') return deletedProject ? null : { _id: filter._id };
    if (name === 'inspections') return { _id: filter._id, projectId: filter._id === 'moved' ? 'p2' : 'p1', assignedTo: filter._id === 'other' ? 'e2' : 'e1' };
    return null;
  } }; } };
}
const req = (path, method = 'GET', origin = 'https://portal.test') => new Request('https://portal.test/api' + path, { method, headers: { cookie: `engineering_session=${raw}`, 'X-Requested-With': 'EngineeringPortal', Origin: origin } });
test('missing, expired and disabled sessions cannot authenticate', async () => {
  await assert.rejects(authenticate(dbFixture(), new Request('https://portal.test')), { status: 401 });
  await assert.rejects(authenticate(dbFixture({ expired: true }), req('/bootstrap')), { status: 401 });
  await assert.rejects(authenticate(dbFixture({ active: false }), req('/bootstrap')), { status: 401 });
});
test('employee cannot fetch another employee inspection even within same project', async () => {
  const db = dbFixture(), user = await authenticate(db, req('/bootstrap'));
  assert.equal((await getInspection(db, 'own', user)).assignedTo, 'e1');
  await assert.rejects(getInspection(db, 'other', user), { status: 403 });
  await assert.rejects(getInspection(db, 'moved', user), { status: 403 });
  await assert.rejects(getProject(db, 'p2', user), { status: 403 });
});
test('deleted parent projects deny inspection access including administrators', async () => {
  await assert.rejects(getInspection(dbFixture({ deletedProject: true }), 'own', { _id: 'owner', role: 'admin' }), { status: 404 });
});
test('employee blocked at API for employee CRUD and project mutations', async () => {
  for (const [path, method] of [['/users', 'GET'], ['/users', 'POST'], ['/users/e2', 'PATCH'], ['/users/e2', 'DELETE'], ['/projects', 'POST'], ['/projects/p1', 'PATCH'], ['/projects/p1', 'DELETE'], ['/inspections/own', 'PATCH'], ['/inspections/own', 'DELETE']]) {
    await assert.rejects(handleApi(req(path, method), {}, dbFixture()), { status: 403 }, `${method} ${path}`);
  }
});
test('cross-origin and requests without CSRF marker are denied', async () => {
  await assert.rejects(handleApi(req('/logout', 'POST', 'https://other.test'), {}, dbFixture()), { status: 403 });
  await assert.rejects(handleApi(new Request('https://portal.test/api/logout', { method: 'POST' }), {}, dbFixture()), { status: 403 });
});
