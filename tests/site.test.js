/* The shipped site: every file the two pages ask for exists, nothing comes from outside, the security policy is in both pages,
   every script parses, and no mockup wording is left. Run: node tests/site.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const root = path.join(__dirname, '..');
const queue = [];
const test = (n, f) => queue.push([n, f]);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const PAGES = { 'index.html': '', 'admin/index.html': 'admin/' };
const refs = (html) => [...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map((m) => m[1]);

for (const [page, dir] of Object.entries(PAGES)) {
  test(page + ': every file it loads exists', () => {
    const missing = refs(read(page)).filter((r) => !/^(https?:|data:|mailto:)/.test(r)).filter((r) => !fs.existsSync(path.join(root, dir, r)));
    assert.deepStrictEqual(missing, []);
  });
  test(page + ': nothing is loaded from another site', () => {
    assert.deepStrictEqual(refs(read(page)).filter((r) => /^(https?:)?\/\//.test(r)), []);
  });
  test(page + ': carries the security policy, a viewport, a title and no indexing', () => {
    const h = read(page);
    assert(/http-equiv="Content-Security-Policy"/.test(h) && /connect-src 'none'/.test(h) && /default-src 'none'/.test(h), 'policy');
    assert(!/<script>(?!<)/.test(h.replace(/<script src=[^>]*><\/script>/g, '')), 'no inline script');
    assert(/name="viewport"/.test(h) && /<title>[^<]+<\/title>/.test(h) && /name="robots" content="noindex"/.test(h) && /name="referrer" content="no-referrer"/.test(h));
  });
  test(page + ': no mockup wording', () => assert(!/mock/i.test(read(page))));
}
test('no prototype wording anywhere a person can read it: pages, scripts and texts', () => {
  for (const f of fs.readdirSync(path.join(root, 'assets')).filter((x) => x.endsWith('.js'))) assert(!/mock(?:up)?\b/i.test(read('assets/' + f)), f + ' still says mock');
});
test('the coach page can be installed: a manifest whose icons exist, and a touch icon', () => {
  const m = JSON.parse(read('admin/manifest.webmanifest'));
  assert(m.display === 'standalone' && m.start_url && m.name && m.lang === 'vi');
  for (const i of m.icons) assert(fs.existsSync(path.join(root, 'admin', i.src)), i.src);
  assert(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'));
  assert(/rel="manifest"/.test(read('admin/index.html')) && /manifest-src 'self'/.test(read('admin/index.html')));
  assert(/apple-touch-icon/.test(read('admin/index.html')) && /apple-touch-icon/.test(read('index.html')));
});
test('every script in assets parses', () => {
  for (const f of fs.readdirSync(path.join(root, 'assets')).filter((x) => x.endsWith('.js'))) new vm.Script(read('assets/' + f), { filename: f });
});
test('the pages load the scripts in an order that works', () => {
  const order = (p) => refs(read(p)).filter((r) => r.endsWith('.js')).map((r) => path.basename(r));
  for (const p of Object.keys(PAGES)) { const o = order(p); assert(o.indexOf('core.js') < o.indexOf('store.js') && o.indexOf('store.js') < o.indexOf('ui.js'), p + ' core, store, ui'); }
  assert(order('admin/index.html').indexOf('sample.js') > order('admin/index.html').indexOf('core.js'), 'sample after core');
});
test('the front page is the card and the coach page is /admin/', () => {
  assert(/id="app"/.test(read('index.html')) && /student\.js/.test(read('index.html')));
  assert(/admin\.js/.test(read('admin/index.html')));
});
test('no outside address appears in any script or style', () => {
  for (const f of fs.readdirSync(path.join(root, 'assets')).filter((x) => /\.(js|css)$/.test(x))) {
    const hits = (read('assets/' + f).match(/https?:\/\/[^\s'"`)]+/g) || []).filter((u) => !/^https:\/\/(zalo\.me|birdiecrew\.github\.io|www\.w3\.org|www\.youtube\.com)/.test(u));
    assert.deepStrictEqual(hits, [], f);
  }
});
test('the only outside address the code reaches is Zalo, and only by opening it', () => {
  const src = read('assets/student.js');
  assert(/window\.open\('https:\/\/zalo\.me\//.test(src), 'opens zalo.me');
  assert(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(['admin.js', 'student.js', 'store.js', 'core.js', 'ui.js', 'admin-setup.js'].map((f) => read('assets/' + f)).join('\n')), 'no network calls in the code');
});

(async () => {
  let p = 0, f = 0;
  for (const [n, fn] of queue) { try { await fn(); p++; console.log('  ok  ' + n); } catch (e) { f++; process.exitCode = 1; console.log('FAIL  ' + n + '\n      ' + String(e.message).split('\n').slice(0, 4).join('\n      ')); } }
  console.log('site: ' + p + ' passed' + (f ? ', ' + f + ' FAILED' : ''));
})();
