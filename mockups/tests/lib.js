/* A tiny test helper shared by the scenario tests. No libraries: run any test file with node. */
global.window = global; global.document = undefined;
const fs = require('fs'), path = require('path'), assert = require('assert');
const dir = path.join(__dirname, '..');
(0, eval)(fs.readFileSync(path.join(dir, 'mock-core.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(dir, 'store.js'), 'utf8'));
const BC = window.BC;

const queue = [];
let current = '';
function test(name, fn) { queue.push([name, fn]); }

/* A clean class: default timetable (Mon to Thu, Sat, Sun), no students, today as given. */
function fresh(today) { BC.blank(); BC.today = today || '2026-11-02'; return BC; }
function stu(name, type, days, start, fee) {
  return BC.addStudent({ name, type: type || 'fixed', days: days || [2, 4], start: start || '2026-09-01', fee: fee || null });
}
/* mark every month from the student's start to `ym` as paid, so nobody is late unless a test wants it */
function payThrough(s, ym) {
  for (let m = BC.ym(s.start); m <= ym; m = BC.addMonths(m, 1)) BC.setPaid(s.id, m, true);
}
function at(iso) { BC.today = iso; }
const dates = (arr) => arr.map((x) => x.date).sort();
const kinds = (s, from, n) => { const out = {}; for (let i = 0; i < n; i++) { const d = BC.addDays(from, i), k = BC.dayInfo(s, d).kind; out[d] = k === 'full' ? 'free' : k; } return out; };

async function run(title) {
  let passed = 0, failed = 0;
  const realNow = Date.now;
  for (const [name, fn] of queue) {
    current = name;
    try { await fn(); passed++; console.log('  ok  ' + name); }
    catch (e) { failed++; process.exitCode = 1; console.log('FAIL  ' + name + '\n      ' + String(e.message).split('\n').slice(0, 4).join('\n      ')); }
    Date.now = realNow;
  }
  console.log(title + ': ' + passed + ' passed' + (failed ? ', ' + failed + ' FAILED' : ''));
}
module.exports = { BC, test, run, fresh, stu, payThrough, at, assert, dates, kinds, fs, path, dir };
