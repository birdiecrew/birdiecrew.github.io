/* Colours people must be able to read (WCAG AA: 4.5 to 1 for text), in the light and the dark theme, from the real style sheet. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'base.css'), 'utf8');
const queue = []; const test = (n, f) => queue.push([n, f]);

const block = (start) => { const i = css.indexOf(start); const j = css.indexOf('}', i); return css.slice(i, j); };
const vars = (b) => { const o = {}; for (const m of b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) o[m[1]] = m[2]; return o; };
const light = vars(block(':root {')), dark = Object.assign({}, light, vars(block(':root[data-theme="dark"]')));
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/* text colour on the surface it is drawn on */
const PAIRS = [['text', 'bg'], ['text', 'surface'], ['text', 'surface2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface2'], ['ok', 'surface'], ['ok', 'ok-soft'], ['danger', 'surface'], ['danger', 'danger-soft'],
  ['brand-ink', 'brand'], ['accent-ink', 'accent'], ['ok-ink', 'ok'], ['danger-ink', 'danger']];
for (const [name, theme] of [['light', light], ['dark', dark]]) {
  test(name + ' theme: every text colour is readable on its background (4.5 to 1)', () => {
    const bad = [];
    for (const [fg, bg] of PAIRS) { const r = ratio(theme[fg], theme[bg]); if (r < 4.5) bad.push(fg + ' on ' + bg + ' = ' + r.toFixed(2)); }
    assert.deepStrictEqual(bad, []);
  });
}
test('the dark theme is defined twice (by choice and by the system); the two copies are identical', () => {
  const a = vars(block(':root[data-theme="dark"]')), b = vars(block(':root:not([data-theme="light"]) {'));
  assert.deepStrictEqual(a, b);
});
test('every page says its language, has a title, and the viewport allows zooming', () => {
  for (const f of ['index.html', 'admin/index.html']) {
    const h = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert(/<html[^>]*\blang="/.test(h), f + ' lang'); assert(/<title>[^<]+<\/title>/.test(h), f + ' title');
    assert(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(h), f + ' must not stop zooming');
  }
});

(async () => {
  let p = 0, f = 0;
  for (const [n, fn] of queue) { try { await fn(); p++; console.log('  ok  ' + n); } catch (e) { f++; process.exitCode = 1; console.log('FAIL  ' + n + '\n      ' + String(e.message).split('\n').slice(0, 6).join('\n      ')); } }
  console.log('access: ' + p + ' passed' + (f ? ', ' + f + ' FAILED' : ''));
})();
