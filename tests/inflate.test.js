/* Cards must open on phones whose browser cannot decompress by itself (older iPhones, some in-app browsers).
   The built-in decoder is checked against Node's zlib on a lot of inputs, and it must never hang or crash on rubbish. */
const zlib = require('zlib');
const { BC, test, run, fresh, stu, assert } = require('./lib');

let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const bytes = (n, alphabet) => Buffer.from(Array.from({ length: n }, () => Math.floor(rnd() * alphabet)));
const same = (a, b) => assert(Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0, 'bytes differ');

test('empty, one byte, a long run and plain text come back exactly, at every compression level', () => {
  const inputs = [Buffer.alloc(0), Buffer.from('a'), Buffer.alloc(70000, 7), Buffer.from('Xin chào, đây là thẻ lớp của bạn. '.repeat(40))];
  for (const x of inputs) for (let level = 0; level <= 9; level++) same(BC.inflateRaw(zlib.deflateRawSync(x, { level })), x);
});
test('random data of every size up to a few thousand bytes, all strategies (fixed, dynamic, stored, run-length, Huffman only)', () => {
  const strategies = [zlib.constants.Z_DEFAULT_STRATEGY, zlib.constants.Z_FILTERED, zlib.constants.Z_HUFFMAN_ONLY, zlib.constants.Z_RLE, zlib.constants.Z_FIXED];
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const size = Math.floor(rnd() * 5000), alpha = [2, 4, 16, 64, 256][i % 5], x = bytes(size, alpha);
    const z = zlib.deflateRawSync(x, { level: (i % 10), strategy: strategies[i % strategies.length], memLevel: 1 + (i % 9) });
    same(BC.inflateRaw(z), x); n++;
  }
  assert.strictEqual(n, 400);
});
test('real cards: every sample student\'s card survives compress, link, and the built-in decoder', async () => {
  BC.seed(); const realDS = global.DecompressionStream;
  try {
    for (const s of BC.students.slice(0, 12)) {
      const card = BC.cardOf(s.id), code = await BC.cardEncode(card);
      assert.strictEqual(code.charAt(0), 'z', 'compressed');
      global.DecompressionStream = undefined;                 /* a browser without it */
      const back = await BC.cardDecode(code);
      assert(back && back.student.name === s.name && back.asOf === card.asOf, 'card opened without DecompressionStream for ' + s.name);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(card)));
      global.DecompressionStream = realDS;
    }
  } finally { global.DecompressionStream = realDS; }
});
test('rubbish never hangs or crashes: cut-short, flipped and random input give an error, or a harmless answer, quickly', () => {
  const good = zlib.deflateRawSync(Buffer.from(JSON.stringify({ a: 'x'.repeat(500), b: [1, 2, 3] }).repeat(20)));
  let threw = 0;
  for (let cut = 0; cut < good.length; cut += 3) { try { BC.inflateRaw(good.subarray(0, cut)); } catch (e) { threw++; } }
  assert(threw > good.length / 6, 'cut-short input is refused');
  for (let i = 0; i < 300; i++) { const bad = Buffer.from(good); bad[Math.floor(rnd() * bad.length)] ^= 1 << Math.floor(rnd() * 8); try { BC.inflateRaw(bad); } catch (e) { /* fine */ } }
  for (let i = 0; i < 300; i++) { try { BC.inflateRaw(bytes(1 + Math.floor(rnd() * 200), 256)); } catch (e) { /* fine */ } }
});
test('a tiny file that would unpack to a huge one is refused, not unpacked', () => {
  const bomb = zlib.deflateRawSync(Buffer.alloc(20 * 1024 * 1024, 0), { level: 9 });
  assert(bomb.length < 40000); assert.throws(() => BC.inflateRaw(bomb), /big/);
});
test('a cut-short or garbled compressed link opens nothing on a browser without DecompressionStream', async () => {
  fresh('2026-11-05'); const s = stu('A', 'fixed', [2], '2026-09-01'); const code = await BC.cardEncode(BC.cardOf(s.id)); const realDS = global.DecompressionStream;
  try {
    global.DecompressionStream = undefined;
    assert.strictEqual(await BC.cardDecode(code.slice(0, 40)), null); assert.strictEqual(await BC.cardDecode('z!!!'), null);
    assert.strictEqual(await BC.cardDecode('z' + Buffer.from('hello world').toString('base64url')), null);
  } finally { global.DecompressionStream = realDS; }
});

run('inflate');
