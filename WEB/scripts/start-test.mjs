import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3107'],
  {
    stdio: 'inherit',
    env: { ...process.env, PHP_API_ORIGIN: 'http://127.0.0.1:8001', NEXT_DIST_DIR: '.next-test' },
  },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
