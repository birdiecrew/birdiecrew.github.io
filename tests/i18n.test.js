/* Texts: nothing is left untranslated, and Vietnamese keeps every {placeholder} the English has. */
const { test, run, assert, fs, path, dir } = require('./lib');
const load = (f) => { const w = {}; new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(w); return w; };
const VI = load('admin-i18n.js').VI, STR = load('student-i18n.js').STR;
const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

test('every text the coach page shows has a Vietnamese version', () => {
  const missing = [];
  for (const f of ['admin.js', 'admin-setup.js']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8'), re = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g; let m;
    while ((m = re.exec(src))) { const k = m[1].replace(/\\'/g, "'"); if (!(k in VI)) missing.push(k); }
  }
  assert.deepStrictEqual(missing, []);
});
test('Vietnamese keeps every {placeholder} of the English on the coach page', () => {
  const bad = Object.keys(VI).filter((k) => holes(k) !== holes(VI[k]));
  assert.deepStrictEqual(bad, []);
});
test('the student card has the same texts in both languages', () => {
  const en = Object.keys(STR.en).sort(), vi = Object.keys(STR.vi).sort();
  assert.deepStrictEqual(en.filter((k) => !(k in STR.vi)), [], 'missing in Vietnamese'); assert.deepStrictEqual(vi.filter((k) => !(k in STR.en)), [], 'missing in English');
});
test('Vietnamese keeps every {placeholder} on the student card', () => {
  const bad = Object.keys(STR.en).filter((k) => typeof STR.en[k] === 'string' && holes(STR.en[k]) !== holes(STR.vi[k]));
  assert.deepStrictEqual(bad, []);
});
test('every Ask the coach button has a message, and the message names the student and the code', () => {
  for (const lang of ['en', 'vi']) {
    const asks = Object.keys(STR[lang]).filter((k) => k.startsWith('ask_')).map((k) => k.slice(4));
    assert(asks.length >= 8);
    for (const a of asks) { const m = STR[lang]['msg_' + a]; assert(m, lang + ' msg_' + a); assert(m.includes('{name}') && m.includes('{code}'), lang + ' msg_' + a + ' needs name and code'); }
  }
});
test('every ask that is about one day puts the date in the message', () => {
  for (const lang of ['en', 'vi']) for (const a of ['skip', 'unskip', 'makeup', 'join', 'leave', 'changemk', 'extra']) assert(STR[lang]['msg_' + a].includes('{date}'), lang + ' ' + a);
});
test('the card has no leftover texts for features that were removed (Key, counters, seats, photo)', () => {
  const src = fs.readFileSync(path.join(dir, 'student.js'), 'utf8');
  for (const gone of ['data-legend', 'creditsToUse', 'makeupsLeft', 'seatsFree', 'avatarSheet', 'fakeQR']) assert(!src.includes(gone), gone + ' is still used');
});

run('texts');
