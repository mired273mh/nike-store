const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

function probe(url) {
  return new Promise((resolve) => {
    const request = http.get(new URL('/api/health', url), (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 8192) request.destroy();
      });
      response.on('end', () => {
        try {
          const health = JSON.parse(body);
          resolve(
            response.statusCode === 200 &&
              health.status === 'ok' &&
              health.backend === 'PHP' &&
              health.database === 'MySQL',
          );
        } catch {
          resolve(false);
        }
      });
      response.on('error', () => resolve(false));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

module.exports = function configureNikeStore(projectRoot, options = {}) {
  const websiteUrl = options.websiteUrl || 'http://127.0.0.1:3000';
  let starting = false;
  let failed = false;
  let lastAttempt = 0;
  function launch() {
    if (starting || Date.now() - lastAttempt < 5000) return;
    starting = true;
    failed = false;
    lastAttempt = Date.now();
    try {
      const runtime = path.join(projectRoot, '.runtime');
      fs.mkdirSync(runtime, { recursive: true });
      const output = fs.openSync(path.join(runtime, 'quick-start.log'), 'a');
      const errors = fs.openSync(path.join(runtime, 'quick-start-errors.log'), 'a');
      let child;
      try {
        child = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            path.join(projectRoot, 'scripts', 'quick-start.ps1'),
          ],
          {
            cwd: projectRoot,
            detached: true,
            windowsHide: true,
            stdio: ['ignore', output, errors],
          },
        );
      } finally {
        fs.closeSync(output);
        fs.closeSync(errors);
      }
      child.on('error', () => {
        failed = true;
        starting = false;
      });
      child.on('exit', (code) => {
        failed = code !== 0;
        starting = false;
      });
      child.unref();
    } catch {
      starting = false;
      failed = true;
    }
  }
  return {
    host: '127.0.0.1',
    port: 5500,
    root: path.join(projectRoot, 'public'),
    open: true,
    watch: false,
    navigate: false,
    injectBody: false,
    injectCss: false,
    remoteLogs: false,
    middleware: [
      async function launchNikeStore(request, response) {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (!['GET', 'HEAD'].includes(request.method)) {
          response.writeHead(405);
          response.end();
          return;
        }
        if (await probe(websiteUrl)) {
          response.writeHead(303, { Location: websiteUrl + '/' });
          response.end();
          return;
        }
        (options.launch || launch)();
        response.writeHead(failed ? 500 : 503, {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': '2',
        });
        if (request.method === 'HEAD') {
          response.end();
          return;
        }
        response.end(
          `<!doctype html><html lang="vi"><meta charset="utf-8">${failed ? '' : '<meta http-equiv="refresh" content="2">'}<title>Nike Store</title><style>body{font-family:Arial,sans-serif;background:#fafafa;display:grid;place-items:center;min-height:95vh;margin:0}main{max-width:520px;padding:32px}h1{font-size:40px}b{color:#ff1e27}p{line-height:1.7;color:#52525b}</style><main><h1>NIKE<b>.</b></h1><h2>${failed ? 'Chưa khởi động được website' : 'Đang khởi động Nike Store…'}</h2><p>${failed ? 'Mở file CHAY-WEB.cmd để xem chi tiết lỗi, sau đó thử lại.' : 'Website sẽ tự mở khi sẵn sàng. Lần chạy đầu có thể mất vài phút để chuẩn bị.'}</p></main></html>`,
        );
      },
    ],
  };
};
