const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { scripts } = require('../package.json');

// One focused release command, including behavioral regressions omitted from the old build gate.
// Run sequentially: media tests and native exports must not compete for memory.
const failures = [];
for (const name of Object.keys(scripts).filter(name => name.startsWith('smoke:'))) {
  console.log(`\n===== ${name} =====`);
  const result = spawnSync('pnpm', ['run', name], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    failures.push(name);
    console.error(`FAILED: ${name}${result.error ? ` (${result.error.message})` : ''}`);
  }
}
if (failures.length) {
  console.error(`Release checks failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nAll focused mobile release checks passed.');
}
