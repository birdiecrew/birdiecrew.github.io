/* A busy class for a whole year (ticket J5): the file stays small, and every screen's maths stays fast. */
const { BC, test, run, at, assert, stu } = require('./lib');

let seed = 77; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];
function busyYear() {
  BC.blank(); BC.today = '2026-01-05';
  for (let i = 0; i < 60; i++) stu('Học viên số ' + i, i % 9 === 0 ? 'flexible' : 'fixed', i % 3 === 0 ? [2, 4] : [pick([1, 2, 3, 4, 6, 0])], '2026-01-0' + (1 + (i % 5)));
  for (let day = 0; day < 360; day++) {
    BC.today = BC.addDays('2026-01-05', day);
    for (let k = 0; k < 3; k++) {
      const s = pick(BC.students), d = BC.addDays(BC.today, 8 + Math.floor(rnd() * 20));
      if (rnd() < 0.6) BC.skip(s.id, d); else if (rnd() < 0.6) BC.makeup(s.id, d, { force: true }); else if (s.type === 'flexible') BC.join(s.id, d, { force: true });
    }
    if (day % 30 === 0) BC.students.forEach((s) => BC.setPaid(s.id, BC.ym(BC.today), rnd() < 0.8));
    if (day % 45 === 0) BC.addBreak(pick(BC.students).id, BC.addDays(BC.today, 10), BC.addDays(BC.today, 10 + 5 + Math.floor(rnd() * 20)), { force: true });
    if (day % 90 === 0) BC.students.forEach((s) => { BC.scores[s.id] = (BC.scores[s.id] || []).concat([{ date: BC.today, v: { smash: 5, net: 6, footwork: 5, defense: 6, serve: 5, stamina: 6 } }]); });
  }
}
const ms = (f) => { const t = process.hrtime.bigint(); f(); return Number(process.hrtime.bigint() - t) / 1e6; };

test('60 students and a year of changes: the save file is under 200 KB and opens', () => {
  busyYear(); const text = BC.fileText(), kb = text.length / 1024;
  console.log('      file: ' + kb.toFixed(0) + ' KB, changes: ' + BC.changes.length + ', breaks: ' + BC.breaks.length);
  assert(kb < 200, 'file is ' + kb.toFixed(0) + ' KB'); assert(BC.parseFile(text).ok);
});
test('saving, opening and the working copy are quick (each under half a second)', () => {
  const t1 = ms(() => BC.fileText()), t2 = ms(() => BC.parseFile(BC.fileText())), t3 = ms(() => JSON.stringify(BC.dump()));
  console.log('      save ' + t1.toFixed(0) + ' ms, open ' + t2.toFixed(0) + ' ms'); assert(t1 < 500 && t2 < 500 && t3 < 500);
});
test('every screen\'s maths is quick: the next 14 days, payments for the month, the reminder list, the card for every student', () => {
  at('2026-12-20'); let n = 0;
  const sessions = ms(() => { for (let i = 0; i < 14; i++) BC.session(BC.addDays(BC.today, i)); });
  const pay = ms(() => BC.students.forEach((s) => { BC.amountDue(s, '2026-12'); BC.isLate(s.id); BC.billedDates(s, '2026-12'); }));
  const cards = ms(() => BC.students.forEach((s) => { n += JSON.stringify(BC.cardOf(s.id)).length; }));
  const cal = ms(() => BC.students.forEach((s) => BC.monthDays('2026-12').forEach((d) => BC.dayInfo(s, d))));
  console.log('      14 days ' + sessions.toFixed(0) + ' ms, payments ' + pay.toFixed(0) + ' ms, 60 cards ' + cards.toFixed(0) + ' ms, 60 calendars ' + cal.toFixed(0) + ' ms');
  assert(sessions < 300 && pay < 300 && cards < 1000 && cal < 1000);
});
test('the busiest student\'s card link still fits in a chat message (under 2,500 characters)', async () => {
  const worst = BC.students.map((s) => s.id).sort((a, b) => JSON.stringify(BC.cardOf(b)).length - JSON.stringify(BC.cardOf(a)).length)[0];
  const link = await BC.cardLink(worst, 'https://birdiecrew.github.io/'); console.log('      busiest card link: ' + link.length + ' characters'); assert(link.length < 2500, link.length + ' characters');
});

run('load');
