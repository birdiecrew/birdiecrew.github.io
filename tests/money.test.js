/* Fees, proration, credits on the next bill, and due dates. */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');

test('fee by days a week: 1 day 800,000, 2 days 1,300,000, 3 or more 1,300,000, flexible 800,000', () => {
  fresh('2026-11-02');
  const one = stu('One', 'fixed', [2]), two = stu('Two', 'fixed', [2, 4]), three = stu('Three', 'fixed', [1, 2, 4]), flex = stu('Flex', 'flexible', []);
  assert.deepStrictEqual([one, two, three, flex].map((s) => BC.baseFee(s)), [800000, 1300000, 1300000, 800000]);
});
test('a fee set for one student beats the tiers', () => {
  fresh('2026-11-02'); const s = stu('Alex', 'fixed', [1, 3], '2026-09-01', 1000000);
  assert.strictEqual(BC.amountDue(s, '2026-11'), 1000000);
});
test('a full month is the full fee, whatever the number of lessons in it', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4]);
  assert.strictEqual(BC.lessonDates(a, '2026-11').length, 8); assert.strictEqual(BC.lessonDates(a, '2026-12').length, 10);
  assert.strictEqual(BC.amountDue(a, '2026-11'), 1300000); assert.strictEqual(BC.amountDue(a, '2026-12'), 1300000);
});
test('Tuesday and Thursday student joining on 17 November pays 4 of 8 lessons: 650,000', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4], '2026-11-17');
  assert.strictEqual(BC.calcAmount(a, '2026-11'), 650000);
});
test('a long break from 17 to 30 November covers 4 of 8 lessons: 650,000', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4]);
  assert(BC.addBreak(a.id, '2026-11-17', '2026-11-30').ok);
  assert.strictEqual(BC.calcAmount(a, '2026-11'), 650000);
});
test('the coach can overwrite the amount, and the new amount is what is due', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4]); BC.payRec(a.id, '2026-11').override = 600000;
  assert.strictEqual(BC.amountDue(a, '2026-11'), 600000);
});
test('a break planned after the month was paid: the difference is a credit on the next bill, never cash back', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4]); payThrough(a, '2026-11');
  assert.strictEqual(BC.payRec(a.id, '2026-11').amountPaid, 1300000);
  BC.addBreak(a.id, '2026-11-17', '2026-11-30');
  assert.strictEqual(BC.payRec(a.id, '2026-12').creditIn, 650000);
  assert.strictEqual(BC.amountDue(a, '2026-12'), 650000);
});
test('credit_carry off: the next bill ignores the credit', () => {
  fresh('2026-11-02'); BC.config.credit_carry = false; const a = stu('A', 'fixed', [2, 4]); payThrough(a, '2026-11');
  BC.addBreak(a.id, '2026-11-17', '2026-11-30'); assert.strictEqual(BC.amountDue(a, '2026-12'), 1300000);
});
test('proration off: always the full fee', () => {
  fresh('2026-11-02'); BC.config.proration = false; const a = stu('A', 'fixed', [2, 4], '2026-11-17');
  assert.strictEqual(BC.calcAmount(a, '2026-11'), 1300000);
});
test('a flexible student is prorated over every session in the month', () => {
  fresh('2026-11-02'); const f = stu('F', 'flexible', [], '2026-11-12');
  const all = BC.lessonDates(f, '2026-11').length, billed = BC.billedDates(f, '2026-11').length;
  assert.strictEqual(BC.calcAmount(f, '2026-11'), Math.round(800000 * billed / all / 1000) * 1000);
});
test('before the start date nothing is billed', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2, 4], '2026-12-15');
  assert.strictEqual(BC.calcAmount(a, '2026-11'), 0);
});
test('every bill is a whole number of thousands, for any start date and any days', () => {
  fresh('2026-11-02'); let n = 0;
  for (const days of [[1], [2], [2, 4], [1, 3, 6], [0, 6], [1, 2, 3, 4, 6, 0]]) {
    for (let d = 1; d <= 30; d++) for (const fee of [null, 1000000]) {
      const s = BC.addStudent({ name: 'S' + (n++), type: 'fixed', days, start: '2026-11-' + String(d).padStart(2, '0'), fee });
      for (const ym of ['2026-11', '2026-12']) { const a = BC.calcAmount(s, ym); assert(Number.isInteger(a) && a % 1000 === 0, 'bad amount ' + a); }
    }
  }
});
test('paid money is whole dong and the paid amount is kept even when the bill is worked out again', () => {
  fresh('2026-11-02'); const a = stu('A', 'fixed', [2]); BC.setPaid(a.id, '2026-11', true);
  const paid = BC.payRec(a.id, '2026-11').amountPaid; BC.config.fee_1day = 900000;
  assert.strictEqual(BC.payRec(a.id, '2026-11').amountPaid, paid);
});
test('due dates: the 5th for everyone, three days after the start for a new student if that is later', () => {
  fresh('2026-11-02');
  const old = stu('Old', 'fixed', [2], '2026-09-01'), n20 = stu('N20', 'fixed', [2], '2026-11-20'), n03 = stu('N03', 'fixed', [2], '2026-11-03');
  assert.deepStrictEqual([old, n20, n03].map((s) => BC.dueDate(s, '2026-11')), ['2026-11-05', '2026-11-23', '2026-11-06']);
  assert.strictEqual(BC.dueDate(n20, '2026-12'), '2026-12-05');
});
test('nobody is late before their start month', () => {
  fresh('2026-11-20'); const a = stu('A', 'fixed', [2], '2026-12-10'); assert(!BC.isLate(a.id));
});

run('money');
