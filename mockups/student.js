/* Student card mockup. The card is a snapshot: the page draws it from the link the coach sent (store.js), with no server. Without a link it shows a made-up demo student. */
(function () {
  'use strict';
  var h = UI.h, icon = UI.icon, $ = UI.$, $$ = UI.$$;
  var cfg = BC.config;
  var S = { sid: BC.byName('Lan').id, lang: 'vi', month: BC.ym(BC.today), card: false, older: null };
  try { var sl = localStorage.getItem('bc_lang'); if (sl === 'en' || sl === 'vi') S.lang = sl; } catch (e) { /* ignore */ }
  BC.lang = S.lang;
  /* the student cannot see other people's bookings, so a day is simply "open" or not */
  function info(s, iso) { var i = BC.dayInfo(s, iso); if (i.kind === 'full') i.kind = 'free'; return i; }

  function t(k, v) {
    var d = STR[S.lang][k]; if (d == null) d = STR.en[k]; if (d == null) return k;
    return typeof d === 'string' && v ? d.replace(/\{(\w+)\}/g, function (m, x) { return v[x] != null ? v[x] : m; }) : d;
  }
  function me() { return BC.student(S.sid); }
  function money(n) { return BC.fmtVND(n, S.lang); }
  function noticeN(s) { return s.type === 'fixed' ? cfg.advance_days : cfg.flex_notice_days; }

  function ttSummary() {
    var order = [1, 2, 3, 4, 5, 6, 0], groups = [], cur = null;
    order.forEach(function (d) {
      var x = BC.timetable[d];
      if (!x || !x.on) { cur = null; return; }
      var key = x.start + '–' + x.end;
      if (cur && cur.key === key) cur.last = d; else { cur = { key: key, first: d, last: d }; groups.push(cur); }
    });
    return groups.map(function (g) {
      var a = BC.wd(g.first, S.lang), b = BC.wd(g.last, S.lang);
      return (g.first === g.last ? a : a + '–' + b) + ' ' + g.key;
    }).join(', ');
  }

  /* ---------- sections ---------- */
  function header() {
    var s = me();
    return '<header class="hdr"><div class="row between"><div class="row">' + UI.logo(36) + '<h1>' + h(cfg.page_title) + '</h1></div>' + UI.langBtn(S.lang) + '</div>' +
      '<div class="me"><b>' + h(s.name) + '</b> <span class="muted">· ' + BC.fmtDay(asOf(), S.lang) + madeTime() + '</span></div></header>';
  }
  function asOf() { return (BC.meta && BC.meta.asOf) || BC.today; }
  function madeTime(m) {
    m = m === undefined ? BC.meta && BC.meta.made : m; if (!m) return '';
    try { return ', ' + new Date(m).toLocaleTimeString(S.lang === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  function banners() {
    var s = me(), ymNow = BC.ym(BC.today), out = '';
    if (S.older) out += '<div class="banner warn" role="status">' + icon('info') + '<div>' + t('olderOpened', { now: BC.fmtDay(asOf(), S.lang) + madeTime() }) + '</div></div>';
    var age = BC.diff(asOf(), BC.today);
    if (age >= 7) out += '<div class="banner warn" role="status">' + icon('refresh') + '<div>' + t('stale') + '</div></div>';
    if (BC.isLate(s.id)) {
      out += '<div class="banner bad" role="alert">' + icon('lock') + '<div><b>' + t('lateTitle', { month: BC.monthOnly(ymNow, S.lang) }) + '</b><br><button class="btn danger sm" data-act="pay">' + t('payNow') + '</button></div></div>';
    } else if (!BC.payRec(s.id, ymNow).paid && ymNow >= BC.ym(s.start)) {
      out += '<div class="banner warn">' + icon('clock') + '<div>' + t('dueSoon', { month: BC.monthOnly(ymNow, S.lang), due: BC.fmtDay(BC.dueDate(s, ymNow), S.lang) }) + '</div></div>';
    }
    return out;
  }

  function cell(s, iso) {
    var i = info(s, iso), day = Number(iso.slice(8));
    if (i.kind === 'off') return '<div class="cd off"><span class="n">' + day + '</span><span class="m"></span></div>';
    var cls = ['cd', i.kind];
    if (i.past) cls.push('past');
    if (iso === BC.today) cls.push('today');
    var m = '';
    if (i.kind === 'makeup') m = '+'; else if (i.kind === 'join') m = '✓'; else if (i.kind === 'cancelled') m = t('off');
    return '<button class="' + cls.join(' ') + '" data-iso="' + iso + '" aria-label="' + h(BC.fmtLong(iso, S.lang)) + '"><span class="n">' + day + '</span><span class="m">' + m + '</span></button>';
  }

  function calendar() {
    var s = me(), ym = S.month, days = BC.monthDays(ym), lead = (BC.dow(days[0]) + 6) % 7, now = BC.ym(BC.today);
    var prevOk = ym > BC.addMonths(now, -1), nextOk = ym < BC.addMonths(now, 3);
    var wd = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<div class="cal-wd">' + BC.wd(d, S.lang) + '</div>'; }).join('');
    var blanks = ''; for (var b = 0; b < lead; b++) blanks += '<div class="cd blank"></div>';
    var cells = days.map(function (d) { return cell(s, d); }).join('');
    return '<section class="card">' +
      '<div class="cal-nav"><button class="btn icon sm" data-nav="-1" aria-label="‹"' + (prevOk ? '' : ' disabled') + '>' + icon('chevL') + '</button><strong>' + BC.monthName(ym, S.lang) + '</strong><button class="btn icon sm" data-nav="1" aria-label="›"' + (nextOk ? '' : ' disabled') + '>' + icon('chevR') + '</button></div>' +
      '<div class="cal-grid">' + wd + blanks + cells + '</div></section>';
  }

  function weakest(cur) {
    var w = BC.skills[0];
    BC.skills.forEach(function (k) { if (cur[k.id] < cur[w.id]) w = k; });
    return w;
  }

  function billInfo(s, ym) {
    var rec = BC.payRec(s.id, ym), full = BC.lessonDates(s, ym).length, billed = BC.billedDates(s, ym).length;
    return { rec: rec, full: full, billed: billed, amount: rec.paid ? rec.amountPaid : BC.amountDue(s, ym) };
  }

  /* One short row per topic. The details open only when tapped. */
  function row(act, title, summary) {
    return '<button class="menu-row" data-act="' + act + '"><span class="mt">' + title + '</span><span class="ms">' + summary + '</span>' + icon('chevR', 'sm') + '</button>';
  }
  function menu() {
    var s = me(), arr = BC.scores[S.sid], now = BC.ym(BC.today), b = billInfo(s, now), list = BC.breaksOf(s.id), out = '';
    if (arr && arr.length) out += row('skills', t('skills'), t('focus', { skill: weakest(arr[arr.length - 1].v)[S.lang] }));
    out += row('fees', t('fees'), money(b.amount) + ' · ' + (b.rec.paid ? t('paidOn', { date: BC.fmtDay(b.rec.paidDate, S.lang) }) : t('dueBy', { date: BC.fmtDay(BC.dueDate(s, now), S.lang) })));
    var next = list.slice().sort(function (a, c) { return a.from < c.from ? -1 : 1; })[0];
    if (next) out += row('breaks', t('breaks'), BC.fmtDay(next.from, S.lang) + ' – ' + BC.fmtDay(next.to, S.lang));
    out += row('rules', t('rules'), '');
    return '<nav class="menu-list">' + out + '</nav>';
  }

  /* ---------- render ---------- */
  var app = $('#app');
  function render() {
    BC.lang = S.lang; document.documentElement.lang = S.lang; document.title = cfg.page_title;
    var y = window.scrollY, s = me();
    app.innerHTML = header() + banners() + calendar() + menu() + '<div class="foot">' + t('footer') + ' · ' + h(s.code) + '</div>';
    window.scrollTo(0, y);
    syncPanel();
  }

  /* ---------- sheets ---------- */
  function sheetHead(title, sub) {
    return '<div class="sheet-h"><div><h2>' + title + '</h2>' + (sub ? '<div class="muted small">' + sub + '</div>' : '') + '</div><button class="btn icon sm ghost" data-close aria-label="Close">' + icon('x') + '</button></div>';
  }
  /* buttons inside any sheet: one place handles them all */
  function wire(el) {
    el.addEventListener('click', function (e) {
      var c = e.target.closest('[data-copy]'); if (c) { UI.copy(c.getAttribute('data-copy'), t('copied')); return; }
      var q = e.target.closest('[data-ask]'); if (q) { showAsk($('#ask-area', el), q.getAttribute('data-ask'), null); return; }
      var a = e.target.closest('[data-sheet]'); if (!a || a.disabled) return;
      var k = a.getAttribute('data-sheet');
      if (k === 'pay') paySheet(); else if (k === 'video') UI.toast(t('videoToast'));
    });
    return el;
  }

  function skillsSheet() {
    var arr = BC.scores[S.sid]; if (!arr || !arr.length) return;
    var last = arr[arr.length - 1], prev = arr.length > 1 ? arr[arr.length - 2] : null, w = weakest(last.v), v = BC.videos[w.id] && BC.videos[w.id].url ? BC.videos[w.id] : null;
    wire(UI.sheet.open(UI.pageHead(t('skills'), t('scoredOn', { date: BC.fmtDay(last.date, S.lang) })) + BC.radar(last.v, prev ? prev.v : null, S.lang) +
      '<h3 style="margin:16px 0 8px">' + t('nextFocus') + ': ' + w[S.lang] + '</h3>' +
      (v ? '<button class="thumb" data-sheet="video" aria-label="' + h(v.title || w[S.lang]) + '"><span class="play">' + icon('play') + '</span>' + (v.len ? '<span class="len">' + h(v.len) + '</span>' : '') + '</button>' +
        (v.title ? '<div style="margin-top:10px"><b>' + h(v.title) + '</b></div>' : '') : ''), { page: true }));
  }

  function feesSheet() {
    var s = me(), now = BC.ym(BC.today), startYm = BC.ym(s.start), late = BC.isLate(s.id), b = billInfo(s, now), due = BC.dueDate(s, now);
    var dots = [-3, -2, -1, 0, 1, 2].map(function (o) {
      var ym = BC.addMonths(now, o), rec = BC.payRec(s.id, ym), cls = 'dot', inner = '';
      if (ym < startYm) { cls += ' none'; inner = '–'; }
      else if (rec.paid) { cls += ' paid'; inner = icon('check'); }
      else if (ym > now) { cls += ' future'; }
      else if (ym === now && !late) { cls += ' due'; inner = '!'; }
      else { cls += ' late'; inner = '!'; }
      return '<div class="dot-c"><div class="' + cls + '">' + inner + '</div>' + BC.monthShort(ym, S.lang) + '</div>';
    }).join('');
    var status;
    if (b.rec.paid) status = '<span class="tag ok">' + icon('check', 'sm') + ' ' + t('paidOn', { date: BC.fmtDay(b.rec.paidDate, S.lang) }) + '</span>';
    else if (late) status = '<span class="tag bad">' + t('lateSince', { date: BC.fmtDay(BC.addDays(due, 1), S.lang) }) + '</span>';
    else status = '<span class="tag warn">' + t('dueBy', { date: BC.fmtDay(due, S.lang) }) + '</span>';
    var lines = '';
    if (b.billed < b.full) lines += '<div class="muted small">' + t('prorated', { a: b.billed, b: b.full }) + '</div>';
    if (b.rec.creditIn > 0 && cfg.credit_carry) lines += '<div class="muted small">' + t('creditLine', { amount: money(b.rec.creditIn) }) + '</div>';
    wire(UI.sheet.open(UI.pageHead(t('fees')) +
      '<div class="bill"><div class="row between wrap"><div><div class="muted small">' + BC.monthName(now, S.lang) + '</div><div class="amt">' + money(b.amount) + '</div></div>' + status + '</div>' + lines +
      (b.rec.paid ? '' : '<button class="btn primary block" style="margin-top:12px" data-sheet="pay">' + t('payNow') + '</button>') + '</div>' +
      '<div class="dots" style="margin:16px 0 0">' + dots + '</div>', { page: true }));
  }

  function breaksSheet() {
    var s = me(), list = BC.breaksOf(s.id).sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    var items = list.map(function (b) {
      return '<div class="brk"><b>' + BC.fmtDay(b.from, S.lang) + ' – ' + BC.fmtDay(b.to, S.lang) + '</b><div class="muted small">' + t('nDays', { n: BC.breakLen(b) }) + ' · ' + (BC.isLong(b) ? t('longBreak') : t('shortBreak')) + '</div></div>';
    }).join('<div style="height:8px"></div>');
    wire(UI.sheet.open(UI.pageHead(t('breaks')) + items, { page: true }));
  }

  function msgFor(kind, iso) {
    var s = me();
    return t('msg_' + kind, { name: s.name, code: s.code, date: iso ? BC.fmtLong(iso, S.lang) : '' });
  }
  /* copy the message and go to Zalo. The coach decides and updates the calendar herself. */
  function showAsk(area, kind, iso) {
    var msg = msgFor(kind, iso);
    UI.copy(msg, t('copiedAsk'));
    if (cfg.coach_zalo) {
      try { window.open('https://zalo.me/' + encodeURIComponent(cfg.coach_zalo), '_blank', 'noopener'); } catch (e) { /* ignore */ }
      area.innerHTML = '<div class="banner ok">' + icon('check') + '<div>' + t('copiedAsk') + '</div></div>';
    } else {
      area.innerHTML = '<div class="msgbox">' + h(msg) + '</div><p class="muted small" style="margin-top:8px">' + t('zaloMock') + '</p>';
    }
  }
  function askButton(kind) { return '<button class="btn primary block" data-ask="' + kind + '">' + icon('chat', 'sm') + ' ' + t('ask_' + kind) + '</button>'; }

  function dayHtml(i) {
    var s = me(), ses = i.ses, iso = i.iso, ym = BC.ym(iso), body = '';
    var d = BC.dayAsk(s, iso), ask = d.ask;
    var head = sheetHead(BC.fmtLong(iso, S.lang), ses.start ? ses.start + '–' + ses.end : t('statusNone'));
    var status = function (txt, cls) { return '<div class="banner ' + (cls || '') + '">' + txt + '</div>'; };
    var why = function (txt) { return '<p class="muted small" style="margin-top:8px">' + txt + '</p>'; };
    switch (d.kind) {
      case 'mine': body = status(t('statusMine'), 'ok'); break;
      case 'skipped':
        body = status(t('statusSkipped')) + why(i.row.credit ? t('skippedCredit', { month: BC.monthOnly(ym, S.lang) }) : t('skippedNoCredit', { n: cfg.max_makeups_per_month })); break;
      case 'makeup': body = status(i.row.source === 'cancel' ? t('statusMakeupFree') : t('statusMakeup'), 'ok'); break;
      case 'join': body = status(t('statusJoin'), 'ok'); break;
      case 'free':
        body = status(t('statusFree'));
        /* a rule is shown only when it is about to be broken */
        if (d.note === 'noCredit') body += why(t('noCreditNote'));
        else if (d.note === 'capReached') body += why(t('r_capReached', { n: cfg.max_makeups_per_month }));
        break;
      case 'cancelled': {
        var got = BC.rows(s.id, 'cancel_credit', function (c) { return c.date === iso; }).length;
        body = status(t('statusCancelled'), 'bad') + (ses.ov.note ? why(h(ses.ov.note)) : '') + (got ? status(icon('check') + ' ' + t('gotFree'), 'ok') : '');
        break;
      }
      case 'break': body = status(t('statusBreak')); break;
      default: body = status(t('statusNone'));
    }
    if (i.past && d.kind === 'free') body = status(t('statusPast'));
    var acts = '';
    if (ask) acts = (i.locked ? why(t('noticeNote', { n: i.notice })) : '') + '<div id="ask-area" style="margin-top:12px">' + askButton(ask) + '</div>';
    return head + body + acts;
  }

  function openDay(iso) {
    var s = me(), i = info(s, iso);
    var el = UI.sheet.open(dayHtml(i));
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ask]'); if (b) { showAsk($('#ask-area', el), b.getAttribute('data-ask'), iso); return; }
    });
  }

  function paySheet() {
    var s = me(), ym = BC.ym(BC.today), b = billInfo(s, ym);
    var html = UI.pageHead(t('payTitle', { month: BC.monthOnly(ym, S.lang) })) +
      '<div class="banner" style="margin-bottom:12px">' + icon('wallet') + '<div>' + t('scanQR') + '</div></div>' +
      '<div class="kv"><span class="muted">' + t('amount') + '</span><span class="row"><span class="v">' + money(b.amount) + '</span><button class="btn sm icon" data-copy="' + b.amount + '" aria-label="' + t('copy') + '">' + icon('copy', 'sm') + '</button></span></div>' +
      '<div class="kv"><span class="muted">' + t('note') + '</span><span class="row"><span class="code">' + h(s.code) + '</span><button class="btn sm icon" data-copy="' + h(s.code) + '" aria-label="' + t('copy') + '">' + icon('copy', 'sm') + '</button></span></div>';
    var el = UI.sheet.open(html, { page: true });
    el.addEventListener('click', function (e) { var c = e.target.closest('[data-copy]'); if (c) UI.copy(c.getAttribute('data-copy'), t('copied')); });
  }

  function rulesList() {
    var items = [
      t('rule1', { pay: cfg.pay_by_day }), t('rule2', { tt: ttSummary() }), t('rule3', { n: cfg.flex_notice_days }),
      t('rule4', { n: cfg.advance_days, long: cfg.long_break_days }), t('rule5', { n: cfg.advance_days, max: cfg.max_makeups_per_month }), t('rule6', { n: cfg.advance_days })
    ];
    var titles = t('ruleTitles');
    return '<div class="rules"><ol>' + items.map(function (x, k) { return '<li><div><b>' + titles[k] + '</b>' + x + '</div></li>'; }).join('') + '</ol></div>';
  }
  function rulesSheet() { wire(UI.sheet.open(UI.pageHead(t('rules')) + rulesList() + '<div id="ask-area" style="margin-top:16px">' + askButton('break') + '</div>', { page: true })); }

  /* ---------- events ---------- */
  function setLang(l) { S.lang = l; BC.lang = l; try { localStorage.setItem('bc_lang', l); } catch (e) { /* ignore */ } render(); }

  app.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-lang-to]'))) { setLang(el.getAttribute('data-lang-to')); return; }
    if ((el = e.target.closest('[data-nav]'))) { S.month = BC.addMonths(S.month, Number(el.getAttribute('data-nav'))); render(); return; }
    if ((el = e.target.closest('[data-iso]'))) { openDay(el.getAttribute('data-iso')); return; }
    if ((el = e.target.closest('[data-act]'))) {
      var a = el.getAttribute('data-act');
      if (a === 'pay') paySheet(); else if (a === 'rules') rulesSheet(); else if (a === 'skills') skillsSheet(); else if (a === 'fees') feesSheet(); else if (a === 'breaks') breaksSheet();
    }
  });

  /* ---------- mockup-only controls ---------- */
  var panel = UI.mockPanel(
    '<h3>Mock controls</h3><div class="note">Only in the mockup. They jump between the situations a real student can be in.</div>' +
    (S.card ? '<label>Whose card</label><div class="note">The card from the link you opened. On the coach page: Students, open one, Send card.</div>' :
      '<label>Who is looking</label><select id="m-who"><option value="Lan">Lan: fixed Tue/Thu, has scores</option><option value="Tuấn">Tuấn: flexible schedule</option><option value="Hà">Hà: new student, starts 17 Nov, no scores</option></select>') +
    '<label>Pretend today is</label><div class="seg full" id="m-today"><button data-v="2026-11-03">3 Nov</button><button data-v="2026-11-05">5 Nov</button><button data-v="2026-11-06">6 Nov</button><button data-v="2026-11-12">12 Nov</button></div>' +
    '<label>This month\'s fee</label><div class="seg full" id="m-paid"><button data-v="1">Paid</button><button data-v="0">Unpaid</button></div>' +
    (S.card ? '<label>Card</label><button class="mb" id="m-demo">Forget this card and show the demo student</button>' : '<label>Data</label><button class="mb" id="m-reset">Reset all fake data</button>')
  );
  function syncPanel() {
    var s = me(), ym = BC.ym(BC.today), who = $('#m-who', panel);
    if (who) who.value = s.name;
    $$('#m-today button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === BC.today)); });
    $$('#m-paid button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-v') === '1') === BC.payRec(s.id, ym).paid)); });
  }
  panel.addEventListener('change', function (e) {
    if (e.target.id === 'm-who') { S.sid = BC.byName(e.target.value).id; render(); }
  });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var grp = b.parentElement && b.parentElement.id, v = b.getAttribute('data-v');
    if (grp === 'm-today') { BC.today = v; S.month = BC.ym(v); render(); }
    else if (grp === 'm-paid') { BC.setPaid(S.sid, BC.ym(BC.today), v === '1'); render(); }
    else if (b.id === 'm-demo') { try { localStorage.setItem('bc_card', ''); } catch (er) { /* ignore */ } location.hash = ''; location.reload(); }
    else if (b.id === 'm-reset') { var who = me().name; BC.seed(); cfg = BC.config; S.sid = BC.byName(who).id; S.month = BC.ym(BC.today); render(); UI.toast('Reset'); }
  });

  /* open a card link. A phone keeps one card, and an older link never replaces a newer card of the same student. */
  function bootCard(code, remember) {
    var storedCode = ''; try { storedCode = localStorage.getItem('bc_card') || ''; } catch (e) { /* ignore */ }
    var decode = function (c) { return c && c !== code ? BC.cardDecode(c) : Promise.resolve(null); };
    return Promise.all([BC.cardDecode(code), decode(storedCode)]).then(function (r) {
      var opened = r[0], stored = r[1];
      if (!opened) return false;
      var pick = remember ? BC.pickCard(stored, opened) : { show: opened, keep: false, older: null };
      S.older = pick.older;
      S.sid = BC.hydrate(pick.show); S.card = true; S.month = BC.ym(BC.today);
      var lang = null; try { lang = localStorage.getItem('bc_lang'); } catch (e) { /* ignore */ }
      if (lang !== 'en' && lang !== 'vi') { S.lang = pick.show.cfg.default_lang === 'en' ? 'en' : 'vi'; BC.lang = S.lang; }
      cfg = BC.config;
      if (remember && pick.keep) { try { localStorage.setItem('bc_card', code); } catch (e) { /* ignore */ } }
      return true;
    });
  }
  function badLink() {
    app.innerHTML = '<div style="padding:60px 0 0;text-align:center"><div style="margin:0 auto 12px;width:52px">' + UI.logo(52) + '</div><h1 style="font-size:1.2rem">' + t('badTitle') + '</h1><p class="muted" style="margin-top:8px">' + t('badBody') + '</p></div>';
  }
  function start() { render(); }
  var m = /^#c=(.+)$/.exec(location.hash), saved = null;
  try { saved = localStorage.getItem('bc_card'); } catch (e) { /* ignore */ }
  if (m) bootCard(m[1], true).then(function (ok) { if (ok) start(); else badLink(); });
  else if (saved) bootCard(saved, false).then(function () { start(); });
  else start();
})();
