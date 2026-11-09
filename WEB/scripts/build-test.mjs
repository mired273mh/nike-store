import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, PHP_API_ORIGIN: 'http://127.0.0.1:8001', NEXT_DIST_DIR: '.next-test' },
});
process.exit(result.status ?? 1);
