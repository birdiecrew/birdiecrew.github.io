/* What a student may ask for on each kind of day (BC.dayAsk), and that a rule is mentioned only when it would be broken. */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');
const force = { force: true };
function one(type, days) { fresh('2026-11-02'); const a = stu('A', type || 'fixed', days || [2, 4]); payThrough(a, '2026-12'); return a; }

test('own lesson: ask to skip. Inside the notice window the day is marked locked but the ask stays', () => {
  const a = one(); let d = BC.dayAsk(a, '2026-11-10'); assert(d.kind === 'mine' && d.ask === 'skip' && !d.locked);
  d = BC.dayAsk(a, '2026-11-03'); assert(d.kind === 'mine' && d.ask === 'skip' && d.locked);
});
test('skipped lesson: ask to attend after all. A skip made by a break has no ask', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); assert.strictEqual(BC.dayAsk(a, '2026-11-10').ask, 'unskip');
  BC.addBreak(a.id, '2026-11-16', '2026-11-20'); assert.strictEqual(BC.dayAsk(a, '2026-11-17').ask, '');
});
test('make-up and join: ask to move/cancel or to leave', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  assert.strictEqual(BC.dayAsk(a, '2026-11-14').ask, 'changemk');
  const f = stu('F', 'flexible', []); BC.join(f.id, '2026-11-14'); assert.strictEqual(BC.dayAsk(f, '2026-11-14').ask, 'leave');
});
test('a day that is not theirs, with a credit: ask for a make-up and say nothing about rules', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); const d = BC.dayAsk(a, '2026-11-14');
  assert(d.kind === 'free' && d.ask === 'makeup' && d.note === '');
});
test('a day that is not theirs, with a free credit from a cancelled lesson: ask for a make-up', () => {
  const a = one(); BC.cancelSession('2026-11-24', 'x'); const d = BC.dayAsk(a, '2026-11-14');
  assert(d.ask === 'makeup' && d.note === '');
});
test('no credit: the ask becomes an extra lesson and the reason is no credit', () => {
  const a = one(); const d = BC.dayAsk(a, '2026-11-14'); assert(d.ask === 'extra' && d.note === 'noCredit');
});
test('credits used up: extra lesson again', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.makeup(a.id, '2026-11-14');
  assert.strictEqual(BC.dayAsk(a, '2026-11-21').ask, 'extra');
});
test('limit reached (cap lowered after credits were earned): the reason is the limit', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); BC.skip(a.id, '2026-11-12'); BC.config.max_makeups_per_month = 1;
  BC.makeup(a.id, '2026-11-14'); const d = BC.dayAsk(a, '2026-11-21'); assert(d.ask === 'extra' && d.note === 'capReached');
});
test('a credit from last month does not help this month', () => {
  const a = one(); BC.skip(a.id, '2026-11-10'); assert.strictEqual(BC.dayAsk(a, '2026-12-05').ask, 'extra');
});
test('flexible students ask to be added; they have no credits to explain', () => {
  const f = one('flexible', []); const d = BC.dayAsk(f, '2026-11-14'); assert(d.ask === 'join' && d.note === '');
});
test('past days have no ask at all', () => {
  const a = one(); at('2026-11-20');
  ['2026-11-10', '2026-11-14', '2026-11-12'].forEach((d) => assert.strictEqual(BC.dayAsk(a, d).ask, ''));
});
test('cancelled session, break, and a day with no class have no ask', () => {
  const a = one(); BC.cancelSession('2026-11-10', 'x'); assert.deepStrictEqual([BC.dayAsk(a, '2026-11-10').kind, BC.dayAsk(a, '2026-11-10').ask], ['cancelled', '']);
  BC.addBreak(a.id, '2026-11-16', '2026-11-30'); assert.deepStrictEqual([BC.dayAsk(a, '2026-11-17').kind, BC.dayAsk(a, '2026-11-17').ask], ['break', '']);
  assert.deepStrictEqual([BC.dayAsk(a, '2026-11-13').kind, BC.dayAsk(a, '2026-11-13').ask], ['off', '']);
});
test('a student never learns whether a session is full: it is simply an open day', () => {
  const a = one(); BC.skip(a.id, '2026-11-10');
  for (let i = 0; i < 16; i++) { const f = stu('F' + i, 'flexible', []); payThrough(f, '2026-12'); BC.join(f.id, '2026-11-14'); }
  assert.strictEqual(BC.session('2026-11-14').free, 0);
  const d = BC.dayAsk(a, '2026-11-14'); assert(d.kind === 'free' && d.ask === 'makeup');
});
test('a student who is paused is not offered anything on their old lessons', () => {
  const a = one(); a.active = false; assert.strictEqual(BC.dayAsk(a, '2026-11-10').ask === 'skip', false);
});

run('ask');
