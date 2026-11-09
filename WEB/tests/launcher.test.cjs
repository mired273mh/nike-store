const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const configure = require('../scripts/live-server.cjs');

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}
const project = path.resolve(__dirname, '..');

test('Go Live redirects to an already running Nike Store without starting another process', async () => {
  let launched = 0;
  const app = await listen((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', backend: 'PHP', database: 'MySQL' }));
  });
  const config = configure(project, {
    websiteUrl: app.url,
    launch: () => {
      launched++;
    },
  });
  const launcher = await listen(config.middleware[0]);
  try {
    const response = await fetch(launcher.url, { redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), app.url + '/');
    assert.equal(launched, 0);
  } finally {
    await close(launcher.server);
    await close(app.server);
  }
});
test('Go Live shows a refresh page while startup is pending and redirects after readiness', async () => {
  let ready = false,
    launched = 0;
  const app = await listen((req, res) => {
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        ready ? { status: 'ok', backend: 'PHP', database: 'MySQL' } : { status: 'starting' },
      ),
    );
  });
  const launcher = await listen(
    configure(project, {
      websiteUrl: app.url,
      launch: () => {
        launched++;
      },
    }).middleware[0],
  );
  try {
    const pending = await fetch(launcher.url);
    assert.equal(pending.status, 503);
    assert.match(await pending.text(), /http-equiv="refresh"/);
    assert.equal(launched, 1);
    ready = true;
    const running = await fetch(launcher.url, { redirect: 'manual' });
    assert.equal(running.status, 303);
    assert.equal(launched, 1);
  } finally {
    await close(launcher.server);
    await close(app.server);
  }
});
test('launcher never serves project secrets or source paths', async () => {
  const app = await listen((req, res) => {
    res.writeHead(503);
    res.end('{}');
  });
  const launcher = await listen(
    configure(project, { websiteUrl: app.url, launch: () => {} }).middleware[0],
  );
  try {
    for (const file of ['/backend/.env', '/.git/config', '/src/app/page.tsx']) {
      const response = await fetch(launcher.url + file);
      assert.equal(response.status, 503);
      assert.match(await response.text(), /Nike Store/);
    }
    assert.equal((await fetch(launcher.url, { method: 'POST' })).status, 405);
  } finally {
    await close(launcher.server);
    await close(app.server);
  }
});
test('Five Server configuration works from either workspace folder', () => {
  const inner = require('../fiveserver.config.js');
  assert.equal(inner.host, '127.0.0.1');
  assert.equal(inner.root, path.join(project, 'public'));
  assert.equal(inner.middleware.length, 1);
  if (fs.existsSync(path.resolve(project, '..', 'fiveserver.config.js'))) {
    const outer = require('../../fiveserver.config.js');
    assert.equal(outer.root, inner.root);
    assert.equal(outer.middleware.length, 1);
  }
});
