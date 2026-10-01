import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { handleApi } from '../src/api.js';

// Use a disposable local MongoDB. A unique database is dropped in finally.
test('MongoDB: full CRUD, session revocation, ownership, photos and persistence', { skip: !process.env.TEST_MONGODB_URI }, async () => {
  const client = new MongoClient(process.env.TEST_MONGODB_URI);
  await client.connect(); const db = client.db(`engineering_test_${Date.now()}`);
  const env = { SETUP_TOKEN: 'test-setup-token-32-characters-long-enough' };
  async function call(path, method = 'GET', data, session, origin = 'https://portal.test') {
    const headers = { 'X-Requested-With': 'EngineeringPortal', Origin: origin };
    if (session) headers.Cookie = session;
    if (data && !(data instanceof FormData)) headers['Content-Type'] = 'application/json';
    const req = new Request('https://portal.test/api' + path, { method, headers, ...(data ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {}) });
    try { return await handleApi(req, env, db); } catch (err) { return Response.json({ error: err.message }, { status: err.status || (err.code === 11000 ? 409 : 500) }); }
  }
  const login = async (employeeNo, password) => { const r = await call('/login', 'POST', { employeeNo, password }); assert.equal(r.status, 200, await r.clone().text()); return r.headers.get('set-cookie').split(';')[0]; };
  const project = (name = 'Site A') => ({ name, code: name, status: 'active', description: '', location: { address: 'Site', lat: 35, lng: 36 } });
  try {
    let r = await call('/setup', 'POST', { setupToken: env.SETUP_TOKEN, name: 'Admin', employeeNo: 'ADMIN', password: 'Secure-admin-pass-2026' }); assert.equal(r.status, 201);
    assert.equal((await call('/setup', 'POST', { setupToken: env.SETUP_TOKEN })).status, 409);
    const admin = await login('ADMIN', 'Secure-admin-pass-2026');
    assert.equal((await call('/projects')).status, 401);
    assert.equal((await call('/projects', 'POST', project(), admin, 'https://evil.test')).status, 403);
    r = await call('/projects', 'POST', project(), admin); assert.equal(r.status, 201); const p1 = await r.json();
    const p2 = await (await call('/projects', 'POST', project('Site B'), admin)).json();
    const userData = { employeeNo: 'E1', name: 'Employee A', profession: 'Engineer', phone: '123', projectId: p1._id, role: 'employee', active: true, password: 'Secure-employee-pass' };
    const employee = await (await call('/users', 'POST', userData, admin)).json(); assert(employee._id); assert(!employee.passwordHash);
    const emp = await login('E1', 'Secure-employee-pass');
    assert.equal((await call('/users', 'GET', null, emp)).status, 403);
    assert.equal((await call('/projects', 'POST', project(), emp)).status, 403);
    assert.equal((await call(`/projects/${p2._id}`, 'GET', null, emp)).status, 403);
    const data = { title: 'Column check', projectId: p1._id, assignedTo: employee._id, date: '2026-09-13', category: 'تسليح', status: 'pending', location: { address: 'Floor 1' } };
    const employeeCreated = await call('/inspections', 'POST', { ...data, title: 'Employee field check', note: 'Initial field note' }, emp); assert.equal(employeeCreated.status, 201);
    assert.equal((await call('/inspections', 'POST', { ...data, projectId: p2._id }, emp)).status, 403);
    assert.equal((await call('/inspections', 'POST', { ...data, projectId: p2._id }, admin)).status, 400);
    const inspection = await (await call('/inspections', 'POST', data, admin)).json(); assert(inspection._id);
    const privateInspection = await (await call('/inspections', 'POST', { ...data, assignedTo: 'owner' }, admin)).json();
    assert.equal((await call(`/inspections/${privateInspection._id}`, 'GET', null, emp)).status, 403);
    assert.equal((await call(`/inspections/${inspection._id}`, 'PATCH', { ...data, status: 'approved' }, emp)).status, 403);
    r = await call(`/inspections/${inspection._id}/notes`, 'POST', { text: 'Check spacing', by: { name: 'spoof' } }, emp); assert.equal(r.status, 201); const note = await r.json(); assert.equal(note.by.name, 'Employee A');
    assert.equal((await call(`/inspections/${privateInspection._id}/notes`, 'POST', { text: 'no' }, emp)).status, 403);
    const upload = new FormData(); upload.set('parentType', 'inspection'); upload.set('parentId', inspection._id);
    upload.set('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'site.png');
    r = await call('/photos', 'POST', upload, emp); assert.equal(r.status, 201); const photo = await r.json();
    const profileUpload = new FormData(); profileUpload.set('parentType', 'user'); profileUpload.set('parentId', employee._id); profileUpload.set('stage', 'profile'); profileUpload.set('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'profile.png');
    assert.equal((await call('/photos', 'POST', profileUpload, emp)).status, 201);
    const documentUpload = new FormData(); documentUpload.set('parentType', 'user'); documentUpload.set('parentId', employee._id); documentUpload.set('stage', 'document'); documentUpload.set('file', new Blob([Buffer.from('%PDF-1.7 employee certificate')], { type: 'application/pdf' }), 'certificate.pdf');
    assert.equal((await call('/photos', 'POST', documentUpload, emp)).status, 201);
    const employeeProfile = await (await call(`/users/${employee._id}`, 'GET', null, admin)).json(); assert.equal(employeeProfile.photos.length, 2);
    assert.equal((await call(`/photos/${photo._id}`, 'GET', null, emp)).headers.get('content-type'), 'image/png');
    assert.equal((await call(`/photos/${photo._id}`, 'DELETE', null, emp)).status, 403);
    assert.equal((await call('/logout', 'POST', null, emp)).status, 200);
    assert.equal((await call('/bootstrap', 'GET', null, emp)).status, 401);
    const emp2 = await login('E1', 'Secure-employee-pass');
    const detail = await (await call(`/inspections/${inspection._id}`, 'GET', null, emp2)).json(); assert.equal(detail.notes[0].text, 'Check spacing'); assert.equal(detail.photos.length, 1);
    const mine = await (await call('/inspections', 'GET', null, emp2)).json(); assert.equal(mine.total, 2);
    assert.equal((await call(`/inspections/${inspection._id}/notes/${note._id}`, 'PATCH', { text: 'Reviewed' }, admin)).status, 200);
    assert.equal((await call(`/users/${employee._id}`, 'PATCH', { ...userData, projectId: p2._id, password: '' }, admin)).status, 200);
    assert.equal((await call('/bootstrap', 'GET', null, emp2)).status, 401);
    const emp3 = await login('E1', 'Secure-employee-pass');
    assert.equal((await call(`/photos/${photo._id}`, 'GET', null, emp3)).status, 403);
    assert.equal((await call('/users/owner', 'DELETE', null, admin)).status, 400);
    assert.equal((await call(`/projects/${p1._id}`, 'DELETE', null, admin)).status, 200);
    assert.equal((await call(`/photos/${photo._id}`, 'GET', null, admin)).status, 404);
    assert.equal((await call(`/users/${employee._id}`, 'DELETE', null, admin)).status, 200);
    assert.equal((await call('/bootstrap', 'GET', null, emp3)).status, 401);
  } finally { await db.dropDatabase(); await client.close(); }
});
