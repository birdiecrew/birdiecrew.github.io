/* The turn of the year: credits, bills, breaks, late dates, cards and the report across 31 December to 1 January.
   Dec 2026: Tue 1, 8, 15, 22, 29; Thu 3, 10, 17, 24, 31. Jan 2027: Fri 1 (no class), Sat 2, Sun 3, Mon 4, Tue 5, Thu 7, Sat 9, Tue 12.  */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');
const force = { force: true };

test('calendar arithmetic across the year end and a leap year', () => {
  assert.strictEqual(BC.addMonths('2026-12', 1), '2027-01'); assert.strictEqual(BC.addMonths('2027-01', -1), '2026-12'); assert.strictEqual(BC.addMonths('2026-11', 14), '2028-01');
  assert.strictEqual(BC.addDays('2026-12-31', 1), '2027-01-01'); assert.strictEqual(BC.addDays('2027-01-01', -1), '2026-12-31');
  assert.strictEqual(BC.diff('2026-12-25', '2027-01-08'), 14); assert.strictEqual(BC.dow('2027-01-01'), 5);
  assert.strictEqual(BC.monthDays('2028-02').length, 29); assert.strictEqual(BC.monthDays('2027-02').length, 28); assert.strictEqual(BC.monthDays('2026-12').length, 31);
});
test('a skip in December for a January lesson earns a credit that works in January', () => {
  fresh('2026-12-20'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2027-02');
  const r = BC.skip(s.id, '2027-01-05'); assert(r.ok && r.credit, 'a skip 16 days ahead earns a credit');
  const m = BC.makeup(s.id, '2027-01-09'); assert(m.ok && m.row.source === 'skip' && !m.courtesy);
});
test('a December credit does not carry into January, even over the new year', () => {
  fresh('2026-12-10'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2027-02');
  assert(BC.skip(s.id, '2026-12-22').ok);
  const r = BC.makeup(s.id, '2027-01-09'); assert(!r.ok && r.reason === 'noCredit');
  assert(BC.makeup(s.id, '2026-12-26').ok, 'but it still works on 26 December');
});
test('a cancelled-lesson credit from 29 December works until the end of January, not February', () => {
  fresh('2026-12-20'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2027-03');
  BC.cancelSession('2026-12-29', 'x');
  const m = BC.makeup(s.id, '2027-01-09'); assert(m.ok && m.row.source === 'cancel');
  fresh('2026-12-20'); const t = stu('B', 'fixed', [2, 4], '2026-09-01'); payThrough(t, '2027-03'); BC.cancelSession('2026-12-29', 'x');
  const f = BC.makeup(t.id, '2027-02-06'); assert(!f.ok && f.reason === 'noCredit');
});
test('the December bill is due on the 5th of December, the January bill on the 5th of January; late is the day after', () => {
  fresh('2026-12-05'); const s = stu('A', 'fixed', [2], '2026-09-01'); payThrough(s, '2026-11');
  assert.strictEqual(BC.dueDate(s, '2026-12'), '2026-12-05'); assert.strictEqual(BC.dueDate(s, '2027-01'), '2027-01-05');
  assert(!BC.isLate(s.id), 'not late on the 5th'); at('2026-12-06'); assert(BC.isLate(s.id), 'late on the 6th');
  BC.setPaid(s.id, '2026-12', true); at('2027-01-05'); assert(!BC.isLate(s.id)); at('2027-01-06'); assert(BC.isLate(s.id), 'January unpaid, late on 6 Jan');
});
test('a first bill in January: due three days after the start, in whole thousands', () => {
  fresh('2027-01-18'); const s = stu('A', 'fixed', [2, 4], '2027-01-20');
  assert.strictEqual(BC.dueDate(s, '2027-01'), '2027-01-23'); assert.strictEqual(BC.amountDue(s, '2027-01') % 1000, 0); assert(BC.amountDue(s, '2027-01') < 1300000);
  assert.strictEqual(BC.amountDue(s, '2026-12'), 0, 'nothing before the start');
});
test('a long break over the new year is billed in each month for its own days', () => {
  fresh('2026-12-10'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2027-02');
  const r = BC.addBreak(s.id, '2026-12-28', '2027-01-12'); assert(r.ok, JSON.stringify(r));
  assert(BC.inLongBreak(s.id, '2026-12-31') && BC.inLongBreak(s.id, '2027-01-05') && !BC.inLongBreak(s.id, '2027-01-13'));
  assert(BC.billedDates(s, '2026-12').every((d) => d < '2026-12-28')); assert(BC.billedDates(s, '2027-01').every((d) => d > '2027-01-12'));
  assert(BC.amountDue(s, '2027-01') < 1300000 && BC.amountDue(s, '2026-12') < 1300000);
});
test('a card made in January still holds December, with the right look-back, and not older changes', () => {
  fresh('2026-11-20'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2027-02'); BC.skip(s.id, '2026-12-01'); at('2026-12-10'); BC.skip(s.id, '2026-12-22');
  at('2027-01-10'); const c = BC.cardOf(s.id);
  assert.deepStrictEqual(c.changes.map((x) => x.date), ['2026-12-01', '2026-12-22'], 'from 1 December');
  assert.strictEqual(c.asOf, '2027-01-10'); BC.hydrate(JSON.parse(JSON.stringify(c))); assert.strictEqual(BC.students[0].name, 'A');
  assert.strictEqual(BC.billedDates(BC.students[0], '2026-12').length, 10, '5 Tuesdays and 5 Thursdays in December 2026');
});
test('the report runs month by month across the new year', () => {
  fresh('2027-01-10'); stu('A', 'fixed', [2], '2026-11-10');
  const months = BC.reportCSV().split('\r\n').slice(1).map((r) => r.split(',')[0]); assert.deepStrictEqual(months, ['2026-11', '2026-12', '2027-01']);
});
test('midnight: the day in Vietnam changes at 17:00 UTC, also on New Year\'s Eve', () => {
  const RealDate = Date, t = RealDate.parse('2026-12-31T17:00:00Z');
  global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
  try { assert.strictEqual(BC.realToday(), '2027-01-01'); } finally { global.Date = RealDate; }
});

run('year');
