/* A student's days can change. The change starts today and never rewrites the past:
   lessons, bills, credits and the card all keep showing the old days for the dates before it. */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');

const lessons = (s, ym) => BC.lessonDates(s, ym);

test('changing days: every earlier month keeps its lessons, its bill and its paid amount', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01');
  BC.setPaid(s.id, '2026-10', true);
  const before = { lessons: lessons(s, '2026-10'), billed: BC.billedDates(s, '2026-10'), due: BC.amountDue(s, '2026-10'), paid: BC.payRec(s.id, '2026-10').amountPaid, sep: BC.amountDue(s, '2026-09') };
  assert.strictEqual(before.billed.length, 9); assert.strictEqual(before.due, 1300000);
  assert.strictEqual(BC.setPlan(s, 'fixed', [1]), true);
  assert.deepStrictEqual(lessons(s, '2026-10'), before.lessons);
  assert.deepStrictEqual(BC.billedDates(s, '2026-10'), before.billed);
  assert.strictEqual(BC.amountDue(s, '2026-10'), before.due);
  assert.strictEqual(BC.payRec(s.id, '2026-10').amountPaid, before.paid);
  assert.strictEqual(BC.amountDue(s, '2026-09'), before.sep);
});
test('the new days start today: dates before today use the old days, today and later the new ones', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); BC.setPlan(s, 'fixed', [1]);
  assert(BC.isRegular(s, '2026-11-03'), 'an old Tuesday is still a lesson');     /* Tue 3 Nov, before today */
  assert(!BC.isRegular(s, '2026-11-10'), 'a later Tuesday is not');
  assert(BC.isRegular(s, '2026-11-09'), 'a later Monday is');
  assert(!BC.isRegular(s, '2026-10-19'), 'an old Monday was never a lesson');
});
test('this month is billed at the fee for the days the student has at the end of it, and by the lessons that really happened', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); BC.setPlan(s, 'fixed', [1]);
  assert.strictEqual(BC.baseFee(s, '2026-11'), 800000, 'one day a week at the end of November');
  assert.strictEqual(BC.baseFee(s, '2026-10'), 1300000, 'October was two days a week');
  assert.strictEqual(BC.amountDue(s, '2026-10'), 1300000);
  assert.strictEqual(BC.baseFee(s), 800000, 'no month given: today\'s plan');
});
test('a student with their own fee keeps it whatever the days', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01', 1000000); BC.setPlan(s, 'fixed', [1]);
  assert.strictEqual(BC.amountDue(s, '2026-10'), 1000000); assert.strictEqual(BC.baseFee(s, '2026-11'), 1000000);
});
test('the same days again change nothing and leave no history; a different order is the same days', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01');
  assert.strictEqual(BC.setPlan(s, 'fixed', [4, 2]), false); assert(!s.dayHist || s.dayHist.length === 0);
});
test('two edits on the same day keep one history entry, with the days from before that day', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01');
  BC.setPlan(s, 'fixed', [1]); BC.setPlan(s, 'fixed', [3]);
  assert.strictEqual(s.dayHist.length, 1); assert.deepStrictEqual(s.dayHist[0].days, [2, 4]);
  assert.deepStrictEqual(s.days, [3]); assert(BC.isRegular(s, '2026-11-11'), 'Wednesday from now on'); assert(BC.isRegular(s, '2026-11-03'), 'old Tuesday');
});
test('several changes on different days keep each period right', () => {
  fresh('2026-10-01'); const s = stu('A', 'fixed', [2], '2026-09-01');
  at('2026-10-15'); BC.setPlan(s, 'fixed', [4]); at('2026-11-10'); BC.setPlan(s, 'fixed', [1, 3]);
  assert(BC.isRegular(s, '2026-10-06'), 'Tue 6 Oct: first plan');      /* Tuesday */
  assert(BC.isRegular(s, '2026-10-22'), 'Thu 22 Oct: second plan');    /* Thursday */
  assert(!BC.isRegular(s, '2026-10-20'), 'Tue 20 Oct: no longer');
  assert(BC.isRegular(s, '2026-11-16'), 'Mon 16 Nov: third plan');
  assert(!BC.isRegular(s, '2026-11-12'), 'Thu 12 Nov: no longer');
});
test('a student who has not started yet: nothing to remember, the new days are simply the days', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2], '2026-12-01'); BC.setPlan(s, 'fixed', [4]);
  assert(!s.dayHist || s.dayHist.length === 0); assert(BC.isRegular(s, '2026-12-03')); assert(!BC.isRegular(s, '2026-12-01'));
});
test('fixed to flexible and back keeps the past as it was', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01');
  const oct = lessons(s, '2026-10'); BC.setPlan(s, 'flexible', []);
  assert.deepStrictEqual(lessons(s, '2026-10'), oct); assert.strictEqual(s.type, 'flexible');
  at('2026-11-20'); BC.setPlan(s, 'fixed', [1]); assert.deepStrictEqual(lessons(s, '2026-10'), oct);
  assert(BC.isRegular(s, '2026-11-03'), 'Tue 3 Nov was before the first change: still a lesson');
  assert(!BC.isRegular(s, '2026-11-10'), 'Tue 10 Nov was in the flexible weeks: not a regular lesson');
  assert(!BC.isRegular(s, '2026-11-24') && BC.isRegular(s, '2026-11-23'), 'from 20 Nov: Mondays only');
});
test('a skip made on an old day stays a skip with its credit, after the days change', () => {
  fresh('2026-11-02'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2026-11');
  assert(BC.skip(s.id, '2026-11-17').ok); const credits = BC.availSkipCredits(s.id, '2026-11').length; assert.strictEqual(credits, 1);
  at('2026-11-05'); BC.setPlan(s, 'fixed', [1]);
  assert(BC.skipRow(s.id, '2026-11-17'), 'the skip is still recorded');
  assert.strictEqual(BC.availSkipCredits(s.id, '2026-11').length, credits, 'and the credit is still there');
});
test('the card carries the history, so past months on it do not change either', async () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); payThrough(s, '2026-11');
  const oct = lessons(s, '2026-10'); BC.setPlan(s, 'fixed', [1]);
  const card = JSON.parse(JSON.stringify(BC.cardOf(s.id))); assert.strictEqual(card.student.dayHist.length, 1);
  BC.hydrate(card); const h = BC.students[0];
  assert.deepStrictEqual(lessons(h, '2026-10'), oct); assert.strictEqual(BC.amountDue(h, '2026-10'), 1300000);
});
test('changing the days makes that student\'s card out of date', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); BC.markCardSent(s.id); assert.strictEqual(BC.cardState(s.id), 'current');
  BC.setPlan(s, 'fixed', [1]); assert.strictEqual(BC.cardState(s.id), 'stale');
});
test('the history is saved in the file and comes back; a file without it still opens', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); BC.setPlan(s, 'fixed', [1]);
  const back = BC.parseFile(BC.fileText()); assert(back.ok, back.reason);
  assert.deepStrictEqual(back.data.students[0].dayHist, [{ until: '2026-11-05', type: 'fixed', days: [2, 4] }]);
  fresh('2026-11-05'); stu('B', 'fixed', [2], '2026-09-01'); assert(BC.parseFile(BC.fileText()).ok, 'no history is fine');
});
test('a file with a damaged history is refused, not half-opened', () => {
  fresh('2026-11-05'); stu('A', 'fixed', [2, 4], '2026-09-01');
  const f = JSON.parse(BC.fileText()); f.data.students[0].dayHist = [{ until: 'soon', type: 'fixed', days: [2] }];
  const r = BC.parseFile(JSON.stringify(f)); assert(!r.ok);
});
test('the report shows the days a week as they are now, and bills each month as it was', () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2, 4], '2026-09-01'); BC.setPlan(s, 'fixed', [1]);
  const rows = BC.reportCSV().split('\r\n').map((r) => r.split(','));
  const oct = rows.find((r) => r[0] === '2026-10'); assert.strictEqual(oct[7], '1300000'); assert.strictEqual(oct[4], '9');
});

run('plan');
