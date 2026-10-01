import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalServer, serveAsset } from '../scripts/local-server.mjs';

async function start(t, options) {
  const server = createLocalServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('local server serves real UI and blocks access to private project files', async t => {
  const base = await start(t, { env: {} });
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /id="app"/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  const css = await fetch(base + '/almasri.css', { method: 'HEAD' });
  assert.equal(css.status, 200);
  assert.equal(await css.text(), '');
  for (const path of ['/.dev.vars', '/src/security.js', '/package.json', '/%2e%2e%2f.dev.vars', '/assets/%2e%2e%2f%2e%2e%2f.env']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const status = await fetch(base + '/api/status');
  assert.equal(status.status, 503);
  assert.equal((await status.json()).code, 'NOT_CONFIGURED');
  assert.equal((await serveAsset(new Request(base + '/%zz'))).status, 400);
});

test('adapter preserves JSON, multipart uploads, sessions and error status', async t => {
  const base = await start(t, { handler: { async fetch(request) {
    assert.equal(request.headers.get('cookie'), 'engineering_session=test');
    assert.notEqual(request.headers.get('cf-connecting-ip'), 'spoof');
    let data;
    if (request.headers.get('content-type').includes('multipart/form-data')) {
      const form = await request.formData();
      data = { text: form.get('note'), file: await form.get('file').text() };
    } else data = await request.json();
    const headers = new Headers();
    headers.append('Set-Cookie', 'one=1; HttpOnly; Path=/');
    headers.append('Set-Cookie', 'two=2; HttpOnly; Path=/');
    return Response.json(data, { status: 201, headers });
  } } });
  const headers = { Cookie: 'engineering_session=test', 'cf-connecting-ip': 'spoof' };
  let response = await fetch(base + '/api/test', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'فحص' }) });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { note: 'فحص' });
  assert.equal(response.headers.getSetCookie().length, 2);
  const form = new FormData();
  form.set('note', 'صورة'); form.set('file', new Blob(['image bytes']), 'photo.png');
  response = await fetch(base + '/api/upload', { method: 'POST', headers, body: form });
  assert.deepEqual(await response.json(), { text: 'صورة', file: 'image bytes' });
});
