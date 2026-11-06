/* Random-sequence test of the rules engine (assets/core.js).
   Runs thousands of random actions (students and coach) and checks invariants after every step.
   Usage: node tests/rules-fuzz.js <seed> <steps> [stats]
   The same invariants should be run against the real Apps Script when it exists. */
global.window = global; global.document = undefined;
const fs = require('fs');
for (const f of ['core.js', 'sample.js']) eval(fs.readFileSync(require('path').join(__dirname, '..', 'assets', f), 'utf8'));
const BC = window.BC;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const seedN = Number(process.argv[2] || 1), STEPS = Number(process.argv[3] || 3000);
const R = rng(seedN), pick = a => a[Math.floor(R() * a.length)], int = n => Math.floor(R() * n);

BC.seed();
const ids = BC.students.map(s => s.id);
const viol = {}; const examples = {};
function bad(code, msg) { viol[code] = (viol[code] || 0) + 1; if (!examples[code]) examples[code] = msg; }
const stats = { ok: {}, refused: {} };
const count = (k, r) => { const t = r.ok ? stats.ok : stats.refused; const key = k + (r.ok ? '' : ':' + r.reason); t[key] = (t[key] || 0) + 1; };

const cfg = BC.config;
function checkStudent(sid, ctx) {
  const s = BC.student(sid), mk = BC.rows(sid, 'makeup'), sk = BC.rows(sid, 'skip'), cc = BC.rows(sid, 'cancel_credit');
  // I2: credited skips per month <= cap
  const perMonth = {};
  sk.forEach(r => { if (r.credit) { const m = BC.ym(r.date); perMonth[m] = (perMonth[m] || 0) + 1; } });
  Object.keys(perMonth).forEach(m => { if (perMonth[m] > cfg.max_makeups_per_month) bad('I2 credited skips over cap', ctx + ' ' + s.name + ' ' + m + '=' + perMonth[m]); });
  // I3/I5: every active makeup points at a live credit, used once
  const used = {};
  mk.forEach(m => {
    if (m.source === 'courtesy') return;   /* coach-approved courtesy: no credit by design */
    if (used[m.creditId]) bad('I5 credit used twice', ctx + ' ' + s.name + ' credit ' + m.creditId);
    used[m.creditId] = 1;
    const c = m.source === 'skip' ? sk.find(r => r.id === m.creditId && r.credit) : cc.find(r => r.id === m.creditId);
    if (!c) bad('I3 make-up points at a missing/cancelled credit', ctx + ' ' + s.name + ' makeup ' + m.date + ' src ' + m.source);
    else if (m.source === 'skip' && BC.ym(c.date) !== BC.ym(m.date)) bad('I4 skip credit used in another month', ctx + ' ' + s.name + ' skip ' + c.date + ' makeup ' + m.date);
    else if (m.source === 'cancel') { const a = BC.ym(c.date); if (BC.ym(m.date) < a || BC.ym(m.date) > BC.addMonths(a, cfg.cancel_credit_months)) bad('I4 cancel credit outside its months', ctx + ' ' + s.name + ' ' + c.date + ' -> ' + m.date); }
  });
  // I-cap: make-ups paid by skip credits per month <= cap
  const capUse = {};
  mk.filter(m => m.source === 'skip').forEach(m => { const k = BC.ym(m.date); capUse[k] = (capUse[k] || 0) + 1; });
  Object.keys(capUse).forEach(k => { if (capUse[k] > cfg.max_makeups_per_month) bad('I2b make-ups over cap', ctx + ' ' + s.name + ' ' + k); });
  // I11/I12: no make-up on a day they already attend regularly; no make-up on cancelled session; no make-up inside a break
  mk.forEach(m => {
    if (BC.isRegular(s, m.date) && !BC.skipRow(sid, m.date) && !BC.inLongBreak(sid, m.date)) bad('I12 make-up on a regular lesson', ctx + ' ' + s.name + ' ' + m.date);
    if (BC.session(m.date).cancelled) bad('I13 make-up left standing on a cancelled session (credit lost?)', ctx + ' ' + s.name + ' ' + m.date);
    if (BC.inAnyBreak(sid, m.date)) bad('I14 make-up inside a break', ctx + ' ' + s.name + ' ' + m.date);
  });
  // at most one cancel credit per student per date
  const cd = {}; cc.forEach(r => { cd[r.date] = (cd[r.date] || 0) + 1; });
  Object.keys(cd).forEach(d => { if (cd[d] > 1) bad('I15 two cancel credits for one lesson', ctx + ' ' + s.name + ' ' + d); });
  // a student cannot get a skip credit AND a cancel credit for the same cancelled lesson
  sk.forEach(r => { if (r.credit && cc.some(c => c.date === r.date)) bad('I16 double credit: skip credit + cancel credit same lesson', ctx + ' ' + s.name + ' ' + r.date); });
  // joins only for flexible
  BC.rows(sid, 'join').forEach(j => { if (s.type !== 'flexible') bad('I17 join by a fixed student', s.name); });
}
function checkSessions(ctx) {
  for (let i = 0; i < 75; i++) {
    const d = BC.addDays(BC.today, i), ses = BC.session(d);
    if (!ses.isClass) continue;
    if (ses.count < 0) bad('I6 negative headcount', d);
    if (ses.count !== ses.coming.length) bad('I6 headcount mismatch', d);
    const dup = ses.coming.filter((x, k) => ses.coming.indexOf(x) !== k);
    if (dup.length) bad('I6b a student counted twice in one session', ctx + ' ' + d + ' ' + dup.map(x => BC.student(x).name));
  }
}

const FORCE = { force: true };
const acts = ['skip', 'skip', 'unskip', 'makeup', 'makeup', 'move', 'cancelmk', 'join', 'leave', 'addbreak', 'rmbreak', 'coachcancel', 'extra', 'courts', 'paid', 'day'];
let performed = 0;
for (let step = 0; step < STEPS; step++) {
  const a = pick(acts), sid = pick(ids), off = R() < 0.8 ? 7 + int(60) : int(70) - 3, iso = BC.addDays(BC.today, off);
  const o = R() < 0.3 ? FORCE : undefined;
  let r = null, ctx = 'seed' + seedN + ' step' + step + ' ' + a + ' ' + BC.student(sid).name + ' ' + iso + ' today=' + BC.today;
  const before = { cap: null };
  const lateBefore = BC.isLate(sid);
  switch (a) {
    case 'skip': r = BC.skip(sid, iso, o); break;
    case 'unskip': r = BC.unskip(sid, iso, o); break;
    case 'makeup': r = BC.makeup(sid, iso, o); break;
    case 'move': { const m = pick(BC.rows(sid, 'makeup').concat([{ date: iso }])); r = BC.moveMakeup(sid, m.date, BC.addDays(BC.today, int(70)), o); break; }
    case 'cancelmk': { const m = pick(BC.rows(sid, 'makeup').concat([{ date: iso }])); r = BC.cancelMakeup(sid, m.date, o); break; }
    case 'join': r = BC.join(sid, iso, o); break;
    case 'leave': r = BC.leave(sid, iso, o); break;
    case 'addbreak': r = BC.addBreak(sid, iso, BC.addDays(iso, 3 + int(25)), o); break;
    case 'rmbreak': { const b = pick(BC.breaksOf(sid).concat([{ id: -9 }])); r = BC.removeBreak(sid, b.id, o); break; }
    case 'coachcancel': if (BC.session(iso).cancelled) { r = { ok: true }; break; } BC.cancelSession(iso, 'fuzz'); r = { ok: true }; break;
    case 'extra': { const k = int(3); BC.overrides[iso] = Object.assign({}, BC.overrides[iso], { extra: k }); r = { ok: true }; break; }
    case 'courts': { const k = 1 + int(4); BC.overrides[iso] = Object.assign({}, BC.overrides[iso], { courts: k }); r = { ok: true }; break; }
    case 'paid': BC.setPaid(sid, BC.ym(BC.today), R() < 0.85); r = { ok: true }; break;
    case 'day': if (BC.today < '2026-12-20') BC.today = BC.addDays(BC.today, 1 + int(3)); ids.forEach(i => { if (R() < 0.9) BC.setPaid(i, BC.ym(BC.today), true); }); r = { ok: true }; break;
  }
  if (r && r.ok !== undefined && ['skip','unskip','makeup','move','cancelmk','join','leave','addbreak','rmbreak'].includes(a)) {
    count(a, r);
    if (r.ok) {
      performed++;
      const W = r.warned || [];
      if ((a === 'makeup' || a === 'join') && BC.session(iso).count > BC.session(iso).seats && W.indexOf('full') < 0) bad('I10 make-up/join took a seat that was not free, without override', ctx);
      if (a === 'makeup' && r.courtesy && !(W.indexOf('noCredit') >= 0 || W.indexOf('capReached') >= 0)) bad('I19 courtesy make-up without a recorded warning', ctx);
            // I7: nothing succeeds for a late student; I8: notice rule honoured (not for break removal, which checks its own)
      if (!o && W.length) bad('I18 something was bent without force', ctx + ' ' + W);
      if (a !== 'rmbreak' && lateBefore && W.indexOf('late') < 0) bad('I7 action succeeded while late, without override', ctx);
      const d = a === 'move' ? null : iso;
      if (d && ['skip', 'unskip', 'makeup', 'join', 'leave'].includes(a) && BC.diff(BC.today, d) < cfg.advance_days && W.indexOf('notice') < 0) bad('I8 notice rule broken without override', ctx);
    }
  }
  checkStudent(sid, ctx);
  if (a === 'coachcancel' || a === 'addbreak' || a === 'day' || step % 25 === 0) { ids.forEach(i => checkStudent(i, ctx)); checkSessions(ctx); }
}
console.log('seed', seedN, 'steps', STEPS, 'successful student actions', performed);
console.log('violations:', Object.keys(viol).length ? '' : 'none');
Object.keys(viol).sort().forEach(k => console.log('  ' + String(viol[k]).padStart(5) + 'x  ' + k + '\n         e.g. ' + examples[k]));
if (process.argv[4] === 'stats') { console.log('OK:', JSON.stringify(stats.ok)); console.log('REFUSED:', JSON.stringify(stats.refused)); }
