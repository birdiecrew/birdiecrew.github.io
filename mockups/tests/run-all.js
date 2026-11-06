/* Run every test: node mockups/tests/run-all.js
   Scenario tests, the storage test, and the random-sequence rules test on several seeds.
   The screen tests need a browser: open mockups/tests/ui-tests.html (see the note in that file). */
const { spawnSync } = require('child_process'), path = require('path'), fs = require('fs');
const here = __dirname;
let failed = 0, lines = [];
const runOne = (label, args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = out.split('\n').filter((l) => /passed|violations|FAIL/.test(l)).join(' | ');
  const bad = r.status !== 0 || /FAIL|violations:\s*$/m.test(out) || /\d+x\s/.test(out);
  if (bad) { failed++; console.log(out); }
  lines.push((bad ? 'FAIL ' : 'ok   ') + label.padEnd(28) + summary.slice(0, 90));
};
fs.readdirSync(here).filter((f) => f.endsWith('.test.js') || f === 'store-test.js').sort().forEach((f) => runOne(f, [path.join(here, f)]));
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) runOne('rules-fuzz seed ' + seed, [path.join(here, 'rules-fuzz.js'), String(seed), '5000']);
console.log(lines.join('\n'));
console.log(failed ? '\n' + failed + ' test file(s) FAILED' : '\nAll tests passed.');
process.exit(failed ? 1 : 0);
