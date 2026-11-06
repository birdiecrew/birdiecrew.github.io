/* The parts that depend on the phone and the clock: today in Vietnam, pretending another day, saved files from older versions,
   the support copy, the save reminder, and asking the browser to keep storage. Run: node tests/platform.test.js */
const { BC, test, run, fresh, stu, payThrough, at, assert } = require('./lib');

const RealDate = Date;
function clock(iso) {                       /* a fake "now" */
  const t = RealDate.parse(iso);
  global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
}
function unclock() { global.Date = RealDate; }
const setNav = (v) => Object.defineProperty(global, 'navigator', { value: v, configurable: true, writable: true });
function fakeStorage() { const m = {}; global.localStorage = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; return m; }

test('today is the day in Vietnam, even when it is still yesterday in UTC', () => {
  clock('2026-11-30T18:00:00Z'); try { assert.strictEqual(BC.realToday(), '2026-12-01'); } finally { unclock(); }
  clock('2026-12-01T16:59:00Z'); try { assert.strictEqual(BC.realToday(), '2026-12-01'); } finally { unclock(); }
  clock('2026-12-01T17:00:00Z'); try { assert.strictEqual(BC.realToday(), '2026-12-02'); } finally { unclock(); }
});
test('?today=2026-12-01 pretends it is that day; nonsense is ignored', () => {
  global.location = { search: '?today=2026-12-01' }; BC.initToday(); assert(BC.pretend && BC.today === '2026-12-01');
  global.location = { search: '?a=1&today=2026-02-30' }; clock('2026-11-07T05:00:00Z'); try { BC.initToday(); assert(!BC.pretend && BC.today === '2026-11-07', 'a day that does not exist'); } finally { unclock(); }
  global.location = { search: '?today=tomorrow' }; BC.initToday(); assert(!BC.pretend);
  global.location = { search: '' }; BC.initToday(); assert(!BC.pretend && /^\d{4}-\d{2}-\d{2}$/.test(BC.today));
  delete global.location;
});
test('the sample class lives on its own day and is marked as a sample', () => {
  BC.seed(); assert.strictEqual(BC.today, BC.SAMPLE_DAY); assert(BC.meta.sample && BC.students.length > 30);
  BC.blank(); assert(!BC.meta.sample && BC.students.length === 0);
});
test('an older save file is upgraded one version at a time, and the fingerprint is still checked', () => {
  fresh('2026-11-02'); stu('A'); const F = BC.FORMAT, saved = F.version;
  const text = BC.fileText();                                   /* a file made by version 1 */
  try {
    F.version = 3; F.migrations[1] = (d) => Object.assign({}, d, { step1: true }); F.migrations[2] = (d) => Object.assign({}, d, { step2: d.step1 === true });
    const r = BC.parseFile(text); assert(r.ok && r.upgraded && r.data.step1 === true && r.data.step2 === true);
    const bad = JSON.parse(text); bad.data.students[0].name = 'X'; assert.strictEqual(BC.parseFile(JSON.stringify(bad)).reason, 'edited');
    delete F.migrations[2]; assert.strictEqual(BC.parseFile(text).reason, 'broken', 'no upgrade written for that step');
  } finally { F.version = saved; F.migrations = {}; }
  const future = JSON.parse(text); future.v = saved + 1; assert.strictEqual(BC.parseFile(JSON.stringify(future)).reason, 'newer');
});
test('a file made before the reply message existed still gets it', () => {
  fresh('2026-11-02'); stu('A'); const f = JSON.parse(BC.fileText()); delete f.data.messages.en.reply; delete f.data.messages.vi.reply; f.sum = BC.sum(JSON.stringify(f.data));
  const r = BC.parseFile(JSON.stringify(f)); assert(r.ok); BC.blank(); BC.load(r.data);
  assert(/\{what\}/.test(BC.messages.en.reply) && /\{link\}/.test(BC.messages.vi.reply) && /\{what\}/.test(BC.messages.vi.reply));
});
test('the reply and card messages carry what they need in both languages', () => {
  BC.blank(); ['en', 'vi'].forEach((l) => { assert(/\{what\}/.test(BC.messages[l].reply) && /\{link\}/.test(BC.messages[l].reply)); assert(/\{link\}/.test(BC.messages[l].card)); });
});
test('the support copy has no real names, no QR, no phone number, and still opens', () => {
  fresh('2026-11-02'); BC.config.coach_zalo = '0912345678'; BC.qrImage = 'data:image/png;base64,AAAA';
  const a = stu('Nguyễn Thị Lan'), b = stu('Minh'); payThrough(a, '2026-12'); BC.skip(a.id, '2026-11-17');
  const text = BC.supportText();
  assert(!/Nguyễn|Thị|\bLan\b|\bMinh\b|0912345678|data:image/.test(text), 'something personal is still in it');
  const r = BC.parseFile(text); assert(r.ok, r.reason); assert.deepStrictEqual(r.data.students.map((s) => s.name), ['S1', 'S2']);
  assert.strictEqual(r.data.changes.length, BC.changes.length, 'the lessons and credits are kept so a bug can be reproduced');
  assert.strictEqual(BC.students[0].name, 'Nguyễn Thị Lan', 'the real class is untouched');
  assert.deepStrictEqual(r.data.students.map((s) => s.code), BC.students.map((s) => s.code));
});
test('a week without a saved file asks for one (the save icon turns on)', () => {
  fakeStorage(); fresh('2026-11-02'); stu('A');
  clock('2026-11-01T00:00:00Z'); try { BC.markBackedUp(); const b = BC.backup(); assert(!b.dirty && !b.old); } finally { unclock(); }
  clock('2026-11-07T00:00:00Z'); try { assert(!BC.backup().old, 'six days is fine'); } finally { unclock(); }
  clock('2026-11-09T00:00:00Z'); try { const b = BC.backup(); assert(b.old && !b.dirty); } finally { unclock(); }
  stu('B'); assert(BC.backup().dirty);
  delete global.localStorage;
});
test('asking the browser to keep storage: kept, refused, or no answer', async () => {
  setNav({ storage: { persisted: () => Promise.resolve(true), persist: () => Promise.resolve(true) } });
  assert.strictEqual(await BC.persist(), true);
  setNav({ storage: { persisted: () => Promise.resolve(false), persist: () => Promise.resolve(false) } });
  assert.strictEqual(await BC.persist(), false); assert.strictEqual(BC.persisted, false);
  setNav({}); assert.strictEqual(await BC.persist(), null);
  setNav({ storage: { persisted: () => Promise.reject(new Error('no')), persist: () => Promise.reject(new Error('no')) } });
  assert.strictEqual(await BC.persist(), null);
  setNav(undefined);
});
test('a video link on a card must be a web address', async () => {
  fresh('2026-11-05'); const a = stu('A'); BC.videos.smash = { title: 't', len: '', url: 'javascript:alert(1)' }; BC.videos.net = { title: 'n', len: '', url: 'https://youtu.be/x' };
  const card = BC.cardOf(a.id); assert(!('smash' in card.videos) && 'net' in card.videos);
});

run('platform');
