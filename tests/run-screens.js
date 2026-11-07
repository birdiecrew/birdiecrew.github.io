/* Runs the two browser tests (ui-tests.html and csp-check.html) in headless Chromium, for CI and for anyone's laptop.
   Needs Playwright:  npm install --no-save playwright && npx playwright install chromium
   Then:              node tests/run-screens.js        (add  --headed  to watch)
   Already have Chrome?  PW_CHANNEL=chrome node tests/run-screens.js  (skips the Chromium download)
   Other engines:        PW_BROWSER=webkit node tests/run-screens.js   (or firefox; run npx playwright install webkit first) */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function runPage(browser, url, key) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.goto(url);
  await page.waitForFunction((k) => window[k], key, { timeout: 280000, polling: 1000 });
  const r = await page.evaluate((k) => ({ title: document.title, fails: (window[k].results || []).filter((x) => x[0] !== 'ok') }), key);
  await page.close();
  return r;
}

(async () => {
  const pw = require('playwright'), name = process.env.PW_BROWSER || 'chromium';   /* chromium (default), firefox or webkit (Safari's engine) */
  if (!pw[name]) throw new Error('unknown browser ' + name);
  const chromium = pw[name];
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: !process.argv.includes('--headed'), channel: name === 'chromium' ? (process.env.PW_CHANNEL || undefined) : undefined });
  let bad = 0;
  for (const [file, key] of [['tests/csp-check.html', '__csp'], ['tests/ui-tests.html', '__ui']]) {
    const r = await runPage(browser, base + '/' + file, key);
    console.log(name + ' ' + file + ': ' + r.title);
    r.fails.forEach((f) => console.log('   ' + f.join(' | ')));
    if (/FAILED/.test(r.title) || r.fails.length) bad++;
  }
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
