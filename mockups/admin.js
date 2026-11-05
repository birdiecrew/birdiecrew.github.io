/* Coach admin mockup. Fake data in memory. The password check is faked here; in the real site the script checks it. */
(function () {
  'use strict';
  var h = UI.h, icon = UI.icon, $ = UI.$, $$ = UI.$$;
  var cfg = BC.config;
  var PASSWORD = 'badminton';
  var S = {
    auth: false, lang: 'en', tab: 'sessions', sub: null, open: {}, filter: 'all', q: '', payMonth: BC.ym(BC.today),
    scoreSid: null, draft: null, cancelIso: null, msgLang: 'vi', reminded: {}, tries: 0, loginErr: '', checking: false
  };
  try { var l0 = localStorage.getItem('bc_admin_lang'); if (l0 === 'vi' || l0 === 'en') S.lang = l0; } catch (e) { /* ignore */ }
  try { S.auth = sessionStorage.getItem('bc_admin_auth') === '1'; } catch (e) { /* ignore */ }

  function t(en, v) {
    var s = (S.lang === 'vi' && window.VI[en] != null) ? window.VI[en] : en;
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s;
  }
  function money(n) { return BC.fmtVND(n, S.lang); }
  function dt(iso) { return BC.fmtDate(iso, S.lang); }
  function ymNow() { return BC.ym(BC.today); }
  function monthWord(ym, lang) { return lang === 'vi' ? 'tháng ' + Number(ym.slice(5)) : BC.monthOnly(ym, 'en'); }
  function linkOf(s) { return 'https://' + BC.linkOf(s); }
  var app = $('#app');

  /* ---------- data helpers ---------- */
  function payRows(ym) {
    return BC.students.filter(function (s) { return s.active && BC.ym(s.start) <= ym; }).map(function (s) {
      var rec = BC.payRec(s.id, ym), due = BC.dueDate(s, ym);
      return { s: s, rec: rec, due: due, late: !rec.paid && BC.today > due, amount: rec.paid ? rec.amountPaid : BC.amountDue(s, ym), billed: BC.billedDates(s, ym).length, full: BC.lessonDates(s, ym).length };
    });
  }
  function remindData() {
    var day = Number(BC.today.slice(8)), soft = [], late = [];
    payRows(ymNow()).forEach(function (r) {
      if (r.rec.paid) return;
      if (r.late) late.push(r); else if (day >= 3 && BC.diff(BC.today, r.due) <= 2) soft.push(r);
    });
    var canc = Object.keys(BC.overrides).filter(function (d) { return BC.overrides[d].cancelled && d >= BC.addDays(BC.today, -7); }).sort();
    return { soft: soft, late: late, canc: canc };
  }
  function msg(kind, s, lang, iso) {
    var tpl = BC.messages[lang][kind], ym = ymNow();
    if (kind === 'cancel') {
      return BC.fill(tpl, { weekday: BC.wdLong(BC.dow(iso), lang), date: BC.fmtDay(iso, lang), until: monthWord(BC.addMonths(BC.ym(iso), cfg.cancel_credit_months), lang) });
    }
    return BC.fill(tpl, { name: s.name, month: monthWord(ym, lang), amount: BC.fmtVND(BC.amountDue(s, ym), lang), due: BC.fmtDay(BC.dueDate(s, ym), lang), code: s.code, link: linkOf(s) });
  }
  function initials(n) { return h(n.charAt(0).toUpperCase()); }
  function lastScore(sid) { var a = BC.scores[sid]; return a && a.length ? a[a.length - 1] : null; }
  function scoreDue(sid) { var l = lastScore(sid); return !l || BC.diff(l.date, BC.today) >= 60; }

  /* ---------- login ---------- */
  function loginView() {
    return '<div style="text-align:right;padding-top:12px">' + UI.themeBtn() + '</div><div class="login"><div class="card stack"><div class="center"><div class="logo" style="margin:0 auto 10px;width:52px;height:52px">VM</div><h1 style="font-size:1.3rem">' + t('Coach sign-in') + '</h1><p class="muted small" style="margin-top:4px">' + t('The password is checked by the script, never by this page.') + '</p></div>' +
      '<label class="field"><span class="lbl">' + t('Admin password') + '</span><input class="inp" type="password" id="pw" autocomplete="current-password" placeholder="••••••••"></label>' +
      (S.loginErr ? '<div class="banner bad" role="alert">' + icon('ban') + '<div>' + S.loginErr + '</div></div>' : '') +
      '<button class="btn primary block" id="login-go"' + (S.checking ? ' disabled' : '') + '>' + (S.checking ? t('Checking...') : t('Sign in')) + '</button>' +
      '<div class="mock-hint">' + t('Mockup: the password is "badminton". Wrong tries answer a little slower each time, like the real script.') + '</div></div></div>';
  }
  function doLogin() {
    var pw = $('#pw').value;
    if (S.checking) return;
    S.checking = true; S.loginErr = ''; render();
    var wait = 500 + S.tries * 700;
    setTimeout(function () {
      S.checking = false;
      if (pw === PASSWORD) { S.auth = true; S.tries = 0; try { sessionStorage.setItem('bc_admin_auth', '1'); } catch (e) { /* ignore */ } }
      else { S.tries++; S.loginErr = t('Wrong password.'); }
      render();
    }, wait);
  }

  /* ---------- shell ---------- */
  function shell() {
    var rd = remindData(), nRemind = rd.soft.length + rd.late.length;
    var unpaid = payRows(ymNow()).filter(function (r) { return !r.rec.paid; }).length;
    var tabs = [['sessions', 'cal2', 'Sessions', 0], ['students', 'users', 'Students', 0], ['payments', 'wallet', 'Payments', unpaid], ['remind', 'bell', 'Remind', nRemind], ['more', 'more', 'More', 0]];
    return '<header class="top"><div class="row between"><div class="row"><div class="logo" aria-hidden="true">VM</div><div><h1>' + h(cfg.page_title) + '</h1><div class="muted small">' + t('Coach') + ' · ' + dt(BC.today) + '</div></div></div>' +
      '<div class="row" style="gap:8px">' + UI.themeBtn() + '<div class="seg" role="group" aria-label="Language"><button data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">VI</button><button data-lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div></div></div></header>' +
      '<div id="view">' + view() + '</div>' +
      '<nav class="nav" aria-label="Main"><div class="nav-in">' + tabs.map(function (x) {
        return '<button data-tab="' + x[0] + '" ' + ((!S.sub && S.tab === x[0]) || (S.sub && x[0] === 'more') ? 'aria-current="page"' : '') + '>' + icon(x[1]) + t(x[2]) + (x[3] ? '<span class="badge ' + (x[0] === 'payments' ? 'warn' : '') + '">' + x[3] + '</span>' : '') + '</button>';
      }).join('') + '</div></nav>';
  }
  function view() {
    if (S.sub) return subView();
    return { sessions: sessionsView, students: studentsView, payments: paymentsView, remind: remindView, more: moreView }[S.tab]();
  }
  function subHead(title) {
    return '<div class="sub-h"><button class="btn icon sm" data-a="back" aria-label="' + t('Back') + '">' + icon('back') + '</button><h2>' + title + '</h2></div>';
  }

  /* ---------- 1. Next 14 days ---------- */
  function sessionsView() {
    var list = [], i;
    for (i = 0; i < 14; i++) { var s = BC.session(BC.addDays(BC.today, i)); if (s.isClass) list.push(s); }
    var over = list.filter(function (x) { return x.over; }).length;
    var out = '<div class="view-h"><h2>' + t('Next 14 days') + '</h2><p class="muted small">' + dt(BC.today) + ' – ' + dt(BC.addDays(BC.today, 13)) + '</p></div>';
    if (over) out += '<div class="banner bad" style="margin-bottom:12px">' + icon('ban') + '<div><b>' + t('{n} session over capacity', { n: over }) + '</b><br>' + t('Regular students are never bumped. Add extra seats or book another court.') + '</div></div>';
    out += list.map(sesCard).join('');
    return out;
  }
  function sesCard(ses) {
    var open = !!S.open[ses.iso], names = function (ids, cls) { return ids.map(function (id) { return '<span class="nm ' + (cls || '') + '">' + h(BC.student(id).name) + '</span>'; }).join(''); };
    var pills = '';
    if (ses.cancelled) pills += '<span class="tag bad">' + t('Cancelled') + '</span>';
    else {
      if (ses.over) pills += '<span class="tag bad">' + t('Over capacity') + '</span>';
      else if (ses.free === 0) pills += '<span class="tag warn">' + t('Full') + '</span>';
      if (ses.extra) pills += '<span class="tag info">' + t('+{n} extra seat', { n: ses.extra }) + '</span>';
      if (ses.courts < cfg.venue_courts) pills += '<span class="tag info">' + t('{n} courts only', { n: ses.courts }) + '</span>';
      if (ses.locked) pills += '<span class="tag ok">' + icon('lock', 'sm') + ' ' + t('Headcount final') + '</span>';
    }
    var courts = ses.cancelled ? '<div class="courts zero"><div class="big">0</div><div class="l">' + t('courts') + '</div></div>' : '<div class="courts ' + (ses.over ? 'bad' : '') + '"><div class="big">' + ses.courtsToBook + '</div><div class="l">' + t('courts to book') + '</div></div>';
    var body = '';
    if (open) {
      body = '<div class="ses-b">';
      if (ses.coming.length) body += '<h3>' + t('Coming ({n})', { n: ses.count }) + '</h3><div class="names">' + names(ses.regular) + names(ses.makeups, 'mk') + names(ses.joins, 'jn') + '</div>';
      if (ses.makeups.length || ses.joins.length) body += '<p class="tiny muted">' + (ses.makeups.length ? '<span class="nm mk">' + t('make-up') + '</span> ' : '') + (ses.joins.length ? '<span class="nm jn">' + t('flexible') + '</span>' : '') + '</p>';
      if (ses.skipped.length) body += '<h3>' + t('Skipped ({n})', { n: ses.skipped.length }) + '</h3><div class="names">' + names(ses.skipped, 'sk') + '</div>';
      if (ses.onBreak.length) body += '<h3>' + t('On a long break ({n})', { n: ses.onBreak.length }) + '</h3><div class="names">' + names(ses.onBreak, 'sk') + '</div>';
      if (!ses.cancelled) {
        body += '<hr class="sep"><div class="ctl"><div><b>' + t('Extra seats') + '</b><div class="muted small">' + t('0 to 2 on top of {n}', { n: ses.courts * cfg.seats_per_court }) + '</div></div>' + stepper('extra:' + ses.iso, ses.extra, 0, 2) + '</div>' +
          '<div class="ctl"><div><b>' + t('Courts available') + '</b><div class="muted small">' + t('The venue has {n}', { n: cfg.venue_courts }) + '</div></div>' + stepper('courts:' + ses.iso, ses.courts, 1, cfg.venue_courts) + '</div>' +
          '<button class="btn danger sm" data-a="cancelses" data-x="' + ses.iso + '">' + icon('ban', 'sm') + ' ' + t('Cancel this session') + '</button>';
      } else body += '<p class="muted small">' + h(ses.ov.note || '') + '</p>';
      body += '</div>';
    }
    return '<div class="ses"><button class="ses-h" data-a="toggle" data-x="' + ses.iso + '" aria-expanded="' + open + '"><div class="d"><b>' + dt(ses.iso) + '</b> <span class="muted small">' + ses.start + '–' + ses.end + '</span>' +
      '<div class="row wrap" style="margin-top:6px;gap:6px">' + pills + '</div></div><div class="right"><div class="big">' + ses.count + ' <small>/ ' + ses.seats + '</small></div><div class="muted tiny">' + t('coming') + '</div></div>' + courts + '</button>' + body + '</div>';
  }
  function stepper(key, val, min, max) {
    return '<div class="stepper"><button data-a="step" data-x="' + key + '" data-y="-1" aria-label="-"' + (val <= min ? ' disabled' : '') + '>−</button><output>' + val + '</output><button data-a="step" data-x="' + key + '" data-y="1" aria-label="+"' + (val >= max ? ' disabled' : '') + '>+</button></div>';
  }

  /* ---------- 2. Students ---------- */
  function filteredStudents() {
    var ym = ymNow(), q = S.q.trim().toLowerCase();
    return BC.students.filter(function (s) {
      if (q && s.name.toLowerCase().indexOf(q) < 0 && s.code.toLowerCase().indexOf(q) < 0) return false;
      var rec = BC.payRec(s.id, ym);
      switch (S.filter) {
        case 'fixed': return s.type === 'fixed'; case 'flexible': return s.type === 'flexible';
        case 'unpaid': return s.active && BC.ym(s.start) <= ym && !rec.paid; case 'paused': return !s.active; default: return true;
      }
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); });
  }
  function stuRows() {
    var ym = ymNow(), rows = filteredStudents();
    if (!rows.length) return '<div class="empty">' + t('Nobody matches.') + '</div>';
    return rows.map(function (s) {
      var rec = BC.payRec(s.id, ym), late = BC.isLate(s.id), started = BC.ym(s.start) <= ym;
      var days = s.type === 'flexible' ? t('Flexible') : s.days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); }).map(function (d) { return BC.wd(d, S.lang); }).join(' · ');
      var tags = '';
      if (!s.active) tags += '<span class="tag">' + t('Paused') + '</span>';
      else if (late) tags += '<span class="tag bad">' + t('Late') + '</span>';
      else if (started && !rec.paid) tags += '<span class="tag warn">' + t('Unpaid') + '</span>';
      if (s.start > BC.today) tags += '<span class="tag info">' + t('Starts {date}', { date: BC.fmtDay(s.start, S.lang) }) + '</span>';
      return '<button class="li" data-a="stu" data-x="' + s.id + '"><div class="avatar ' + (late ? 'late' : '') + '">' + initials(s.name) + '</div><div class="grow"><b>' + h(s.name) + '</b><span class="muted small">' + h(s.code) + ' · ' + days + '</span></div><div class="row" style="gap:4px;flex-wrap:wrap;justify-content:flex-end">' + tags + '</div></button>';
    }).join('');
  }
  function studentsView() {
    var ym = ymNow(), n = function (f) { return BC.students.filter(f).length; };
    var chips = [['all', 'All', BC.students.length], ['fixed', 'Fixed', n(function (s) { return s.type === 'fixed'; })], ['flexible', 'Flexible', n(function (s) { return s.type === 'flexible'; })],
      ['unpaid', 'Unpaid', n(function (s) { return s.active && BC.ym(s.start) <= ym && !BC.payRec(s.id, ym).paid; })], ['paused', 'Paused', n(function (s) { return !s.active; })]];
    return '<div class="view-h row between"><h2>' + t('Students') + '</h2><button class="btn primary" data-a="addstu">' + icon('plus', 'sm') + ' ' + t('Add student') + '</button></div>' +
      '<input class="inp" type="search" id="q" placeholder="' + t('Search name or code') + '" value="' + h(S.q) + '" style="margin-bottom:10px">' +
      '<div class="chips" style="margin-bottom:12px">' + chips.map(function (c) { return '<button class="chip" data-a="filter" data-x="' + c[0] + '" aria-pressed="' + (S.filter === c[0]) + '">' + t(c[1]) + ' ' + c[2] + '</button>'; }).join('') + '</div>' +
      '<div id="stu-list">' + stuRows() + '</div>';
  }

  /* student sheets */
  function dayChips(sel) {
    return [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return BC.timetable[d].on; }).map(function (d) {
      return '<button type="button" class="chip" data-day="' + d + '" aria-pressed="' + (sel.indexOf(d) >= 0) + '">' + BC.wd(d, S.lang) + '</button>';
    }).join('');
  }
  function firstBill(ed) {
    if (!ed.start) return '';
    var tmp = { id: -1, name: ed.name, type: ed.type, days: ed.days, start: ed.start, fee: ed.fee || null }, ym = BC.ym(ed.start);
    var amt = BC.calcAmount(tmp, ym), billed = BC.billedDates(tmp, ym).length, full = BC.lessonDates(tmp, ym).length;
    return '<div class="banner ok">' + icon('wallet') + '<div><b>' + t('First bill') + ': ' + money(amt) + '</b><br>' + t('{a} of {b} lessons in {month}', { a: billed, b: full, month: BC.monthOnly(ym, S.lang) }) + '<br>' + t('Due {date}', { date: dt(BC.dueDate(tmp, ym)) }) + '</div></div>';
  }
  function studentFormHtml(ed) {
    return '<div class="stack"><label class="field"><span class="lbl">' + t('Name (first name or nickname)') + '</span><input class="inp" id="f-name" value="' + h(ed.name) + '" placeholder="' + t('e.g. Lan') + '"></label>' +
      '<div class="field"><span class="lbl">' + t('Schedule') + '</span><div class="seg full"><button type="button" data-type="fixed" aria-pressed="' + (ed.type === 'fixed') + '">' + t('Fixed days') + '</button><button type="button" data-type="flexible" aria-pressed="' + (ed.type === 'flexible') + '">' + t('Flexible') + '</button></div></div>' +
      (ed.type === 'fixed' ? '<div class="field"><span class="lbl">' + t('Weekly days') + '</span><div class="chips" id="f-days">' + dayChips(ed.days) + '</div></div>' : '<p class="muted small">' + t('Flexible students pick sessions themselves, at least {n} days ahead. No make-up credits.', { n: cfg.flex_notice_days }) + '</p>') +
      '<label class="field"><span class="lbl">' + t('Start date') + '</span><input class="inp" type="date" id="f-start" value="' + ed.start + '"></label>' +
      '<label class="field"><span class="lbl">' + t('Own monthly fee (optional)') + '</span><input class="inp" type="number" id="f-fee" step="1000" min="0" placeholder="' + cfg.monthly_fee + '" value="' + (ed.fee || '') + '"><span class="hint">' + t('Leave empty for the usual {fee}', { fee: money(cfg.monthly_fee) }) + '</span></label></div>';
  }
  function bindForm(el, ed, redraw, onInput) {
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-type]'))) { ed.type = b.getAttribute('data-type'); redraw(); }
      else if ((b = e.target.closest('[data-day]'))) {
        var d = Number(b.getAttribute('data-day')), i = ed.days.indexOf(d); if (i >= 0) ed.days.splice(i, 1); else ed.days.push(d); redraw();
      }
    });
    el.addEventListener('input', function (e) {
      if (e.target.id === 'f-name') ed.name = e.target.value;
      else if (e.target.id === 'f-start') ed.start = e.target.value;
      else if (e.target.id === 'f-fee') ed.fee = e.target.value ? Number(e.target.value) : null;
      else return;
      onInput && onInput();
    });
  }

  function openAddStudent() {
    var ed = { name: '', type: 'fixed', days: [], start: BC.addDays(BC.today, 1), fee: null }, el, saved = null;
    var ok = function () { return ed.name.trim() && ed.start && (ed.type === 'flexible' || ed.days.length); };
    var upd = function () { var p = $('#as-prev', el), b = $('#as-save', el); if (p) p.innerHTML = ok() ? firstBill(ed) : ''; if (b) b.disabled = !ok(); };
    var draw = function () {
      if (saved) {
        el.innerHTML = '<div class="grab"></div><div class="sheet-h"><h2>' + t('{name} is added', { name: h(saved.name) }) + '</h2><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
          '<div class="stack"><div class="banner ok">' + icon('check') + '<div>' + t('Copy the link and send it on your Zalo channel. The student opens it once and the browser remembers.') + '</div></div>' +
          '<div class="field"><span class="lbl">' + t('Personal link') + '</span><div class="linkbox"><code>' + h(linkOf(saved)) + '</code><button class="btn primary sm" data-copy="' + h(linkOf(saved)) + '">' + icon('copy', 'sm') + ' ' + t('Copy link') + '</button></div></div>' +
          '<div class="kv" style="display:flex;justify-content:space-between"><span class="muted">' + t('Payment code') + '</span><b class="code" style="font-family:ui-monospace,monospace">' + h(saved.code) + '</b></div>' + firstBill(saved) +
          '<div class="row"><button class="btn grow" data-a2="another">' + t('Add another') + '</button><button class="btn primary grow" data-close>' + t('Done') + '</button></div></div>';
        return;
      }
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><h2>' + t('Add student') + '</h2><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' + studentFormHtml(ed) +
        '<div id="as-prev" style="margin-top:12px"></div><button class="btn primary block" id="as-save" style="margin-top:12px" disabled>' + t('Save') + '</button>';
      upd();
    };
    el = UI.sheet.open('', {});
    bindForm(el, ed, draw, upd);
    el.addEventListener('click', function (e) {
      if (e.target.closest('#as-save')) {
        if (!ok()) return;
        saved = BC.addStudent({ name: ed.name.trim(), type: ed.type, days: ed.days, start: ed.start, fee: ed.fee }); draw(); render();
      } else if (e.target.closest('[data-a2="another"]')) {
        saved = null; ed.name = ''; ed.days = []; draw();
      } else if (e.target.closest('[data-copy]')) UI.copy(e.target.closest('[data-copy]').getAttribute('data-copy'), t('Copied'));
    });
    draw();
  }

  function openStudent(id) {
    var s = BC.student(id), ed = { name: s.name, type: s.type, days: s.days.slice(), start: s.start, fee: s.fee }, el;
    var ym = ymNow(), rec = BC.payRec(id, ym);
    var draw = function () {
      var st = BC.student(id);
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><div><h2>' + h(st.name) + '</h2><div class="muted small">' + h(st.code) + (st.active ? '' : ' · ' + t('Paused')) + '</div></div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
        '<div class="stack"><div class="field"><span class="lbl">' + t('Personal link') + '</span><div class="linkbox"><code>' + h(linkOf(st)) + '</code><button class="btn primary sm" data-copy="' + h(linkOf(st)) + '">' + icon('copy', 'sm') + ' ' + t('Copy link') + '</button></div></div>' +
        '<div class="kv" style="display:flex;justify-content:space-between;align-items:center"><span class="muted">' + t('Payment code') + '</span><span class="row"><b style="font-family:ui-monospace,monospace;font-size:1.1rem">' + h(st.code) + '</b><button class="btn sm icon" data-copy="' + h(st.code) + '" aria-label="' + t('Copy') + '">' + icon('copy', 'sm') + '</button></span></div>' +
        '<div class="row between"><span class="muted">' + h(BC.monthName(ym, S.lang)) + '</span>' + (BC.ym(st.start) > ym ? '<span class="tag">' + t('Not started') + '</span>' : (rec.paid ? '<span class="tag ok">' + t('Paid') + ' · ' + money(rec.amountPaid) + '</span>' : (BC.isLate(id) ? '<span class="tag bad">' + t('Late') + ' · ' + money(BC.amountDue(st, ym)) + '</span>' : '<span class="tag warn">' + t('Unpaid') + ' · ' + money(BC.amountDue(st, ym)) + '</span>'))) + '</div><hr class="sep">' +
        studentFormHtml(ed) +
        '<button class="btn primary block" id="st-save">' + t('Save changes') + '</button>' +
        '<div class="row"><button class="btn grow" id="st-pause">' + icon(st.active ? 'pause' : 'refresh', 'sm') + ' ' + (st.active ? t('Pause student') : t('Resume student')) + '</button><button class="btn danger grow" id="st-reset">' + icon('refresh', 'sm') + ' ' + t('Reset link') + '</button></div>' +
        '<p class="muted small">' + t('Reset link: the old link stops working at once. Send the new one on Zalo.') + '</p></div>';
    };
    el = UI.sheet.open('', {});
    bindForm(el, ed, draw);
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-copy]'))) { UI.copy(b.getAttribute('data-copy'), t('Copied')); return; }
      if (e.target.closest('#st-save')) {
        var st = BC.student(id);
        if (!ed.name.trim()) { UI.toast(t('Please enter a name.'), 'bad'); return; }
        st.name = ed.name.trim(); st.type = ed.type; st.days = ed.type === 'fixed' ? ed.days.slice() : []; st.start = ed.start; st.fee = ed.fee;
        UI.sheet.close(); render(); UI.toast(t('Saved'));
      } else if (e.target.closest('#st-pause')) {
        var s2 = BC.student(id); s2.active = !s2.active; UI.sheet.close(); render(); UI.toast(s2.active ? t('Resumed') : t('Paused'));
      } else if (e.target.closest('#st-reset')) {
        UI.confirm({ title: t('Reset {name}\'s link?', { name: BC.student(id).name }), body: t('The old link stops working at once. You will get a new one to send.'), ok: t('Reset link'), cancel: t('Cancel'), danger: true }).then(function (yes) {
          if (!yes) return; BC.resetLink(id); draw(); UI.toast(t('New link ready. Copy it and send it.'));
        });
      }
    });
    draw();
  }

  /* ---------- 3. Payments ---------- */
  function paymentsView() {
    var ym = S.payMonth, rows = payRows(ym);
    var collected = 0, outstanding = 0, lateN = 0, unpaidN = 0;
    rows.forEach(function (r) { if (r.rec.paid) collected += r.rec.amountPaid; else { outstanding += r.amount; unpaidN++; if (r.late) lateN++; } });
    rows.sort(function (a, b) {
      var ra = a.rec.paid ? 2 : (a.late ? 0 : 1), rb = b.rec.paid ? 2 : (b.late ? 0 : 1);
      return ra - rb || a.s.name.localeCompare(b.s.name, 'vi');
    });
    var nav = '<div class="row between" style="margin-bottom:12px"><button class="btn icon sm" data-a="pm" data-x="-1" aria-label="Previous month"' + (ym <= '2026-09' ? ' disabled' : '') + '>' + icon('chevL') + '</button><b>' + BC.monthName(ym, S.lang) + '</b><button class="btn icon sm" data-a="pm" data-x="1" aria-label="Next month"' + (ym >= '2026-12' ? ' disabled' : '') + '>' + icon('chevR') + '</button></div>';
    var tiles = '<div class="tiles"><div class="tile"><div class="v">' + money(collected) + '</div><div class="l">' + t('Collected') + '</div></div><div class="tile"><div class="v">' + money(outstanding) + '</div><div class="l">' + t('Still to collect') + '</div></div><div class="tile"><div class="v">' + unpaidN + '</div><div class="l">' + t('Unpaid') + '</div></div><div class="tile"><div class="v" style="color:' + (lateN ? 'var(--danger)' : 'inherit') + '">' + lateN + '</div><div class="l">' + t('Late') + '</div></div></div>';
    var list = rows.map(function (r) {
      var s = r.s, note = '';
      if (r.billed < r.full) note += t('{a} of {b} lessons', { a: r.billed, b: r.full }) + ' · ';
      if (r.rec.override != null) note += '<span class="tag accent">' + t('edited') + '</span> ';
      if (r.rec.creditIn > 0 && cfg.credit_carry) note += t('credit -{amount}', { amount: money(r.rec.creditIn) }) + ' · ';
      var status = r.rec.paid ? '<span class="tag ok">' + icon('check', 'sm') + ' ' + t('Paid {date}', { date: BC.fmtDay(r.rec.paidDate, S.lang) }) + '</span>' : (r.late ? '<span class="tag bad">' + t('Late since {date}', { date: BC.fmtDay(BC.addDays(r.due, 1), S.lang) }) + '</span>' : '<span class="tag warn">' + t('Due {date}', { date: BC.fmtDay(r.due, S.lang) }) + '</span>');
      return '<div class="li pay"><div class="avatar ' + (r.late ? 'late' : (r.rec.paid ? '' : 'warn')) + '">' + initials(s.name) + '</div><div class="who"><b>' + h(s.name) + '</b> <span class="muted small">' + h(s.code) + '</span></div>' +
        '<div class="amt">' + money(r.amount) + '</div><div class="st small">' + note + status + '</div><div class="acts">' +
        '<button class="btn icon sm" data-a="editamt" data-x="' + s.id + '" aria-label="' + t('Change amount') + '">' + icon('pencil', 'sm') + '</button>' +
        (r.rec.paid ? '<button class="btn sm paid-btn" data-a="undopaid" data-x="' + s.id + '">' + t('Undo') + '</button>' : '<button class="btn primary paid-btn" data-a="paid" data-x="' + s.id + '">' + icon('check', 'sm') + ' ' + t('Paid') + '</button>') + '</div></div>';
    }).join('');
    return '<div class="view-h"><h2>' + t('Payments') + '</h2><p class="muted small">' + t('Check your bank app, then tap Paid.') + '</p></div>' + nav + tiles + '<div>' + list + '</div>';
  }
  function openEditAmount(sid) {
    var s = BC.student(sid), ym = S.payMonth, rec = BC.payRec(sid, ym), calc = BC.calcAmount(s, ym) - (cfg.credit_carry ? rec.creditIn : 0), cur = rec.paid ? rec.amountPaid : BC.amountDue(s, ym);
    var el = UI.sheet.open('<div class="sheet-h"><div><h2>' + t('Change amount') + '</h2><div class="muted small">' + h(s.name) + ' · ' + BC.monthName(ym, S.lang) + '</div></div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
      '<div class="stack"><div class="banner">' + icon('info') + '<div>' + t('Worked out by the rules: {amount}', { amount: money(Math.max(0, calc)) }) + '<br>' + t('{a} of {b} lessons', { a: BC.billedDates(s, ym).length, b: BC.lessonDates(s, ym).length }) + '</div></div>' +
      '<label class="field"><span class="lbl">' + t('Amount (VND)') + '</span><input class="inp" type="number" id="amt" step="1000" min="0" value="' + cur + '"></label>' +
      '<button class="btn primary block" id="amt-save">' + t('Save') + '</button><button class="btn block" id="amt-reset">' + t('Use the worked-out amount') + '</button></div>');
    el.addEventListener('click', function (e) {
      if (e.target.closest('#amt-save')) {
        var v = Number($('#amt', el).value); if (isNaN(v) || v < 0) return;
        rec.override = v; if (rec.paid) rec.amountPaid = v; UI.sheet.close(); render(); UI.toast(t('Saved'));
      } else if (e.target.closest('#amt-reset')) {
        rec.override = null; if (rec.paid) rec.amountPaid = BC.amountDue(s, ym); UI.sheet.close(); render(); UI.toast(t('Saved'));
      }
    });
  }

  /* ---------- 4. To remind ---------- */
  function remindView() {
    var d = remindData(), out = '<div class="view-h"><h2>' + t('To remind') + '</h2><p class="muted small">' + t('Tap a language to copy the message, then paste it into Zalo.') + '</p></div>';
    var group = function (title, sub, rows, kind) {
      if (!rows.length) return '';
      return '<h3 style="margin:14px 0 8px">' + title + ' <span class="tag">' + rows.length + '</span></h3><p class="muted small" style="margin-bottom:8px">' + sub + '</p>' + rows.map(function (r) {
        var key = kind + r.s.id, done = S.reminded[key];
        return '<div class="li pay"><div class="avatar ' + (kind === 'late' ? 'late' : 'warn') + '">' + (done ? icon('check') : initials(r.s.name)) + '</div><div class="who"><b>' + h(r.s.name) + '</b> <span class="muted small">' + h(r.s.code) + '</span></div><div class="amt">' + money(BC.amountDue(r.s, ymNow())) + '</div>' +
          '<div class="st small muted">' + (kind === 'late' ? t('Late since {date}', { date: BC.fmtDay(BC.addDays(r.due, 1), S.lang) }) : t('Due {date}', { date: BC.fmtDay(r.due, S.lang) })) + (done ? ' · <span class="tick">' + t('copied') + '</span>' : '') + '</div><div class="acts">' +
          '<button class="btn sm" data-a="copymsg" data-x="' + kind + '|' + r.s.id + '|vi">' + icon('copy', 'sm') + ' VI</button><button class="btn sm" data-a="copymsg" data-x="' + kind + '|' + r.s.id + '|en">' + icon('copy', 'sm') + ' EN</button>' +
          '<button class="btn sm icon" data-a="prevmsg" data-x="' + kind + '|' + r.s.id + '" aria-label="' + t('Preview') + '">' + icon('info', 'sm') + '</button></div></div>';
      }).join('');
    };
    out += group(t('Friendly heads-up'), t('Unpaid and due within 2 days (from the 3rd).'), d.soft, 'soft');
    out += group(t('Late'), t('Past the pay-by day. They are locked from changes until they pay.'), d.late, 'late');
    if (d.canc.length) {
      out += '<h3 style="margin:14px 0 8px">' + t('Announcements') + '</h3>' + d.canc.map(function (iso) {
        var key = 'canc' + iso;
        return '<div class="li pay"><div class="avatar late">' + icon('ban') + '</div><div class="who"><b>' + t('{date} is cancelled', { date: dt(iso) }) + '</b></div><div class="amt"></div>' +
          '<div class="st small muted">' + h(BC.overrides[iso].note || '') + (S.reminded[key] ? ' · <span class="tick">' + t('copied') + '</span>' : '') + '</div><div class="acts">' +
          '<button class="btn sm" data-a="copymsg" data-x="cancel|' + iso + '|vi">' + icon('copy', 'sm') + ' VI</button><button class="btn sm" data-a="copymsg" data-x="cancel|' + iso + '|en">' + icon('copy', 'sm') + ' EN</button></div></div>';
      }).join('');
    }
    if (!d.soft.length && !d.late.length && !d.canc.length) out += '<div class="empty">' + icon('check') + '<p>' + t('Nothing to remind right now.') + '</p><p class="small">' + t('Reminders start on the 3rd for unpaid fees.') + '</p></div>';
    return out;
  }
  function msgFromKey(x, lang) {
    var p = x.split('|'), kind = p[0];
    if (kind === 'cancel') return msg('cancel', null, lang, p[1]);
    return msg(kind, BC.student(Number(p[1])), lang);
  }
  function copyMsg(x) {
    var p = x.split('|'), lang = p[2]; var key = p[0] === 'cancel' ? 'canc' + p[1] : p[0] + p[1];
    UI.copy(msgFromKey(x, lang), t('Message copied. Paste it into Zalo.')); S.reminded[key] = true; render();
  }
  function openPreview(x) {
    var p = x.split('|'), s = BC.student(Number(p[1])), lang = S.msgLang, el;
    var draw = function () {
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><div><h2>' + t('Message to {name}', { name: h(s.name) }) + '</h2></div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
        '<div class="seg full" style="margin-bottom:12px"><button data-l="vi" aria-pressed="' + (lang === 'vi') + '">Tiếng Việt</button><button data-l="en" aria-pressed="' + (lang === 'en') + '">English</button></div>' +
        '<div class="msgbox">' + h(msgFromKey(x, lang)) + '</div><button class="btn primary block" style="margin-top:12px" id="pv-copy">' + icon('copy', 'sm') + ' ' + t('Copy message') + '</button><p class="muted small" style="margin-top:10px">' + t('You can reword these texts in Settings.') + '</p>';
    };
    el = UI.sheet.open('', {});
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-l]');
      if (b) { lang = b.getAttribute('data-l'); S.msgLang = lang; draw(); }
      else if (e.target.closest('#pv-copy')) { UI.copy(msgFromKey(x, lang), t('Message copied. Paste it into Zalo.')); S.reminded[p[0] + p[1]] = true; UI.sheet.close(); render(); }
    });
    draw();
  }

  /* ---------- 5. More ---------- */
  function moreView() {
    var items = [['scores', 'chart', 'Scores', 'Score a student on the six skills'], ['breaks', 'pause', 'Breaks', 'Planned breaks and fee reductions'], ['cancel', 'ban', 'Cancel a session', 'Public holiday or closed venue'],
      ['timetable', 'clock', 'Timetable and seats', 'Class days, times and extra seats'], ['videos', 'video', 'Videos', 'One link per skill'], ['settings', 'settings', 'Settings', 'All the numbers and texts']];
    return '<div class="view-h"><h2>' + t('More') + '</h2></div><div class="menu">' + items.map(function (x) {
      return '<button class="li" data-a="sub" data-x="' + x[0] + '">' + icon(x[1]) + '<div class="grow"><b>' + t(x[2]) + '</b><span class="muted small">' + t(x[3]) + '</span></div>' + icon('chevR') + '</button>';
    }).join('') + '</div><div class="card" style="margin-top:16px"><div class="row between"><div><b>' + t('Signed in') + '</b><div class="muted small">' + t('The sign-in lasts 6 hours. After that you enter the password again.') + '</div></div><button class="btn" data-a="logout">' + t('Sign out') + '</button></div></div>';
  }
  function subView() {
    return { scores: scoresView, breaks: breaksView, cancel: cancelView, timetable: timetableView, videos: videosView, settings: settingsView }[S.sub]();
  }

  /* scores */
  function scoresView() {
    if (!S.scoreSid) {
      var firstDue = BC.students.filter(function (s) { return s.active && scoreDue(s.id); })[0];
      S.scoreSid = (firstDue || BC.students[0]).id; S.draft = null;
    }
    var sid = S.scoreSid, l = lastScore(sid);
    if (!S.draft) { S.draft = {}; if (l) BC.skills.forEach(function (k) { S.draft[k.id] = l.v[k.id]; }); }
    var opts = BC.students.filter(function (s) { return s.active; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); }).map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === sid ? ' selected' : '') + '>' + h(s.name) + ' (' + s.code + ')' + (scoreDue(s.id) ? ' · ' + t('due') : '') + '</option>';
    }).join('');
    var complete = BC.skills.every(function (k) { return S.draft[k.id]; });
    var rows = BC.skills.map(function (k) {
      var was = l ? l.v[k.id] : 0, cur = S.draft[k.id] || 0;
      var btns = '';
      for (var n = 1; n <= 10; n++) btns += '<button data-a="score" data-x="' + k.id + ':' + n + '" aria-pressed="' + (cur === n) + '" class="' + (was === n ? 'was' : '') + '">' + n + '</button>';
      return '<div><div class="row between small" style="margin-bottom:4px"><b>' + k[S.lang] + '</b><span class="muted">' + (was ? t('last time {n}', { n: was }) : '') + '</span></div><div class="scorebtns">' + btns + '</div></div>';
    }).join('');
    return subHead(t('Scores')) + '<div class="card stack"><label class="field"><span class="lbl">' + t('Student') + '</span><select class="inp" data-bind="scoreSid">' + opts + '</select><span class="hint">' + (l ? t('Last scored {date}. Every 2 to 3 months is enough.', { date: dt(l.date) }) : t('Not scored yet.')) + '</span></label>' +
      (complete ? BC.radar(S.draft, l ? l.v : null, S.lang) : '<div class="empty small">' + t('Tap a number for each of the six skills to see the polygon.') + '</div>') +
      '<div class="stack">' + rows + '</div><p class="muted tiny">' + t('Orange underline = last scoring. Today is {date}.', { date: dt(BC.today) }) + '</p><button class="btn primary block" data-a="savescore"' + (complete ? '' : ' disabled') + '>' + t('Save scores') + '</button></div>';
  }

  /* breaks */
  function breakReduction(b) {
    var s = BC.student(b.student), total = 0, idx = BC.breaks.indexOf(b);
    for (var ym = BC.ym(b.from); ym <= BC.ym(b.to); ym = BC.addMonths(ym, 1)) {
      var withB = BC.calcAmount(s, ym); BC.breaks.splice(idx, 1); var without = BC.calcAmount(s, ym); BC.breaks.splice(idx, 0, b); total += without - withB;
    }
    return total;
  }
  function breaksView() {
    var list = BC.breaks.slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    var rows = list.map(function (b) {
      var s = BC.student(b.student), long = BC.isLong(b), red = breakReduction(b);
      return '<div class="li"><div class="avatar">' + initials(s.name) + '</div><div class="grow"><b>' + h(s.name) + ' <span class="muted small">' + h(s.code) + '</span></b><span class="small muted">' + dt(b.from) + ' – ' + dt(b.to) + ' · ' + t('{n} days', { n: BC.breakLen(b) }) + '</span><span class="small muted">' + t('Told you on {date}', { date: BC.fmtDay(b.notified, S.lang) }) + (b.note ? ' · ' + h(b.note) : '') + '</span></div>' +
        '<div class="right"><span class="tag ' + (long ? 'info' : '') + '">' + (long ? t('Long break') : t('Short break')) + '</span><div class="bold" style="margin-top:4px">' + (long ? '−' + money(red) : t('No fee change')) + '</div></div>' +
        (long ? '<button class="btn icon sm" data-a="adjbreak" data-x="' + b.student + '|' + BC.ym(b.from) + '" aria-label="' + t('Change amount') + '">' + icon('pencil', 'sm') + '</button>' : '') + '</div>';
    }).join('');
    return subHead(t('Breaks')) + '<p class="muted small" style="margin-bottom:12px">' + t('Students plan breaks on their own card. A long break ({n} days or more) lowers the fee and gives no make-ups. A short break is just normal skips.', { n: cfg.long_break_days }) + '</p>' + (rows || '<div class="empty">' + t('No planned breaks.') + '</div>');
  }

  /* cancel a session */
  function cancelView() {
    var up = [], i;
    for (i = 0; i < 35; i++) { var s = BC.session(BC.addDays(BC.today, i)); if (s.isClass && !s.cancelled) up.push(s); }
    if (S.cancelIso && !up.some(function (x) { return x.iso === S.cancelIso; })) S.cancelIso = null;
    var sel = S.cancelIso ? BC.session(S.cancelIso) : null;
    var list = up.map(function (s) {
      var late = BC.diff(BC.today, s.iso) < cfg.advance_days;
      return '<button class="opt" data-a="pickcancel" data-x="' + s.iso + '" aria-pressed="' + (S.cancelIso === s.iso) + '"><div class="grow"><b>' + dt(s.iso) + '</b> <span class="muted small">' + s.start + '–' + s.end + '</span></div><span class="small muted">' + t('{n} booked', { n: s.count }) + '</span>' + (late ? '<span class="tag warn">' + t('Inside notice') + '</span>' : '') + '</button>';
    }).join('');
    var detail = '';
    if (sel) {
      var late = BC.diff(BC.today, sel.iso) < cfg.advance_days, until = BC.addMonths(BC.ym(sel.iso), cfg.cancel_credit_months);
      var sample = BC.student(sel.regular[0] || BC.students[0].id);
      detail = '<div class="card stack" style="margin-top:14px"><h3>' + dt(sel.iso) + '</h3>' +
        (late ? '<div class="banner warn">' + icon('info') + '<div><b>' + t('Inside the {n}-day notice window.', { n: cfg.advance_days }) + '</b><br>' + t('Students did not get a week of warning. Sort it out with them on Zalo.') + '</div></div>' : '<div class="banner ok">' + icon('check') + '<div>' + t('You are giving enough notice ({n} days or more).', { n: cfg.advance_days }) + '</div></div>') +
        '<div class="banner">' + icon('users') + '<div>' + t('{n} students are booked. Each one gets 1 free make-up lesson, usable until the end of {month}. No refunds.', { n: sel.regular.length, month: BC.monthOnly(until, S.lang) }) + (sel.makeups.length || sel.joins.length ? '<br>' + t('{n} make-ups or joins on this date are cancelled and go back to their owners.', { n: sel.makeups.length + sel.joins.length }) : '') + '</div></div>' +
        '<label class="field"><span class="lbl">' + t('Reason (shown to you only)') + '</span><input class="inp" id="cx-note" placeholder="' + t('e.g. Public holiday') + '"></label>' +
        '<div><div class="seg full" style="margin-bottom:8px"><button data-a="msglang" data-x="vi" aria-pressed="' + (S.msgLang === 'vi') + '">Tiếng Việt</button><button data-a="msglang" data-x="en" aria-pressed="' + (S.msgLang === 'en') + '">English</button></div><div class="msgbox">' + h(msg('cancel', sample, S.msgLang, sel.iso)) + '</div></div>' +
        '<button class="btn block" data-a="copycancel">' + icon('copy', 'sm') + ' ' + t('Copy announcement') + '</button><button class="btn danger block" data-a="docancel">' + icon('ban', 'sm') + ' ' + t('Cancel this session') + '</button></div>';
    }
    return subHead(t('Cancel a session')) + '<p class="muted small" style="margin-bottom:12px">' + t('Pick the date. You will see who is affected and get the message to paste into Zalo.') + '</p>' + detail.replace('margin-top:14px', 'margin:0 0 14px') + '<div>' + list + '</div>';
  }

  /* timetable and seats */
  function timetableView() {
    var rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var x = BC.timetable[d];
      return '<div class="tt-row"><b>' + BC.wd(d, S.lang) + '</b><button class="switch" role="switch" aria-checked="' + x.on + '" data-a="ttsw" data-x="' + d + '" aria-label="' + BC.wdLong(d, S.lang) + '"></button><input class="inp" type="time" data-bind="tt" data-k="' + d + ':start" value="' + x.start + '"' + (x.on ? '' : ' disabled') + '><input class="inp" type="time" data-bind="tt" data-k="' + d + ':end" value="' + x.end + '"' + (x.on ? '' : ' disabled') + '></div>';
    }).join('');
    var ovs = Object.keys(BC.overrides).sort().map(function (iso) {
      var o = BC.overrides[iso], c = o.courts == null ? cfg.venue_courts : o.courts;
      return '<div class="card" style="margin-top:8px"><div class="row between"><b>' + dt(iso) + '</b>' + (o.cancelled ? '<span class="tag bad">' + t('Cancelled') + '</span>' : '<button class="btn sm icon" data-a="ovrm" data-x="' + iso + '" aria-label="' + t('Remove') + '">' + icon('trash', 'sm') + '</button>') + '</div>' +
        (o.cancelled ? '<p class="muted small">' + h(o.note || '') + '</p>' : '<div class="ctl"><span>' + t('Extra seats') + '</span>' + stepper('extra:' + iso, o.extra || 0, 0, 2) + '</div><div class="ctl"><span>' + t('Courts available') + '</span>' + stepper('courts:' + iso, c, 1, cfg.venue_courts) + '</div>') + '</div>';
    }).join('');
    return subHead(t('Timetable and seats')) + '<div class="card"><h3 style="margin-bottom:6px">' + t('Class days and times') + '</h3><p class="muted small">' + t('Switch a day off to have no class (Friday is off).') + '</p>' + rows + '</div>' +
      '<div class="card"><h3>' + t('Special dates') + '</h3><p class="muted small">' + t('The venue has {courts} courts, {seats} players each: {total} seats. Add 0 to 2 extra seats, or fewer courts, on a date.', { courts: cfg.venue_courts, seats: cfg.seats_per_court, total: cfg.venue_courts * cfg.seats_per_court }) + '</p>' + ovs +
      '<div class="row" style="margin-top:12px"><input class="inp grow" type="date" id="ov-date" value="' + BC.addDays(BC.today, 8) + '"><button class="btn primary" data-a="ovadd">' + icon('plus', 'sm') + ' ' + t('Add date') + '</button></div></div>';
  }

  /* videos */
  function videosView() {
    var rows = BC.skills.map(function (k) {
      var v = BC.videos[k.id];
      return '<div class="card stack" style="margin-top:10px"><div class="row between"><b>' + k[S.lang] + '</b><span class="tag ' + (v.url ? 'ok' : '') + '">' + (v.url ? t('link set') : t('no link yet')) + '</span></div>' +
        '<label class="field"><span class="lbl">' + t('YouTube or TikTok link') + '</span><input class="inp" type="url" data-bind="vid" data-k="' + k.id + ':url" placeholder="https://" value="' + h(v.url) + '"></label>' +
        '<label class="field"><span class="lbl">' + t('Title (optional)') + '</span><input class="inp" data-bind="vid" data-k="' + k.id + ':title" value="' + h(v.title) + '"></label></div>';
    }).join('');
    return subHead(t('Videos')) + '<p class="muted small">' + t('Students see the clip for their weakest skill. Paste the link and it saves by itself.') + '</p>' + rows;
  }

  /* settings */
  var DEFS = { advance_days: 7, flex_notice_days: 7, pay_by_day: 5, first_bill_days: 3, max_makeups_per_month: 3, max_makeup_changes_per_month: 3, long_break_days: 14, cancel_credit_months: 1, venue_courts: 4, seats_per_court: 4, monthly_fee: 1000000, fee_round: 1000, proration: true, credit_carry: true, page_title: 'VM Badminton', default_lang: 'vi', timezone: 'Asia/Ho_Chi_Minh' };
  var SET = [
    ['Class rules', [['advance_days', 'Notice for skips, make-ups and breaks (calendar days)', 'n', 0, 30], ['flex_notice_days', 'Flexible students join a session this many days ahead', 'n', 0, 30], ['pay_by_day', 'Fee is paid by the end of this day of the month', 'n', 1, 28], ['first_bill_days', 'A new student\'s first bill is due this many days after the start date', 'n', 0, 14],
      ['max_makeups_per_month', 'Make-ups per student per month', 'n', 0, 10], ['max_makeup_changes_per_month', 'Moves or cancels of a booked make-up per month (0 = no limit)', 'n', 0, 10], ['long_break_days', 'A break this long or longer is a long break (days)', 'n', 2, 60], ['cancel_credit_months', 'A cancelled-lesson credit stays valid this many more months', 'n', 0, 3]]],
    ['Seats', [['venue_courts', 'Courts the venue has', 'n', 1, 8], ['seats_per_court', 'Players per court', 'n', 2, 6]]],
    ['Money', [['monthly_fee', 'Usual monthly fee (VND)', 'money'], ['fee_round', 'Round amounts to this many VND', 'money'], ['proration', 'Pay only for the lessons studied (mid-month joiners, long breaks)', 'bool'], ['credit_carry', 'A too-high paid bill becomes a credit on the next bill', 'bool']]],
    ['Page', [['page_title', 'Page title (browser tab and link previews)', 'text'], ['default_lang', 'Default language on the student card', 'lang'], ['timezone', 'Time zone', 'tz']]]
  ];
  function settingsView() {
    var def = function (k, type) {
      var d = DEFS[k]; if (type === 'bool') d = d ? t('on') : t('off'); else if (type === 'money') d = money(d); else if (type === 'lang') d = d === 'vi' ? 'Tiếng Việt' : 'English';
      return t('Default: {v}', { v: d });
    };
    var sections = SET.map(function (sec) {
      return '<div class="card"><h3>' + t(sec[0]) + '</h3>' + sec[1].map(function (r) {
        var k = r[0], type = r[2], v = cfg[k], ctl;
        if (type === 'n') ctl = stepper('set:' + k, v, r[3], r[4]);
        else if (type === 'money') ctl = '<input class="inp" type="number" step="1000" min="0" data-bind="set" data-k="' + k + '" value="' + v + '">';
        else if (type === 'bool') ctl = '<button class="switch" role="switch" aria-checked="' + v + '" data-a="setsw" data-x="' + k + '"></button>';
        else if (type === 'text') ctl = '<input class="inp" data-bind="set" data-k="' + k + '" value="' + h(v) + '">';
        else if (type === 'lang') ctl = '<select class="inp" data-bind="set" data-k="' + k + '"><option value="vi"' + (v === 'vi' ? ' selected' : '') + '>Tiếng Việt</option><option value="en"' + (v === 'en' ? ' selected' : '') + '>English</option></select>';
        else ctl = '<select class="inp" data-bind="set" data-k="' + k + '"><option' + (v === 'Asia/Ho_Chi_Minh' ? ' selected' : '') + '>Asia/Ho_Chi_Minh</option><option' + (v === 'Asia/Bangkok' ? ' selected' : '') + '>Asia/Bangkok</option><option' + (v === 'UTC' ? ' selected' : '') + '>UTC</option></select>';
        var changed = v !== DEFS[k];
        return '<div class="set-row"><div class="l"><div>' + t(r[1]) + '</div><div class="muted tiny">' + def(k, type) + (changed ? ' · <a href="#" data-a="setreset" data-x="' + k + '">' + t('reset') + '</a>' : '') + '</div></div>' + ctl + '</div>';
      }).join('') + '</div>';
    }).join('');
    var msgs = ['vi', 'en'].map(function (lg) {
      return ['soft', 'late', 'cancel'].map(function (kind) {
        var lbl = { soft: 'Friendly heads-up', late: 'Late reminder', cancel: 'Cancelled session' }[kind];
        return '<label class="field"><span class="lbl">' + t(lbl) + ' · ' + (lg === 'vi' ? 'Tiếng Việt' : 'English') + '</span><textarea class="inp" data-bind="msg" data-k="' + lg + '.' + kind + '">' + h(BC.messages[lg][kind]) + '</textarea></label>';
      }).join('');
    }).join('');
    var qr = '<div class="card stack"><h3>' + t('Your QR image') + '</h3><p class="muted small">' + t('Students see this next to the amount and their payment code. It is kept in the private Sheet, never in the public repo.') + '</p>' +
      '<div class="qr-preview">' + (BC.qrImage ? '<img alt="QR" style="width:100%;display:block;border-radius:8px" src="' + BC.qrImage + '">' : BC.fakeQR(7)) + '</div><p class="muted tiny">' + (BC.qrImage ? t('Your image (not saved anywhere in this mockup).') : t('Demo QR. Upload your own bank QR.')) + '</p>' +
      '<input type="file" id="qr-file" accept="image/*" class="hide"><button class="btn" data-a="qrpick">' + icon('plus', 'sm') + ' ' + t('Choose image') + '</button></div>';
    return subHead(t('Settings')) + '<p class="muted small" style="margin-bottom:12px">' + t('Every number the site uses. Changes save by themselves.') + '</p>' + sections + qr +
      '<div class="card stack"><h3>' + t('Message texts') + '</h3><p class="muted small">' + t('Placeholders: {name} {month} {amount} {due} {code} {link} {weekday} {date} {until}') + '</p>' + msgs + '<button class="btn" data-a="msgreset">' + t('Reset texts to the defaults') + '</button></div>' +
      '<button class="btn danger block" style="margin-top:14px" data-a="setresetall">' + t('Reset all settings to defaults') + '</button>';
  }

  /* ---------- render and events ---------- */
  function render() {
    BC.lang = S.lang; document.documentElement.lang = S.lang; cfg = BC.config;
    var y = window.scrollY, focus = document.activeElement && document.activeElement.id;
    app.innerHTML = S.auth ? shell() : loginView();
    window.scrollTo(0, y);
    if (!S.auth) { var pw = $('#pw'); if (pw && !S.checking) pw.focus(); }
    syncPanel();
    if (focus === 'q') { var q = $('#q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  function toast(msg, kind) { UI.toast(msg, kind); }

  function stepAction(key, d) {
    var p = key.split(':'), kind = p[0];
    if (kind === 'set') {
      var def = SET.reduce(function (a, s) { return a.concat(s[1]); }, []).filter(function (r) { return r[0] === p[1]; })[0];
      cfg[p[1]] = Math.max(def[3], Math.min(def[4], cfg[p[1]] + d)); render(); toast(t('Saved')); return;
    }
    var iso = p[1], o = BC.overrides[iso] || (BC.overrides[iso] = {});
    if (kind === 'extra') o.extra = Math.max(0, Math.min(2, (o.extra || 0) + d));
    else { var cur = o.courts == null ? cfg.venue_courts : o.courts; o.courts = Math.max(1, Math.min(cfg.venue_courts, cur + d)); if (o.courts === cfg.venue_courts) delete o.courts; }
    render(); toast(t('Saved'));
  }

  app.addEventListener('click', function (e) {
    var el;
    if (e.target.closest('#login-go')) { doLogin(); return; }
    if ((el = e.target.closest('[data-lang]'))) { S.lang = el.getAttribute('data-lang'); try { localStorage.setItem('bc_admin_lang', S.lang); } catch (er) { /* ignore */ } render(); return; }
    if ((el = e.target.closest('[data-tab]'))) { S.tab = el.getAttribute('data-tab'); S.sub = null; render(); window.scrollTo(0, 0); return; }
    if ((el = e.target.closest('[data-a]'))) {
      var a = el.getAttribute('data-a'), x = el.getAttribute('data-x'), y = el.getAttribute('data-y');
      if (el.tagName === 'A') e.preventDefault();
      switch (a) {
        case 'toggle': S.open[x] = !S.open[x]; render(); break;
        case 'step': stepAction(x, Number(y)); break;
        case 'cancelses': S.cancelIso = x; S.sub = 'cancel'; S.tab = 'more'; render(); window.scrollTo(0, 0); break;
        case 'filter': S.filter = x; render(); break;
        case 'stu': openStudent(Number(x)); break;
        case 'addstu': openAddStudent(); break;
        case 'pm': S.payMonth = BC.addMonths(S.payMonth, Number(x)); render(); break;
        case 'paid': BC.setPaid(Number(x), S.payMonth, true); render(); toast(t('{name} marked as paid', { name: BC.student(Number(x)).name })); break;
        case 'undopaid': BC.setPaid(Number(x), S.payMonth, false); render(); toast(t('Back to unpaid')); break;
        case 'editamt': openEditAmount(Number(x)); break;
        case 'copymsg': copyMsg(x); break;
        case 'prevmsg': openPreview(x); break;
        case 'sub': S.sub = x; render(); window.scrollTo(0, 0); break;
        case 'back': S.sub = null; S.tab = 'more'; render(); window.scrollTo(0, 0); break;
        case 'logout': S.auth = false; try { sessionStorage.removeItem('bc_admin_auth'); } catch (er) { /* ignore */ } S.sub = null; S.tab = 'sessions'; render(); break;
        case 'score': { var q = x.split(':'); S.draft[q[0]] = Number(q[1]); render(); break; }
        case 'savescore': {
          var arr = BC.scores[S.scoreSid] || (BC.scores[S.scoreSid] = []), v = {};
          BC.skills.forEach(function (k) { v[k.id] = S.draft[k.id]; });
          arr.push({ date: BC.today, v: v }); S.draft = null; render(); toast(t('Scores saved. The student sees the new polygon.')); break;
        }
        case 'adjbreak': { var pp = x.split('|'); S.payMonth = pp[1]; S.sub = null; S.tab = 'payments'; render(); openEditAmount(Number(pp[0])); break; }
        case 'pickcancel': S.cancelIso = x; render(); window.scrollTo(0, 0); break;
        case 'msglang': S.msgLang = x; render(); break;
        case 'copycancel': UI.copy(msg('cancel', null, S.msgLang, S.cancelIso), t('Message copied. Paste it into Zalo.')); break;
        case 'docancel': {
          var iso = S.cancelIso, note = ($('#cx-note') || {}).value || '';
          UI.confirm({ title: t('Cancel {date}?', { date: dt(iso) }), body: t('Booked students each get 1 free make-up lesson. You cannot undo this in the mockup.'), ok: t('Cancel session'), cancel: t('Keep it'), danger: true }).then(function (yes) {
            if (!yes) return; var r = BC.cancelSession(iso, note); S.cancelIso = null; S.reminded['canc' + iso] = false; S.sub = null; S.tab = 'remind'; render(); toast(t('Cancelled. {n} students got a free make-up.', { n: r.affected }));
          });
          break;
        }
        case 'ttsw': BC.timetable[x].on = !BC.timetable[x].on; render(); toast(t('Saved')); break;
        case 'ovadd': {
          var d = $('#ov-date').value; if (!d || !BC.classDay(d)) { toast(t('That day has no class.'), 'bad'); break; }
          if (!BC.overrides[d]) BC.overrides[d] = { extra: 1 }; render(); toast(t('Saved')); break;
        }
        case 'ovrm': delete BC.overrides[x]; render(); toast(t('Saved')); break;
        case 'setsw': cfg[x] = !cfg[x]; render(); toast(t('Saved')); break;
        case 'setreset': cfg[x] = DEFS[x]; render(); toast(t('Saved')); break;
        case 'setresetall': Object.keys(DEFS).forEach(function (k) { cfg[k] = DEFS[k]; }); render(); toast(t('All settings are back to the defaults.')); break;
        case 'msgreset': BC.messages = BC.defaultMessages(); render(); toast(t('Saved')); break;
        case 'qrpick': $('#qr-file').click(); break;
      }
    }
  });

  app.addEventListener('input', function (e) {
    if (e.target.id === 'q') { S.q = e.target.value; var L = $('#stu-list'); if (L) L.innerHTML = stuRows(); }
  });
  app.addEventListener('change', function (e) {
    var el = e.target, b = el.getAttribute && el.getAttribute('data-bind'), k = el.getAttribute && el.getAttribute('data-k');
    if (el.id === 'qr-file' && el.files && el.files[0]) {
      var fr = new FileReader(); fr.onload = function () { BC.qrImage = fr.result; render(); toast(t('Saved')); }; fr.readAsDataURL(el.files[0]); return;
    }
    if (!b) return;
    if (b === 'scoreSid') { S.scoreSid = Number(el.value); S.draft = null; render(); }
    else if (b === 'tt') { var p = k.split(':'); BC.timetable[p[0]][p[1]] = el.value; toast(t('Saved')); }
    else if (b === 'vid') { var q = k.split(':'); BC.videos[q[0]][q[1]] = el.value; render(); toast(t('Saved')); }
    else if (b === 'set') {
      var v = el.type === 'number' ? Number(el.value) : el.value; cfg[k] = v; if (k === 'page_title') document.title = v + ' · Coach'; toast(t('Saved')); if (k === 'monthly_fee' || k === 'fee_round') render();
    }
    else if (b === 'msg') { var m = k.split('.'); BC.messages[m[0]][m[1]] = el.value; toast(t('Saved')); }
  });
  app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'pw') doLogin(); });

  /* ---------- mockup-only controls ---------- */
  var panel = UI.mockPanel(
    '<h3>Mock controls</h3><div class="note">Only in the mockup. Jump between situations the coach meets.</div>' +
    '<label>Pretend today is</label><div class="seg full" id="m-today"><button data-v="2026-11-03">3 Nov</button><button data-v="2026-11-05">5 Nov</button><button data-v="2026-11-06">6 Nov</button><button data-v="2026-11-12">12 Nov</button></div>' +
    '<label>Sign-in</label><button class="mb" id="m-logout">Sign out (see the password screen)</button>' +
    '<label>Data</label><button class="mb" id="m-reset">Reset all fake data</button>', { up: true });
  function syncPanel() { $$('#m-today button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === BC.today)); }); }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.parentElement.id === 'm-today') { BC.today = b.getAttribute('data-v'); S.payMonth = BC.ym(BC.today); render(); }
    else if (b.id === 'm-logout') { S.auth = false; try { sessionStorage.removeItem('bc_admin_auth'); } catch (er) { /* ignore */ } S.sub = null; S.tab = 'sessions'; panel.classList.add('hide'); render(); }
    else if (b.id === 'm-reset') { BC.seed(); cfg = BC.config; S.open = {}; S.reminded = {}; S.draft = null; S.scoreSid = null; S.cancelIso = null; S.payMonth = BC.ym(BC.today); render(); UI.toast('Reset'); }
  });

  render();
})();
