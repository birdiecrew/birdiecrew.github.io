/* The rules, scenario by scenario (the PLAN.md test lists for steps 3 and 5).
   Defaults: advance_days 7, max 3 make-ups a month, pay by the 5th. The coach records every change.
   "warned" = refused with a soft warning, then allowed with { force: true }. "refused" = a hard rule that never gives way. */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');
const force = { force: true };

/* Nov 2026: Mon 2 (today). Tue 3, 10, 17, 24. Thu 5, 12, 19, 26. Sat 7, 14, 21, 28. Sun 1, 8, 15, 22, 29. Fri has no class. */
function one() { fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4]); payThrough(a, '2026-12'); return a; }

/* ---------- skip ---------- */
test('skip 8 days ahead: allowed and earns a credit', () => {
  const a = one(), r = BC.skip(a.id, '2026-11-10');
  assert(r.ok && r.credit === true && r.warned.length === 0);
});
test('skip exactly 7 days ahead is fine, 6 days ahead is warned (notice)', () => {
  const a = one(); at('2026-11-03'); assert(BC.skip(a.id, '2026-11-10').ok);
  const b = one(); at('2026-11-04');
  const r = BC.skip(b.id, '2026-11-10');
  assert(!r.ok && r.reason === 'notice' && BC.isSoft(r.reason));
  const f = BC.skip(b.id, '2026-11-10', force);
  assert(f.ok && f.warned[0] === 'notice');
});
test('a sudden absence with no record earns nothing', () => {
  const a = one(); assert.strictEqual(BC.availSkipCredits(a.id, '2026-11').length, 0);
});
test('four skips in a month, all with notice: all allowed, only the first three give a credit', () => {
  const a = one();
  const r = ['2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19'].map((d) => BC.skip(a.id, d));
  assert(r.every((x) => x.ok));
  assert.deepStrictEqual(r.map((x) => x.credit), [true, true, true, false]);
});
test('skipping the same lesson twice is refused', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  const r = BC.skip(a.id, '2026-11-10'); assert(!r.ok && r.reason === 'already' && !BC.isSoft(r.reason));
});

/* ---------- make-up ---------- */
test('a credit works in the same month, even on a day before the skipped lesson', () => {
  const a = one(); BC.skip(a.id, '2026-11-17');
  const r = BC.makeup(a.id, '2026-11-14'); assert(r.ok && r.row.source === 'skip' && !r.courtesy);
});
test('a credit does not carry into next month: warned (no credit), and doing it anyway is a courtesy make-up', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  const r = BC.makeup(a.id, '2026-12-05');
  assert(!r.ok && r.reason === 'noCredit' && BC.isSoft(r.reason));
  const f = BC.makeup(a.id, '2026-12-05', force);
  assert(f.ok && f.courtesy && f.row.source === 'courtesy' && f.row.creditId === null);
});
test('a second make-up with only one skip is warned, and courtesy on override', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  assert(BC.makeup(a.id, '2026-11-14').ok);
  const r = BC.makeup(a.id, '2026-11-21'); assert(!r.ok && r.reason === 'noCredit');
  assert(BC.makeup(a.id, '2026-11-21', force).courtesy);
});
test('three make-ups taken: a fourth is warned, and a courtesy make-up does not count toward the cap', () => {
  const a = one();
  ['2026-11-10', '2026-11-12', '2026-11-17'].forEach((d) => BC.skip(a.id, d));
  ['2026-11-14', '2026-11-21', '2026-11-28'].forEach((d) => assert(BC.makeup(a.id, d).ok));
  const r = BC.makeup(a.id, '2026-11-15'); assert(!r.ok && BC.isSoft(r.reason));
  const left = BC.makeupsLeft(a.id, '2026-11');
  const f = BC.makeup(a.id, '2026-11-15', force); assert(f.ok && f.courtesy);
  assert.strictEqual(BC.makeupsLeft(a.id, '2026-11'), left, 'courtesy must not use the cap');
  assert.strictEqual(BC.capUsed(a.id, '2026-11'), 3);
});
test('cap reached is its own warning when the limit was lowered after credits were earned', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.skip(a.id, '2026-11-12');
  BC.config.max_makeups_per_month = 1;
  assert(BC.makeup(a.id, '2026-11-14').ok);
  const r = BC.makeup(a.id, '2026-11-21'); assert(!r.ok && r.reason === 'capReached' && BC.isSoft(r.reason));
});
test('a make-up on the student\'s own regular day (skipped or not) is refused', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  [ '2026-11-10', '2026-11-12' ].forEach((d) => { const r = BC.makeup(a.id, d, force); assert(!r.ok && r.reason === 'alreadyIn'); });
});
test('make-up and join refused where there is no class or the session is cancelled', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  assert.strictEqual(BC.makeup(a.id, '2026-11-13', force).reason, 'notClass');     // Friday
  BC.cancelSession('2026-11-14', 'x');
  assert.strictEqual(BC.makeup(a.id, '2026-11-14', force).reason, 'cancelled');
});
test('a make-up already booked on a date cannot be booked twice', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.skip(a.id, '2026-11-12');
  BC.makeup(a.id, '2026-11-14'); assert.strictEqual(BC.makeup(a.id, '2026-11-14', force).reason, 'already');
});
test('moving a booked make-up is cancel plus add, with no monthly limit on changes', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  ['2026-11-21', '2026-11-28', '2026-11-15', '2026-11-22', '2026-11-29'].reduce((from, to) => { const r = BC.moveMakeup(a.id, from, to); assert(r.ok, from + ' -> ' + to); return to; }, '2026-11-14');
  assert.strictEqual(BC.rows(a.id, 'makeup').length, 1);
});
test('a failed move leaves the old make-up in place', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  const r = BC.moveMakeup(a.id, '2026-11-14', '2026-11-13'); assert(!r.ok);
  assert.deepStrictEqual(BC.rows(a.id, 'makeup').map((x) => x.date), ['2026-11-14']);
});

/* ---------- undo skip ---------- */
test('undo a skip 8 days ahead: allowed, the credit goes away. 6 days ahead: warned', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); assert(BC.unskip(a.id, '2026-11-10').ok);
  assert.strictEqual(BC.availSkipCredits(a.id, '2026-11').length, 0);
  BC.skip(a.id, '2026-11-10'); at('2026-11-04');
  const r = BC.unskip(a.id, '2026-11-10'); assert(!r.ok && r.reason === 'notice');
  assert(BC.unskip(a.id, '2026-11-10', force).ok);
});
test('undo a skip whose credit already paid for a make-up: refused until the make-up is cancelled', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  const r = BC.unskip(a.id, '2026-11-10', force); assert(!r.ok && r.reason === 'creditUsed' && !BC.isSoft(r.reason));
  BC.cancelMakeup(a.id, '2026-11-14'); assert(BC.unskip(a.id, '2026-11-10').ok);
});
test('four skips (the fourth had no credit), undo one of the first three: the fourth now gets the credit', () => {
  const a = one();
  ['2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19'].forEach((d) => BC.skip(a.id, d));
  BC.unskip(a.id, '2026-11-12');
  assert.strictEqual(BC.skipRow(a.id, '2026-11-19').credit, true);
});
test('undo a skip that never happened is refused', () => {
  const a = one(); assert.strictEqual(BC.unskip(a.id, '2026-11-10').reason, 'notFound');
});

/* ---------- seats and courts ---------- */
function crowd(n, date) { for (let i = 0; i < n; i++) { const f = stu('F' + i, 'flexible', [], '2026-09-01'); payThrough(f, '2026-12'); assert(BC.join(f.id, date).ok, 'join ' + i); } }
test('a make-up on a full session (16 seats) is warned; doing it anyway shows it over capacity', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); crowd(16, '2026-11-14');
  const r = BC.makeup(a.id, '2026-11-14'); assert(!r.ok && r.reason === 'full' && BC.isSoft(r.reason));
  assert(BC.makeup(a.id, '2026-11-14', force).ok);
  const s = BC.session('2026-11-14'); assert(s.over && s.count === 17);
});
test('with one extra seat the same make-up is allowed with no warning', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); crowd(16, '2026-11-14');
  BC.overrides['2026-11-14'] = { extra: 1 };
  const r = BC.makeup(a.id, '2026-11-14'); assert(r.ok && r.warned.length === 0);
});
test('flexible join on a full session is warned too', () => {
  one(); crowd(16, '2026-11-14'); const g = stu('G', 'flexible', []); payThrough(g, '2026-12');
  assert.strictEqual(BC.join(g.id, '2026-11-14').reason, 'full');
});
test('courts to book: 9 people need 3 courts, 8 people need 2', () => {
  one(); crowd(9, '2026-11-14'); assert.strictEqual(BC.session('2026-11-14').courtsToBook, 3);
  fresh('2026-11-02'); crowd(8, '2026-11-14'); assert.strictEqual(BC.session('2026-11-14').courtsToBook, 2);
});
test('the venue has 4 courts: a date can never have more', () => {
  one(); BC.overrides['2026-11-14'] = { courts: 5 };
  assert.strictEqual(BC.session('2026-11-14').courts, 4);
  assert.strictEqual(BC.session('2026-11-14').seats, 16);
});
test('a skipping student frees a seat; a student on a long break frees one too', () => {
  const a = one(), b = stu('B', 'fixed', [2, 4]);
  assert.strictEqual(BC.session('2026-11-10').count, 2);
  BC.skip(a.id, '2026-11-10'); assert.strictEqual(BC.session('2026-11-10').count, 1);
  BC.addBreak(b.id, '2026-11-16', '2026-11-30'); assert.strictEqual(BC.session('2026-11-17').count, 1);
});

/* ---------- late fee ---------- */
test('the 5th is on time, the 6th is late: every change is warned until it is paid', () => {
  fresh('2026-11-05'); const a = stu('A', 'fixed', [2, 4]);
  assert(!BC.isLate(a.id)); assert(BC.skip(a.id, '2026-11-17').ok);
  at('2026-11-06'); assert(BC.isLate(a.id));
  const r = BC.skip(a.id, '2026-11-19'); assert(!r.ok && r.reason === 'late' && BC.isSoft('late'));
});
test('marking the month paid removes the late warning at once', () => {
  fresh('2026-11-12'); const a = stu('A', 'fixed', [2, 4]);
  assert.strictEqual(BC.skip(a.id, '2026-11-24').reason, 'late');
  BC.setPaid(a.id, '2026-11', true); assert(BC.skip(a.id, '2026-11-24').ok);
});
test('first bill: starts on the 20th, due on the 23rd, late from the 24th. Starts on the 3rd: due on the 6th', () => {
  fresh('2026-11-23'); const a = stu('A', 'fixed', [2, 4], '2026-11-20');
  assert.strictEqual(BC.dueDate(a, '2026-11'), '2026-11-23'); assert(!BC.isLate(a.id));
  at('2026-11-24'); assert(BC.isLate(a.id));
  fresh('2026-11-06'); const b = stu('B', 'fixed', [2, 4], '2026-11-03');
  assert.strictEqual(BC.dueDate(b, '2026-11'), '2026-11-06'); assert(!BC.isLate(b.id));
  at('2026-11-07'); assert(BC.isLate(b.id));
});
test('a late warning looks at the current month: a December skip recorded in November is judged on November', () => {
  fresh('2026-11-20'); const a = stu('A', 'fixed', [2, 4]); BC.setPaid(a.id, '2026-11', true);
  assert(BC.skip(a.id, '2026-12-08').ok);
});

/* ---------- cancelled sessions ---------- */
test('the coach cancels a lesson: each affected fixed student gets one free credit outside the cap', () => {
  const a = one(), b = stu('B', 'fixed', [2]), c = stu('C', 'fixed', [4]);
  const r = BC.cancelSession('2026-11-10', 'holiday'); assert(r.ok && r.affected === 2);
  assert.strictEqual(BC.rows(a.id, 'cancel_credit').length, 1); assert.strictEqual(BC.rows(c.id, 'cancel_credit').length, 0);
  const m = BC.makeup(a.id, '2026-11-14'); assert(m.ok && m.free && m.row.source === 'cancel');
  assert.strictEqual(BC.makeupsLeft(a.id, '2026-11'), 3, 'free credits do not use the cap');
});
test('cancelling a session that is already cancelled is refused: nobody gets the credit twice', () => {
  const a = one(); BC.cancelSession('2026-11-10', 'x');
  const r = BC.cancelSession('2026-11-10', 'x'); assert(!r.ok && r.reason === 'already');
  assert.strictEqual(BC.rows(a.id, 'cancel_credit').length, 1);
});
test('a cancelled-lesson credit from November works in December but not in January', () => {
  const a = one(); BC.cancelSession('2026-11-24', 'x');
  assert.strictEqual(BC.availCancelCredits(a.id, '2026-12').length, 1);
  assert.strictEqual(BC.availCancelCredits(a.id, '2027-01').length, 0);
});
test('cancelling gives back the make-ups and joins booked on that date', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  const f = stu('F', 'flexible', []); BC.join(f.id, '2026-11-14');
  BC.cancelSession('2026-11-14', 'x');
  assert.strictEqual(BC.rows(a.id, 'makeup').length, 0); assert.strictEqual(BC.rows(f.id, 'join').length, 0);
  assert.strictEqual(BC.availSkipCredits(a.id, '2026-11').length, 1, 'the skip credit is free again');
});
test('a make-up cannot be booked on a session that is cancelled, and a skip cannot be recorded on it', () => {
  const a = one(); BC.cancelSession('2026-11-10', 'x');
  assert.strictEqual(BC.skip(a.id, '2026-11-10', force).reason, 'cancelled');
});

/* ---------- breaks ---------- */
test('a 14-day break from 7+ days ahead is long: no credits, sessions show on break', () => {
  const a = one(), r = BC.addBreak(a.id, '2026-11-16', '2026-11-29');
  assert(r.ok && r.long && r.warned.length === 0);
  assert.strictEqual(BC.rows(a.id, 'skip').length, 0);
  assert(BC.session('2026-11-17').onBreak.indexOf(a.id) >= 0);
});
test('a 10-day break is only normal skips, with credits and the cap', () => {
  const a = one(), r = BC.addBreak(a.id, '2026-11-16', '2026-11-25');
  assert(r.ok && !r.long);
  const sk = BC.rows(a.id, 'skip'); assert.deepStrictEqual(sk.map((x) => x.date), ['2026-11-17', '2026-11-19', '2026-11-24']);
  assert(sk.every((x) => x.credit && x.breakId === r.brk.id));
});
test('a break starting 3 days from now is warned, and doing it anyway saves it', () => {
  const a = one(), r = BC.addBreak(a.id, '2026-11-05', '2026-11-20');
  assert(!r.ok && r.reason === 'noticeBreak');
  assert(BC.addBreak(a.id, '2026-11-05', '2026-11-20', force).ok);
});
test('breaks that overlap, or run backwards, are refused', () => {
  const a = one(); BC.addBreak(a.id, '2026-11-16', '2026-11-29');
  assert.strictEqual(BC.addBreak(a.id, '2026-11-20', '2026-12-05').reason, 'overlap');
  assert.strictEqual(BC.addBreak(a.id, '2026-12-10', '2026-12-01').reason, 'dateOrder');
});
test('remove a short break whose skips already paid for a make-up: refused until that make-up is cancelled', () => {
  const a = one(), b = BC.addBreak(a.id, '2026-11-16', '2026-11-20');
  assert(BC.makeup(a.id, '2026-11-21').ok);
  const r = BC.removeBreak(a.id, b.brk.id, force); assert(!r.ok && r.reason === 'creditUsedBreak' && !BC.isSoft(r.reason));
  BC.cancelMakeup(a.id, '2026-11-21'); assert(BC.removeBreak(a.id, b.brk.id).ok);
  assert.strictEqual(BC.rows(a.id, 'skip').length, 0);
});
test('a break cancels the make-ups and joins that fall inside it', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-21');
  BC.addBreak(a.id, '2026-11-20', '2026-11-22', force);
  assert.strictEqual(BC.rows(a.id, 'makeup').length, 0);
});
test('no make-up inside a break', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.addBreak(a.id, '2026-11-20', '2026-11-22');
  assert.strictEqual(BC.makeup(a.id, '2026-11-21', force).reason, 'onBreak');
});

/* ---------- flexible students ---------- */
test('flexible: add a session 7 days ahead is allowed, 6 days ahead is warned, removing gives no credit', () => {
  fresh('2026-11-02'); const f = stu('F', 'flexible', []); payThrough(f, '2026-12');
  assert(BC.join(f.id, '2026-11-09').ok);
  at('2026-11-04'); const r = BC.join(f.id, '2026-11-10'); assert(!r.ok && r.reason === 'notice');
  assert(BC.join(f.id, '2026-11-10', force).ok);
  assert(BC.leave(f.id, '2026-11-09', force).ok);
  assert.strictEqual(BC.rows(f.id, 'cancel_credit').length + BC.availSkipCredits(f.id, '2026-11').length, 0);
});
test('flexible-only and fixed-only actions are kept apart', () => {
  fresh('2026-11-02'); const f = stu('F', 'flexible', []), a = stu('A', 'fixed', [2, 4]);
  assert.strictEqual(BC.skip(f.id, '2026-11-10').reason, 'fixedOnly');
  assert.strictEqual(BC.makeup(f.id, '2026-11-14').reason, 'fixedOnly');
  assert.strictEqual(BC.join(a.id, '2026-11-14').reason, 'flexOnly');
  assert.strictEqual(BC.skip(a.id, '2026-11-11').reason, 'notRegular');
  assert.strictEqual(BC.join(f.id, '2026-08-01', force).reason, 'beforeStart');
});

/* ---------- every forced change is recorded ---------- */
test('every change made with Do it anyway is written down with the rules it bent; a plain change leaves no mark', () => {
  const a = one(); at('2026-11-04');
  BC.skip(a.id, '2026-11-17');                         // fine
  assert.strictEqual(BC.changeLog.length, 0);
  BC.skip(a.id, '2026-11-10', force);                  // notice bent
  BC.makeup(a.id, '2026-12-05', force);                // no credit bent
  assert.deepStrictEqual(BC.changeLog.map((x) => [x.act, x.bent.join()]), [['skip', 'notice'], ['makeup', 'noCredit']]);
  assert(BC.changeLog.every((x) => x.student === a.id && x.date));
});
test('a forced move is logged once, not twice', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14'); at('2026-11-12');
  BC.moveMakeup(a.id, '2026-11-14', '2026-11-21', force);
  assert.strictEqual(BC.changeLog.filter((x) => x.act === 'moveMakeup' || x.act === 'makeup').length, 1);
});

run('rules');
