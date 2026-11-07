/* A file that passes the fingerprint can still hold nonsense (a bug, a bad upgrade, a recomputed fingerprint).
   Opening it must either work or be refused in plain words, never half-load. And no real class may ever be refused. */
const { BC, test, run, fresh, stu, at, assert } = require('./lib');
const force = { force: true };

/* ---------- nothing the app can produce is ever refused ---------- */
let seed = 2024; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const day = () => BC.addDays('2026-09-01', Math.floor(rnd() * 210));

function randomStep() {
  const s = pick(BC.students), d = day(), f = rnd() < 0.3 ? force : undefined;
  switch (Math.floor(rnd() * 14)) {
    case 0: BC.skip(s.id, d, f); break;
    case 1: BC.unskip && BC.unskip(s.id, d, f); break;
    case 2: BC.makeup(s.id, d, f); break;
    case 3: BC.join(s.id, d, f); break;
    case 4: BC.leave && BC.leave(s.id, d, f); break;
    case 5: BC.addBreak(s.id, d, BC.addDays(d, 1 + Math.floor(rnd() * 25)), f); break;
    case 6: BC.cancelSession(d, rnd() < 0.5 ? 'note' : ''); break;
    case 7: BC.setPaid(s.id, BC.ym(d), rnd() < 0.7); break;
    case 8: BC.setPlan(s, rnd() < 0.2 ? 'flexible' : 'fixed', [pick([0, 1, 2, 3, 4, 6]), pick([1, 2, 3, 4])]); break;
    case 9: BC.ttEdit((tt) => { tt[pick([0, 1, 2, 3, 4, 6])].on = rnd() < 0.8; if (!Object.keys(tt).some((k) => tt[k].on)) tt[1].on = true; }); break;
    case 10: BC.scores[s.id] = (BC.scores[s.id] || []).concat([{ date: d, v: { smash: 1 + Math.floor(rnd() * 9), net: 5, footwork: 5, defense: 5, serve: 5, stamina: 5 } }]); break;
    case 11: if (BC.students.length < 60) stu('N' + BC.nextId, rnd() < 0.2 ? 'flexible' : 'fixed', [pick([1, 2, 3, 4])], d); break;
    case 12: BC.markCardSent(s.id); break;
    case 13: at(BC.addDays(BC.today, Math.floor(rnd() * 4))); break;
  }
}
test('every state the app reaches while a coach uses it can be saved and opened again (50 random runs)', () => {
  for (let run = 0; run < 50; run++) {
    seed = 1000 + run; BC.blank(); BC.today = '2026-10-01'; BC.seed(); BC.today = '2026-10-01';
    for (let step = 1; step <= 120; step++) {
      randomStep();
      if (step % 30 === 0) {
        const r = BC.parseFile(BC.fileText()); assert(r.ok, 'run ' + run + ' step ' + step + ': refused (' + r.reason + ')');
        assert.strictEqual(JSON.stringify(r.data.students), JSON.stringify(BC.students), 'students survive the round trip');
      }
    }
  }
});
test('the blank class, the sample class and a class made by the wizard are accepted', () => {
  fresh('2026-11-05'); assert(BC.parseFile(BC.fileText()).ok, 'blank'); BC.seed(); assert(BC.parseFile(BC.fileText()).ok, 'sample');
  fresh('2026-11-05'); for (let i = 0; i < 60; i++) stu('S' + i, 'fixed', [1 + (i % 4)], '2026-09-01'); assert(BC.parseFile(BC.fileText()).ok, '60 students');
});
test('an older file without the newer settings gets the defaults, never values left over from the class that was open', () => {
  fresh('2026-11-05'); stu('A', 'fixed', [2], '2026-09-01'); delete BC.config.cancel_credit_months; delete BC.config.default_lang; delete BC.config.timezone;
  const old = BC.fileText(); const r = BC.parseFile(old); assert(r.ok, 'opens');
  fresh('2026-11-05'); BC.config.cancel_credit_months = 3; BC.config.default_lang = 'en'; BC.config.fee_1day = 900000;   /* another class is open, with its own settings */
  BC.load(r.data); assert.strictEqual(BC.config.cancel_credit_months, 1); assert.strictEqual(BC.config.default_lang, 'vi'); assert.strictEqual(BC.config.fee_1day, 800000, 'its own fee, from the file');
});

/* ---------- nonsense is refused, in plain words, with the right fingerprint ---------- */
const damage = {
  'a negative fee': () => { BC.students[0].fee = -5; },
  'a fee that is text': () => { BC.students[0].fee = 'abc'; },
  'a fee of a trillion': () => { BC.students[0].fee = 1e12; },
  'a day that does not exist (9)': () => { BC.students[0].days = [9]; },
  'a day that is half a day (1.5)': () => { BC.students[0].days = [1.5]; },
  'a start that is not a date': () => { BC.students[0].start = 'soon'; },
  'a start that is not a real day (30 Feb)': () => { BC.students[0].start = '2026-02-30'; },
  'a name of 500 letters': () => { BC.students[0].name = 'x'.repeat(500); },
  'two students with the same id': () => { BC.students[1].id = BC.students[0].id; },
  'a student whose "active" is a word': () => { BC.students[0].active = 'yes'; },
  'a change on a day that is not a day': () => { BC.changes.push({ id: 9999, student: BC.students[0].id, type: 'skip', date: '2026-13-40' }); },
  'a break that ends before it starts': () => { BC.breaks.push({ id: 9998, student: BC.students[0].id, from: '2026-12-10', to: '2026-12-01' }); },
  'a payment with a key that is not a student and month': () => { BC.payments.junk = { paid: true }; },
  'a payment of minus one': () => { BC.payments[BC.students[0].id + '|2026-10'] = { paid: true, amountPaid: -1, override: null, creditIn: 0 }; },
  'a score of eleven': () => { BC.scores[BC.students[0].id] = [{ date: '2026-10-01', v: { smash: 11 } }]; },
  'a score on a day that is not a day': () => { BC.scores[BC.students[0].id] = [{ date: 'yesterday', v: { smash: 5 } }]; },
  'an override on a day that is not a day': () => { BC.overrides.nonsense = { extra: 1 }; },
  'zero seats per court (a bill and a court count would divide by it)': () => { BC.config.seats_per_court = 0; },
  'a setting that is the wrong kind (fee as text)': () => { BC.config.fee_1day = 'free'; },
  'a class name that is a number': () => { BC.config.page_title = 42; },
  'a timetable with a day missing': () => { delete BC.timetable[3]; },
  'a timetable time that is not a time': () => { BC.timetable[1].start = '8pm'; },
  'a message that is a number': () => { BC.messages.en.soft = 7; },
  'a video that is a bare word': () => { BC.videos.smash = 'link'; },
  'a time-line of old timetables with a bad date': () => { BC.ttHistory = [{ until: 'x', tt: {} }]; },
  'a "next number" that is text': () => { BC.nextId = 'five'; }
};
for (const name of Object.keys(damage)) {
  test('refused: ' + name, () => {
    BC.blank(); BC.today = '2026-11-05'; BC.seed(); BC.today = '2026-11-05';
    damage[name]();
    const r = BC.parseFile(BC.fileText());     /* the fingerprint is right: only the content is wrong */
    assert(!r.ok && r.reason === 'broken', 'should be refused as broken, got ' + JSON.stringify({ ok: r.ok, reason: r.reason }));
  });
}
test('a refused file leaves the class that is open exactly as it was', () => {
  fresh('2026-11-05'); stu('Keep', 'fixed', [2], '2026-09-01'); const before = BC.fileText();
  BC.students[0].fee = -1; const bad = BC.fileText(); BC.students[0].fee = null; const again = BC.fileText();
  assert.strictEqual(again.length, before.length); const r = BC.parseFile(bad); assert(!r.ok);
  assert.strictEqual(BC.students[0].fee, null, 'parseFile only looks, it never changes what is open');
});

run('validate');
