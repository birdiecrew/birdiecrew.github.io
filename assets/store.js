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
    BC.config = Object.assign({}, BC.config, c.config);
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
  function shapeOk(d) {
    if (!d || typeof d !== 'object') return false;
    var ok = d.config && typeof d.config === 'object' && d.timetable && d.overrides && d.videos && d.messages && d.payments && d.scores &&
      Array.isArray(d.students) && Array.isArray(d.changes) && Array.isArray(d.breaks) && isNum(d.nextId);
    if (!ok || d.students.length > 200) return false;
    return d.students.every(function (s) {
      return s && isNum(s.id) && typeof s.name === 'string' && (s.type === 'fixed' || s.type === 'flexible') && Array.isArray(s.days) &&
        s.days.every(function (x) { return x >= 0 && x <= 6; }) && typeof s.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.start);
    });
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
    var txt = BC.fileText(), cur = JSON.parse(txt).sum, hist = [];
    if (!set(K_DATA, txt)) return false;
    try { hist = JSON.parse(get(K_HIST) || '[]'); } catch (e) { hist = []; }
    var last = hist[hist.length - 1], now = Date.now();
    if (!last || last.sum !== cur) {
      var entry = { t: now, sum: cur, txt: txt };
      if (last && now - last.t < 60000) hist[hist.length - 1] = entry; else hist.push(entry);
      while (hist.length > 5) hist.shift();
      if (!set(K_HIST, JSON.stringify(hist))) { hist = hist.slice(-2); set(K_HIST, JSON.stringify(hist)); }
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
  BC.wipeLocal = function () { del(K_DATA); del(K_HIST); del(K_BAK_AT); del(K_BAK_SUM); };

  /* ---------- backup bookkeeping ---------- */
  function sumNow() { return sum(JSON.stringify(BC.dump())); }
  BC.markBackedUp = function (atMs) { set(K_BAK_AT, String(atMs || Date.now())); set(K_BAK_SUM, sumNow()); };
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
      student: { id: s.id, name: s.name, type: s.type, days: s.days, start: s.start, fee: s.fee, active: s.active, code: s.code },
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
    return !!(c && c.v === 1 && c.student && isNum(c.student.id) && typeof c.student.name === 'string' && Array.isArray(c.student.days) && Array.isArray(c.changes) &&
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
    return BC.cardEncode(BC.cardOf(sid)).then(function (code) { return (base || 'https://birdiecrew.github.io/s.html') + '#c=' + code; });
  };
})();
