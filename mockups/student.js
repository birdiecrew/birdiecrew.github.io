/* Student card mockup. Everything here is fake data in memory; the rules come from mock-core.js. */
(function () {
  'use strict';
  var h = UI.h, icon = UI.icon, $ = UI.$, $$ = UI.$$;
  var cfg = BC.config;
  var S = { sid: BC.byName('Lan').id, lang: 'vi', month: BC.ym(BC.today), down: false, moveFrom: null };
  try { var sl = localStorage.getItem('bc_lang'); if (sl === 'en' || sl === 'vi') S.lang = sl; } catch (e) { /* ignore */ }
  BC.lang = S.lang;

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

  /* what is on a given day for this student */
  function info(s, iso) {
    var ses = BC.session(iso);
    var i = { iso: iso, ses: ses, past: iso < BC.today, locked: BC.diff(BC.today, iso) < noticeN(s), kind: 'off' };
    if (!ses.isClass) return i;
    if (ses.cancelled) { i.kind = 'cancelled'; return i; }
    if (s.type === 'fixed') {
      var mk = BC.rows(s.id, 'makeup', function (c) { return c.date === iso; })[0];
      if (mk) { i.kind = 'makeup'; i.row = mk; return i; }
      if (BC.isRegular(s, iso)) {
        if (BC.inLongBreak(s.id, iso)) i.kind = 'break';
        else { var sk = BC.skipRow(s.id, iso); if (sk) { i.kind = 'skipped'; i.row = sk; } else i.kind = 'mine'; }
        return i;
      }
    } else {
      var jn = BC.rows(s.id, 'join', function (c) { return c.date === iso; })[0];
      if (jn) { i.kind = 'join'; i.row = jn; return i; }
    }
    if (BC.inAnyBreak(s.id, iso)) { i.kind = 'break'; return i; }
    i.kind = ses.free > 0 ? 'free' : 'full';
    return i;
  }

  function reasonText(r) {
    var n = r === 'capReached' ? cfg.max_makeups_per_month : (r === 'notice' ? noticeN(me()) : cfg.advance_days);
    var key = 'r_' + r;
    return t(STR[S.lang][key] != null || STR.en[key] != null ? key : 'r_generic', { n: n });
  }

  /* ---------- sections ---------- */
  function header() {
    var s = me();
    return '<header class="hdr"><div class="row between"><div class="row"><div class="logo" aria-hidden="true">VM</div><div><h1>' + h(cfg.page_title) + '</h1><div class="hi">' + t('hi', { name: h(s.name) }) + '</div></div></div>' +
      '<div class="row" style="gap:8px">' + UI.themeBtn() + '<div class="seg" role="group" aria-label="Language"><button data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">VI</button><button data-lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div></div></div></header>';
  }

  function banners() {
    var s = me(), ymNow = BC.ym(BC.today), out = '';
    if (S.down) out += '<div class="banner warn" role="status">' + icon('refresh') + '<div>' + t('down', { when: BC.fmtDay('2026-11-05', S.lang) + ', 20:41' }) + '</div></div>';
    if (BC.isLate(s.id)) {
      out += '<div class="banner bad" role="alert">' + icon('lock') + '<div><b>' + t('lateTitle', { month: BC.monthOnly(ymNow, S.lang) }) + '</b><br>' + t('lateBody') + '<br><button class="btn danger sm" data-act="pay" style="background:#fff3">' + t('payNow') + '</button></div></div>';
    } else if (!BC.payRec(s.id, ymNow).paid && ymNow >= BC.ym(s.start)) {
      out += '<div class="banner warn">' + icon('clock') + '<div>' + t('dueSoon', { month: BC.monthOnly(ymNow, S.lang), due: BC.fmtDay(BC.dueDate(s, ymNow), S.lang) }) + '</div></div>';
    }
    return out;
  }

  function cell(s, iso) {
    var i = info(s, iso), day = Number(iso.slice(8));
    if (i.kind === 'off') return '<div class="cd off"><span class="n">' + day + '</span><span class="m"></span></div>';
    var cls = ['cd', i.kind];
    if (i.locked || i.past) cls.push('locked');
    if (i.past) cls.push('past');
    if (iso === BC.today) cls.push('today');
    if (S.moveFrom && i.kind === 'free' && !i.locked) cls.push('target');
    var m = '';
    if (i.kind === 'free') m = i.ses.free; else if (i.kind === 'full') m = t('full');
    else if (i.kind === 'makeup') m = '+'; else if (i.kind === 'join') m = '✓'; else if (i.kind === 'cancelled') m = t('off');
    return '<button class="' + cls.join(' ') + '" data-iso="' + iso + '" aria-label="' + h(BC.fmtLong(iso, S.lang)) + '"><span class="n">' + day + '</span><span class="m">' + m + '</span></button>';
  }

  function calendar() {
    var s = me(), ym = S.month, days = BC.monthDays(ym), lead = (BC.dow(days[0]) + 6) % 7, now = BC.ym(BC.today);
    var prevOk = ym > BC.addMonths(now, -1), nextOk = ym < BC.addMonths(now, 3);
    var wd = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<div class="cal-wd">' + BC.wd(d, S.lang) + '</div>'; }).join('');
    var blanks = ''; for (var b = 0; b < lead; b++) blanks += '<div class="cd blank"></div>';
    var cells = days.map(function (d) { return cell(s, d); }).join('');
    var top = '';
    if (s.type === 'fixed') {
      var cs = BC.creditSummary(s.id, ym);
      top = '<div class="kpis"><div class="kpi"><div class="v">' + cs.left + ' <small>' + t('ofN', { n: cfg.max_makeups_per_month }) + '</small></div><div class="l">' + t('makeupsLeft') + '</div></div>' +
        '<div class="kpi"><div class="v">' + cs.skipCredits + '</div><div class="l">' + t('creditsToUse') + '</div></div>' +
        (cs.free ? '<div class="kpi free"><div class="v">' + cs.free + '</div><div class="l">' + t('freeCredit') + ', ' + t('until', { month: BC.monthOnly(cs.freeUntil, S.lang) }) + '</div></div>' : '') + '</div>';
    } else {
      top = '<div class="banner" style="margin-bottom:12px">' + icon('info') + '<div>' + t('flexHint', { n: cfg.flex_notice_days }) + '</div></div>';
    }
    var move = S.moveFrom ? '<div class="banner" style="margin-bottom:12px">' + icon('calendar') + '<div>' + t('moveHint', { date: BC.fmtDate(S.moveFrom, S.lang) }) + '<br><button class="btn sm" data-act="movecancel">' + t('cancel') + '</button></div></div>' : '';
    var lg = (s.type === 'fixed' ? ['mine', 'skipped', 'makeup'] : ['join']).concat(['free', 'full', 'cancelled', 'break', 'locked']);
    var lgNames = { mine: t('lgMine'), join: t('lgJoin'), skipped: t('lgSkipped'), makeup: t('lgMakeup'), free: t('lgFree'), full: t('lgFull'), cancelled: t('lgCancelled'), 'break': t('lgBreak'), locked: t('lgLocked', { n: noticeN(s) }) };
    return '<section class="card" aria-labelledby="h-cal"><div class="card-h"><h2 id="h-cal"><span class="num">1</span>' + t('calendar') + '</h2></div>' + top + move +
      '<div class="cal-nav"><button class="btn icon sm" data-nav="-1" aria-label="Previous month"' + (prevOk ? '' : ' disabled') + '>' + icon('chevL') + '</button><strong>' + BC.monthName(ym, S.lang) + '</strong><button class="btn icon sm" data-nav="1" aria-label="Next month"' + (nextOk ? '' : ' disabled') + '>' + icon('chevR') + '</button></div>' +
      '<div class="cal-grid' + (BC.isLate(s.id) || S.down ? ' frozen' : '') + '">' + wd + blanks + cells + '</div>' +
      '<div class="legend">' + lg.map(function (k) { return '<span><i class="sw ' + k + '"></i>' + lgNames[k] + '</span>'; }).join('') + '</div></section>';
  }

  function weakest(cur) {
    var w = BC.skills[0];
    BC.skills.forEach(function (k) { if (cur[k.id] < cur[w.id]) w = k; });
    return w;
  }

  function polygon() {
    var arr = BC.scores[S.sid];
    if (!arr || !arr.length) return '';
    var last = arr[arr.length - 1], prev = arr.length > 1 ? arr[arr.length - 2] : null;
    var rows = BC.skills.map(function (k) {
      var d = prev ? last.v[k.id] - prev.v[k.id] : 0;
      return '<div><span>' + k[S.lang] + '</span><span><b>' + last.v[k.id] + '</b> ' + (d > 0 ? '<span class="up">+' + d + '</span>' : d < 0 ? '<span class="dn">' + d + '</span>' : '') + '</span></div>';
    }).join('');
    return '<section class="card" aria-labelledby="h-skill"><div class="card-h"><h2 id="h-skill"><span class="num">2</span>' + t('skills') + '</h2></div>' +
      BC.radar(last.v, prev ? prev.v : null, S.lang) +
      '<p class="muted small center" style="margin-top:6px">' + t('scoredOn', { date: BC.fmtDay(last.date, S.lang) }) + ' ' + (prev ? t('prevOn', { date: BC.fmtDay(prev.date, S.lang) }) : t('firstScore')) + '</p>' +
      '<div class="skills">' + rows + '</div></section>';
  }

  function video() {
    var arr = BC.scores[S.sid];
    if (!arr || !arr.length) return '';
    var w = weakest(arr[arr.length - 1].v), v = BC.videos[w.id];
    return '<section class="card" aria-labelledby="h-vid"><div class="card-h"><h2 id="h-vid"><span class="num">3</span>' + t('nextFocus') + '</h2><span class="tag accent">' + t('weakest', { skill: w[S.lang] }) + '</span></div>' +
      '<button class="thumb" data-act="video" aria-label="' + h(v.title) + '"><span class="play">' + icon('play') + '</span><span class="len">' + v.len + '</span></button>' +
      '<div class="row between" style="margin-top:10px"><div><b>' + h(v.title) + '</b><div class="muted small">YouTube</div></div></div></section>';
  }

  function billInfo(s, ym) {
    var rec = BC.payRec(s.id, ym), full = BC.lessonDates(s, ym).length, billed = BC.billedDates(s, ym).length;
    return { rec: rec, full: full, billed: billed, amount: rec.paid ? rec.amountPaid : BC.amountDue(s, ym) };
  }

  function bills() {
    var s = me(), now = BC.ym(BC.today), startYm = BC.ym(s.start), late = BC.isLate(s.id);
    var dots = [-3, -2, -1, 0, 1, 2].map(function (o) {
      var ym = BC.addMonths(now, o), rec = BC.payRec(s.id, ym), cls = 'dot', inner = '';
      if (ym < startYm) { cls += ' none'; inner = '–'; }
      else if (rec.paid) { cls += ' paid'; inner = icon('check'); }
      else if (ym > now) { cls += ' future'; }
      else if (ym === now && !late) { cls += ' due'; inner = '!'; }
      else { cls += ' late'; inner = '!'; }
      return '<div class="dot-c"><div class="' + cls + '">' + inner + '</div>' + BC.monthShort(ym, S.lang) + '</div>';
    }).join('');
    var b = billInfo(s, now), due = BC.dueDate(s, now), status;
    if (b.rec.paid) status = '<span class="tag ok">' + icon('check', 'sm') + ' ' + t('paidOn', { date: BC.fmtDay(b.rec.paidDate, S.lang) }) + '</span>';
    else if (late) status = '<span class="tag bad">' + t('lateSince', { date: BC.fmtDay(BC.addDays(due, 1), S.lang) }) + '</span>';
    else status = '<span class="tag warn">' + t('dueBy', { date: BC.fmtDay(due, S.lang) }) + '</span>';
    var lines = '';
    if (b.billed < b.full) lines += '<div class="muted small">' + t('prorated', { a: b.billed, b: b.full }) + '</div>';
    if (b.rec.creditIn > 0 && cfg.credit_carry) lines += '<div class="muted small">' + t('creditLine', { amount: money(b.rec.creditIn) }) + '</div>';
    return '<section class="card" aria-labelledby="h-fee"><div class="card-h"><h2 id="h-fee"><span class="num">4</span>' + t('fees') + '</h2></div>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="bill"><div class="row between wrap"><div><div class="muted small">' + BC.monthName(now, S.lang) + '</div><div class="amt">' + money(b.amount) + '</div></div>' + status + '</div>' + lines +
      '<button class="btn block ' + (b.rec.paid ? '' : 'primary') + '" style="margin-top:12px" data-act="pay">' + (b.rec.paid ? t('payDetails') : t('payNow')) + '</button>' +
      (b.rec.paid ? '<div class="muted small center" style="margin-top:8px">' + t('nextBill') + '</div>' : '') + '</div></section>';
  }

  function breaksCard() {
    var s = me(), list = BC.breaksOf(s.id).sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    var items = list.length ? list.map(function (b) {
      var long = BC.isLong(b), canRm = BC.diff(BC.today, b.from) >= cfg.advance_days && !S.down;
      return '<div class="brk row between"><div><b>' + BC.fmtDay(b.from, S.lang) + ' – ' + BC.fmtDay(b.to, S.lang) + '</b><div class="muted small">' + t('nDays', { n: BC.breakLen(b) }) + '</div></div>' +
        '<div class="row"><span class="tag ' + (long ? 'info' : '') + '">' + (long ? t('longBreak') : t('shortBreak')) + '</span>' +
        '<button class="btn sm icon" data-rmbreak="' + b.id + '" aria-label="' + t('remove') + '"' + (canRm ? '' : ' disabled') + '>' + icon('trash', 'sm') + '</button></div></div>';
    }).join('<div style="height:8px"></div>') : '<p class="muted">' + t('noBreaks') + '</p>';
    return '<section class="card" aria-labelledby="h-brk"><div class="card-h"><h2 id="h-brk"><span class="num">5</span>' + t('breaks') + '</h2></div>' +
      '<p class="muted small" style="margin-bottom:10px">' + t('longNote') + '</p><h3 style="margin-bottom:8px">' + t('planned') + '</h3>' + items +
      '<button class="btn block" style="margin-top:12px" data-act="breakform"' + (S.down || BC.isLate(s.id) ? ' disabled' : '') + '>' + icon('plus', 'sm') + ' ' + t('breaks') + '</button></section>';
  }

  function rulesCard() {
    return '<section class="card"><button class="btn block" data-act="rules"><span class="num" style="display:none"></span>' + icon('list', 'sm') + ' ' + t('seeRules') + '</button></section>';
  }

  /* ---------- render ---------- */
  var app = $('#app');
  function render() {
    BC.lang = S.lang; document.documentElement.lang = S.lang; document.title = cfg.page_title;
    var y = window.scrollY, s = me();
    app.innerHTML = header() + banners() + calendar() + (s.type ? polygon() : '') + video() + bills() + breaksCard() + rulesCard() + '<div class="foot">' + t('footer') + ' · ' + h(s.code) + '</div>';
    window.scrollTo(0, y);
    syncPanel();
  }

  /* ---------- sheets ---------- */
  function sheetHead(title, sub) {
    return '<div class="sheet-h"><div><h2>' + title + '</h2>' + (sub ? '<div class="muted small">' + sub + '</div>' : '') + '</div><button class="btn icon sm ghost" data-close aria-label="Close">' + icon('x') + '</button></div>';
  }
  function btnState(i, s) {
    var late = BC.isLate(s.id);
    if (S.down) return { off: true, why: t('down', { when: '20:41' }) };
    if (late) return { off: true, why: t('r_late') };
    if (i.locked) return { off: true, why: t('r_notice', { n: noticeN(s) }) };
    return { off: false };
  }

  function dayHtml(i) {
    var s = me(), ses = i.ses, iso = i.iso, ym = BC.ym(iso), body = '', acts = '', st = btnState(i, s);
    var head = sheetHead(BC.fmtLong(iso, S.lang), ses.start ? ses.start + '–' + ses.end : t('statusNone'));
    var status = function (txt, cls) { return '<div class="banner ' + (cls || '') + '">' + txt + '</div>'; };
    var seats = ses.isClass && !ses.cancelled ? '<p class="muted small" style="margin-top:10px">' + icon('seat', 'sm') + ' ' + t('seatsFree', { free: ses.free, total: ses.seats }) + '</p>' : '';
    var disabled = function (label, act, off) { return '<button class="btn block ' + (off ? '' : 'primary') + '" data-act="' + act + '"' + (off ? ' disabled' : '') + '>' + label + '</button>'; };
    var why = function (txt) { return '<p class="muted small" style="margin-top:8px">' + txt + '</p>'; };

    switch (i.kind) {
      case 'mine': {
        body = status(t('statusMine'), 'ok'); seats = '';
        if (i.past) { body += why(t('pastNote')); break; }
        var earned = BC.rows(s.id, 'skip', function (c) { return c.credit && BC.ym(c.date) === ym; }).length;
        var gain = earned < cfg.max_makeups_per_month;
        acts = disabled(t('btnSkip'), 'skip', st.off) + (st.off ? why((i.locked ? t('lockedNote', { n: noticeN(s) }) : st.why)) : why(gain ? t('skipGain', { month: BC.monthOnly(ym, S.lang) }) : t('skipNoGain', { n: cfg.max_makeups_per_month })));
        break;
      }
      case 'skipped':
        body = status(t('statusSkipped')) + why(i.row.credit ? t('skippedCredit', { month: BC.monthOnly(ym, S.lang) }) : t('skippedNoCredit', { n: cfg.max_makeups_per_month }));
        break;
      case 'makeup': {
        var free = i.row.source === 'cancel';
        body = status(free ? t('statusMakeupFree') : t('statusMakeup'), 'ok');
        if (i.past) { body += why(t('pastNote')); break; }
        var left = BC.changesLeft(s.id);
        acts = '<div class="stack-s">' + disabled(t('btnMove'), 'move', st.off).replace('primary', '') + disabled(t('btnCancelMk'), 'cancelmk', st.off).replace('primary', '') + '</div>' +
          (st.off ? why(i.locked ? t('lockedNote', { n: noticeN(s) }) : st.why) : '') +
          why(t('changesLeft', { n: left === Infinity ? t('unlimited') : left, max: cfg.max_makeup_changes_per_month || t('unlimited') }));
        break;
      }
      case 'join':
        body = status(t('statusJoin'), 'ok');
        if (i.past) { body += why(t('pastNote')); break; }
        acts = disabled(t('btnLeave'), 'leave', st.off).replace('primary', '') + (st.off ? why(i.locked ? t('r_notice', { n: cfg.flex_notice_days }) : st.why) : '');
        break;
      case 'free': {
        body = status(t('statusFree'), 'info') + seats;
        if (i.past) { body = status(t('statusPast')); seats = ''; break; }
        if (s.type === 'fixed') {
          var pick = BC.pickCredit(s.id, ym), off = st.off || !!pick.reason;
          acts = disabled(t('btnMakeup'), 'makeup', off) + why(st.off ? st.why : pick.reason ? reasonText(pick.reason) : (pick.src === 'cancel' ? t('usesFree') : t('usesCredit')));
        } else {
          acts = disabled(t('btnJoin'), 'join', st.off) + (st.off ? why(st.why) : '');
        }
        seats = '';
        break;
      }
      case 'full':
        body = status(t('statusFull'), 'warn') + seats; seats = '';
        if (i.past) body = status(t('statusPast'));
        break;
      case 'cancelled': {
        var got = BC.rows(s.id, 'cancel_credit', function (c) { return c.date === iso; }).length;
        body = status(t('statusCancelled'), 'bad') + (ses.ov.note ? why(h(ses.ov.note)) : '') + (got ? status(icon('check') + ' ' + t('gotFree'), 'ok') : '');
        break;
      }
      case 'break':
        body = status(t('statusBreak'), 'info'); break;
      default:
        body = status(t('statusNone'));
    }
    return head + body + seats + '<div id="day-err"></div><div style="margin-top:14px">' + acts + '</div>';
  }

  function openDay(iso) {
    var s = me(), i = info(s, iso);
    var el = UI.sheet.open(dayHtml(i));
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      doAct(b.getAttribute('data-act'), iso);
    });
  }

  function doAct(act, iso) {
    var r, ok = '';
    if (act === 'move') { UI.sheet.close(); S.moveFrom = iso; render(); return; }
    if (act === 'skip') { r = BC.skip(S.sid, iso); ok = r.ok ? (r.credit ? t('okSkip') : t('okSkipNo')) : ''; }
    else if (act === 'makeup') { r = BC.makeup(S.sid, iso); ok = t('okMakeup'); }
    else if (act === 'join') { r = BC.join(S.sid, iso); ok = t('okJoin'); }
    else if (act === 'leave') { r = BC.leave(S.sid, iso); ok = t('okLeave'); }
    else if (act === 'cancelmk') { r = BC.cancelMakeup(S.sid, iso); ok = t('okCancelMk'); }
    if (!r) return;
    if (!r.ok) {
      var box = $('#day-err'); if (box) box.innerHTML = '<div class="banner bad" style="margin-top:12px" role="alert">' + icon('ban') + '<div>' + reasonText(r.reason) + '</div></div>';
      return;
    }
    UI.sheet.close(); render(); UI.toast(ok);
  }

  function paySheet() {
    var s = me(), ym = BC.ym(BC.today), b = billInfo(s, ym);
    var html = sheetHead(t('payTitle', { month: BC.monthOnly(ym, S.lang) })) +
      (BC.isLate(s.id) ? '<div class="banner bad" style="margin-bottom:12px">' + icon('lock') + '<div>' + t('lateBody') + '</div></div>' : '') +
      '<p class="center muted small" style="margin-bottom:8px">' + t('scanQR') + '</p><div class="qr-box">' + BC.fakeQR(s.id) + '</div><p class="center muted tiny" style="margin-bottom:12px">' + t('demoQR') + '</p>' +
      '<div class="kv"><span class="muted">' + t('amount') + '</span><span class="row"><span class="v">' + money(b.amount) + '</span><button class="btn sm icon" data-copy="' + b.amount + '" aria-label="' + t('copy') + '">' + icon('copy', 'sm') + '</button></span></div>' +
      '<div class="kv"><span class="muted">' + t('note') + '</span><span class="row"><span class="code">' + h(s.code) + '</span><button class="btn sm icon" data-copy="' + h(s.code) + '" aria-label="' + t('copy') + '">' + icon('copy', 'sm') + '</button></span></div>' +
      '<p class="muted small" style="margin-top:12px">' + t('payInfo') + '</p>';
    var el = UI.sheet.open(html);
    el.addEventListener('click', function (e) { var c = e.target.closest('[data-copy]'); if (c) UI.copy(c.getAttribute('data-copy'), t('copied')); });
  }

  function rulesList() {
    var items = [
      t('rule1', { pay: cfg.pay_by_day }), t('rule2', { tt: ttSummary() }), t('rule3', { n: cfg.flex_notice_days }),
      t('rule4', { n: cfg.advance_days, long: cfg.long_break_days }), t('rule5', { n: cfg.advance_days, max: cfg.max_makeups_per_month }), t('rule6', { n: cfg.advance_days })
    ];
    var titles = t('ruleTitles');
    return '<div class="rules"><ol>' + items.map(function (x, k) { return '<li><div><b>' + titles[k] + '</b>' + x + '</div></li>'; }).join('') + '</ol></div>' +
      '<p class="muted small" style="margin-top:12px">' + t('rulesNote', { pay: cfg.pay_by_day }) + '</p>';
  }
  function rulesSheet() { UI.sheet.open(sheetHead(t('rules')) + rulesList(), { full: true }); }

  function welcomeSheet() {
    var build = function () {
      return '<div class="center stack"><div class="logo" style="margin:6px auto;width:52px;height:52px;font-size:1.2rem">VM</div><h2>' + t('welcome', { title: h(cfg.page_title) }) + '</h2>' +
        '<p class="muted small">' + t('pickLang') + '</p><div class="row"><button class="chip langbtn grow" data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">Tiếng Việt</button><button class="chip langbtn grow" data-lang="en" aria-pressed="' + (S.lang === 'en') + '">English</button></div>' +
        '<p class="muted small">' + t('welcomeBody') + '</p></div><div style="text-align:left;margin-top:10px">' + sheetHead(t('rules')) + rulesList() + '</div>' +
        '<button class="btn primary block" style="margin-top:16px" data-close>' + t('gotIt') + '</button>';
    };
    var el = UI.sheet.open(build(), { full: true, onClose: function () { try { localStorage.setItem('bc_seen', '1'); } catch (e) { /* ignore */ } } });
    el.addEventListener('click', function (e) {
      var l = e.target.closest('[data-lang]'); if (!l) return;
      setLang(l.getAttribute('data-lang'));
      el.innerHTML = '<div class="grab"></div>' + build();
    });
  }

  function breakSheet() {
    var s = me(), min = BC.addDays(BC.today, cfg.advance_days);
    var html = sheetHead(t('breaks')) +
      '<p class="muted small" style="margin-bottom:12px">' + t('longNote') + '</p>' +
      '<div class="stack"><label class="field"><span class="lbl">' + t('from') + '</span><input class="inp" type="date" id="b-from" min="' + min + '" value="' + BC.addDays(min, 7) + '"><span class="hint">' + t('noticeHint', { date: BC.fmtDate(min, S.lang), n: cfg.advance_days }) + '</span></label>' +
      '<label class="field"><span class="lbl">' + t('to') + '</span><input class="inp" type="date" id="b-to" min="' + min + '" value="' + BC.addDays(min, 20) + '"></label>' +
      '<div id="b-prev"></div><div id="b-err"></div><button class="btn primary block" id="b-save">' + t('saveBreak') + '</button></div>';
    var el = UI.sheet.open(html);
    var f = $('#b-from', el), to = $('#b-to', el), prev = $('#b-prev', el);
    var update = function () {
      var a = f.value, b = to.value; if (!a || !b) { prev.innerHTML = ''; return; }
      if (b < a) { prev.innerHTML = '<div class="banner bad">' + t('r_dateOrder') + '</div>'; return; }
      var len = BC.diff(a, b) + 1, long = len >= cfg.long_break_days, out = '<div class="row wrap"><span class="tag">' + t('nDays', { n: len }) + '</span><span class="tag ' + (long ? 'info' : '') + '">' + (long ? t('longBreak') : t('shortBreak')) + '</span></div>';
      if (BC.diff(BC.today, a) < cfg.advance_days) out += '<div class="banner bad" style="margin-top:8px">' + t('r_noticeBreak', { n: cfg.advance_days }) + '</div>';
      if (long) {
        out += '<p class="small" style="margin-top:8px">' + t('longNote') + '</p>';
        var tmp = { id: -1, student: s.id, from: a, to: b }; BC.breaks.push(tmp);
        for (var ym = BC.ym(a); ym <= BC.ym(b); ym = BC.addMonths(ym, 1)) {
          var calc = BC.calcAmount(s, ym), rec = BC.payRec(s.id, ym);
          out += '<div class="kv"><span>' + t('newFee', { month: BC.monthOnly(ym, S.lang), amount: '' }).replace(/:?\s*$/, '') + '</span><b>' + money(calc) + '</b></div>';
          if (rec.paid && rec.amountPaid > calc && cfg.credit_carry) out += '<p class="muted small">' + t('creditNext', { amount: money(rec.amountPaid - calc) }) + '</p>';
        }
        BC.breaks.pop();
      } else {
        out += '<p class="small" style="margin-top:8px">' + t('shortNote', { n: cfg.max_makeups_per_month }) + '</p>';
      }
      prev.innerHTML = out;
    };
    f.addEventListener('input', update); to.addEventListener('input', update); update();
    $('#b-save', el).addEventListener('click', function () {
      var r = BC.addBreak(S.sid, f.value, to.value);
      if (!r.ok) { $('#b-err', el).innerHTML = '<div class="banner bad" style="margin-bottom:12px">' + reasonText(r.reason) + '</div>'; return; }
      UI.sheet.close(); render(); UI.toast(t('okBreak'));
    });
  }

  /* ---------- events ---------- */
  function setLang(l) { S.lang = l; BC.lang = l; try { localStorage.setItem('bc_lang', l); } catch (e) { /* ignore */ } render(); }

  app.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-lang]'))) { setLang(el.getAttribute('data-lang')); return; }
    if ((el = e.target.closest('[data-nav]'))) { S.month = BC.addMonths(S.month, Number(el.getAttribute('data-nav'))); render(); return; }
    if ((el = e.target.closest('[data-iso]'))) {
      var iso = el.getAttribute('data-iso');
      if (S.moveFrom) {
        var r = BC.moveMakeup(S.sid, S.moveFrom, iso);
        if (r.ok) { S.moveFrom = null; render(); UI.toast(t('okMove')); }
        else UI.toast(reasonText(r.reason), 'bad');
        return;
      }
      openDay(iso); return;
    }
    if ((el = e.target.closest('[data-rmbreak]'))) {
      var rr = BC.removeBreak(S.sid, Number(el.getAttribute('data-rmbreak')));
      if (rr.ok) { render(); UI.toast(t('okRemove')); } else UI.toast(reasonText(rr.reason), 'bad');
      return;
    }
    if ((el = e.target.closest('[data-act]'))) {
      var a = el.getAttribute('data-act');
      if (a === 'pay') paySheet(); else if (a === 'rules') rulesSheet(); else if (a === 'breakform') breakSheet();
      else if (a === 'video') UI.toast(t('videoToast')); else if (a === 'movecancel') { S.moveFrom = null; render(); }
    }
  });

  /* ---------- mockup-only controls ---------- */
  var panel = UI.mockPanel(
    '<h3>Mock controls</h3><div class="note">Only in the mockup. They jump between the situations a real student can be in.</div>' +
    '<label>Who is looking</label><select id="m-who"><option value="Lan">Lan: fixed Tue/Thu, has scores</option><option value="Tuấn">Tuấn: flexible schedule</option><option value="Hà">Hà: new student, starts 17 Nov, no scores</option></select>' +
    '<label>Pretend today is</label><div class="seg full" id="m-today"><button data-v="2026-11-03">3 Nov</button><button data-v="2026-11-05">5 Nov</button><button data-v="2026-11-06">6 Nov</button><button data-v="2026-11-12">12 Nov</button></div>' +
    '<label>This month\'s fee</label><div class="seg full" id="m-paid"><button data-v="1">Paid</button><button data-v="0">Unpaid</button></div>' +
    '<label>Server</label><div class="seg full" id="m-down"><button data-v="0">Online</button><button data-v="1">Down</button></div>' +
    '<label>Screens</label><button class="mb" id="m-welcome">Show the first-open welcome</button>' +
    '<label>Data</label><button class="mb" id="m-reset">Reset all fake data</button>'
  );
  function syncPanel() {
    var s = me(), ym = BC.ym(BC.today);
    $('#m-who', panel).value = s.name;
    $$('#m-today button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === BC.today)); });
    $$('#m-paid button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-v') === '1') === BC.payRec(s.id, ym).paid)); });
    $$('#m-down button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-v') === '1') === S.down)); });
  }
  panel.addEventListener('change', function (e) {
    if (e.target.id === 'm-who') { S.sid = BC.byName(e.target.value).id; S.moveFrom = null; render(); }
  });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var grp = b.parentElement && b.parentElement.id, v = b.getAttribute('data-v');
    if (grp === 'm-today') { BC.today = v; S.month = BC.ym(v); render(); }
    else if (grp === 'm-paid') { BC.setPaid(S.sid, BC.ym(BC.today), v === '1'); render(); }
    else if (grp === 'm-down') { S.down = v === '1'; render(); }
    else if (b.id === 'm-welcome') { panel.classList.add('hide'); welcomeSheet(); }
    else if (b.id === 'm-reset') { var who = me().name; BC.seed(); cfg = BC.config; S.sid = BC.byName(who).id; S.month = BC.ym(BC.today); S.moveFrom = null; S.down = false; render(); UI.toast('Reset'); }
  });

  render();
  var seen = false; try { seen = !!localStorage.getItem('bc_seen'); } catch (e) { /* ignore */ }
  if (!seen) welcomeSheet();
})();
