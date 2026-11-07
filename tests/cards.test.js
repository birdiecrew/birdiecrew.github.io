/* Student cards: what is in one, which of two cards is newer, what a phone keeps, and how the coach knows a card is out of date. */
const { BC, test, run, fresh, stu, payThrough, at, assert, kinds } = require('./lib');
const force = { force: true };
let clock;
const tick = () => { clock = 1.7e12; Date.now = () => (clock += 60000); };   /* each card is made a minute after the last */
async function make(sid) { return BC.cardDecode(await BC.cardEncode(BC.cardOf(sid))); }
function two() { fresh('2026-11-05'); tick(); const a = stu('John', 'fixed', [2, 4]), b = stu('Jane', 'fixed', [2]); payThrough(a, '2026-12'); payThrough(b, '2026-12'); return [a, b]; }

/* ---------- what is in a card ---------- */
test('a card holds only that student: no other name, code or row', async () => {
  const [a, b] = two(); BC.skip(b.id, '2026-11-10'); BC.skip(a.id, '2026-11-12');
  const json = JSON.stringify(await make(a.id));
  assert(!json.includes('Jane') && !json.includes(b.code), 'another student leaked');
  const card = await make(a.id); assert(card.changes.every((c) => c.student === a.id));
});
test('a card carries no phone number, no QR, no photo and no other personal detail', async () => {
  const [a] = two(); BC.config.coach_zalo = '0912345678'; BC.qrImage = 'data:image/png;base64,AAAA';
  const json = JSON.stringify(await make(a.id));
  assert(!json.includes('data:image') && !/qr|photo|email|phone/i.test(Object.keys(JSON.parse(json)).join()));
});
test('a card has no way to write: it holds data only, no code', async () => {
  const [a] = two(); const card = await make(a.id);
  assert(!JSON.stringify(card).includes('function')); assert.strictEqual(typeof card.v, 'number');
});
test('the link is short enough for a chat message even for a busy student', async () => {
  fresh('2026-11-05'); tick(); const a = stu('Busy', 'fixed', [1, 2, 3, 4, 6, 0]); payThrough(a, '2026-12');
  for (const d of ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-17']) BC.skip(a.id, d);
  BC.makeup(a.id, '2026-11-14'); BC.addBreak(a.id, '2026-11-24', '2026-11-30', force);
  BC.scores[a.id] = [{ date: '2026-08-29', v: { smash: 5, net: 4, footwork: 3, defense: 5, serve: 6, stamina: 4 } }, { date: '2026-10-28', v: { smash: 6, net: 5, footwork: 4, defense: 6, serve: 7, stamina: 5 } }];
  const link = await BC.cardLink(a.id, 'https://birdiecrew.github.io/');
  assert(link.length < 4000, 'link is ' + link.length);
});
test('a cut-short or damaged link opens nothing', async () => {
  const [a] = two(); const code = await BC.cardEncode(BC.cardOf(a.id));
  assert.strictEqual(await BC.cardDecode(code.slice(0, 20)), null);
  assert.strictEqual(await BC.cardDecode(code.slice(0, -5) + 'xxxxx'), null);
  assert.strictEqual(await BC.cardDecode(''), null);
  assert.strictEqual(await BC.cardDecode('q' + code.slice(1)), null);
});
test('every student of the sample class gets the same calendar from the card as the coach sees', async () => {
  BC.seed(); tick(); const ids = BC.students.map((s) => s.id);
  for (const id of ids) {
    BC.seed(); tick();
    const s0 = BC.student(id), from = BC.addMonths(BC.ym(BC.today), -1) + '-01', ym = BC.ym(BC.today);
    const want = kinds(s0, from, 120), credit = BC.creditSummary(id, ym), late = BC.isLate(id), amount = BC.amountDue(s0, ym);
    const card = await make(id); BC.hydrate(card);
    const me = BC.student(id);
    assert.deepStrictEqual(kinds(me, from, 120), want, s0.name + ' calendar');
    assert.deepStrictEqual(BC.creditSummary(id, ym), credit, s0.name + ' credits');
    assert.strictEqual(BC.isLate(id), late, s0.name + ' late'); assert.strictEqual(BC.amountDue(me, ym), amount, s0.name + ' amount');
  }
});

/* ---------- two cards ---------- */
test('every card carries the moment it was made, so two cards from one day still have an order', async () => {
  const [a] = two(); const c1 = await make(a.id), c2 = await make(a.id);
  assert.strictEqual(c1.asOf, c2.asOf); assert(c2.made > c1.made); assert(BC.cardNewer(c2, c1) && !BC.cardNewer(c1, c2));
});
test('a newer card replaces the one the phone keeps', async () => {
  const [a] = two(); const old = await make(a.id); BC.skip(a.id, '2026-11-17'); const now = await make(a.id);
  const p = BC.pickCard(old, now); assert(p.keep && p.show === now && p.older === null);
});
test('opening an OLD link never replaces the newer card the phone already holds', async () => {
  const [a] = two(); const old = await make(a.id); BC.skip(a.id, '2026-11-17'); const now = await make(a.id);
  const p = BC.pickCard(now, old);
  assert(!p.keep && p.show === now && p.older === old, 'the newest card must stay');
});
test('opening the same link again is harmless', async () => {
  const [a] = two(); const c = await make(a.id); const p = BC.pickCard(c, JSON.parse(JSON.stringify(c)));
  assert(p.older === null && p.show.made === c.made);
});
test('the first card a phone sees is kept', async () => {
  const [a] = two(); const c = await make(a.id); const p = BC.pickCard(null, c); assert(p.keep && p.show === c);
});
test('a card of a different student (a brother or sister on the same phone) replaces it instead of being ignored', async () => {
  const [a, b] = two(); const ca = await make(a.id); const cb = await make(b.id);
  const p = BC.pickCard(cb, ca); assert(p.keep && p.show === ca && p.older === null);
});
test('cards from before the moment was recorded still order by their date', () => {
  const mk = (asOf) => ({ asOf, student: { id: 1, code: 'VM031' } });
  assert(BC.cardNewer(mk('2026-12-01'), mk('2026-11-06')));
  const p = BC.pickCard(mk('2026-12-01'), mk('2026-11-06')); assert(!p.keep && p.older.asOf === '2026-11-06');
});
test('two cards for John: the older one shows the old state, the newer shows the change', async () => {
  const [a] = two(); const old = await make(a.id); BC.skip(a.id, '2026-11-17'); const now = await make(a.id);
  BC.hydrate(old); assert.strictEqual(BC.dayInfo(BC.student(a.id), '2026-11-17').kind, 'mine');
  BC.hydrate(now); assert.strictEqual(BC.dayInfo(BC.student(a.id), '2026-11-17').kind, 'skipped');
});
test('an old card can never change the coach\'s data: opening any card only reads', async () => {
  const [a] = two(); const before = BC.sum(JSON.stringify(BC.dump())); const old = await make(a.id);
  const after = BC.sum(JSON.stringify(BC.dump())); assert.strictEqual(before, after, 'making a card must not change the data');
});
test('a card opened a month later still draws the right lessons, but its payment status is as old as the card', async () => {
  const [a] = two(); fresh('2026-11-06'); tick(); const b = stu('John', 'fixed', [2, 4]); BC.setPaid(b.id, '2026-11', true);
  const card = await make(b.id);
  BC.setPaid(b.id, '2026-12', true);                 // the coach ticks December on her side
  const decNow = BC.payRec(b.id, '2026-12').paid;
  BC.hydrate(card); at('2026-12-08');
  const me = BC.student(b.id);
  assert.strictEqual(BC.dayInfo(me, '2026-12-08').kind, 'mine', 'lessons come from the rules');
  assert.strictEqual(decNow, true); assert.strictEqual(BC.payRec(me.id, '2026-12').paid, false, 'the old card does not know');
  assert.strictEqual(BC.diff(BC.meta.asOf, BC.today) >= 7, true, 'so the card shows its age');
});

/* ---------- the coach knows which card is out of date ---------- */
test('a student with no card sent is "never", then "current" once sent', () => {
  const [a] = two(); assert.strictEqual(BC.cardState(a.id), 'never'); BC.markCardSent(a.id); assert.strictEqual(BC.cardState(a.id), 'current');
});
test('a change for that student makes their card stale; sending again makes it current', () => {
  const [a] = two(); BC.markCardSent(a.id); BC.skip(a.id, '2026-11-17'); assert.strictEqual(BC.cardState(a.id), 'stale');
  BC.markCardSent(a.id); assert.strictEqual(BC.cardState(a.id), 'current');
});
test('a change for another student leaves this card current', () => {
  const [a, b] = two(); BC.markCardSent(a.id); BC.markCardSent(b.id); BC.skip(b.id, '2026-11-17');
  assert.strictEqual(BC.cardState(a.id), 'current'); assert.strictEqual(BC.cardState(b.id), 'stale');
});
test('ticking Paid, scoring, planning a break and cancelling a session each make the card stale', () => {
  const [a] = two();
  const actions = [() => BC.setPaid(a.id, '2027-01', true), () => { BC.scores[a.id] = [{ date: '2026-11-05', v: { smash: 5, net: 5, footwork: 5, defense: 5, serve: 5, stamina: 5 } }]; },
    () => BC.addBreak(a.id, '2026-12-14', '2026-12-18'), () => BC.cancelSession('2026-11-24', 'x')];
  for (const act of actions) { BC.markCardSent(a.id); assert.strictEqual(BC.cardState(a.id), 'current'); act(); assert.strictEqual(BC.cardState(a.id), 'stale'); }
});
test('merely opening screens (reading payment records) does not make a card stale', () => {
  const [a] = two(); BC.markCardSent(a.id); BC.students.forEach((s) => BC.payRec(s.id, '2027-05')); assert.strictEqual(BC.cardState(a.id), 'current');
});
test('time passing alone does not make a card stale: the card works out lateness and lessons itself', () => {
  const [a] = two(); BC.markCardSent(a.id); at('2026-11-20'); assert.strictEqual(BC.cardState(a.id), 'current');
});
test('cards to send: new students and stale cards, not paused students', () => {
  const [a, b] = two(); const c = stu('Paused', 'fixed', [2]); c.active = false;
  BC.markCardSent(a.id); assert.deepStrictEqual(BC.cardsToSend().map((s) => s.name), ['Jane']);
  BC.skip(a.id, '2026-11-17'); assert.deepStrictEqual(BC.cardsToSend().map((s) => s.name).sort(), ['Jane', 'John']);
  BC.markCardSent(a.id); BC.markCardSent(b.id); assert.strictEqual(BC.cardsToSend().length, 0);
});
test('which card was sent when is kept in the file and survives a save and open', () => {
  const [a] = two(); BC.markCardSent(a.id); const r = BC.parseFile(BC.fileText()); assert(r.ok);
  BC.blank(); BC.load(r.data); assert.strictEqual(BC.cardState(a.id), 'current');
});
test('marking a card as sent does not touch the lessons, bills or credits', () => {
  const [a] = two(); const rows = JSON.stringify([BC.changes, BC.payments, BC.breaks]); BC.markCardSent(a.id);
  assert.strictEqual(JSON.stringify([BC.changes, BC.payments, BC.breaks]), rows);
});

run('cards');
