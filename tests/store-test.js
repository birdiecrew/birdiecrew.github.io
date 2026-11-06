/* Tests for the storage layer (assets/store.js): save file round trip, hand-edit detection, student card link, pasted names, report.
   Run: node mockups/tests/store-test.js */
global.window = global; global.document = undefined;
const fs = require('fs'), path = require('path'), assert = require('assert');
const dir = path.join(__dirname, '..', 'assets');
eval(fs.readFileSync(path.join(dir, 'core.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'sample.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'store.js'), 'utf8'));
const BC = window.BC;
let n = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { n++; console.log('  ok  ' + name); }, e => { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; });

(async () => {
  await ok('file round trip keeps everything', () => {
    BC.seed();
    const before = JSON.stringify(BC.dump()), txt = BC.fileText(), r = BC.parseFile(txt);
    assert(r.ok, 'parse failed: ' + r.reason);
    BC.blank(); assert.strictEqual(BC.students.length, 0);
    BC.load(r.data);
    assert.strictEqual(JSON.stringify(BC.dump()), before);
  });

  await ok('opening the payments screen does not make the file look changed', () => {
    BC.seed(); const a = BC.sum(JSON.stringify(BC.dump()));
    BC.students.forEach(s => BC.payRec(s.id, '2027-03'));
    assert.strictEqual(BC.sum(JSON.stringify(BC.dump())), a);
  });

  await ok('a file edited by hand is refused with a clear reason', () => {
    BC.seed(); const f = JSON.parse(BC.fileText()); f.data.students[0].name = 'Hacked';
    assert.strictEqual(BC.parseFile(JSON.stringify(f)).reason, 'edited');
    assert.strictEqual(BC.parseFile('not json at all').reason, 'notJson');
    assert.strictEqual(BC.parseFile('{"a":1}').reason, 'notOurs');
    const g = JSON.parse(BC.fileText()); g.v = 99;
    assert.strictEqual(BC.parseFile(JSON.stringify(g)).reason, 'newer');
  });

  await ok('a file with the right fingerprint but a broken shape is refused', () => {
    BC.seed(); const f = JSON.parse(BC.fileText()); f.data.students[0].type = 'vip'; f.sum = BC.sum(JSON.stringify(f.data));
    assert.strictEqual(BC.parseFile(JSON.stringify(f)).reason, 'broken');
  });

  await ok('student card carries only that student and survives the link', async () => {
    BC.seed();
    const lan = BC.byName('Lan').id, card = BC.cardOf(lan), json = JSON.stringify(card);
    assert(!/Minh|Hùng|Thảo/.test(json), 'other students leaked into the card');
    assert(card.changes.every(c => c.student === lan));
    const code = await BC.cardEncode(card);
    assert(code.length < 6000, 'link too long: ' + code.length);
    const back = await BC.cardDecode(code);
    assert.deepStrictEqual(back, JSON.parse(json));
    assert.strictEqual(await BC.cardDecode('zzzz'), null);
    assert.strictEqual(await BC.cardDecode('p' + Buffer.from('{"v":2}').toString('base64url')), null);
  });

  await ok('the hydrated card draws the same calendar as the coach sees', async () => {
    BC.seed();
    const lan = BC.byName('Lan').id, ym = BC.ym(BC.today), want = {};
    BC.monthDays(ym).concat(BC.monthDays(BC.addMonths(ym, 1))).forEach(d => { const i = BC.dayInfo(BC.student(lan), d); want[d] = i.kind === 'full' ? 'free' : i.kind; });
    const sum1 = BC.creditSummary(lan, ym), card = await BC.cardDecode(await BC.cardEncode(BC.cardOf(lan)));
    BC.hydrate(card);
    const me = BC.student(lan);
    Object.keys(want).forEach(d => assert.strictEqual(BC.dayInfo(me, d).kind, want[d], d));
    assert.deepStrictEqual(BC.creditSummary(lan, ym), sum1);
    assert.strictEqual(BC.students.length, 1);
  });

  await ok('pasted names: bullets, numbers, duplicates, long names, limit', () => {
    const r = BC.parseNames('1. Lan\n- Minh\n• Hùng, Thảo;  Quang\nlan\nLAN \n\n' + 'x'.repeat(30));
    assert.deepStrictEqual(r.names.slice(0, 5), ['Lan', 'Minh', 'Hùng', 'Thảo', 'Quang']);
    assert.strictEqual(r.dup, 2); assert.strictEqual(r.long, 1);
    assert.strictEqual(r.names[5].length, BC.LIMITS.nameLen);
    const many = BC.parseNames(Array.from({ length: 70 }, (_, i) => 'Student' + i).join('\n'));
    assert.strictEqual(many.names.length, BC.LIMITS.students); assert.strictEqual(many.over, 10);
    assert.strictEqual(BC.parseNames('Đức\nduc').dup, 1, 'accents should not make two students');
  });

  await ok('report is a plain CSV with a row per student per month', () => {
    BC.seed(); const csv = BC.reportCSV(), lines = csv.replace('﻿', '').split('\r\n');
    assert.strictEqual(lines[0].split(',').length, 10);
    assert(lines.length > BC.students.length * 2);
    assert(lines.every(l => l.length));
  });

  await ok('blank class has no students and the default rules', () => {
    BC.blank(); assert.strictEqual(BC.students.length, 0); assert.strictEqual(BC.config.fee_2days, 1300000);
    const s = BC.addStudent({ name: 'A', type: 'fixed', days: [2], start: '2026-11-01' });
    assert.strictEqual(s.code, 'VM031'); assert.strictEqual(BC.addStudent({ name: 'B', type: 'fixed', days: [2], start: '2026-11-01' }).code, 'VM032');
  });
  console.log(n + ' passed');
})();
