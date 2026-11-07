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

test('the sample class is in Vietnamese: every note and video title has Vietnamese letters, not plain English', () => {
  BC.seed();
  const texts = [];
  Object.keys(BC.overrides).forEach((d) => BC.overrides[d].note && texts.push(BC.overrides[d].note));
  BC.breaks.forEach((b) => b.note && texts.push(b.note));
  BC.changes.forEach((c) => c.note && texts.push(c.note));
  Object.keys(BC.videos).forEach((k) => texts.push(BC.videos[k].title));
  assert(texts.length >= 8, 'found the texts: ' + texts.length);
  texts.forEach((x) => assert(/[^\u0000-\u007f]/.test(x), 'not Vietnamese: ' + x));
});

test('while pretending a date nothing is written: no working copy, no earlier copy, no backup mark, no wipe; ?save=1 (tests) lifts it', () => {
  const m = fakeStorage(); try {
    fresh('2026-11-05'); stu('A', 'fixed', [2], '2026-09-01');
    global.location = { search: '' }; BC.initToday(); BC.blank(); stu('A', 'fixed', [2], '2026-09-01');
    assert.strictEqual(BC.autosave(), true); const kept = JSON.stringify(m); assert(m.bc_data, 'a normal day writes');
    global.location = { search: '?today=2026-12-01' }; BC.initToday(); assert(BC.pretend && BC.noWrite());
    stu('B', 'fixed', [4], '2026-09-01'); assert.strictEqual(BC.autosave(), false); BC.markBackedUp(); BC.wipeLocal();
    assert.strictEqual(JSON.stringify(m), kept, 'storage is exactly as it was');
    global.location = { search: '?today=2026-12-01&save=1' }; BC.initToday(); assert(BC.pretend && !BC.noWrite());
    assert.strictEqual(BC.autosave(), true); assert.notStrictEqual(JSON.stringify(m), kept);
    global.location = { search: '?save=1' }; BC.initToday(); assert(!BC.pretend && !BC.noWrite(), 'save=1 alone does nothing');
  } finally { delete global.location; delete global.localStorage; BC.initToday(); }
});

/* a phone that is nearly full: setItem throws once the total would pass the limit, and a failed write leaves the old value */
function quotaStorage(limit) {
  const m = {}; const size = (skip) => Object.keys(m).reduce((n, k) => n + (k === skip ? 0 : k.length + m[k].length), 0);
  global.localStorage = { getItem: (k) => (k in m ? m[k] : null), removeItem: (k) => { delete m[k]; },
    setItem: (k, v) => { v = String(v); if (size(k) + k.length + v.length > limit) throw new Error('QuotaExceededError'); m[k] = v; } };
  return m;
}
test('a full phone: the working copy wins the room, the earlier copies shrink or go, and the coach is told only when nothing fits', () => {
  try {
    fresh('2026-11-05'); stu('A', 'fixed', [2], '2026-09-01'); const one = BC.fileText().length;
    const m = quotaStorage(one * 3 + 200);                         /* room for about two copies, not six */
    for (let i = 0; i < 6; i++) { BC.students[0].name = 'A' + i; assert.strictEqual(BC.autosave(), true, 'the working copy is always kept, edit ' + i); assert(!BC.saveFailed); }
    assert.strictEqual(JSON.parse(m.bc_data).data.students[0].name, 'A5', 'the newest data is the one kept');
    assert(!m.bc_hist || JSON.parse(m.bc_hist).length <= 2, 'earlier copies were cut back');
    quotaStorage(one - 50);                                       /* not even one copy fits */
    BC.students[0].name = 'Z'; assert.strictEqual(BC.autosave(), false); assert.strictEqual(BC.saveFailed, true, 'she is told');
    quotaStorage(one * 3 + 200); assert.strictEqual(BC.autosave(), true); assert.strictEqual(BC.saveFailed, false, 'and the warning goes when it works again');
  } finally { delete global.localStorage; BC.saveFailed = false; }
});
test('when saving fails the data already on the phone is not damaged', () => {
  try {
    fresh('2026-11-05'); stu('A', 'fixed', [2], '2026-09-01'); const one = BC.fileText().length; const m = quotaStorage(one + 100);
    assert.strictEqual(BC.autosave(), true); const before = m.bc_data;
    BC.students[0].name = 'A very long name '.repeat(20); stu('B', 'fixed', [4], '2026-09-01');
    assert.strictEqual(BC.autosave(), false); assert.strictEqual(m.bc_data, before, 'the last good copy is still there');
    assert(BC.restore().ok, 'and it still opens');
  } finally { delete global.localStorage; BC.saveFailed = false; }
});
test('storage that does not exist or throws on read: nothing crashes, nothing is claimed saved', () => {
  try {
    fresh('2026-11-05'); stu('A', 'fixed', [2], '2026-09-01');
    global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    assert.strictEqual(BC.autosave(), false); assert.strictEqual(BC.restore().ok, false); assert.doesNotThrow(() => BC.backup()); assert.deepStrictEqual(BC.history(), []);
  } finally { delete global.localStorage; BC.saveFailed = false; }
});

test('message text: every placeholder is filled, unknown ones stay as typed, and dollar signs or braces in a name do no harm', () => {
  assert.strictEqual(BC.fill('Hi {name}, {name}! {code}', { name: 'An', code: 'VM001' }), 'Hi An, An! VM001');
  assert.strictEqual(BC.fill('Hi {name} {unknown}', { name: 'An' }), 'Hi An {unknown}');
  assert.strictEqual(BC.fill('Hi {name}', { name: '$& $1 {code} $$' }), 'Hi $& $1 {code} $$');
  assert.strictEqual(BC.fill('', { name: 'An' }), ''); assert.strictEqual(BC.fill('no placeholders', {}), 'no placeholders');
});
run('platform');
