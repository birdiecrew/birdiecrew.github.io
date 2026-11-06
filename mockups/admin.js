/* Coach admin mockup. Made-up data, kept in this browser only (the real site keeps the coach's own save file the same way). */
(function () {
  'use strict';
  var h = UI.h, icon = UI.icon, $ = UI.$, $$ = UI.$$;
  var cfg = BC.config;
  var S = {
    mode: 'app', lang: 'en', tab: 'sessions', sub: null, open: {}, filter: 'all', q: '', payMonth: BC.ym(BC.today),
    scoreSid: null, draft: null, cancelIso: null, msgLang: 'vi', reminded: {}
  };
  try { var l0 = localStorage.getItem('bc_admin_lang'); if (l0 === 'vi' || l0 === 'en') S.lang = l0; } catch (e) { /* ignore */ }

  function t(en, v) {
    var s = (S.lang === 'vi' && window.VI[en] != null) ? window.VI[en] : en;
    return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s;
  }
  function money(n) { return BC.fmtVND(n, S.lang); }
  function dt(iso) { return BC.fmtDate(iso, S.lang); }
  function ymNow() { return BC.ym(BC.today); }
  function monthWord(ym, lang) { return lang === 'vi' ? 'tháng ' + Number(ym.slice(5)) : BC.monthOnly(ym, 'en'); }
  function cardBase() { try { return new URL('student.html', location.href).href; } catch (e) { return 'student.html'; } }
  var app = $('#app');
  var SU = Setup.create({ t: t, h: h, icon: icon, money: money, S: S, $: $, render: function () { render(); }, toast: function (m, k) { UI.toast(m, k); } });

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
    return BC.fill(tpl, { name: s.name, month: monthWord(ym, lang), amount: BC.fmtVND(BC.amountDue(s, ym), lang), due: BC.fmtDay(BC.dueDate(s, ym), lang), code: s.code });
  }
  function initials(n) { return h(n.charAt(0).toUpperCase()); }
  function ava(s) { return UI.avatarInner(s.id, s.name); }
  function lastScore(sid) { var a = BC.scores[sid]; return a && a.length ? a[a.length - 1] : null; }
  function scoreDue(sid) { var l = lastScore(sid); return !l || BC.diff(l.date, BC.today) >= 60; }

  /* ---------- shell ---------- */
  function ago(ms) {
    var d = Math.floor((Date.now() - ms) / 864e5);
    return d <= 0 ? t('today') : d === 1 ? t('yesterday') : t('{n} days ago', { n: d });
  }
  function shell() {
    var rd = remindData(), nRemind = rd.soft.length + rd.late.length, bk = BC.backup();
    var unpaid = payRows(ymNow()).filter(function (r) { return !r.rec.paid; }).length;
    var tabs = [['sessions', 'cal2', 'Sessions', 0], ['students', 'users', 'Students', 0], ['payments', 'wallet', 'Payments', unpaid], ['remind', 'bell', 'Remind', nRemind], ['more', 'more', 'More', 0]];
    var isSample = !!(BC.meta && BC.meta.sample), nag = bk.dirty && !isSample;
    var chip = '<button class="btn sm dchip' + (nag ? ' primary' : '') + '" data-a="gotodata" aria-label="' + t('Your data') + '">' + icon(nag ? 'copy' : (isSample ? 'info' : 'check'), 'sm') + ' ' + (isSample ? t('Sample') : (nag ? t('Back up now') : t('Backed up'))) + '</button>';
    var sample = BC.meta && BC.meta.sample ? '<div class="banner sample-bar" style="margin-bottom:12px"><div>' + icon('info') + ' <b>' + t('Sample class') + '</b> · ' + t('made-up students') + '</div><button class="btn sm" data-a="clearsample">' + t('Start my own class') + '</button></div>' : '';
    return '<header class="top"><div class="row between"><div class="row">' + UI.logo(36) + '<div><h1>' + h(cfg.page_title) + '</h1></div></div>' +
      '<div class="row" style="gap:8px">' + UI.themeBtn() + '<div class="seg" role="group" aria-label="Language"><button data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">VI</button><button data-lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div></div></div>' +
      '<div class="row sub"><span class="muted small">' + t('Coach') + ' · ' + dt(BC.today) + '</span>' + chip + '</div></header>' + sample +
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
    var open = !!S.open[ses.iso], names = function (ids, cls) { return ids.map(function (id) { return '<button class="nm ' + (cls || '') + '" data-a="nmday" data-x="' + id + '|' + ses.iso + '">' + h(BC.student(id).name) + '</button>'; }).join(''); };
    var pills = '';
    if (ses.cancelled) pills += '<span class="tag bad">' + t('Cancelled') + '</span>';
    else {
      if (ses.over) pills += '<span class="tag bad">' + t('Over capacity') + '</span>';
      else if (ses.free === 0) pills += '<span class="tag warn">' + t('Full') + '</span>';
    }
    var courts = ses.cancelled ? '<div class="courts zero"><div class="big">0</div><div class="l">' + t('courts') + '</div></div>' : '<div class="courts ' + (ses.over ? 'bad' : '') + '"><div class="big">' + ses.courtsToBook + '</div><div class="l">' + t('courts to book') + '</div></div>';
    var body = '';
    if (open) {
      body = '<div class="ses-b">';
      var notes = '';
      if (ses.extra) notes += '<span class="tag">' + t('+{n} extra seat', { n: ses.extra }) + '</span> ';
      if (ses.courts < cfg.venue_courts) notes += '<span class="tag">' + t('{n} courts only', { n: ses.courts }) + '</span> ';
      if (ses.locked && !ses.cancelled) notes += '<span class="tag">' + icon('lock', 'sm') + ' ' + t('Headcount final') + '</span>';
      if (notes) body += '<div class="row wrap" style="margin-top:10px;gap:6px">' + notes + '</div>';
      if (ses.coming.length) body += '<h3>' + t('Coming ({n})', { n: ses.count }) + '</h3><div class="names">' + names(ses.regular) + names(ses.makeups, 'mk') + names(ses.joins, 'jn') + '</div>';
      if (ses.makeups.length || ses.joins.length) body += '<p class="tiny muted">' + (ses.makeups.length ? '<span class="nm mk">' + t('make-up') + '</span> ' : '') + (ses.joins.length ? '<span class="nm jn">' + t('flexible') + '</span>' : '') + '</p>';
      if (ses.skipped.length) body += '<h3>' + t('Skipped ({n})', { n: ses.skipped.length }) + '</h3><div class="names">' + names(ses.skipped, 'sk') + '</div>';
      if (ses.onBreak.length) body += '<h3>' + t('On a long break ({n})', { n: ses.onBreak.length }) + '</h3><div class="names">' + names(ses.onBreak, 'sk') + '</div>';
      if (!ses.cancelled) {
        body += '<p class="tiny muted" style="margin-top:8px">' + t('Tap a name to change their lesson.') + '</p><button class="btn sm" data-a="addtoses" data-x="' + ses.iso + '" style="margin-top:8px">' + icon('plus', 'sm') + ' ' + t('Add a student') + '</button>' +
          '<hr class="sep"><div class="ctl"><div><b>' + t('Extra seats') + '</b><div class="muted small">' + t('0 to 2 on top of {n}', { n: ses.courts * cfg.seats_per_court }) + '</div></div>' + stepper('extra:' + ses.iso, ses.extra, 0, 2) + '</div>' +
          '<div class="ctl"><div><b>' + t('Courts available') + '</b><div class="muted small">' + t('The venue has {n}', { n: cfg.venue_courts }) + '</div></div>' + stepper('courts:' + ses.iso, ses.courts, 1, cfg.venue_courts) + '</div>' +
          '<button class="btn danger sm" data-a="cancelses" data-x="' + ses.iso + '">' + icon('ban', 'sm') + ' ' + t('Cancel this session') + '</button>';
      } else body += '<p class="muted small">' + h(ses.ov.note || '') + '</p>';
      body += '</div>';
    }
    return '<div class="ses"><button class="ses-h" data-a="toggle" data-x="' + ses.iso + '" aria-expanded="' + open + '"><div class="d"><b>' + dt(ses.iso) + '</b><span class="muted small" style="display:block;white-space:nowrap">' + ses.start + '–' + ses.end + '</span>' +
      (pills ? '<div class="row wrap" style="margin-top:6px;gap:6px">' + pills + '</div>' : '') + '</div><div class="right"><div class="big">' + ses.count + ' <small>/ ' + ses.seats + '</small></div><div class="muted tiny">' + t('coming') + '</div></div>' + courts + '</button>' + body + '</div>';
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
      if (!s.active) tags = '<span class="tag">' + t('Paused') + '</span>';
      else if (late) tags = '<span class="tag bad">' + t('Late') + '</span>';
      else if (s.start > BC.today) tags = '<span class="tag">' + t('Starts {date}', { date: BC.fmtDay(s.start, S.lang) }) + '</span>';
      else if (started && !rec.paid) tags = '<span class="tag warn">' + t('Unpaid') + '</span>';
      return '<button class="li" data-a="stu" data-x="' + s.id + '"><div class="avatar ' + (late ? 'late' : '') + '">' + ava(s) + '</div><div class="grow"><b>' + h(s.name) + '</b><span class="muted small">' + h(s.code) + ' · ' + days + '</span></div><div class="row" style="gap:4px;flex-wrap:wrap;justify-content:flex-end">' + tags + '</div></button>';
    }).join('');
  }
  function studentsView() {
    var ym = ymNow(), n = function (f) { return BC.students.filter(f).length; };
    var chips = [['all', 'All', BC.students.length],
      ['unpaid', 'Unpaid', n(function (s) { return s.active && BC.ym(s.start) <= ym && !BC.payRec(s.id, ym).paid; })], ['paused', 'Paused', n(function (s) { return !s.active; })]];
    var need = BC.meta && BC.meta.sample ? [] : BC.cardsToSend();
    var cardBanner = need.length ? '<div class="banner" style="margin-bottom:12px">' + icon('copy') + '<div><b>' + (need.length === 1 ? t('1 card to send') : t('{n} cards to send', { n: need.length })) + '</b><br>' + t('New students, or something changed since their last card.') + '<br><button class="btn sm" data-a="cards">' + t('Send cards') + '</button></div></div>' : '';
    return '<div class="view-h row between"><h2>' + t('Students') + '</h2><button class="btn primary" data-a="addstu"' + (BC.students.length >= BC.LIMITS.students ? ' disabled' : '') + '>' + icon('plus', 'sm') + ' ' + (BC.students.length >= BC.LIMITS.students ? t('Class is full') : t('Add student')) + '</button></div>' +
      cardBanner + '<input class="inp" type="search" id="q" placeholder="' + t('Search name or code') + '" value="' + h(S.q) + '" style="margin-bottom:10px">' +
      '<div class="chips" style="margin-bottom:12px">' + chips.map(function (c) { return '<button class="chip" data-a="filter" data-x="' + c[0] + '" aria-pressed="' + (S.filter === c[0]) + '">' + t(c[1]) + ' ' + c[2] + '</button>'; }).join('') + '</div>' +
      '<div id="stu-list">' + stuRows() + '</div>';
  }

  /* student sheets */
  function dayChips(sel, off) {
    return [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return BC.timetable[d].on; }).map(function (d) {
      return '<button type="button" class="chip" data-day="' + d + '" aria-pressed="' + (sel.indexOf(d) >= 0) + '"' + (off ? ' disabled' : '') + '>' + BC.wd(d, S.lang) + '</button>';
    }).join('');
  }
  function firstBill(ed) {
    if (!ed.start) return '';
    var tmp = { id: -1, name: ed.name, type: ed.type, days: ed.days, start: ed.start, fee: ed.fee || null }, ym = BC.ym(ed.start);
    var amt = BC.calcAmount(tmp, ym), billed = BC.billedDates(tmp, ym).length, full = BC.lessonDates(tmp, ym).length;
    return '<div class="banner">' + icon('wallet') + '<div><b>' + t('First bill') + ': ' + money(amt) + '</b><br>' + t('{a} of {b} lessons in {month}', { a: billed, b: full, month: BC.monthOnly(ym, S.lang) }) + '<br>' + t('Due {date}', { date: dt(BC.dueDate(tmp, ym)) }) + '</div></div>';
  }
  /* why the student cannot be saved yet, in the order the coach would fix it ('' = fine) */
  function studentReason(ed, selfId) {
    var name = ed.name.trim(), L = BC.LIMITS;
    if (!selfId && BC.students.length >= L.students) return 'full';
    if (!name) return 'name';
    if (BC.students.some(function (x) { return x.id !== selfId && BC.nameKey(x.name) === BC.nameKey(name); })) return 'dup';
    if (ed.type === 'fixed' && !ed.days.length) return 'days';
    if (!ed.start || ed.start < BC.addDays(BC.today, -L.dayRange) || ed.start > BC.addDays(BC.today, L.dayRange)) return 'date';
    return '';
  }
  function reasonLine(r) {
    var txt = { full: t('The class is full ({n} students).', { n: BC.LIMITS.students }), name: t('Type a name first.'), dup: t('Someone with this name is already in the class.'),
      days: t('Pick at least one day.'), date: t('Choose a start date within a year of today.'), '': t('Ready.') }[r];
    return '<div class="why' + (r ? '' : ' ready') + '" id="as-why">' + icon(r ? 'info' : 'check') + '<span>' + txt + '</span></div>';
  }
  function studentFormHtml(ed, gate) {
    var L = BC.LIMITS, noName = gate && !ed.name.trim();
    return '<div class="stack"><label class="field"><span class="lbl">' + t('Name (first name or nickname)') + '</span><input class="inp" id="f-name" maxlength="' + L.nameLen + '" autocomplete="off" value="' + h(ed.name) + '" placeholder="' + t('e.g. Lan') + '"></label>' +
      '<div class="field"><span class="lbl">' + t('Schedule') + '</span><div class="seg full"><button type="button" data-type="fixed" aria-pressed="' + (ed.type === 'fixed') + '">' + t('Fixed days') + '</button><button type="button" data-type="flexible" aria-pressed="' + (ed.type === 'flexible') + '">' + t('Flexible') + '</button></div></div>' +
      '<div class="field"><span class="lbl">' + t('Weekly days') + '</span><div class="chips" id="f-days">' + dayChips(ed.type === 'fixed' ? ed.days : [], noName || ed.type !== 'fixed') + '</div>' +
      '<span class="hint">' + (ed.type === 'fixed' ? t('Name first, then the days.') : t('Flexible students pick sessions themselves, at least {n} days ahead. No make-up credits.', { n: cfg.flex_notice_days })) + '</span></div>' +
      '<label class="field"><span class="lbl">' + t('Start date') + '</span><input class="inp" type="date" id="f-start" value="' + ed.start + '" min="' + BC.addDays(BC.today, -L.dayRange) + '" max="' + BC.addDays(BC.today, L.dayRange) + '"></label>' +
      '<label class="field"><span class="lbl">' + t('Own monthly fee (optional)') + '</span><input class="inp" type="number" inputmode="numeric" id="f-fee" step="1000" min="' + L.feeMin + '" max="' + L.feeMax + '" placeholder="' + BC.baseFee({ type: ed.type, days: ed.days || [], fee: null }) + '" value="' + (ed.fee || '') + '"><span class="hint">' + t('Leave empty for the usual {fee}', { fee: money(BC.baseFee({ type: ed.type, days: ed.days || [], fee: null })) }) + '</span></label></div>';
  }
  function bindForm(el, ed, redraw, onInput) {
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-type]'))) { ed.type = b.getAttribute('data-type'); redraw(); }
      else if ((b = e.target.closest('[data-day]')) && !b.disabled) {
        var d = Number(b.getAttribute('data-day')), i = ed.days.indexOf(d); if (i >= 0) ed.days.splice(i, 1); else ed.days.push(d); redraw();
      }
    });
    el.addEventListener('input', function (e) {
      if (e.target.id === 'f-name') ed.name = e.target.value;
      else if (e.target.id === 'f-start') ed.start = e.target.value;
      else if (e.target.id === 'f-fee') ed.fee = e.target.value ? Number(e.target.value) : null;
      else return;
      if (e.target.id === 'f-name') $$('#f-days .chip', el).forEach(function (c) { c.disabled = ed.type !== 'fixed' || !ed.name.trim(); });
      onInput && onInput();
    });
    el.addEventListener('change', function (e) {
      if (e.target.id !== 'f-fee' || !e.target.value) return;
      var L = BC.LIMITS, v = Math.round(Number(e.target.value) / 1000) * 1000;
      v = Math.max(L.feeMin, Math.min(L.feeMax, v)); ed.fee = v; e.target.value = v; onInput && onInput();
    });
  }

  function openAddStudent() {
    var ed = { name: '', type: 'fixed', days: [], start: BC.addDays(BC.today, 1), fee: null }, el, saved = null;
    var upd = function () {
      var p = $('#as-prev', el), b = $('#as-save', el), w = $('#as-why', el), r = studentReason(ed);
      if (p) p.innerHTML = r ? '' : firstBill(ed);
      if (w) w.outerHTML = reasonLine(r);
      if (b) b.disabled = !!r;
    };
    var draw = function () {
      if (saved) {
        el.innerHTML = '<div class="grab"></div><div class="sheet-h"><h2>' + t('{name} is added', { name: h(saved.name) }) + '</h2><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
          '<div class="stack"><div class="banner ok">' + icon('check') + '<div>' + t('Send their card on Zalo so they can see their days and fees.') + '</div></div>' +
          '<button class="btn primary block" data-a2="card">' + icon('copy', 'sm') + ' ' + t('Send card') + '</button>' +
          '<div class="kv" style="display:flex;justify-content:space-between"><span class="muted">' + t('Payment code') + '</span><b class="code" style="font-family:ui-monospace,monospace">' + h(saved.code) + '</b></div>' + firstBill(saved) +
          '<div class="row"><button class="btn grow" data-a2="another">' + t('Add another') + '</button><button class="btn primary grow" data-close>' + t('Done') + '</button></div></div>';
        return;
      }
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><h2>' + t('Add student') + '</h2><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' + studentFormHtml(ed, true) +
        '<div id="as-prev" style="margin-top:12px;min-height:96px"></div>' + reasonLine(studentReason(ed)) + '<button class="btn primary block" id="as-save" disabled>' + t('Save') + '</button>';
      upd();
    };
    el = UI.sheet.open('', {});
    bindForm(el, ed, draw, upd);
    el.addEventListener('click', function (e) {
      if (e.target.closest('#as-save')) {
        if (studentReason(ed)) return;
        saved = BC.addStudent({ name: ed.name.trim(), type: ed.type, days: ed.days, start: ed.start, fee: ed.fee }); draw(); render();
      } else if (e.target.closest('[data-a2="another"]')) {
        saved = null; ed.name = ''; ed.days = []; draw();
      } else if (e.target.closest('[data-a2="card"]')) openSendCard(saved.id);
    });
    draw();
  }

  /* every card that is new or out of date, one tap each. The order is fixed when the sheet opens, so rows never jump. */
  function openSendCards() {
    var el = UI.sheet.open('', {}), order = BC.cardsToSend().concat(BC.students.filter(function (s) { return s.active && BC.cardState(s.id) === 'current'; }))
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); });
    order.sort(function (a, b) { return (BC.cardState(a.id) === 'current') - (BC.cardState(b.id) === 'current'); });
    var draw = function () {
      var left = BC.cardsToSend().length;
      el.innerHTML = '<div class="grab"></div>' + shd(t('Send cards'), left ? (left === 1 ? t('1 card to send') : t('{n} cards to send', { n: left })) : t('All cards are up to date')) +
        '<div class="stack"><div class="seg full"><button data-ml="vi" aria-pressed="' + (S.msgLang === 'vi') + '">Tiếng Việt</button><button data-ml="en" aria-pressed="' + (S.msgLang === 'en') + '">English</button></div>' +
        '<p class="muted small">' + t('Tap Copy message, paste it into that student\'s Zalo chat, then tap the next one. A card counts as sent when you copy it.') + '</p><div>' +
        order.map(function (s) {
          var st = BC.cardState(s.id);
          return '<div class="hist"><div><b>' + h(s.name) + '</b><div class="muted tiny">' + (st === 'never' ? t('No card yet') : st === 'stale' ? t('Out of date') : t('Up to date')) + '</div></div>' +
            '<button class="btn sm' + (st === 'current' ? '' : ' primary') + '" data-cc="' + s.id + '">' + (st === 'current' ? t('Copy again') : t('Copy message')) + '</button></div>';
        }).join('') + '</div></div>';
    };
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ml]'), c = e.target.closest('[data-cc]');
      if (b) { S.msgLang = b.getAttribute('data-ml'); draw(); return; }
      if (!c) return;
      var sid = Number(c.getAttribute('data-cc')), s = BC.student(sid);
      BC.cardLink(sid, cardBase()).then(function (link) {
        UI.copy(BC.fill(BC.messages[S.msgLang].card, { name: s.name, date: BC.fmtDay(BC.today, S.msgLang), link: link }), t('Message copied. Paste it into Zalo.'));
        BC.markCardSent(sid); render(); draw();
      });
    });
    draw();
  }

  /* the student's card: a link that holds only that student's own lessons. Nothing is stored anywhere. */
  function openSendCard(id) {
    var s = BC.student(id), link = '', el = UI.sheet.open('', {});
    var text = function (full) { return BC.fill(BC.messages[S.msgLang].card, { name: s.name, date: BC.fmtDay(BC.today, S.msgLang), link: full ? link : (link ? link.replace(/#c=.*/, '#c=…') : '…') }); };
    var draw = function () {
      var kb = link ? Math.max(1, Math.round(link.length / 1024)) : 0, st = BC.cardState(id), m = BC.meta.cards && BC.meta.cards[id];
      var sentLine = st === 'never' ? t('No card sent yet.') : (st === 'stale' ? t('Last card sent {when}. Something changed since.', { when: ago(m.at) }) : t('Last card sent {when}. Nothing changed since.', { when: ago(m.at) }));
      el.innerHTML = '<div class="grab"></div>' + shd(t('Send card to {name}', { name: h(s.name) }), t('Card as of {date}', { date: dt(BC.today) })) +
        '<div class="stack"><div class="seg full"><button data-ml="vi" aria-pressed="' + (S.msgLang === 'vi') + '">Tiếng Việt</button><button data-ml="en" aria-pressed="' + (S.msgLang === 'en') + '">English</button></div>' +
        '<div class="why' + (st === 'current' ? ' ready' : '') + '" style="min-height:0">' + icon(st === 'current' ? 'check' : 'info') + '<span>' + sentLine + '</span></div>' +
        '<div class="msgbox">' + h(text(false)) + '</div>' +
        '<button class="btn primary block" data-cc' + (link ? '' : ' disabled') + '>' + icon('copy', 'sm') + ' ' + t('Copy message') + '</button>' +
        '<button class="btn block" data-view' + (link ? '' : ' disabled') + '>' + icon('link', 'sm') + ' ' + t('See it as {name} sees it', { name: h(s.name) }) + '</button>' +
        '<div class="why">' + icon('info') + '<span>' + (link ? t('The link holds only {name}\'s own lessons ({kb} KB). Nobody else\'s. Send a new card when something changes.', { name: h(s.name), kb: kb }) : t('Preparing the card...')) + '</span></div></div>';
    };
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-ml]'))) { S.msgLang = b.getAttribute('data-ml'); draw(); }
      else if (e.target.closest('[data-cc]') && link) { UI.copy(text(true), t('Message copied. Paste it into Zalo.')); BC.markCardSent(id); render(); draw(); }
      else if (e.target.closest('[data-view]') && link) window.open(link, '_blank', 'noopener');
    });
    draw();
    BC.cardLink(id, cardBase()).then(function (l) { link = l; if (UI.sheet.el() === el) draw(); });
  }

  /* ---------- the coach changes a student's lessons (the student asked her on Zalo) ---------- */
  function shd(title, sub) {
    return '<div class="sheet-h"><div><h2>' + title + '</h2>' + (sub ? '<div class="muted small">' + sub + '</div>' : '') + '</div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>';
  }
  /* why something was refused. Soft ones can be done anyway; hard ones cannot. */
  function reasonText(r, sid) {
    var s = sid ? BC.student(sid) : null, n = s && s.type === 'flexible' ? cfg.flex_notice_days : cfg.advance_days;
    var m = {
      late: t('This student\'s fee is late.'), notice: t('Less than {n} days before the lesson.', { n: n }), noticeBreak: t('The break starts in less than {n} days.', { n: cfg.advance_days }),
      full: t('The session is full. This takes the headcount over the seats.'), capReached: t('Already {n} make-ups this month. This one uses no credit.', { n: cfg.max_makeups_per_month }),
      noCredit: t('No make-up credit this month. This one uses no credit.'),
      fixedOnly: t('Only fixed-day students can do this.'), flexOnly: t('Only flexible students can do this.'), notRegular: t('This is not one of their regular lessons.'),
      cancelled: t('This session is cancelled.'), already: t('Already done for this day.'), notClass: t('There is no class on this day.'),
      alreadyIn: t('This is already one of their regular lessons.'), onBreak: t('They are on a break on this day.'), beforeStart: t('This is before their start date.'),
      notFound: t('Nothing to change here.'), fromBreak: t('This skip comes from a planned break. Remove the break instead.'),
      creditUsed: t('Its make-up credit is already used. Cancel that make-up first.'), creditUsedBreak: t('A make-up already uses a credit from this break. Cancel that make-up first.'),
      dateOrder: t('The end date must be on or after the start date.'), overlap: t('This overlaps a break already planned.')
    };
    return m[r] || t('This is not possible.');
  }
  function warnList(list, sid) { return (list || []).map(function (r) { return reasonText(r, sid); }).join(' '); }

  function runAct(sid, iso, act, force) {
    var o = force ? { force: true } : undefined;
    switch (act) {
      case 'skip': return BC.skip(sid, iso, o);
      case 'unskip': return BC.unskip(sid, iso, o);
      case 'makeup': return BC.makeup(sid, iso, o);
      case 'cancelmk': return BC.cancelMakeup(sid, iso, o);
      case 'join': return BC.join(sid, iso, o);
      case 'leave': return BC.leave(sid, iso, o);
    }
    return { ok: false, reason: 'notFound' };
  }
  function doneText(act, r) {
    if (act === 'skip') return r.credit ? t('Skipped. +1 make-up credit.') : t('Skipped. No credit: the monthly cap is reached.');
    if (act === 'makeup') return r.courtesy ? t('Courtesy make-up added. No credit used.') : t('Make-up added.');
    return { unskip: t('Skip undone. They attend.'), cancelmk: t('Make-up cancelled.'), join: t('Added to the session.'), leave: t('Removed from the session.') }[act];
  }

  /* one day for one student: status, then only the actions that make sense */
  function openStudentDay(sid, iso, back) {
    var s = BC.student(sid), i = BC.dayInfo(s, iso), ses = i.ses, act = '', label = '', body = '';
    var banner = function (txt, cls) { return '<div class="banner ' + (cls || '') + '">' + txt + '</div>'; };
    var seats = ses.isClass && !ses.cancelled ? '<p class="muted small" style="margin-top:10px">' + icon('seat', 'sm') + ' ' + t('{free} of {total} seats free', { free: ses.free, total: ses.seats }) + '</p>' : '';
    switch (i.kind) {
      case 'mine': body = banner(t('Regular lesson'), 'ok'); act = 'skip'; label = t('Skip this lesson'); break;
      case 'skipped':
        body = banner(t('Skipped') + (i.row.credit ? ' · ' + t('1 make-up credit') : ' · ' + t('no credit')));
        if (i.row.breakId) body += '<p class="muted small" style="margin-top:8px">' + reasonText('fromBreak') + '</p>'; else { act = 'unskip'; label = t('Undo skip: they attend'); }
        break;
      case 'makeup': body = banner(i.row.source === 'cancel' ? t('Free make-up (cancelled lesson)') : (i.row.source === 'courtesy' ? t('Courtesy make-up') : t('Make-up lesson')), 'ok'); act = 'cancelmk'; label = t('Cancel this make-up'); break;
      case 'join': body = banner(t('Joined this session'), 'ok'); act = 'leave'; label = t('Remove from this session'); break;
      case 'free': case 'full':
        body = banner(i.kind === 'free' ? t('Seats are free') : t('Full')) + seats;
        act = s.type === 'fixed' ? 'makeup' : 'join'; label = s.type === 'fixed' ? t('Add make-up here') : t('Add to this session'); break;
      case 'cancelled': body = banner(t('Cancelled'), 'bad'); break;
      case 'break': body = banner(t('On a planned break')); break;
      default: body = banner(t('No class'));
    }
    var el = UI.sheet.open(shd(dt(iso) + (ses.start ? ' · ' + ses.start + '–' + ses.end : ''), h(s.name) + ' · ' + h(s.code)) + body +
      (act ? '<div id="day-res" style="margin-top:12px"></div><button class="btn primary block" id="day-go" style="margin-top:12px">' + label + '</button>' : ''), { onClose: back || null });
    if (!act) return;
    var pending = false;
    var finish = function (r) {
      UI.sheet.close(true); render(); UI.toast(doneText(act, r) + ((r.warned || []).length ? ' (' + t('rule bent') + ')' : ''));
      if (back) back();
    };
    $('#day-go', el).addEventListener('click', function () {
      var box = $('#day-res', el), r;
      if (pending) r = runAct(sid, iso, act, true); else r = runAct(sid, iso, act, false);
      if (r.ok) { finish(r); return; }
      if (BC.isSoft(r.reason)) {
        pending = true;
        box.innerHTML = banner(icon('info') + '<div><b>' + t('Heads-up') + '</b><br>' + reasonText(r.reason, sid) + '</div>', 'warn');
        this.textContent = t('Do it anyway');
      } else {
        box.innerHTML = banner(icon('ban') + '<div>' + reasonText(r.reason, sid) + '</div>', 'bad');
      }
    });
  }

  /* a student's month: the same calendar the student sees, but tapping a day opens the actions */
  function openStudentCalendar(sid, ym) {
    var s = BC.student(sid), now = ymNow(), cur = ym || now, el;
    var draw = function () {
      var days = BC.monthDays(cur), lead = (BC.dow(days[0]) + 6) % 7;
      var wd = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<div class="cal-wd">' + BC.wd(d, S.lang) + '</div>'; }).join('');
      var blanks = ''; for (var b = 0; b < lead; b++) blanks += '<div class="cd blank"></div>';
      var cells = days.map(function (iso) {
        var i = BC.dayInfo(s, iso), day = Number(iso.slice(8));
        if (i.kind === 'off') return '<div class="cd off"><span class="n">' + day + '</span><span class="m"></span></div>';
        var cls = ['cd', i.kind]; if (i.past) cls.push('past'); if (iso === BC.today) cls.push('today');
        var m = '';
        if (i.kind === 'free') m = i.ses.free; else if (i.kind === 'full') m = t('full'); else if (i.kind === 'makeup') m = '+'; else if (i.kind === 'join') m = '✓'; else if (i.kind === 'cancelled') m = t('off');
        return '<button class="' + cls.join(' ') + '" data-d="' + iso + '"><span class="n">' + day + '</span><span class="m">' + m + '</span></button>';
      }).join('');
      var info = '';
      if (s.type === 'fixed') {
        var cs = BC.creditSummary(s.id, cur);
        info = '<p class="small" style="margin-bottom:10px"><b>' + cs.left + '</b> ' + t('make-ups left this month') + ' · <b>' + cs.skipCredits + '</b> ' + t('credits to use') + (cs.free ? ' · <b>' + cs.free + '</b> ' + t('free credit') : '') + '</p>';
      }
      el.innerHTML = '<div class="grab"></div>' + shd(h(s.name) + ' · ' + t('Lessons'), h(s.code)) + info +
        '<div class="cal-nav"><button class="btn icon sm" data-n="-1" aria-label="Previous month">' + icon('chevL') + '</button><strong>' + h(BC.monthName(cur, S.lang)) + '</strong><button class="btn icon sm" data-n="1" aria-label="Next month">' + icon('chevR') + '</button></div>' +
        '<div class="cal-grid">' + wd + blanks + cells + '</div><p class="muted small" style="margin-top:12px">' + t('Tap a day to change it. Solid = their lesson, outlined number = free seats, + = make-up.') + '</p>';
    };
    el = UI.sheet.open('', { full: true });
    var again = function () { openStudentCalendar(sid, cur); };
    el.addEventListener('click', function (e) {
      var n = e.target.closest('[data-n]'), d = e.target.closest('[data-d]');
      if (n) { cur = BC.addMonths(cur, Number(n.getAttribute('data-n'))); draw(); }
      else if (d) { openStudentDay(sid, d.getAttribute('data-d'), again); }
    });
    draw();
  }

  /* choose a student, then go to their day (used from a session) */
  function openPickStudent(iso) {
    var el = UI.sheet.open('', {}), q = '';
    var draw = function () {
      var list = BC.students.filter(function (s) { return s.active && (!q || s.name.toLowerCase().indexOf(q) >= 0 || s.code.toLowerCase().indexOf(q) >= 0); })
        .sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); }).slice(0, 30);
      $('#pk-list', el).innerHTML = list.map(function (s) {
        return '<button class="li" data-id="' + s.id + '"><div class="avatar">' + ava(s) + '</div><div class="grow"><b>' + h(s.name) + '</b><span class="muted small">' + h(s.code) + ' · ' + (s.type === 'fixed' ? t('Fixed days') : t('Flexible')) + '</span></div></button>';
      }).join('') || '<div class="empty">' + t('Nobody matches.') + '</div>';
    };
    el.innerHTML = '<div class="grab"></div>' + shd(t('Add a student to {date}', { date: dt(iso) })) +
      '<input class="inp" type="search" id="pk-q" placeholder="' + t('Search name or code') + '" style="margin-bottom:10px"><div id="pk-list"></div>';
    el.addEventListener('input', function (e) { if (e.target.id === 'pk-q') { q = e.target.value.trim().toLowerCase(); draw(); } });
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) openStudentDay(Number(b.getAttribute('data-id')), iso, null); });
    draw();
  }

  /* plan a break for a student (they asked on Zalo) */
  function openAddBreak() {
    var min = BC.addDays(BC.today, cfg.advance_days), el, st = { sid: BC.students[0].id, from: BC.addDays(min, 7), to: BC.addDays(min, 20) }, pending = false;
    var opts = BC.students.filter(function (s) { return s.active; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); });
    var preview = function () {
      var s = BC.student(st.sid), box = $('#bk-prev', el); if (!st.from || !st.to) { box.innerHTML = ''; return; }
      if (st.to < st.from) { box.innerHTML = '<div class="banner bad">' + reasonText('dateOrder') + '</div>'; return; }
      var len = BC.diff(st.from, st.to) + 1, long = len >= cfg.long_break_days, out = '<div class="row wrap"><span class="tag">' + t('{n} days', { n: len }) + '</span><span class="tag ' + (long ? 'info' : '') + '">' + (long ? t('Long break') : t('Short break')) + '</span></div>';
      if (long) {
        var tmp = { id: -1, student: s.id, from: st.from, to: st.to }; BC.breaks.push(tmp);
        for (var ym = BC.ym(st.from); ym <= BC.ym(st.to); ym = BC.addMonths(ym, 1)) out += '<div class="kv" style="display:flex;justify-content:space-between;margin-top:8px"><span>' + t('New fee for {month}', { month: BC.monthOnly(ym, S.lang) }) + '</span><b>' + money(BC.calcAmount(s, ym)) + '</b></div>';
        BC.breaks.pop();
      } else out += '<p class="small muted" style="margin-top:8px">' + t('A short break is just normal skips, each with a make-up credit (up to {n} a month).', { n: cfg.max_makeups_per_month }) + '</p>';
      box.innerHTML = out;
    };
    el = UI.sheet.open('', {});
    el.innerHTML = '<div class="grab"></div>' + shd(t('Plan a break')) + '<div class="stack">' +
      '<label class="field"><span class="lbl">' + t('Student') + '</span><select class="inp" id="bk-s">' + opts.map(function (s) { return '<option value="' + s.id + '">' + h(s.name) + ' · ' + h(s.code) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span class="lbl">' + t('From') + '</span><input class="inp" type="date" id="bk-f" value="' + st.from + '"></label>' +
      '<label class="field"><span class="lbl">' + t('To') + '</span><input class="inp" type="date" id="bk-t" value="' + st.to + '"></label>' +
      '<div id="bk-prev"></div><div id="bk-res"></div><button class="btn primary block" id="bk-go">' + t('Save break') + '</button></div>';
    el.addEventListener('input', function (e) {
      if (e.target.id === 'bk-s') st.sid = Number(e.target.value); else if (e.target.id === 'bk-f') st.from = e.target.value; else if (e.target.id === 'bk-t') st.to = e.target.value;
      pending = false; $('#bk-go', el).textContent = t('Save break'); $('#bk-res', el).innerHTML = ''; preview();
    });
    $('#bk-go', el).addEventListener('click', function () {
      var r = BC.addBreak(st.sid, st.from, st.to, pending ? { force: true } : undefined), box = $('#bk-res', el);
      if (r.ok) { UI.sheet.close(true); render(); UI.toast(t('Break saved.')); return; }
      if (BC.isSoft(r.reason)) { pending = true; box.innerHTML = '<div class="banner warn">' + icon('info') + '<div><b>' + t('Heads-up') + '</b><br>' + reasonText(r.reason, st.sid) + '</div></div>'; this.textContent = t('Do it anyway'); }
      else box.innerHTML = '<div class="banner bad">' + icon('ban') + '<div>' + reasonText(r.reason, st.sid) + '</div></div>';
    });
    preview();
  }

  function openStudent(id) {
    var s = BC.student(id), ed = { name: s.name, type: s.type, days: s.days.slice(), start: s.start, fee: s.fee }, el;
    var ym = ymNow(), rec = BC.payRec(id, ym);
    var upd = function () { var b = $('#st-save', el), w = $('#as-why', el), r = studentReason(ed, id); if (w) w.outerHTML = reasonLine(r); if (b) b.disabled = !!r; };
    var draw = function () {
      var st = BC.student(id);
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><div><h2>' + h(st.name) + '</h2><div class="muted small">' + h(st.code) + (st.active ? '' : ' · ' + t('Paused')) + '</div></div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
        '<div class="stack"><button class="btn primary block" id="st-cal">' + icon('cal2', 'sm') + ' ' + t('Lessons and changes') + '</button>' +
        '<button class="btn block" id="st-card">' + icon('copy', 'sm') + ' ' + t('Send card') + '</button>' +
        '<div class="kv" style="display:flex;justify-content:space-between;align-items:center"><span class="muted">' + t('Payment code') + '</span><span class="row"><b style="font-family:ui-monospace,monospace;font-size:1.1rem">' + h(st.code) + '</b><button class="btn sm icon" data-copy="' + h(st.code) + '" aria-label="' + t('Copy') + '">' + icon('copy', 'sm') + '</button></span></div>' +
        '<div class="row between"><span class="muted">' + h(BC.monthName(ym, S.lang)) + '</span>' + (BC.ym(st.start) > ym ? '<span class="tag">' + t('Not started') + '</span>' : (rec.paid ? '<span class="tag ok">' + t('Paid') + ' · ' + money(rec.amountPaid) + '</span>' : (BC.isLate(id) ? '<span class="tag bad">' + t('Late') + ' · ' + money(BC.amountDue(st, ym)) + '</span>' : '<span class="tag warn">' + t('Unpaid') + ' · ' + money(BC.amountDue(st, ym)) + '</span>'))) + '</div><hr class="sep">' +
        studentFormHtml(ed) + reasonLine(studentReason(ed, id)) +
        '<button class="btn primary block" id="st-save"' + (studentReason(ed, id) ? ' disabled' : '') + '>' + t('Save changes') + '</button>' +
        '<button class="btn block" id="st-pause">' + icon(st.active ? 'pause' : 'refresh', 'sm') + ' ' + (st.active ? t('Pause student') : t('Resume student')) + '</button></div>';
    };
    el = UI.sheet.open('', {});
    bindForm(el, ed, draw, upd);
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-copy]'))) { UI.copy(b.getAttribute('data-copy'), t('Copied')); return; }
      if (e.target.closest('#st-cal')) { UI.sheet.close(true); openStudentCalendar(id); return; }
      if (e.target.closest('#st-card')) { openSendCard(id); return; }
      if (e.target.closest('#st-save')) {
        if (studentReason(ed, id)) return;
        var st = BC.student(id);
        st.name = ed.name.trim(); st.type = ed.type; st.days = ed.type === 'fixed' ? ed.days.slice() : []; st.start = ed.start; st.fee = ed.fee;
        UI.sheet.close(); render(); UI.toast(t('Saved'));
      } else if (e.target.closest('#st-pause')) {
        var s2 = BC.student(id); s2.active = !s2.active; UI.sheet.close(); render(); UI.toast(s2.active ? t('Resumed') : t('Paused'));
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
    var tiles = '<div class="tiles"><div class="tile"><div class="v ok">' + money(collected) + '</div><div class="l">' + t('Collected') + '</div></div><div class="tile"><div class="v">' + money(outstanding) + '</div><div class="l">' + t('Still to collect') + ' · ' + unpaidN + (lateN ? ' · <span style="color:var(--danger)">' + t('Late') + ' ' + lateN + '</span>' : '') + '</div></div></div>';
    var list = rows.map(function (r) {
      var s = r.s, note = '';
      if (r.billed < r.full) note += t('{a} of {b} lessons', { a: r.billed, b: r.full }) + ' · ';
      if (r.rec.override != null) note += '<span class="tag accent">' + t('edited') + '</span> ';
      if (r.rec.creditIn > 0 && cfg.credit_carry) note += t('credit -{amount}', { amount: money(r.rec.creditIn) }) + ' · ';
      var status = r.rec.paid ? '<span class="tag ok">' + icon('check', 'sm') + ' ' + t('Paid {date}', { date: BC.fmtDay(r.rec.paidDate, S.lang) }) + '</span>' : (r.late ? '<span class="tag bad">' + t('Late since {date}', { date: BC.fmtDay(BC.addDays(r.due, 1), S.lang) }) + '</span>' : '<span class="tag warn">' + t('Due {date}', { date: BC.fmtDay(r.due, S.lang) }) + '</span>');
      return '<div class="li pay"><div class="avatar ' + (r.late ? 'late' : (r.rec.paid ? '' : 'warn')) + '">' + ava(s) + '</div><div class="who"><b>' + h(s.name) + '</b> <span class="muted small">' + h(s.code) + '</span></div>' +
        '<button class="amt amt-edit" data-a="editamt" data-x="' + s.id + '" aria-label="' + t('Change amount') + '">' + money(r.amount) + '</button><div class="st small">' + note + status + '</div><div class="acts">' +
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
    var d = remindData(), out = '<div class="view-h"><h2>' + t('To remind') + '</h2><p class="muted small">' + t('Copy the message, then paste it into Zalo.') + '</p></div>';
    var group = function (title, sub, rows, kind) {
      if (!rows.length) return '';
      return '<h3 style="margin:14px 0 8px">' + title + ' <span class="tag">' + rows.length + '</span></h3><p class="muted small" style="margin-bottom:8px">' + sub + '</p>' + rows.map(function (r) {
        var key = kind + r.s.id, done = S.reminded[key];
        return '<div class="li pay"><div class="avatar ' + (done ? 'done' : (kind === 'late' ? 'late' : 'warn')) + '">' + (done ? icon('check') : ava(r.s)) + '</div><div class="who"><b>' + h(r.s.name) + '</b> <span class="muted small">' + h(r.s.code) + '</span></div><div class="amt">' + money(BC.amountDue(r.s, ymNow())) + '</div>' +
          '<div class="st small muted">' + (kind === 'late' ? t('Late since {date}', { date: BC.fmtDay(BC.addDays(r.due, 1), S.lang) }) : t('Due {date}', { date: BC.fmtDay(r.due, S.lang) })) + (done ? ' · <span class="tick">' + t('copied') + '</span>' : '') + '</div><div class="acts">' +
          '<button class="btn sm primary" data-a="prevmsg" data-x="' + kind + '|' + r.s.id + '">' + icon('copy', 'sm') + ' ' + t('Copy message') + '</button></div></div>';
      }).join('');
    };
    out += group(t('Friendly heads-up'), t('Unpaid and due within 2 days (from the 3rd).'), d.soft, 'soft');
    out += group(t('Late'), t('Past the pay-by day. They are locked from changes until they pay.'), d.late, 'late');
    if (d.canc.length) {
      out += '<h3 style="margin:14px 0 8px">' + t('Announcements') + '</h3>' + d.canc.map(function (iso) {
        var key = 'canc' + iso;
        return '<div class="li pay"><div class="avatar late">' + icon('ban') + '</div><div class="who"><b>' + t('{date} is cancelled', { date: dt(iso) }) + '</b></div><div class="amt"></div>' +
          '<div class="st small muted">' + h(BC.overrides[iso].note || '') + (S.reminded[key] ? ' · <span class="tick">' + t('copied') + '</span>' : '') + '</div><div class="acts">' +
          '<button class="btn sm primary" data-a="prevmsg" data-x="cancel|' + iso + '">' + icon('copy', 'sm') + ' ' + t('Copy message') + '</button></div></div>';
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
    var p = x.split('|'), isC = p[0] === 'cancel', s = isC ? null : BC.student(Number(p[1])), lang = S.msgLang, el;
    var draw = function () {
      el.innerHTML = '<div class="grab"></div><div class="sheet-h"><div><h2>' + (isC ? t('Announcement') : t('Message to {name}', { name: h(s.name) })) + '</h2></div><button class="btn icon sm ghost" data-close aria-label="' + t('Close') + '">' + icon('x') + '</button></div>' +
        '<div class="seg full" style="margin-bottom:12px"><button data-l="vi" aria-pressed="' + (lang === 'vi') + '">Tiếng Việt</button><button data-l="en" aria-pressed="' + (lang === 'en') + '">English</button></div>' +
        '<div class="msgbox">' + h(msgFromKey(x, lang)) + '</div><button class="btn primary block" style="margin-top:12px" id="pv-copy">' + icon('copy', 'sm') + ' ' + t('Copy message') + '</button><p class="muted small" style="margin-top:10px">' + t('You can reword these texts in Settings.') + '</p>';
    };
    el = UI.sheet.open('', {});
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-l]');
      if (b) { lang = b.getAttribute('data-l'); S.msgLang = lang; draw(); }
      else if (e.target.closest('#pv-copy')) { UI.copy(msgFromKey(x, lang), t('Message copied. Paste it into Zalo.')); S.reminded[isC ? 'canc' + p[1] : p[0] + p[1]] = true; UI.sheet.close(); render(); }
    });
    draw();
  }

  /* ---------- 5. More ---------- */
  function moreView() {
    var items = [['data', 'copy', 'My data', 'Save a file, open a file, export a report'], ['scores', 'chart', 'Scores', 'Score a student on the six skills'], ['breaks', 'pause', 'Breaks', 'Planned breaks and fee reductions'], ['cancel', 'ban', 'Cancel a session', 'Public holiday or closed venue'],
      ['timetable', 'clock', 'Timetable and seats', 'Class days, times and extra seats'], ['videos', 'video', 'Videos', 'One link per skill'], ['settings', 'settings', 'Settings', 'All the numbers and texts']];
    return '<div class="view-h"><h2>' + t('More') + '</h2></div><div class="menu">' + items.map(function (x) {
      return '<button class="li" data-a="sub" data-x="' + x[0] + '">' + icon(x[1]) + '<div class="grow"><b>' + t(x[2]) + '</b><span class="muted small">' + t(x[3]) + '</span></div>' + icon('chevR') + '</button>';
    }).join('') + '</div>';
  }
  function subView() {
    return { data: dataView, scores: scoresView, breaks: breaksView, cancel: cancelView, timetable: timetableView, videos: videosView, settings: settingsView }[S.sub]();
  }

  /* my data: the save file, the backup state, earlier copies */
  function dataView() {
    var bk = BC.backup(), hist = BC.history().slice(0, -1).reverse();
    var state = !bk.at ? ['warn', t('You have not saved a file yet.'), t('If this phone is lost or the browser is cleared, the data is gone. Save a file now.')] :
      bk.dirty ? ['warn', t('You have changes that are not in a file.'), t('Last file: {when}.', { when: ago(bk.at) })] : ['ok', t('Your file is up to date.'), t('Saved {when}.', { when: ago(bk.at) })];
    var copies = hist.length ? hist.map(function (x, i) {
      return '<div class="hist"><div><b>' + new Date(x.t).toLocaleString(S.lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</b></div><button class="btn sm" data-a="restorehist" data-x="' + (hist.length - 1 - i) + '">' + t('Restore') + '</button></div>';
    }).join('') : '<p class="muted small">' + t('No earlier copies yet. They appear as you work.') + '</p>';
    return subHead(t('My data')) +
      '<div class="banner ' + state[0] + '" style="margin-bottom:14px">' + icon(state[0] === 'ok' ? 'check' : 'info') + '<div><b>' + state[1] + '</b><br>' + state[2] + '</div></div>' +
      '<div class="card stack"><h3>' + t('Your file') + '</h3><p class="muted small">' + t('The file is the only copy that lives outside this phone. Keep it in Files, Zalo or email.') + '</p>' +
      '<button class="btn primary block" data-a="savefile">' + icon('copy', 'sm') + ' ' + t('Save file') + '</button>' +
      '<button class="btn block" data-a="openfile">' + icon('plus', 'sm') + ' ' + t('Open a file') + '</button></div>' +
      '<div class="card stack"><h3>' + t('Report for Google Sheets') + '</h3><p class="muted small">' + t('A table of who paid and who came, month by month. Open it in Google Sheets to count, sum and draw charts. It is one way: changing it there changes nothing here.') + '</p>' +
      '<button class="btn block" data-a="report">' + icon('chart', 'sm') + ' ' + t('Export report') + '</button></div>' +
      '<div class="card"><h3 style="margin-bottom:6px">' + t('Earlier copies on this phone') + '</h3>' + copies + '</div>' +
      '<div class="card stack"><h3>' + t('Where is my data?') + '</h3><ul class="small muted" style="margin:0;padding-left:18px"><li>' + t('On this phone, in this browser. Nothing is sent anywhere.') + '</li><li>' + t('Try it: switch on airplane mode. Everything still works.') + '</li><li>' + t('Students see only the card you send them, and only their own lessons.') + '</li></ul></div>' +
      '<div class="card stack"><h3>' + t('Start over') + '</h3><p class="muted small">' + t('Clears this phone and takes you back to the start screen.') + '</p>' +
      '<button class="btn danger block" data-a="startover"' + (bk.dirty ? ' disabled' : '') + '>' + icon('trash', 'sm') + ' ' + t('Start over') + '</button>' +
      '<div class="why">' + (bk.dirty ? icon('info') + '<span>' + t('Save a file first, so nothing is lost.') + '</span>' : '') + '</div></div>';
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
      return '<div class="li"><div class="avatar">' + ava(s) + '</div><div class="grow"><b>' + h(s.name) + ' <span class="muted small">' + h(s.code) + '</span></b><span class="small muted">' + dt(b.from) + ' – ' + dt(b.to) + ' · ' + t('{n} days', { n: BC.breakLen(b) }) + '</span><span class="small muted">' + t('Told you on {date}', { date: BC.fmtDay(b.notified, S.lang) }) + (b.note ? ' · ' + h(b.note) : '') + '</span></div>' +
        '<div class="right"><span class="tag ' + (long ? 'info' : '') + '">' + (long ? t('Long break') : t('Short break')) + '</span><div class="bold" style="margin-top:4px">' + (long ? '−' + money(red) : t('No fee change')) + '</div></div>' +
        (long ? '<button class="btn icon sm" data-a="adjbreak" data-x="' + b.student + '|' + BC.ym(b.from) + '" aria-label="' + t('Change amount') + '">' + icon('pencil', 'sm') + '</button>' : '') +
        '<button class="btn icon sm" data-a="rmbreak" data-x="' + b.student + '|' + b.id + '" aria-label="' + t('Remove') + '">' + icon('trash', 'sm') + '</button></div>';
    }).join('');
    return subHead(t('Breaks')) + '<p class="muted small" style="margin-bottom:12px">' + t('Students ask you on Zalo and you plan the break here. A long break ({n} days or more) lowers the fee and gives no make-ups. A short break is just normal skips.', { n: cfg.long_break_days }) + '</p><button class="btn primary" style="margin-bottom:14px" data-a="addbreak">' + icon('plus', 'sm') + ' ' + t('Plan a break') + '</button>' + (rows || '<div class="empty">' + t('No planned breaks.') + '</div>');
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
    var onN = [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return BC.timetable[d].on; }).length;
    var rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var x = BC.timetable[d];
      return '<div class="tt-row"><b>' + BC.wd(d, S.lang) + '</b><button class="switch" role="switch" aria-checked="' + x.on + '" data-a="ttsw" data-x="' + d + '" aria-label="' + BC.wdLong(d, S.lang) + '"' + (x.on && onN === 1 ? ' disabled' : '') + '></button><input class="inp" type="time" data-bind="tt" data-k="' + d + ':start" value="' + x.start + '"' + (x.on ? '' : ' disabled') + '><input class="inp" type="time" data-bind="tt" data-k="' + d + ':end" value="' + x.end + '"' + (x.on ? '' : ' disabled') + '></div>';
    }).join('');
    var ovs = Object.keys(BC.overrides).sort().map(function (iso) {
      var o = BC.overrides[iso], c = o.courts == null ? cfg.venue_courts : o.courts;
      return '<div class="card" style="margin-top:8px"><div class="row between"><b>' + dt(iso) + '</b>' + (o.cancelled ? '<span class="tag bad">' + t('Cancelled') + '</span>' : '<button class="btn sm icon" data-a="ovrm" data-x="' + iso + '" aria-label="' + t('Remove') + '">' + icon('trash', 'sm') + '</button>') + '</div>' +
        (o.cancelled ? '<p class="muted small">' + h(o.note || '') + '</p>' : '<div class="ctl"><span>' + t('Extra seats') + '</span>' + stepper('extra:' + iso, o.extra || 0, 0, 2) + '</div><div class="ctl"><span>' + t('Courts available') + '</span>' + stepper('courts:' + iso, c, 1, cfg.venue_courts) + '</div>') + '</div>';
    }).join('');
    return subHead(t('Timetable and seats')) + '<div class="card"><h3 style="margin-bottom:6px">' + t('Class days and times') + '</h3><p class="muted small">' + t('Switch a day off to have no class (Friday is off). One day always stays on. A change starts today: lessons, bills and credits before today stay as they were.') + '</p>' + rows + '</div>' +
      '<div class="card"><h3>' + t('Special dates') + '</h3><p class="muted small">' + t('The venue has {courts} courts, {seats} players each: {total} seats. Add 0 to 2 extra seats, or fewer courts, on a date.', { courts: cfg.venue_courts, seats: cfg.seats_per_court, total: cfg.venue_courts * cfg.seats_per_court }) + '</p>' + ovs +
      '<div class="row" style="margin-top:12px"><input class="inp grow" type="date" id="ov-date" value="' + BC.addDays(BC.today, 8) + '" min="' + BC.today + '" max="' + BC.addDays(BC.today, BC.LIMITS.dayRange) + '"><button class="btn primary" data-a="ovadd">' + icon('plus', 'sm') + ' ' + t('Add date') + '</button></div></div>';
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
  var DEFS = { advance_days: 7, flex_notice_days: 7, pay_by_day: 5, first_bill_days: 3, max_makeups_per_month: 3, long_break_days: 14, cancel_credit_months: 1, venue_courts: 4, seats_per_court: 4, fee_1day: 800000, fee_2days: 1300000, proration: true, credit_carry: true, page_title: 'VM Badminton', coach_zalo: '', default_lang: 'vi', timezone: 'Asia/Ho_Chi_Minh' };
  var SET = [
    ['Class rules', [['advance_days', 'Notice for skips, make-ups and breaks (calendar days)', 'n', 0, 30], ['flex_notice_days', 'Flexible students join a session this many days ahead', 'n', 0, 30], ['pay_by_day', 'Fee is paid by the end of this day of the month', 'n', 1, 28], ['first_bill_days', 'A new student\'s first bill is due this many days after the start date', 'n', 0, 14],
      ['max_makeups_per_month', 'Make-ups per student per month', 'n', 0, 10], ['long_break_days', 'A break this long or longer is a long break (days)', 'n', 2, 60], ['cancel_credit_months', 'A cancelled-lesson credit stays valid this many more months', 'n', 0, 3]]],
    ['Seats', [['venue_courts', 'Courts the venue has', 'n', 1, 8], ['seats_per_court', 'Players per court', 'n', 2, 6]]],
    ['Money', [['fee_1day', 'Monthly fee, 1 day a week (VND)', 'money'], ['fee_2days', 'Monthly fee, 2 days a week (VND)', 'money'], ['proration', 'Pay only for the lessons studied (mid-month joiners, long breaks)', 'bool'], ['credit_carry', 'A too-high paid bill becomes a credit on the next bill', 'bool']]],
    ['Page', [['page_title', 'Page title (browser tab and link previews)', 'text'], ['coach_zalo', 'Your Zalo phone number (the Ask-the-coach button opens this chat)', 'text'], ['default_lang', 'Default language on the student card', 'lang'], ['timezone', 'Time zone', 'tz']]]
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
        else if (type === 'money') ctl = '<input class="inp" type="number" inputmode="numeric" step="1000" min="' + BC.LIMITS.feeMin + '" max="' + BC.LIMITS.feeMax + '" data-bind="set" data-k="' + k + '" value="' + v + '">';
        else if (type === 'bool') ctl = '<button class="switch" role="switch" aria-checked="' + v + '" data-a="setsw" data-x="' + k + '"></button>';
        else if (type === 'text') ctl = '<input class="inp" data-bind="set" data-k="' + k + '" maxlength="' + (k === 'coach_zalo' ? 15 : 40) + '"' + (k === 'coach_zalo' ? ' inputmode="tel"' : '') + ' value="' + h(v) + '">';
        else if (type === 'lang') ctl = '<select class="inp" data-bind="set" data-k="' + k + '"><option value="vi"' + (v === 'vi' ? ' selected' : '') + '>Tiếng Việt</option><option value="en"' + (v === 'en' ? ' selected' : '') + '>English</option></select>';
        else ctl = '<select class="inp" data-bind="set" data-k="' + k + '"><option' + (v === 'Asia/Ho_Chi_Minh' ? ' selected' : '') + '>Asia/Ho_Chi_Minh</option><option' + (v === 'Asia/Bangkok' ? ' selected' : '') + '>Asia/Bangkok</option><option' + (v === 'UTC' ? ' selected' : '') + '>UTC</option></select>';
        var changed = v !== DEFS[k];
        return '<div class="set-row"><div class="l"><div>' + t(r[1]) + '</div><div class="muted tiny">' + def(k, type) + (changed ? ' · <a href="#" data-a="setreset" data-x="' + k + '">' + t('reset') + '</a>' : '') + '</div></div>' + ctl + '</div>';
      }).join('') + '</div>';
    }).join('');
    var msgs = ['vi', 'en'].map(function (lg) {
      return ['soft', 'late', 'cancel', 'card'].map(function (kind) {
        var lbl = { soft: 'Friendly heads-up', late: 'Late reminder', cancel: 'Cancelled session', card: 'Class card message' }[kind];
        return '<label class="field"><span class="lbl">' + t(lbl) + ' · ' + (lg === 'vi' ? 'Tiếng Việt' : 'English') + '</span><textarea class="inp" data-bind="msg" data-k="' + lg + '.' + kind + '">' + h(BC.messages[lg][kind]) + '</textarea></label>';
      }).join('');
    }).join('');
    var qr = '<div class="card stack"><h3>' + t('Your QR image') + '</h3><p class="muted small">' + t('Kept in your save file. A student card is a link and cannot carry a picture, so pin this QR in your Zalo chat once.') + '</p>' +
      '<div class="qr-preview">' + (BC.qrImage ? '<img alt="QR" style="width:100%;display:block;border-radius:8px" src="' + BC.qrImage + '">' : BC.fakeQR(7)) + '</div><p class="muted tiny">' + (BC.qrImage ? t('Your image.') : t('Demo QR. Upload your own bank QR.')) + '</p>' +
      '<input type="file" id="qr-file" accept="image/*" class="hide"><button class="btn" data-a="qrpick">' + icon('plus', 'sm') + ' ' + t('Choose image') + '</button></div>';
    var hasLogo = !!UI.pics.get('logo');
    var pic = '<div class="card stack"><h3>' + t('Page picture') + '</h3><p class="muted small">' + t('Shown at the top of every page and in the browser tab. Use a square picture.') + '</p>' +
      '<div class="row">' + UI.logo(72) + '<div class="stack-s grow"><button class="btn" data-a="logopick">' + icon('plus', 'sm') + ' ' + t('Choose picture') + '</button>' +
      (hasLogo ? '<button class="btn ghost" data-a="logoreset">' + t('Use the default picture') + '</button>' : '') + '</div></div></div>';
    return subHead(t('Settings')) + '<p class="muted small" style="margin-bottom:12px">' + t('Every number the site uses. Changes save by themselves.') + '</p>' + pic + sections + qr +
      '<div class="card stack"><h3>' + t('Message texts') + '</h3><p class="muted small">' + t('Placeholders: {name} {month} {amount} {due} {code} {weekday} {date} {until} {link} (class card only)') + '</p>' + msgs + '<button class="btn" data-a="msgreset">' + t('Reset texts to the defaults') + '</button></div>' +
      '<button class="btn danger block" style="margin-top:14px" data-a="setresetall">' + t('Reset all settings to defaults') + '</button>';
  }

  /* ---------- render and events ---------- */
  function render() {
    BC.lang = S.lang; document.documentElement.lang = S.lang; cfg = BC.config;
    var y = window.scrollY, focus = document.activeElement && document.activeElement.id;
    app.className = 'wrap-col wide' + (S.mode === 'wizard' ? ' wz' : '');
    if (S.mode === 'start') app.innerHTML = SU.startView();
    else if (S.mode === 'wizard') app.innerHTML = SU.wizardView();
    else { app.innerHTML = shell(); BC.autosave(); }
    window.scrollTo(0, y);
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
    if (SU.click(e)) return;
    if ((el = e.target.closest('[data-lang]'))) { S.lang = el.getAttribute('data-lang'); try { localStorage.setItem('bc_admin_lang', S.lang); } catch (er) { /* ignore */ } render(); return; }
    if ((el = e.target.closest('[data-tab]'))) { S.tab = el.getAttribute('data-tab'); S.sub = null; render(); window.scrollTo(0, 0); return; }
    if ((el = e.target.closest('[data-a]'))) {
      var a = el.getAttribute('data-a'), x = el.getAttribute('data-x'), y = el.getAttribute('data-y');
      if (el.tagName === 'A') e.preventDefault();
      switch (a) {
        case 'nmday': { var pr = x.split('|'); openStudentDay(Number(pr[0]), pr[1], null); break; }
        case 'addtoses': openPickStudent(x); break;
        case 'addbreak': openAddBreak(); break;
        case 'rmbreak': {
          var rb = x.split('|'), rsid = Number(rb[0]), rid = Number(rb[1]), rr = BC.removeBreak(rsid, rid);
          if (rr.ok) { render(); toast(t('Break removed.')); }
          else if (BC.isSoft(rr.reason)) UI.confirm({ title: t('Remove this break?'), body: h(reasonText(rr.reason, rsid)), ok: t('Do it anyway'), cancel: t('Keep it') }).then(function (yes) { if (yes && BC.removeBreak(rsid, rid, { force: true }).ok) { render(); toast(t('Break removed.')); } });
          else toast(reasonText(rr.reason, rsid), 'bad');
          break;
        }
        case 'toggle': S.open[x] = !S.open[x]; render(); break;
        case 'step': stepAction(x, Number(y)); break;
        case 'cancelses': S.cancelIso = x; S.sub = 'cancel'; S.tab = 'more'; render(); window.scrollTo(0, 0); break;
        case 'filter': S.filter = x; render(); break;
        case 'stu': openStudent(Number(x)); break;
        case 'addstu': openAddStudent(); break;
        case 'cards': openSendCards(); break;
        case 'pm': S.payMonth = BC.addMonths(S.payMonth, Number(x)); render(); break;
        case 'paid': BC.setPaid(Number(x), S.payMonth, true); render(); toast(t('{name} marked as paid', { name: BC.student(Number(x)).name })); break;
        case 'undopaid': BC.setPaid(Number(x), S.payMonth, false); render(); toast(t('Back to unpaid')); break;
        case 'editamt': openEditAmount(Number(x)); break;
        case 'copymsg': copyMsg(x); break;
        case 'prevmsg': openPreview(x); break;
        case 'sub': S.sub = x; render(); window.scrollTo(0, 0); break;
        case 'back': S.sub = null; S.tab = 'more'; render(); window.scrollTo(0, 0); break;
        case 'gotodata': S.tab = 'more'; S.sub = 'data'; render(); window.scrollTo(0, 0); break;
        case 'savefile': BC.giveFile(BC.fileName(), BC.fileText(), 'application/json').then(function (done) { if (done) { BC.markBackedUp(); render(); toast(t('File saved.')); } }); break;
        case 'openfile': {
          var openIt = function () { SU.pickFile(function (r) { if (r.ok) SU.adopt(r); else toast(t(SU.errText(r.reason)), 'bad'); }); };
          if (BC.backup().dirty) UI.confirm({ title: t('Open another file?'), body: t('This replaces what is on this phone now. Changes that are not in a file will be lost.'), ok: t('Choose a file'), cancel: t('Keep mine'), danger: true }).then(function (yes) { if (yes) openIt(); });
          else openIt();
          break;
        }
        case 'report': BC.giveFile('birdie-crew-report-' + ymNow() + '.csv', BC.reportCSV(), 'text/csv').then(function (done) { if (done) toast(t('Report ready.')); }); break;
        case 'restorehist': {
          var hist = BC.history(), item = hist[Number(x)], rr = item && BC.parseFile(item.txt);
          if (!rr || !rr.ok) { toast(t('That copy could not be read.'), 'bad'); break; }
          UI.confirm({ title: t('Go back to this copy?'), body: t('This phone returns to how it was then. Later work stays in your file only if you saved one.'), ok: t('Restore'), cancel: t('Cancel') }).then(function (yes) {
            if (!yes) return; BC.load(rr.data); BC.meta.setup = true; S.sub = null; S.tab = 'sessions'; render(); toast(t('Restored.'));
          });
          break;
        }
        case 'startover':
          if (BC.backup().dirty) { toast(t('Save a file first, so nothing is lost.'), 'bad'); break; }
          UI.confirm({ title: t('Start over?'), body: t('This clears everything on this phone. Your saved file is not touched.'), ok: t('Clear this phone'), cancel: t('Keep it'), danger: true }).then(function (yes) {
            if (!yes) return; BC.wipeLocal(); BC.blank(); SU.restart(); S.sub = null; S.tab = 'sessions'; render(); window.scrollTo(0, 0);
          });
          break;
        case 'clearsample':
          UI.confirm({ title: t('Leave the sample class?'), body: t('The made-up students are cleared from this phone.'), ok: t('Start my own class'), cancel: t('Keep playing'), danger: true }).then(function (yes) {
            if (!yes) return; BC.wipeLocal(); BC.blank(); SU.restart(); S.sub = null; S.tab = 'sessions'; render(); window.scrollTo(0, 0);
          });
          break;
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
            if (!yes) return; var r = BC.cancelSession(iso, note); if (!r.ok) { toast(t('This session is already cancelled.'), 'bad'); return; } S.cancelIso = null; S.reminded['canc' + iso] = false; S.sub = null; S.tab = 'remind'; render(); toast(t('Cancelled. {n} students got a free make-up.', { n: r.affected }));
          });
          break;
        }
        case 'ttsw': {
          var dowN = Number(x), onCount = [1, 2, 3, 4, 5, 6, 0].filter(function (dd) { return BC.timetable[dd].on; }).length;
          if (!BC.timetable[dowN].on) { BC.setDay(dowN, true); render(); toast(t('Saved. It starts today.')); break; }
          if (onCount <= 1) { toast(t('One class day has to stay on.'), 'bad'); break; }
          var imp = BC.dayImpact(dowN);
          UI.confirm({ title: t('Switch off {day}?', { day: BC.wdLong(dowN, S.lang) }), body: t('{n} students have this as a regular day and {m} make-ups or joins later on this day will be cancelled. Past lessons and bills stay as they were.', { n: imp.regular, m: imp.later }), ok: t('Switch off'), cancel: t('Keep it'), danger: true }).then(function (yes) {
            if (!yes) return;
            BC.setDay(dowN, false); render(); toast(t('Saved. It stops today.'));
          });
          break;
        }
        case 'ovadd': {
          var d = $('#ov-date').value; if (!d || d < BC.today || d > BC.addDays(BC.today, BC.LIMITS.dayRange)) { toast(t('Choose a date from today to a year ahead.'), 'bad'); break; }
          if (!BC.classDay(d)) { toast(t('That day has no class.'), 'bad'); break; }
          if (!BC.overrides[d]) BC.overrides[d] = { extra: 1 }; render(); toast(t('Saved')); break;
        }
        case 'ovrm': delete BC.overrides[x]; render(); toast(t('Saved')); break;
        case 'setsw': cfg[x] = !cfg[x]; render(); toast(t('Saved')); break;
        case 'setreset': cfg[x] = DEFS[x]; render(); toast(t('Saved')); break;
        case 'setresetall': Object.keys(DEFS).forEach(function (k) { cfg[k] = DEFS[k]; }); render(); toast(t('All settings are back to the defaults.')); break;
        case 'msgreset': BC.messages = BC.defaultMessages(); render(); toast(t('Saved')); break;
        case 'qrpick': $('#qr-file').click(); break;
        case 'logopick': UI.pickImage(256, function (d) { UI.pics.set('logo', d); UI.applyFavicon(); render(); UI.toast(t('Picture saved.')); }); break;
        case 'logoreset': UI.pics.del('logo'); UI.applyFavicon(); render(); UI.toast(t('Picture saved.')); break;
      }
    }
  });

  app.addEventListener('input', function (e) {
    if (SU.input(e)) return;
    if (e.target.id === 'q') { S.q = e.target.value; var L = $('#stu-list'); if (L) L.innerHTML = stuRows(); }
  });
  app.addEventListener('change', function (e) {
    if (SU.change(e)) return;
    var el = e.target, b = el.getAttribute && el.getAttribute('data-bind'), k = el.getAttribute && el.getAttribute('data-k');
    if (el.id === 'qr-file' && el.files && el.files[0]) {
      var fr = new FileReader(); if (el.files[0].size > 2e6) { toast(t('That picture is too big (2 MB at most).'), 'bad'); return; }
      fr.onload = function () { BC.qrImage = fr.result; render(); toast(t('Saved')); }; fr.readAsDataURL(el.files[0]); return;
    }
    if (!b) return;
    if (b === 'scoreSid') { S.scoreSid = Number(el.value); S.draft = null; render(); }
    else if (b === 'tt') {
      var p = k.split(':'), row = BC.timetable[p[0]], nv = el.value;
      if (!nv || (p[1] === 'start' ? nv >= row.end : nv <= row.start)) { el.value = row[p[1]]; toast(t('The end of class must be after the start.'), 'bad'); return; }
      BC.ttEdit(function (tt) { tt[p[0]][p[1]] = nv; }); toast(t('Saved. It starts today.'));
    }
    else if (b === 'vid') { var q = k.split(':'); BC.videos[q[0]][q[1]] = el.value; render(); toast(t('Saved')); }
    else if (b === 'set') {
      var v = el.type === 'number' ? Number(el.value) : el.value, L = BC.LIMITS;
      if (k === 'coach_zalo') v = v.replace(/[^0-9+]/g, '');
      if (k === 'page_title') { v = v.trim() || DEFS.page_title; document.title = v + ' · Coach'; }
      if (k === 'fee_1day' || k === 'fee_2days') {
        v = Math.round(v / 1000) * 1000; if (!isFinite(v)) v = DEFS[k];
        var lo = k === 'fee_2days' ? Math.max(L.feeMin, cfg.fee_1day) : L.feeMin, hi = k === 'fee_1day' ? Math.min(L.feeMax, cfg.fee_2days) : L.feeMax;
        if (v < lo || v > hi) { v = Math.max(lo, Math.min(hi, v)); toast(k === 'fee_1day' ? t('The 1-day fee cannot be above the 2-day fee.') : t('The 2-day fee cannot be below the 1-day fee.'), 'bad'); }
      }
      cfg[k] = v; if (k === 'page_title' || k === 'coach_zalo' || k === 'fee_1day' || k === 'fee_2days') render(); else toast(t('Saved'));
    }
    else if (b === 'msg') { var m = k.split('.'); BC.messages[m[0]][m[1]] = el.value; toast(t('Saved')); }
  });

  /* ---------- mockup-only controls ---------- */
  var panel = UI.mockPanel(
    '<h3>Mock controls</h3><div class="note">Only in the mockup. Jump between situations the coach meets.</div>' +
    '<label>Pretend today is</label><div class="seg full" id="m-today"><button data-v="2026-11-03">3 Nov</button><button data-v="2026-11-05">5 Nov</button><button data-v="2026-11-06">6 Nov</button><button data-v="2026-11-12">12 Nov</button></div>' +
    '<label>First run</label><button class="mb" id="m-start">Clear this browser and show the start screen</button>' +
    '<label>Data</label><button class="mb" id="m-reset">Load the sample class again</button>', { up: true });
  function syncPanel() { $$('#m-today button', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === BC.today)); }); }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.parentElement.id === 'm-today') { BC.today = b.getAttribute('data-v'); S.payMonth = BC.ym(BC.today); render(); }
    else if (b.id === 'm-start') { BC.wipeLocal(); BC.blank(); SU.restart(); S.sub = null; S.tab = 'sessions'; panel.classList.add('hide'); render(); window.scrollTo(0, 0); }
    else if (b.id === 'm-reset') { S.mode = 'app'; BC.seed(); cfg = BC.config; S.open = {}; S.reminded = {}; S.draft = null; S.scoreSid = null; S.cancelIso = null; S.payMonth = BC.ym(BC.today); render(); UI.toast('Reset'); }
  });

  /* start: use the working copy in this browser if there is one */
  var boot = BC.restore();
  if (boot.ok && BC.meta && BC.meta.setup) S.mode = 'app';
  else {
    BC.blank(); S.mode = 'start';
    if (!boot.ok && boot.reason !== 'none') SU.setErr('The copy saved on this phone could not be read. Open your file instead.');
  }
  render();
})();
