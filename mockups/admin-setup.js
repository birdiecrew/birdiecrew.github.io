/* Coach admin: the first-run start screen and the 5-step wizard.
   The rules of the screen, so the coach cannot do things in the wrong order or enter nonsense:
   - a step opens only when the steps before it are complete (the later steps are dimmed, never hidden)
   - "Next" is dimmed until the step is complete, and a reserved line under it always says why
   - numbers move with steppers inside their limits, and two linked numbers cannot cross (the 2-day fee is never below the 1-day fee)
   - times are picked from a list, and the end list only offers times after the start. Nothing is typed that could be wrong. */
window.Setup = (function () {
  'use strict';
  var TIMES = (function () { var a = [], m; for (m = 5 * 60; m <= 23 * 60 + 30; m += 30) a.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2)); return a; })();
  var ORDER = [1, 2, 3, 4, 5, 6, 0];

  function create(E) {
    var t = E.t, h = E.h, icon = E.icon, money = E.money, S = E.S, $ = E.$, W = null, startErr = '';

    /* ---------- start screen ---------- */
    function errText(reason) {
      return { notJson: 'That is not a Birdie Crew file.', notOurs: 'That is not a Birdie Crew file.', newer: 'This file was saved by a newer version. Open the latest page and try again.',
        edited: 'This file was changed outside the app, so it cannot be trusted. Open your last saved copy instead.', broken: 'This file is damaged. Open an earlier copy.' }[reason] || 'That file could not be opened.';
    }
    function startView() {
      return '<div class="start"><div class="row between" style="margin-bottom:14px"><span></span><div class="row" style="gap:8px">' + UI.themeBtn() +
        '<div class="seg" role="group" aria-label="Language"><button data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">VI</button><button data-lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div></div></div>' +
        '<div class="center" style="margin-bottom:18px"><div style="margin:0 auto 10px;width:64px">' + UI.logo(64) + '</div><h1 style="font-size:1.4rem">' + h(BC.config.page_title) + '</h1>' +
        '<p class="muted" style="margin-top:6px">' + t('Your class, in your pocket. Start here.') + '</p></div>' +
        '<div class="stack-s">' +
        '<button class="opt" data-wz="new">' + icon('plus') + '<div class="grow"><b>' + t('New class') + '</b><span class="muted small">' + t('Set up in about 5 minutes. You only paste names and tap days.') + '</span></div>' + icon('chevR') + '</button>' +
        '<button class="opt" data-wz="open">' + icon('copy') + '<div class="grow"><b>' + t('Open my file') + '</b><span class="muted small">' + t('Continue with the save file you made before.') + '</span></div>' + icon('chevR') + '</button>' +
        '<button class="opt" data-wz="sample">' + icon('play') + '<div class="grow"><b>' + t('Try a sample class') + '</b><span class="muted small">' + t('Made-up students to play with. You can clear it any time.') + '</span></div>' + icon('chevR') + '</button></div>' +
        '<div class="why" style="margin-top:12px;color:var(--danger)" role="alert">' + (startErr ? icon('ban') + '<span>' + t(startErr) + '</span>' : '') + '</div>' +
        '<div class="card" style="margin-top:6px"><h3>' + t('Where does my data go?') + '</h3><ul class="small muted" style="margin:8px 0 0;padding-left:18px">' +
        '<li>' + t('It stays on this phone, in this browser. Nothing is sent anywhere.') + '</li>' +
        '<li>' + t('The person who built this page cannot see it.') + '</li>' +
        '<li>' + t('You keep a save file as your backup. The app reminds you.') + '</li></ul></div></div>';
    }

    /* ---------- reading a save file ---------- */
    function pickFile(done) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
        if (f.size > 5e6) { done({ ok: false, reason: 'broken' }); return; }
        var fr = new FileReader();
        fr.onload = function () { done(BC.parseFile(String(fr.result))); };
        fr.onerror = function () { done({ ok: false, reason: 'broken' }); };
        fr.readAsText(f);
      });
      inp.click();
    }
    function adopt(r) {
      BC.load(r.data); BC.meta.setup = true; BC.markBackedUp(Date.parse(r.saved) || Date.now()); BC.autosave();
      S.mode = 'app'; S.tab = 'sessions'; S.sub = null; startErr = ''; E.render(); E.toast(t('File opened.'));
    }

    /* ---------- the wizard ---------- */
    function freshW() {
      BC.blank();
      var tt = {}; ORDER.forEach(function (d) { var x = BC.timetable[d]; tt[d] = { on: x.on, start: x.start, end: x.end }; });
      W = { step: 1, tt: tt, courts: BC.config.venue_courts, fee1: BC.config.fee_1day, fee2: BC.config.fee_2days, text: '', list: [], parse: { names: [], dup: 0, long: 0, over: 0 }, paid: {}, saved: false };
    }
    function onDays() { return ORDER.filter(function (d) { return W.tt[d].on; }); }
    function needDay() { return W.list.filter(function (s) { return s.type === 'fixed' && !s.days.length; }).length; }
    var VALID = [null,
      function () { return onDays().length >= 1; },
      function () { return W.list.length >= 1; },
      function () { return W.list.length >= 1 && needDay() === 0; },
      function () { return true; },
      function () { return !!W.saved; }];
    function unlocked(step) { for (var k = 1; k < step; k++) if (!VALID[k]()) return false; return true; }
    function touch() { if (W.saved === true) W.saved = false; }
    function reconcile() {
      var p = BC.parseNames(W.text), old = {};
      W.list.forEach(function (s) { old[BC.nameKey(s.name)] = s; });
      W.parse = p;
      W.list = p.names.map(function (n) { var o = old[BC.nameKey(n)]; if (o) { o.name = n; return o; } return { name: n, type: 'fixed', days: [] }; });
    }
    function pruneDays() { var on = onDays(); W.list.forEach(function (s) { s.days = s.days.filter(function (d) { return on.indexOf(d) >= 0; }); }); }
    function feeOf(s) { return s.type === 'fixed' ? (s.days.length >= 2 ? W.fee2 : W.fee1) : W.fee1; }
    function plural(n, one, many) { return t(n === 1 ? one : many, { n: n }); }

    function numStepper(k, val, min, max, label) {
      return '<div class="stepper"><button data-wz="num" data-k="' + k + '" data-d="-1" aria-label="' + h(label) + ' −"' + (val <= min ? ' disabled' : '') + '>−</button><output class="wide">' + label + '</output>' +
        '<button data-wz="num" data-k="' + k + '" data-d="1" aria-label="' + h(label) + ' +"' + (val >= max ? ' disabled' : '') + '>+</button></div>';
    }
    function sel(id, val, opts, off) {
      return '<select class="inp" id="' + id + '"' + (off ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
    }

    function step1() {
      var lastOn = onDays().length === 1;
      var rows = ORDER.map(function (d) {
        var x = W.tt[d], endOpts = TIMES.filter(function (m) { return m > x.start; });
        return '<div class="wz-row' + (x.on ? '' : ' off') + '"><button class="chip" data-wz="day" data-d="' + d + '" aria-pressed="' + x.on + '"' + (x.on && lastOn ? ' disabled' : '') + ' aria-label="' + BC.wdLong(d, S.lang) + '">' + BC.wd(d, S.lang) + '</button>' +
          sel('wz-s-' + d, x.start, TIMES.slice(0, -1), !x.on) + sel('wz-e-' + d, x.end, endOpts, !x.on) + '</div>';
      }).join('');
      return '<h2 class="wz-h">' + t('Your class') + '</h2><p class="muted small" style="margin-bottom:12px">' + t('Tap the days you teach, then check the times. The fees are your usual ones.') + '</p>' +
        '<div class="card"><div class="wz-row muted small" style="border-bottom:0;padding-bottom:0"><span>' + t('Day') + '</span><span>' + t('From') + '</span><span>' + t('To') + '</span></div>' +
        rows + '</div>' +
        '<div class="card"><div class="set-row"><div class="l">' + t('Courts the venue has') + '</div>' + numStepper('courts', W.courts, 1, BC.LIMITS.courts, String(W.courts)) + '</div>' +
        '<div class="set-row"><div class="l">' + t('Monthly fee, 1 day a week') + '</div>' + numStepper('fee1', W.fee1, BC.LIMITS.feeMin, W.fee2, money(W.fee1)) + '</div>' +
        '<div class="set-row"><div class="l">' + t('Monthly fee, 2 days a week') + '</div>' + numStepper('fee2', W.fee2, W.fee1, BC.LIMITS.feeMax, money(W.fee2)) + '</div>' +
        '<p class="muted tiny" style="margin-top:6px">' + t('The 2-day fee can never be lower than the 1-day fee, so the buttons stop there.') + '</p></div>';
    }

    function prevHtml() {
      var p = W.parse, notes = [];
      if (p.dup) notes.push(plural(p.dup, '{n} repeated name was left out.', '{n} repeated names were left out.'));
      if (p.long) notes.push(plural(p.long, '{n} name was cut to {max} letters.'.replace('{max}', BC.LIMITS.nameLen), '{n} names were cut to {max} letters.'.replace('{max}', BC.LIMITS.nameLen)));
      if (p.over) notes.push(t('Only the first {n} names are used.', { n: BC.LIMITS.students }));
      return '<div class="row between" style="margin:12px 0 8px"><b class="cnt">' + plural(W.list.length, '{n} student', '{n} students') + '</b><span class="muted small">' + t('up to {n}', { n: BC.LIMITS.students }) + '</span></div>' +
        '<div class="chips" style="min-height:44px;max-height:168px;overflow:auto">' + W.list.map(function (s) { return '<span class="fchip">' + h(s.name) + '</span>'; }).join('') + '</div>' +
        '<div class="why" style="margin-top:6px">' + (notes.length ? icon('info') + '<span>' + notes.join(' ') + '</span>' : '') + '</div>';
    }
    function step2() {
      return '<h2 class="wz-h">' + t('Your students') + '</h2><p class="muted small" style="margin-bottom:12px">' + t('Paste their first names, one per line. You can copy them from your Zalo group, your notes or a spreadsheet column.') + '</p>' +
        '<div class="card"><label class="field"><span class="lbl">' + t('Names') + '</span><textarea class="inp names" id="wz-names" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Lan&#10;Minh&#10;Hùng">' + h(W.text) + '</textarea>' +
        '<span class="hint">' + t('Numbers, dashes and bullets in front are ignored. Names are cut at {n} letters.', { n: BC.LIMITS.nameLen }) + '</span></label><div id="wz-prev">' + prevHtml() + '</div></div>';
    }

    function dayChipsFor(i, s) {
      var off = s.type !== 'fixed';
      return onDays().map(function (d) { return '<button class="chip" data-wz="sday" data-i="' + i + '" data-d="' + d + '" aria-pressed="' + (s.days.indexOf(d) >= 0) + '"' + (off ? ' disabled' : '') + '>' + BC.wd(d, S.lang) + '</button>'; }).join('');
    }
    function step3() {
      var fixed = W.list.filter(function (s) { return s.type === 'fixed'; });
      var all = onDays().map(function (d) {
        var on = fixed.length > 0 && fixed.every(function (s) { return s.days.indexOf(d) >= 0; });
        return '<button class="chip" data-wz="allday" data-d="' + d + '" aria-pressed="' + on + '"' + (fixed.length ? '' : ' disabled') + '>' + BC.wd(d, S.lang) + '</button>';
      }).join('');
      var rows = W.list.map(function (s, i) {
        var fee = s.type === 'fixed' && !s.days.length ? '—' : money(feeOf(s));
        return '<div class="wz-stu"><div class="row between"><b>' + h(s.name) + '</b><span class="small muted">' + fee + '</span></div>' +
          '<div class="seg full" role="group" style="margin-top:8px"><button data-wz="type" data-i="' + i + '" data-v="fixed" aria-pressed="' + (s.type === 'fixed') + '">' + t('Fixed days') + '</button><button data-wz="type" data-i="' + i + '" data-v="flexible" aria-pressed="' + (s.type === 'flexible') + '">' + t('Flexible') + '</button></div>' +
          '<div class="chips grid" style="--n:' + onDays().length + '">' + dayChipsFor(i, s) + '</div></div>';
      }).join('');
      return '<h2 class="wz-h">' + t('Their days') + '</h2><p class="muted small" style="margin-bottom:12px">' + t('Most students come on the same days. Set those first, then fix the few who are different.') + '</p>' +
        '<div class="card"><b>' + t('Same days for everyone') + '</b><div class="chips grid" style="--n:' + onDays().length + ';margin-top:10px">' + all + '</div></div>' +
        '<div class="card" id="wz-list">' + rows + '</div>';
    }

    function step4() {
      var ym = BC.ym(BC.today), n = W.list.filter(function (s) { return W.paid[BC.nameKey(s.name)]; }).length;
      var rows = W.list.map(function (s, i) {
        var on = !!W.paid[BC.nameKey(s.name)];
        return '<div class="set-row"><div class="l"><b>' + h(s.name) + '</b><div class="muted tiny">' + money(feeOf(s)) + '</div></div><button class="switch" role="switch" aria-checked="' + on + '" data-wz="paid" data-i="' + i + '" aria-label="' + h(s.name) + '"></button></div>';
      }).join('');
      return '<h2 class="wz-h">' + t('Who has paid {month}?', { month: BC.monthOnly(ym, S.lang) }) + '</h2><p class="muted small" style="margin-bottom:12px">' + t('Switch on everyone who has already paid this month. You can skip this and tick people later.') + '</p>' +
        '<div class="card"><div class="row between" style="margin-bottom:6px"><b class="cnt">' + t('{a} of {b} paid', { a: n, b: W.list.length }) + '</b><div class="seg"><button data-wz="allpaid" data-v="1">' + t('All') + '</button><button data-wz="allpaid" data-v="0">' + t('None') + '</button></div></div>' + rows + '</div>';
    }

    function step5() {
      var paid = W.list.filter(function (s) { return W.paid[BC.nameKey(s.name)]; }).length;
      return '<h2 class="wz-h">' + t('Save your file') + '</h2><p class="muted small" style="margin-bottom:12px">' + t('Your data lives on this phone. The file is your backup: keep it in Files, Zalo or email, and save a new one now and then.') + '</p>' +
        '<div class="card stack"><div class="kv" style="display:flex;justify-content:space-between"><span class="muted">' + t('Students') + '</span><b>' + W.list.length + '</b></div>' +
        '<div class="kv" style="display:flex;justify-content:space-between"><span class="muted">' + t('Class days') + '</span><b>' + onDays().length + '</b></div>' +
        '<div class="kv" style="display:flex;justify-content:space-between"><span class="muted">' + t('Paid this month') + '</span><b>' + paid + '</b></div>' +
        '<button class="btn primary block" data-wz="save">' + icon('copy', 'sm') + ' ' + (W.saved === true ? t('Save again') : t('Save file')) + '</button>' +
        '<button class="btn ghost block" data-wz="later"' + (W.saved ? ' disabled' : '') + '>' + t('I will do it later') + '</button>' +
        '<div class="why' + (W.saved === true ? ' ready' : '') + '">' + (W.saved === true ? icon('check') + '<span>' + t('Saved. Keep the file somewhere safe.') + '</span>' : (W.saved === 'later' ? icon('info') + '<span>' + t('No backup yet. The app will remind you.') + '</span>' : '')) + '</div></div>';
    }

    function whyHtml() {
      var s = W.step, ok = VALID[s](), ready = ok && s !== 5, txt = '', ic = '';
      if (s === 1) { txt = t('At least one day stays on.'); ic = 'info'; ready = false; }
      else if (s === 2) { txt = ok ? plural(W.list.length, '{n} student. Next: their days.', '{n} students. Next: their days.') : t('Paste at least one name to continue.'); ic = ok ? 'check' : 'info'; }
      else if (s === 3) { var n = needDay(); txt = ok ? t('Everyone has a day.') : plural(n, '{n} student still needs a day.', '{n} students still need a day.'); ic = ok ? 'check' : 'info'; }
      else if (s === 4) { txt = t('You can skip this one.'); ic = 'info'; ready = false; }
      else { txt = ok ? t('All set.') : t('Save the file first, or choose "I will do it later".'); ic = ok ? 'check' : 'info'; ready = ok; }
      return '<div class="why' + (ready ? ' ready' : '') + '" id="wz-why">' + icon(ic) + '<span>' + txt + '</span></div>';
    }
    function barHtml() {
      var s = W.step, ok = VALID[s]();
      return whyHtml() + '<div class="row"><button class="btn back" data-wz="back">' + icon('back', 'sm') + ' ' + t('Back') + '</button>' +
        '<button class="btn primary" data-wz="' + (s === 5 ? 'finish' : 'next') + '"' + (ok ? '' : ' disabled') + '>' + (s === 5 ? t('Finish') : t('Next')) + '</button></div>';
    }

    function stepsHtml() {
      return [1, 2, 3, 4, 5].map(function (k) {
        var dis = !unlocked(k), done = k < W.step && VALID[k]();
        return '<button data-wz="go" data-s="' + k + '" class="' + (done ? 'done' : '') + '"' + (k === W.step ? ' aria-current="step"' : '') + (dis ? ' disabled' : '') + ' aria-label="' + t('Step {n}', { n: k }) + '">' + (done ? icon('check', 'sm') : k) + '</button>';
      }).join('');
    }
    function wizardView() {
      var s = W.step, steps = stepsHtml();
      return '<div class="wzv"><div class="row between" style="padding-top:12px"><span class="muted small">' + t('Step {a} of {b}', { a: s, b: 5 }) + '</span><div class="row" style="gap:8px">' + UI.themeBtn() +
        '<div class="seg" role="group" aria-label="Language"><button data-lang="vi" aria-pressed="' + (S.lang === 'vi') + '">VI</button><button data-lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div></div></div>' +
        '<div class="steps" id="wz-steps" style="margin-top:10px">' + steps + '</div>' + [null, step1, step2, step3, step4, step5][s]() +
        '</div><div class="bar"><div class="bar-in" id="wz-bar">' + barHtml() + '</div></div>';
    }

    /* build the real data from the wizard's answers */
    function apply() {
      var ym = BC.ym(BC.today), start = ym + '-01';
      BC.blank();
      BC.config.venue_courts = W.courts; BC.config.fee_1day = W.fee1; BC.config.fee_2days = W.fee2;
      ORDER.forEach(function (d) { BC.timetable[d] = { on: W.tt[d].on, start: W.tt[d].start, end: W.tt[d].end }; });
      W.list.forEach(function (s) {
        var st = BC.addStudent({ name: s.name, type: s.type, days: s.type === 'fixed' ? s.days : [], start: start, fee: null });
        if (W.paid[BC.nameKey(s.name)]) BC.setPaid(st.id, ym, true);
      });
      BC.meta = { sample: false, setup: true };
      BC.autosave();
    }

    function go(step) { if (step < 1 || step > 5 || !unlocked(step)) return; W.step = step; if (step === 3) pruneDays(); E.render(); window.scrollTo(0, 0); }
    function barRefresh() { var b = $('#wz-bar'); if (b) b.innerHTML = barHtml(); }

    /* ---------- events ---------- */
    function click(e) {
      var el = e.target.closest('[data-wz]'); if (!el || el.disabled) return !!el;
      var a = el.getAttribute('data-wz'), i = Number(el.getAttribute('data-i')), d = Number(el.getAttribute('data-d')), v = el.getAttribute('data-v');
      switch (a) {
        case 'new': startErr = ''; freshW(); S.mode = 'wizard'; E.render(); window.scrollTo(0, 0); break;
        case 'open': pickFile(function (r) { if (r.ok) adopt(r); else { startErr = errText(r.reason); E.render(); } }); break;
        case 'sample': BC.seed(); BC.autosave(); S.mode = 'app'; S.tab = 'sessions'; S.sub = null; startErr = ''; E.render(); E.toast(t('Sample class loaded.')); break;
        case 'go': go(Number(el.getAttribute('data-s'))); break;
        case 'next': if (VALID[W.step]()) go(W.step + 1); break;
        case 'back': if (W.step === 1) { S.mode = 'start'; E.render(); } else go(W.step - 1); break;
        case 'day': touch(); W.tt[d].on = !W.tt[d].on; E.render(); break;
        case 'num': {
          touch(); var k = el.getAttribute('data-k'), dir = d;
          if (k === 'courts') W.courts = Math.max(1, Math.min(BC.LIMITS.courts, W.courts + dir));
          else if (k === 'fee1') W.fee1 = Math.max(BC.LIMITS.feeMin, Math.min(W.fee2, W.fee1 + dir * BC.LIMITS.feeStep));
          else W.fee2 = Math.min(BC.LIMITS.feeMax, Math.max(W.fee1, W.fee2 + dir * BC.LIMITS.feeStep));
          E.render(); break;
        }
        case 'type': touch(); W.list[i].type = v; if (v === 'flexible') W.list[i].days = []; E.render(); break;
        case 'sday': { touch(); var s = W.list[i], p = s.days.indexOf(d); if (p >= 0) s.days.splice(p, 1); else s.days.push(d); E.render(); break; }
        case 'allday': {
          touch(); var fx = W.list.filter(function (x) { return x.type === 'fixed'; }), every = fx.every(function (x) { return x.days.indexOf(d) >= 0; });
          fx.forEach(function (x) { var q = x.days.indexOf(d); if (every && q >= 0) x.days.splice(q, 1); else if (!every && q < 0) x.days.push(d); });
          E.render(); break;
        }
        case 'paid': { touch(); var key = BC.nameKey(W.list[i].name); W.paid[key] = !W.paid[key]; E.render(); break; }
        case 'allpaid': touch(); W.list.forEach(function (x) { W.paid[BC.nameKey(x.name)] = v === '1'; }); E.render(); break;
        case 'save':
          apply();
          BC.giveFile(BC.fileName(), BC.fileText(), 'application/json').then(function (done) { if (done) { BC.markBackedUp(); W.saved = true; E.render(); } });
          break;
        case 'later':
          UI.confirm({ title: t('Skip the backup?'), body: t('If this phone is lost or the browser is cleared, you would have to start again. You can save a file any time from More.'), ok: t('I will do it later'), cancel: t('Save now') }).then(function (yes) { if (yes) { W.saved = 'later'; E.render(); } });
          break;
        case 'finish':
          if (!VALID[5]()) break;
          apply(); if (W.saved === true) BC.markBackedUp();
          W = null; S.mode = 'app'; S.tab = 'sessions'; S.sub = null; E.render(); window.scrollTo(0, 0); E.toast(t('Your class is ready.'));
          break;
      }
      return true;
    }
    function input(e) {
      if (!W || e.target.id !== 'wz-names') return false;
      touch(); W.text = e.target.value; reconcile();
      var p = $('#wz-prev'); if (p) p.innerHTML = prevHtml();
      var st = $('#wz-steps'); if (st) st.innerHTML = stepsHtml();
      barRefresh(); return true;
    }
    function change(e) {
      var id = e.target.id || '', m = /^wz-([se])-(\d)$/.exec(id); if (!W || !m) return false;
      touch(); var d = Number(m[2]), x = W.tt[d];
      if (m[1] === 's') { x.start = e.target.value; if (x.end <= x.start) { var i = TIMES.indexOf(x.start); x.end = TIMES[Math.min(TIMES.length - 1, i + 4)]; } }
      else x.end = e.target.value;
      E.render(); return true;
    }

    return {
      startView: startView, wizardView: wizardView, click: click, input: input, change: change, pickFile: pickFile, adopt: adopt, errText: errText,
      restart: function () { startErr = ''; S.mode = 'start'; },
      setErr: function (x) { startErr = x; }
    };
  }
  return { create: create };
})();
