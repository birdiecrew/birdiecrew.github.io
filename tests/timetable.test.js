/* The coach changes the timetable. Class on Tuesday and Thursday only, then Monday is added (and other changes).
   Rule: a change starts today. Nothing before today moves: not a lesson, a bill, a credit or a paid amount. */
const { BC, test, run, fresh, stu, payThrough, at, assert, kinds } = require('./lib');
const force = { force: true };
let clock = 1.7e12; Date.now = () => (clock += 60000);

/* The coach's class like the one in the downloaded file: only Tue and Thu are class days. Today is Fri 6 Nov 2026. */
function tueThu() {
  fresh('2026-11-06');
  [0, 1, 3, 5, 6].forEach((d) => { BC.timetable[d].on = false; });
  const a = stu('John', 'fixed', [2, 4], '2026-09-01'), b = stu('Jane', 'fixed', [2], '2026-09-01'), f = stu('Flo', 'flexible', [], '2026-10-12');
  [a, b, f].forEach((s) => payThrough(s, '2026-11'));
  return { a, b, f };
}
const snap = (s, months) => months.map((m) => [m, BC.lessonDates(s, m).join(), BC.amountDue(s, m), BC.payRec(s.id, m).amountPaid].join('|'));
const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12'];

test('adding Monday starts today: earlier Mondays are not class days, later ones are', () => {
  tueThu(); BC.setDay(1, true);
  assert(!BC.classDay('2026-11-02') && !BC.classDay('2026-10-26'), 'past Mondays stay as they were');
  assert(BC.classDay('2026-11-09') && BC.classDay('2026-12-07'));
});
test('Monday starts on the day it is added, including that day itself', () => {
  tueThu(); at('2026-11-09'); BC.setDay(1, true);
  assert(!BC.classDay('2026-11-02')); assert(BC.classDay('2026-11-09'));
});
test('students on fixed days: lessons, bills and paid amounts are exactly the same before and after', () => {
  const { a, b } = tueThu(); const before = [a, b].map((s) => snap(s, MONTHS));
  BC.setDay(1, true);
  assert.deepStrictEqual([a, b].map((s) => snap(s, MONTHS)), before);
});
test('a flexible student who started in October pays the same for October after Monday is added', () => {
  const { f } = tueThu(); const before = BC.calcAmount(f, '2026-10'), paid = BC.payRec(f.id, '2026-10').amountPaid;
  BC.setDay(1, true); assert.strictEqual(BC.calcAmount(f, '2026-10'), before); assert.strictEqual(BC.payRec(f.id, '2026-10').amountPaid, paid);
});
test('a flexible student who joins mid-month is billed for the new Mondays from today on', () => {
  fresh('2026-11-06'); [0, 1, 3, 5, 6].forEach((d) => { BC.timetable[d].on = false; });
  const g = stu('Gia', 'flexible', [], '2026-11-12'); const before = BC.calcAmount(g, '2026-11');
  BC.setDay(1, true); const after = BC.calcAmount(g, '2026-11');
  assert.strictEqual(before, 500000); assert.strictEqual(after, 533000);   // 8 of 12 sessions instead of 5 of 8
});
test('the new Monday appears as a session with 16 seats, nobody booked, no courts to book', () => {
  tueThu(); BC.setDay(1, true); const s = BC.session('2026-11-09');
  assert(s.isClass && s.seats === 16 && s.count === 0 && s.courtsToBook === 0 && s.start === '20:00');
});
test('the Next 14 days list gains the Mondays and loses nothing', () => {
  tueThu(); const list = () => { const o = []; for (let i = 0; i < 14; i++) if (BC.session(BC.addDays(BC.today, i)).isClass) o.push(BC.addDays(BC.today, i)); return o; };
  const before = list(); BC.setDay(1, true); const after = list();
  assert(before.every((d) => after.includes(d))); assert.deepStrictEqual(after.filter((d) => !before.includes(d)), ['2026-11-09', '2026-11-16']);
});
test('a student can now ask about Monday; students with a credit are offered a make-up there', () => {
  const { a } = tueThu(); BC.skip(a.id, '2026-11-17');
  assert.strictEqual(BC.dayAsk(a, '2026-11-09').kind, 'off'); BC.setDay(1, true);
  const d = BC.dayAsk(a, '2026-11-09'); assert(d.kind === 'free' && d.ask === 'makeup');
});
test('credits, skips, make-ups and breaks made before are untouched', () => {
  const { a } = tueThu(); BC.skip(a.id, '2026-11-17'); BC.makeup(a.id, '2026-11-21', force); BC.addBreak(a.id, '2026-12-14', '2026-12-18');
  const rows = JSON.stringify(BC.changes), breaks = JSON.stringify(BC.breaks); BC.setDay(1, true);
  assert.strictEqual(JSON.stringify(BC.changes), rows); assert.strictEqual(JSON.stringify(BC.breaks), breaks);
});
test('a skip recorded on a Tuesday is still a skip, and the credit is still there', () => {
  const { a } = tueThu(); BC.skip(a.id, '2026-11-17'); BC.setDay(1, true);
  assert.strictEqual(BC.availSkipCredits(a.id, '2026-11').length, 1); assert.strictEqual(BC.skipRow(a.id, '2026-11-17').credit, true);
});
test('cancelled sessions and their free credits stay as they were', () => {
  const { a } = tueThu(); BC.cancelSession('2026-11-24', 'x'); BC.setDay(1, true);
  assert.strictEqual(BC.availCancelCredits(a.id, '2026-12').length, 1); assert(BC.session('2026-11-24').cancelled);
});
test('adding Monday twice does nothing the second time', () => {
  tueThu(); BC.setDay(1, true); const n = BC.ttHistory.length; const r = BC.setDay(1, true);
  assert(r.ok && !r.changed); assert.strictEqual(BC.ttHistory.length, n);
});
test('changing a class time starts today: earlier sessions keep their time', () => {
  tueThu(); BC.ttEdit((tt) => { tt[2].start = '19:00'; });
  assert.strictEqual(BC.session('2026-11-03').start, '20:00'); assert.strictEqual(BC.session('2026-11-10').start, '19:00');
});
test('several changes on different days keep each period right', () => {
  tueThu(); BC.setDay(1, true);                  // 6 Nov: add Monday
  at('2026-12-01'); BC.setDay(6, true);          // 1 Dec: add Saturday
  at('2027-01-04'); BC.setDay(1, false);         // 4 Jan: drop Monday again
  assert.strictEqual(BC.classDay('2026-11-02'), false, 'Monday before it existed');
  assert.strictEqual(BC.classDay('2026-11-23'), true, 'Monday in its first period');
  assert.strictEqual(BC.classDay('2026-11-21'), false, 'Saturday before it was added');
  assert.strictEqual(BC.classDay('2026-12-05'), true, 'Saturday in its period');
  assert.strictEqual(BC.classDay('2026-12-07'), true, 'Monday still there in December');
  assert.strictEqual(BC.classDay('2027-01-11'), false, 'Monday gone from 4 Jan');
  assert.strictEqual(BC.classDay('2027-01-09'), true, 'Saturday stays');
});
test('two edits on the same day keep one history entry, so nothing is lost or doubled', () => {
  tueThu(); BC.setDay(1, true); BC.setDay(6, true); BC.setDay(1, false);
  assert.strictEqual(BC.ttHistory.length, 1); assert.strictEqual(BC.ttHistory[0].until, '2026-11-06');
  assert(!BC.classDay('2026-11-09'));
});
test('a day added and removed on the same day leaves no trace in the past or the future', () => {
  const { a } = tueThu(); const before = snap(a, MONTHS); BC.setDay(1, true); BC.setDay(1, false);
  assert.deepStrictEqual(snap(a, MONTHS), before); assert(!BC.classDay('2026-11-09'));
});

/* ---------- switching a day off ---------- */
test('switching Thursday off: nothing before today changes', () => {
  const { a } = tueThu(); const before = BC.lessonDates(a, '2026-10').join(); BC.setDay(4, false);
  assert.strictEqual(BC.lessonDates(a, '2026-10').join(), before); assert(BC.classDay('2026-11-05'));   // Thursday 5 Nov was before today
  assert(!BC.classDay('2026-11-12') && !BC.classDay('2026-12-03'));
});
test('make-ups and joins booked on later Thursdays are cancelled and the credit comes back', () => {
  const { b, f } = tueThu(); BC.skip(b.id, '2026-11-17'); assert(BC.makeup(b.id, '2026-11-19').ok); assert(BC.join(f.id, '2026-11-26', force).ok);   // Jane makes up on a Thursday
  const imp = BC.dayImpact(4); assert.strictEqual(imp.later, 2); assert.strictEqual(imp.regular, 1);   // only John has Thursday as a regular day
  const r = BC.setDay(4, false); assert.strictEqual(r.cancelled, 2);
  assert.strictEqual(BC.rows(b.id, 'makeup').length, 0); assert.strictEqual(BC.rows(f.id, 'join').length, 0);
  assert.strictEqual(BC.availSkipCredits(b.id, '2026-11').length, 1, 'the credit is free to use again');
});
test('make-ups already attended (before today) are left alone', () => {
  const { b } = tueThu(); at('2026-11-02'); BC.skip(b.id, '2026-11-10'); assert(BC.makeup(b.id, '2026-11-05', force).ok); at('2026-11-06');
  BC.setDay(4, false); assert.strictEqual(BC.rows(b.id, 'makeup').length, 1);
});
test('students keep paying the same fee when a day is dropped: the coach changes their days if she wants a different fee', () => {
  const { a } = tueThu(); const fee = BC.amountDue(a, '2026-12'); BC.setDay(4, false);
  assert.strictEqual(BC.amountDue(a, '2026-12'), fee); assert.deepStrictEqual(BC.lessonDates(a, '2026-12').map((d) => BC.dow(d)), [2, 2, 2, 2, 2]);
});
test('a student whose only day is dropped has no lessons left, and nobody is double booked', () => {
  const { b } = tueThu(); BC.setDay(2, false);
  assert.strictEqual(BC.lessonDates(b, '2026-12').length, 0); assert.strictEqual(BC.session('2026-12-01').isClass, false);
});
test('the last class day cannot be switched off', () => {
  tueThu(); assert(BC.setDay(2, false).ok); const r = BC.setDay(4, false); assert(!r.ok && r.reason === 'lastDay'); assert(BC.classDay('2026-12-03'));
});

/* ---------- cards and the file ---------- */
test('after Monday is added every card that was sent is out of date, because the class timetable changed', () => {
  const { a, b, f } = tueThu(); [a, b, f].forEach((s) => BC.markCardSent(s.id)); BC.setDay(1, true);
  assert.deepStrictEqual([a, b, f].map((s) => BC.cardState(s.id)), ['stale', 'stale', 'stale']); assert.strictEqual(BC.cardsToSend().length, 3);
});
test('an old card still draws its student correctly; it just does not know about Monday', async () => {
  const { a } = tueThu(); const old = await BC.cardDecode(await BC.cardEncode(BC.cardOf(a.id)));
  BC.setDay(1, true); const now = await BC.cardDecode(await BC.cardEncode(BC.cardOf(a.id)));
  const week = (c) => { BC.hydrate(c); const me = BC.student(a.id); return kinds(me, '2026-11-09', 7); };
  const o = week(old), n = week(now);
  assert.strictEqual(o['2026-11-09'], 'off'); assert.strictEqual(n['2026-11-09'], 'free');
  assert.strictEqual(o['2026-11-10'], 'mine'); assert.strictEqual(n['2026-11-10'], 'mine');
  assert.strictEqual(o['2026-11-12'], 'mine'); assert.strictEqual(n['2026-11-12'], 'mine');
});
test('a new card carries the timetable history, so past months on it do not change either', async () => {
  const { f } = tueThu(); BC.setDay(1, true);
  const want = BC.lessonDates(f, '2026-10').join(); const card = await BC.cardDecode(await BC.cardEncode(BC.cardOf(f.id)));
  BC.hydrate(card); assert.strictEqual(BC.lessonDates(BC.student(f.id), '2026-10').join(), want);
});
test('the timetable history is saved in the file and comes back', () => {
  tueThu(); BC.setDay(1, true); const r = BC.parseFile(BC.fileText()); assert(r.ok);
  BC.blank(); BC.load(r.data); assert(!BC.classDay('2026-11-02') && BC.classDay('2026-11-09'));
});
test('a file saved before timetable history existed still opens, with no history', () => {
  tueThu(); const f = JSON.parse(BC.fileText()); delete f.data.ttHistory; f.sum = BC.sum(JSON.stringify(f.data));
  const r = BC.parseFile(JSON.stringify(f)); assert(r.ok); BC.blank(); BC.load(r.data);
  assert.deepStrictEqual(BC.ttHistory, []); assert(BC.classDay('2026-11-10'));
});
test('the wizard\'s first timetable has no history: it applies to every date', () => {
  fresh('2026-11-06'); assert.deepStrictEqual(BC.ttHistory, []); assert(BC.classDay('2026-01-05'));
});

run('timetable');
