/* Birdie Crew: where the data lives.
   There is no server. The coach's data is one file she keeps (a "save file") plus an automatic working copy in her browser.
   Students get a card link that carries only their own rows. This file is the whole storage layer, so the real site can
   swap the browser copy for another place later without touching the rules. */
(function () {
  'use strict';
  var BC = window.BC;
  var APP = 'birdie-crew';
  /* the save file format. When it changes, add a function to `migrations` that turns version N data into version N+1 data. */
  var F = BC.FORMAT = { version: 1, migrations: {} };
  var K_DATA = 'bc_data', K_HIST = 'bc_hist', K_BAK_AT = 'bc_backup_at', K_BAK_SUM = 'bc_backup_sum';

  /* the numbers the screens use to stop mistakes before they happen */
  BC.LIMITS = { students: 60, nameLen: 20, courts: 8, feeMin: 100000, feeMax: 5000000, feeStep: 50000, dayRange: 366 };

  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function get(k) { var s = ls(); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v) { var s = ls(); try { if (s) { s.setItem(k, v); return true; } } catch (e) { /* full or blocked */ } return false; }
  function del(k) { var s = ls(); try { if (s) s.removeItem(k); } catch (e) { /* ignore */ } }

  /* a short fingerprint: it catches a file that was edited by hand, it is not a security feature */
  function sum(str) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  BC.sum = sum;

  /* ---------- everything the file holds ---------- */
  var EMPTY_PAY = function (r) { return !r.paid && !r.paidDate && !r.amountPaid && r.override == null && !r.creditIn; };
  BC.dump = function () {
    var pay = {};
    Object.keys(BC.payments).forEach(function (k) { if (!EMPTY_PAY(BC.payments[k])) pay[k] = BC.payments[k]; });
    return {
      config: BC.config, messages: BC.messages, timetable: BC.timetable, ttHistory: BC.ttHistory || [], overrides: BC.overrides, videos: BC.videos,
      students: BC.students, changes: BC.changes, breaks: BC.breaks, payments: pay, changeLog: BC.changeLog, scores: BC.scores,
      nextId: BC.nextId, meta: BC.meta, qr: BC.qrImage || '', logo: (window.UI && UI.pics.get('logo')) || ''
    };
  };
  BC.load = function (d) {
    var c = JSON.parse(JSON.stringify(d));
    BC.config = Object.assign(BC.defaultConfig(), c.config);   /* a setting the file lacks gets the default, never a value left over from another class */
    BC.messages = { en: Object.assign({}, BC.defaultMessages().en, (c.messages || {}).en), vi: Object.assign({}, BC.defaultMessages().vi, (c.messages || {}).vi) };   /* an older file gets the newer texts */ BC.timetable = c.timetable; BC.ttHistory = c.ttHistory || []; BC.overrides = c.overrides;
    BC.videos = c.videos; BC.students = c.students; BC.changes = c.changes; BC.breaks = c.breaks; BC.payments = c.payments;
    BC.changeLog = c.changeLog || []; BC.scores = c.scores; BC.nextId = c.nextId; BC.meta = c.meta || { sample: false, setup: true };
    BC.qrImage = c.qr || '';
    if (window.UI) { if (c.logo) UI.pics.set('logo', c.logo); else UI.pics.del('logo'); UI.applyFavicon(); }
  };

  /* ---------- the save file ---------- */
  BC.fileText = function () {
    var data = BC.dump();
    return JSON.stringify({ app: APP, v: F.version, saved: new Date().toISOString(), sum: sum(JSON.stringify(data)), data: data });
  };
  BC.fileName = function (ext) {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return 'birdie-crew-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + (ext || '.json');
  };
  var isNum = function (x) { return typeof x === 'number' && isFinite(x); };
  function isDay(x) { return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && BC.iso(BC.toDate(x)) === x; }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function num(x, lo, hi) { return typeof x === 'number' && isFinite(x) && x >= lo && x <= hi; }
  /* The checks are about what could crash a screen or make a bill meaningless: types, real dates, sane numbers. */
  function shapeOk(d) {
    if (!isObj(d)) return false;
    var ok = isObj(d.config) && isObj(d.timetable) && isObj(d.overrides) && isObj(d.videos) && isObj(d.messages) && isObj(d.payments) && isObj(d.scores) &&
      Array.isArray(d.students) && Array.isArray(d.changes) && Array.isArray(d.breaks) && isNum(d.nextId);
    if (!ok || d.students.length > 200 || d.changes.length > 50000 || d.breaks.length > 5000) return false;
    var ids = {}, c = d.config, def = BC.defaultConfig(), i;
    for (var k in def) {   /* a setting that is there must be the same kind of thing as its default, and a sane number */
      if (c[k] === undefined) continue;
      if (typeof c[k] !== typeof def[k]) return false;
      if (typeof c[k] === 'number' && !num(c[k], 0, 1e9)) return false;
      if (typeof c[k] === 'string' && c[k].length > 200) return false;
    }
    if (c.seats_per_court !== undefined && c.seats_per_court < 1 || c.venue_courts !== undefined && c.venue_courts < 1) return false;
    for (i = 0; i < 7; i++) {
      var t = d.timetable[i]; if (!isObj(t) || typeof t.on !== 'boolean' || !/^\d{2}:\d{2}$/.test(t.start) || !/^\d{2}:\d{2}$/.test(t.end)) return false;
    }
    if (d.ttHistory !== undefined && !(Array.isArray(d.ttHistory) && d.ttHistory.length <= 1000 && d.ttHistory.every(function (x) { return isObj(x) && isDay(x.until) && isObj(x.tt); }))) return false;
    if (!d.students.every(function (s) {
      if (!isObj(s) || !isNum(s.id) || ids[s.id]) return false; ids[s.id] = 1;
      return typeof s.name === 'string' && s.name.length <= 100 && (s.type === 'fixed' || s.type === 'flexible') && Array.isArray(s.days) && s.days.length <= 7 &&
        s.days.every(function (x) { return x === Math.floor(x) && x >= 0 && x <= 6; }) && isDay(s.start) && histOk(s.dayHist) &&
        (s.fee === null || s.fee === undefined || num(s.fee, 0, 1e8)) && (s.active === undefined || typeof s.active === 'boolean') && (s.code === undefined || (typeof s.code === 'string' && s.code.length <= 20));
    })) return false;
    if (!d.changes.every(function (x) { return isObj(x) && isNum(x.student) && isDay(x.date) && typeof x.type === 'string'; })) return false;
    if (!d.breaks.every(function (b) { return isObj(b) && isNum(b.student) && isDay(b.from) && isDay(b.to) && b.from <= b.to; })) return false;
    for (var pk in d.payments) {
      var p = d.payments[pk]; if (!/^\d+\|\d{4}-\d{2}$/.test(pk) || !isObj(p) || (p.paid !== undefined && typeof p.paid !== 'boolean')) return false;
      if (p.amountPaid != null && !num(p.amountPaid, 0, 1e9) || p.override != null && !num(p.override, 0, 1e9) || p.creditIn != null && !num(p.creditIn, 0, 1e9)) return false;
    }
    for (var sk in d.scores) {
      if (!Array.isArray(d.scores[sk]) || !d.scores[sk].every(function (x) { return isObj(x) && isDay(x.date) && isObj(x.v) && Object.keys(x.v).every(function (m) { return num(x.v[m], 0, 10); }); })) return false;
    }
    for (var ok2 in d.overrides) if (!isDay(ok2) || !isObj(d.overrides[ok2])) return false;
    for (var vk in d.videos) if (!isObj(d.videos[vk]) || (d.videos[vk].title !== undefined && typeof d.videos[vk].title !== 'string')) return false;
    for (var lang in d.messages) { if (!isObj(d.messages[lang]) || !Object.keys(d.messages[lang]).every(function (m) { return typeof d.messages[lang][m] === 'string'; })) return false; }
    return true;
  }
  /* the days a student had before a change: absent, or a list of {until, type, days} */
  function histOk(h) {
    return h === undefined || (Array.isArray(h) && h.length <= 100 && h.every(function (x) {
      return x && typeof x.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.until) && (x.type === 'fixed' || x.type === 'flexible') && Array.isArray(x.days) && x.days.every(function (d) { return d >= 0 && d <= 6; });
    }));
  }
  /* reason: notJson | notOurs | newer | edited | broken */
  BC.parseFile = function (text) {
    var f;
    try { f = JSON.parse(text); } catch (e) { return { ok: false, reason: 'notJson' }; }
    if (!f || f.app !== APP || !f.data) return { ok: false, reason: 'notOurs' };
    if (!isNum(f.v) || f.v > F.version) return { ok: false, reason: 'newer' };
    if (f.sum !== sum(JSON.stringify(f.data))) return { ok: false, reason: 'edited' };
    var data = f.data;
    for (var v = f.v; v < F.version; v++) {          /* an older file is upgraded one version at a time */
      if (typeof F.migrations[v] !== 'function') return { ok: false, reason: 'broken' };
      try { data = F.migrations[v](JSON.parse(JSON.stringify(data))); } catch (e) { return { ok: false, reason: 'broken' }; }
    }
    if (!shapeOk(data)) return { ok: false, reason: 'broken' };
    return { ok: true, data: data, saved: f.saved, upgraded: f.v < F.version };
  };

  /* give a file to the person: the phone's share sheet when there is one, else a normal download */
  BC.giveFile = function (name, text, mime) {
    var file;
    try { file = new File([text], name, { type: mime }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file] }).then(function () { return true; }, function (e) { return e && e.name === 'AbortError' ? false : download(); });
    }
    return Promise.resolve(download());
    function download() {
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: mime }));
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    }
  };

  /* ---------- the working copy in her browser, plus the last few earlier copies ---------- */
  BC.autosave = function () {
    if (BC.noWrite()) return false;
    var txt = BC.fileText(), cur = JSON.parse(txt).sum, hist = [];
    if (!set(K_DATA, txt)) {
      del(K_HIST);   /* the earlier copies come second: free their room for the working copy */
      if (!set(K_DATA, txt)) { BC.saveFailed = true; return false; }
    }
    BC.saveFailed = false; window.__bcLastWrite = txt;
    try { hist = JSON.parse(get(K_HIST) || '[]'); } catch (e) { hist = []; }
    var last = hist[hist.length - 1], now = Date.now();
    if (!last || last.sum !== cur) {
      var entry = { t: now, sum: cur, txt: txt };
      if (last && now - last.t < 60000) hist[hist.length - 1] = entry; else hist.push(entry);
      while (hist.length > 5) hist.shift();
      if (!set(K_HIST, JSON.stringify(hist))) { hist = hist.slice(-2); if (!set(K_HIST, JSON.stringify(hist))) del(K_HIST); }
    }
    return true;
  };
  BC.history = function () { try { return JSON.parse(get(K_HIST) || '[]'); } catch (e) { return []; } };
  /* returns { ok: true } and fills BC, or { ok: false, reason } */
  BC.restore = function () {
    var txt = get(K_DATA);
    if (!txt) return { ok: false, reason: 'none' };
    var r = BC.parseFile(txt);
    if (r.ok) BC.load(r.data);
    return r;
  };
  BC.wipeLocal = function () { if (BC.noWrite()) return; del(K_DATA); del(K_HIST); del(K_BAK_AT); del(K_BAK_SUM); };

  /* Another tab of this page changed the saved class. This tab must not write over it with older data, so it stops writing until it is reloaded. */
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === K_DATA && (!e.storageArea || e.storageArea === window.localStorage) && e.newValue !== (window.__bcLastWrite || null)) { BC.otherTab = true; if (BC.onOtherTab) BC.onOtherTab(); }
    });
  } catch (e) { /* no window */ }

  /* ---------- backup bookkeeping ---------- */
  function sumNow() { return sum(JSON.stringify(BC.dump())); }
  BC.markBackedUp = function (atMs) { if (BC.noWrite()) return; set(K_BAK_AT, String(atMs || Date.now())); set(K_BAK_SUM, sumNow()); };
  BC.backup = function () {
    var at = Number(get(K_BAK_AT)) || 0;
    return { at: at || null, dirty: !at || get(K_BAK_SUM) !== sumNow(), old: !!at && Date.now() - at > 7 * 864e5 };
  };

  /* ---------- ask the browser to keep the working copy ---------- */
  /* resolves true (kept), false (the browser may clear it, so the file matters) or null (cannot tell) */
  BC.persist = function () {
    try {
      if (!(navigator.storage && navigator.storage.persist)) return Promise.resolve(null);
      return navigator.storage.persisted().then(function (already) { return already ? true : navigator.storage.persist(); }).then(function (v) { BC.persisted = !!v; return !!v; }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  };

  /* ---------- a copy to send for support: same file, but no real names, QR or phone number ---------- */
  BC.supportText = function () {
    var d = JSON.parse(JSON.stringify(BC.dump()));
    d.students.forEach(function (s, i) { s.name = 'S' + (i + 1); });
    d.qr = ''; d.logo = ''; d.config.coach_zalo = ''; d.config.page_title = 'Support copy';
    return JSON.stringify({ app: APP, v: F.version, saved: new Date().toISOString(), sum: sum(JSON.stringify(d)), data: d });
  };

  /* ---------- names pasted from Zalo, a notebook or a sheet ---------- */
  BC.nameKey = function (n) { return n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase(); };
  BC.parseNames = function (text, existing) {
    var seen = {}, out = { names: [], dup: 0, long: 0, over: 0 };
    (existing || []).forEach(function (n) { seen[BC.nameKey(n)] = 1; });
    String(text || '').split(/[\n\r,;\t]+/).forEach(function (line) {
      var n = line.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim();
      if (!n) return;
      if (n.length > BC.LIMITS.nameLen) { n = n.slice(0, BC.LIMITS.nameLen).trim(); out.long++; }
      var k = BC.nameKey(n);
      if (seen[k]) { out.dup++; return; }
      if (out.names.length + (existing || []).length >= BC.LIMITS.students) { out.over++; return; }
      seen[k] = 1; out.names.push(n);
    });
    return out;
  };

  /* ---------- a report she can open in Google Sheets (one way: nothing is read back) ---------- */
  BC.reportCSV = function () {
    var now = BC.ym(BC.today), first = now, rows = [['month', 'name', 'code', 'plan', 'lessons billed', 'lessons skipped', 'make-ups', 'amount due', 'paid', 'paid on']];
    BC.students.forEach(function (s) { if (BC.ym(s.start) < first) first = BC.ym(s.start); });
    var from = first > BC.addMonths(now, -11) ? first : BC.addMonths(now, -11), ym;
    for (ym = from; ym <= now; ym = BC.addMonths(ym, 1)) {
      BC.students.forEach(function (s) {
        if (BC.ym(s.start) > ym) return;
        var rec = BC.payRec(s.id, ym), inM = function (c) { return BC.ym(c.date) === ym; };
        rows.push([ym, s.name, s.code, s.type === 'fixed' ? s.days.length + ' day(s) a week' : 'flexible', BC.billedDates(s, ym).length,
          BC.rows(s.id, 'skip', inM).length, BC.rows(s.id, 'makeup', inM).length + BC.rows(s.id, 'join', inM).length,
          rec.paid ? rec.amountPaid : BC.amountDue(s, ym), rec.paid ? 'yes' : 'no', rec.paidDate || '']);
      });
    }
    var q = function (x) { x = String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    return '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n');
  };

  /* ---------- the student card: one student's rows packed into a link ---------- */
  var CARD_CFG = ['advance_days', 'flex_notice_days', 'pay_by_day', 'first_bill_days', 'max_makeups_per_month', 'long_break_days', 'cancel_credit_months',
    'seats_per_court', 'venue_courts', 'page_title', 'coach_zalo', 'currency', 'credit_carry', 'proration', 'fee_1day', 'fee_2days', 'default_lang'];
  BC.cardOf = function (sid) {
    var s = BC.student(sid), cfg = {}, from = BC.addMonths(BC.ym(BC.today), -1) + '-01', pay = {}, ov = {}, vids = {};
    CARD_CFG.forEach(function (k) { cfg[k] = BC.config[k]; });
    Object.keys(BC.payments).forEach(function (k) {
      var p = k.split('|');
      if (Number(p[0]) === sid && p[1] >= BC.addMonths(BC.ym(BC.today), -6) && !EMPTY_PAY(BC.payments[k])) pay[k] = BC.payments[k];
    });
    Object.keys(BC.overrides).forEach(function (d) { if (BC.overrides[d].cancelled && d >= from) ov[d] = { cancelled: true, note: BC.overrides[d].note || '' }; });
    Object.keys(BC.videos).forEach(function (k) { if (/^https?:\/\//i.test(BC.videos[k].url || '')) vids[k] = BC.videos[k]; });   /* only web links go on a card */
    return {
      v: 1, asOf: BC.today, made: Date.now(), cfg: cfg, timetable: BC.timetable, ttHistory: (BC.ttHistory || []).filter(function (x) { return x.until > from; }), overrides: ov, videos: vids,
      student: { id: s.id, name: s.name, type: s.type, days: s.days, dayHist: s.dayHist || [], start: s.start, fee: s.fee, active: s.active, code: s.code },
      changes: BC.changes.filter(function (c) { return c.student === sid && c.date >= from; }),
      breaks: BC.breaksOf(sid).filter(function (b) { return b.to >= from; }),
      scores: (BC.scores[sid] || []).slice(-2), pay: pay
    };
  };
  /* turn a card back into a tiny one-student world the student page can draw */
  BC.hydrate = function (card) {
    BC.blank();
    BC.config = Object.assign({}, BC.config, card.cfg); BC.timetable = card.timetable; BC.ttHistory = card.ttHistory || []; BC.overrides = card.overrides;
    Object.keys(card.videos || {}).forEach(function (k) { BC.videos[k] = card.videos[k]; });
    BC.students = [Object.assign({}, card.student)]; BC.changes = card.changes; BC.breaks = card.breaks; BC.payments = card.pay;
    BC.scores = {}; if (card.scores && card.scores.length) BC.scores[card.student.id] = card.scores;
    BC.nextId = 1e6; BC.meta = { sample: false, setup: true, card: true, asOf: card.asOf, made: card.made || 0 };
    return card.student.id;
  };
  function validCard(c) {
    return !!(c && c.v === 1 && c.student && isNum(c.student.id) && typeof c.student.name === 'string' && Array.isArray(c.student.days) && histOk(c.student.dayHist) && Array.isArray(c.changes) &&
      Array.isArray(c.breaks) && c.cfg && c.timetable && c.overrides && c.pay && typeof c.asOf === 'string');
  }
  function b64u(buf) {
    var b = new Uint8Array(buf), s = '', i;
    for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
    var s = atob(str), b = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function pipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  }
  /* Raw DEFLATE decoder (RFC 1951), for phones whose browser cannot decompress by itself (older iPhones, some in-app browsers).
     Small, slow and strict: it throws on anything that is not valid, and refuses to grow past 2 MB. */
  var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
    LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
    DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
    DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
    CORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], MAXOUT = 2 * 1024 * 1024;
  BC.inflateRaw = function (src) {
    var pos = 0, cur = 0, have = 0, out = [], fixedL = null, fixedD = null;
    function bits(n) {
      var v = 0, i;
      for (i = 0; i < n; i++) {
        if (!have) { if (pos >= src.length) throw new Error('short'); cur = src[pos++]; have = 8; }
        v |= (cur & 1) << i; cur >>= 1; have--;
      }
      return v;
    }
    function huff(lengths, n) {
      var count = [], symbol = [], offs = [], i;
      for (i = 0; i <= 15; i++) count[i] = 0;
      for (i = 0; i < n; i++) count[lengths[i]]++;
      offs[1] = 0; for (i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
      for (i = 0; i < n; i++) if (lengths[i]) symbol[offs[lengths[i]]++] = i;
      return { count: count, symbol: symbol };
    }
    function decode(h) {
      var code = 0, first = 0, index = 0, len, c;
      for (len = 1; len <= 15; len++) {
        code |= bits(1); c = h.count[len];
        if (code - c < first) return h.symbol[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      throw new Error('bad code');
    }
    function codes(hl, hd) {
      for (;;) {
        var sym = decode(hl), len, dist, i;
        if (sym < 256) { out.push(sym); if (out.length > MAXOUT) throw new Error('big'); }
        else if (sym === 256) return;
        else {
          sym -= 257; if (sym >= 29) throw new Error('bad length');
          len = LBASE[sym] + bits(LEXT[sym]);
          sym = decode(hd); if (sym >= 30) throw new Error('bad distance');
          dist = DBASE[sym] + bits(DEXT[sym]);
          if (dist > out.length) throw new Error('too far');
          if (out.length + len > MAXOUT) throw new Error('big');
          for (i = 0; i < len; i++) out.push(out[out.length - dist]);
        }
      }
    }
    var last, type, i, n;
    do {
      last = bits(1); type = bits(2);
      if (type === 0) {
        have = 0; if (pos + 4 > src.length) throw new Error('short');
        n = src[pos] | (src[pos + 1] << 8);
        if (((src[pos + 2] | (src[pos + 3] << 8)) ^ 0xffff) !== n) throw new Error('bad stored');
        pos += 4; if (pos + n > src.length) throw new Error('short');
        for (i = 0; i < n; i++) out.push(src[pos + i]); pos += n;
        if (out.length > MAXOUT) throw new Error('big');
      } else if (type === 1) {
        if (!fixedL) {
          var l = [];
          for (i = 0; i < 144; i++) l[i] = 8; for (; i < 256; i++) l[i] = 9; for (; i < 280; i++) l[i] = 7; for (; i < 288; i++) l[i] = 8;
          fixedL = huff(l, 288);
          var d = []; for (i = 0; i < 30; i++) d[i] = 5; fixedD = huff(d, 30);
        }
        codes(fixedL, fixedD);
      } else if (type === 2) {
        var nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4, lengths = [], hl, hd;
        if (nlen > 286 || ndist > 30) throw new Error('bad counts');
        for (i = 0; i < 19; i++) lengths[CORDER[i]] = i < ncode ? bits(3) : 0;
        var hc = huff(lengths, 19); lengths = [];
        for (i = 0; i < nlen + ndist;) {
          var sym = decode(hc), rep, val = 0;
          if (sym < 16) { lengths[i++] = sym; continue; }
          if (sym === 16) { if (!i) throw new Error('bad repeat'); val = lengths[i - 1]; rep = 3 + bits(2); }
          else if (sym === 17) rep = 3 + bits(3); else rep = 11 + bits(7);
          if (i + rep > nlen + ndist) throw new Error('bad repeat');
          while (rep--) lengths[i++] = val;
        }
        hl = huff(lengths.slice(0, nlen), nlen); hd = huff(lengths.slice(nlen), ndist);
        codes(hl, hd);
      } else throw new Error('bad block');
    } while (!last);
    return new Uint8Array(out);
  };
  /* 'z' = compressed, 'p' = plain (older browsers) */
  BC.cardEncode = function (card) {
    var bytes = new TextEncoder().encode(JSON.stringify(card));
    if (typeof CompressionStream === 'function') {
      return pipe(bytes, new CompressionStream('deflate-raw')).then(function (b) { return 'z' + b64u(b); }, function () { return 'p' + b64u(bytes); });
    }
    return Promise.resolve('p' + b64u(bytes));
  };
  BC.cardDecode = function (str) {
    return new Promise(function (resolve) {
      try {
        var kind = str.charAt(0), bytes = unb64u(str.slice(1)), done = function (buf) {
          var c = null; try { c = JSON.parse(new TextDecoder().decode(buf)); } catch (e) { /* bad */ }
          resolve(validCard(c) ? c : null);
        };
        if (kind === 'z' && typeof DecompressionStream === 'function') pipe(bytes, new DecompressionStream('deflate-raw')).then(done, function () { resolve(null); });
        else if (kind === 'z') done(BC.inflateRaw(bytes));   /* this browser cannot decompress by itself */
        else if (kind === 'p') done(bytes);
        else resolve(null);
      } catch (e) { resolve(null); }
    });
  };
  /* Which card is newer. Cards carry the moment they were made, so two cards from one day still order. */
  BC.cardNewer = function (a, b) {
    var ma = a.made || 0, mb = b.made || 0;
    if (ma || mb) return ma > mb;
    return a.asOf > b.asOf;
  };
  /* A phone keeps one card. Opening an older link must never replace a newer card of the same student.
     Returns { show, keep, older } : the card to draw, whether to remember it, and the older card that was opened (if any). */
  BC.pickCard = function (stored, opened) {
    if (!stored || !opened) return { show: opened || stored, keep: !!opened, older: null };
    var same = stored.student.code === opened.student.code && stored.student.id === opened.student.id;
    if (same && !BC.cardNewer(opened, stored) && !(opened.made === stored.made && opened.asOf === stored.asOf)) return { show: stored, keep: false, older: opened };
    return { show: opened, keep: true, older: null };
  };

  /* What the coach has sent each student, and whether it still matches what the card would say now. */
  function cardBody(sid) { var c = BC.cardOf(sid); delete c.asOf; delete c.made; return sum(JSON.stringify(c)); }
  BC.markCardSent = function (sid) {
    BC.meta.cards = BC.meta.cards || {};
    BC.meta.cards[sid] = { at: Date.now(), asOf: BC.today, sum: cardBody(sid) };
  };
  /* 'never' | 'stale' | 'current' */
  BC.cardState = function (sid) {
    var m = BC.meta && BC.meta.cards && BC.meta.cards[sid];
    if (!m) return 'never';
    return m.sum === cardBody(sid) ? 'current' : 'stale';
  };
  BC.cardsToSend = function () {
    return BC.students.filter(function (s) { return s.active && BC.cardState(s.id) !== 'current'; });
  };
  BC.cardLink = function (sid, base) {
    return BC.cardEncode(BC.cardOf(sid)).then(function (code) { return (base || 'https://birdiecrew.github.io/') + '#c=' + code; });
  };
})();
