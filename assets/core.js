/* Birdie Crew: the class rules, shared by the card and the coach's page.
   Everything lives in memory. Nothing here talks to a server. */
(function () {
  'use strict';
  var BC = (window.BC = {});
  var pad = function (n) { return String(n).padStart(2, '0'); };
  BC.lang = 'vi';

  /* ---------- dates (ISO strings, no time zones) ---------- */
  BC.toDate = function (iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
  BC.iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  BC.addDays = function (iso, n) { var d = BC.toDate(iso); d.setDate(d.getDate() + n); return BC.iso(d); };
  BC.diff = function (a, b) { return Math.round((BC.toDate(b) - BC.toDate(a)) / 864e5); };
  BC.dow = function (iso) { return BC.toDate(iso).getDay(); };
  BC.ym = function (iso) { return iso.slice(0, 7); };
  BC.addMonths = function (ym, n) { var p = ym.split('-').map(Number); var d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  BC.monthDays = function (ym) {
    var p = ym.split('-').map(Number); var n = new Date(p[0], p[1], 0).getDate(); var a = [];
    for (var i = 1; i <= n; i++) a.push(ym + '-' + pad(i));
    return a;
  };
  var WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] };
  var WDL = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    vi: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  BC.wd = function (dow, lang) { return WD[lang || BC.lang][dow]; };
  BC.wdLong = function (dow, lang) { return WDL[lang || BC.lang][dow]; };
  BC.fmtDay = function (iso, lang) {
    lang = lang || BC.lang; var d = BC.toDate(iso);
    return lang === 'vi' ? d.getDate() + '/' + (d.getMonth() + 1) : d.getDate() + ' ' + MON[d.getMonth()];
  };
  BC.fmtDate = function (iso, lang) {
    lang = lang || BC.lang; var d = BC.toDate(iso);
    return WD[lang][d.getDay()] + (lang === 'vi' ? ', ' : ' ') + BC.fmtDay(iso, lang);
  };
  BC.fmtLong = function (iso, lang) {
    lang = lang || BC.lang; var d = BC.toDate(iso);
    return lang === 'vi'
      ? WDL.vi[d.getDay()] + ', ' + d.getDate() + ' tháng ' + (d.getMonth() + 1)
      : WDL.en[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()];
  };
  BC.monthName = function (ym, lang) {
    lang = lang || BC.lang; var p = ym.split('-').map(Number);
    return lang === 'vi' ? 'Tháng ' + p[1] + ', ' + p[0] : MONL[p[1] - 1] + ' ' + p[0];
  };
  BC.monthOnly = function (ym, lang) {
    lang = lang || BC.lang; var m = Number(ym.split('-')[1]);
    return lang === 'vi' ? 'Tháng ' + m : MONL[m - 1];
  };
  BC.monthShort = function (ym, lang) {
    lang = lang || BC.lang; var m = Number(ym.split('-')[1]);
    return lang === 'vi' ? 'Th' + m : MON[m - 1];
  };
  BC.fmtVND = function (n, lang) {
    lang = lang || BC.lang;
    return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n) + ' ₫';
  };

  /* ---------- skills ---------- */
  BC.skills = [
    { id: 'smash', en: 'Smash', vi: 'Đập cầu' },
    { id: 'net', en: 'Net', vi: 'Chơi lưới' },
    { id: 'footwork', en: 'Footwork', vi: 'Di chuyển' },
    { id: 'defense', en: 'Defense', vi: 'Phòng thủ' },
    { id: 'serve', en: 'Serve', vi: 'Giao cầu' },
    { id: 'stamina', en: 'Stamina', vi: 'Thể lực' }
  ];

  /* ---------- message texts (live in Config) ---------- */
  BC.defaultMessages = function () {
    return {
      en: {
        soft: 'Hi {name}, a friendly reminder: the {month} fee of {amount} is due by the end of {due}. Please transfer with the note {code}.',
        late: 'Hi {name}, the {month} fee ({amount}) is now overdue. Until it is paid you cannot skip, take make-ups or plan breaks (lessons already booked stay). Transfer note: {code}.',
        cancel: 'Notice: the {weekday} {date} session is cancelled. Everyone booked gets 1 free make-up lesson, valid until the end of {until}. Message me to pick a day.',
        card: 'Hi {name}, here is your class card (as of {date}). Open it and bookmark it. When something changes I will send you a fresh one: {link}'
      },
      vi: {
        soft: 'Chào {name}, nhắc nhẹ: học phí {month} là {amount}, hạn đóng hết ngày {due}. Bạn chuyển khoản với nội dung {code} nhé.',
        late: 'Chào {name}, học phí {month} ({amount}) đã quá hạn. Khi chưa đóng, bạn chưa thể xin nghỉ, đặt học bù hay báo nghỉ dài (các buổi đã đặt vẫn giữ). Nội dung chuyển khoản: {code}.',
        cancel: 'Thông báo: buổi học {weekday} {date} được hủy. Mỗi bạn đã đăng ký được 1 buổi học bù miễn phí, dùng đến hết {until}. Nhắn cho HLV để chọn ngày học bù.',
        card: 'Chào {name}, đây là thẻ lớp của bạn (cập nhật ngày {date}). Bạn mở và lưu lại nhé. Khi có thay đổi mình sẽ gửi thẻ mới: {link}'
      }
    };
  };
  BC.fill = function (tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  };

  /* ---------- a fresh, empty class with the usual rules ---------- */
  BC.defaults = function () {
    BC.nextId = 1;
    BC.meta = { sample: false, setup: false };
    BC.config = {
      advance_days: 7, flex_notice_days: 7, pay_by_day: 5, first_bill_days: 3,
      max_makeups_per_month: 3, long_break_days: 14,
      seats_per_court: 4, venue_courts: 4, proration: true, credit_carry: true,
      cancel_credit_months: 1, page_title: 'VM Badminton', timezone: 'Asia/Ho_Chi_Minh',
      coach_zalo: '', currency: 'VND', fee_1day: 800000, fee_2days: 1300000, default_lang: 'vi'
    };
    BC.messages = BC.defaultMessages();
    BC.ttHistory = [];   /* older timetables: [{ until: iso, tt }], each valid for dates before `until` */
    BC.timetable = {
      1: { on: true, start: '20:00', end: '22:00' }, 2: { on: true, start: '20:00', end: '22:00' },
      3: { on: true, start: '20:00', end: '22:00' }, 4: { on: true, start: '20:00', end: '22:00' },
      5: { on: false, start: '20:00', end: '22:00' },
      6: { on: true, start: '10:00', end: '12:00' }, 0: { on: true, start: '10:00', end: '12:00' }
    };
    BC.overrides = {};
    BC.videos = {};
    BC.skills.forEach(function (k) { BC.videos[k.id] = { title: '', len: '', url: '' }; });
    BC.students = []; BC.changes = []; BC.breaks = []; BC.payments = {}; BC.changeLog = []; BC.scores = {};
    BC.qrImage = '';
  };
  BC.blank = function () { BC.defaults(); };   /* the date is left alone */

  /* today in Vietnam, whatever time zone the phone is set to */
  BC.realToday = function () {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return BC.iso(new Date()); }
  };
  /* pages call this once. Adding ?today=2026-12-01 to the address pretends it is that day (for trying things out). */
  BC.initToday = function () {
    BC.today = BC.realToday(); BC.pretend = false;
    try {
      var m = /[?&]today=(\d{4}-\d{2}-\d{2})(?:&|#|$)/.exec(window.location.search + '&');
      if (m && !isNaN(BC.toDate(m[1]).getTime())) { BC.today = m[1]; BC.pretend = true; }
    } catch (e) { /* not in a browser */ }
  };

  /* ---------- lookups ---------- */
  BC.student = function (id) { return BC.students.filter(function (s) { return s.id === id; })[0]; };
  BC.rows = function (sid, type, f) {
    return BC.changes.filter(function (c) { return c.student === sid && c.type === type && !c.cancelled && (!f || f(c)); });
  };
  BC.skipRow = function (sid, iso) { return BC.rows(sid, 'skip', function (c) { return c.date === iso; })[0]; };
  /* The timetable that was in force on a date. A change applies from the day it is made, so past
     lessons, bills and credits never move when the coach adds or drops a class day later. */
  BC.ttFor = function (iso) {
    var h = BC.ttHistory || [], i;
    for (i = 0; i < h.length; i++) if (iso < h[i].until) return h[i].tt;
    return BC.timetable;
  };
  BC.ttEdit = function (fn) {
    var h = BC.ttHistory = BC.ttHistory || [], last = h[h.length - 1];
    if (!last || last.until !== BC.today) h.push({ until: BC.today, tt: JSON.parse(JSON.stringify(BC.timetable)) });
    h.sort(function (a, b) { return a.until < b.until ? -1 : a.until > b.until ? 1 : 0; });
    fn(BC.timetable);
  };
  BC.classDay = function (iso) { var t = BC.ttFor(iso)[BC.dow(iso)]; return !!(t && t.on); };
  BC.breakLen = function (b) { return BC.diff(b.from, b.to) + 1; };
  BC.isLong = function (b) { return BC.breakLen(b) >= BC.config.long_break_days; };
  BC.breaksOf = function (sid) { return BC.breaks.filter(function (b) { return b.student === sid; }); };
  BC.inLongBreak = function (sid, iso) {
    return BC.breaks.some(function (b) { return b.student === sid && BC.isLong(b) && iso >= b.from && iso <= b.to; });
  };
  BC.inAnyBreak = function (sid, iso) {
    return BC.breaks.some(function (b) { return b.student === sid && iso >= b.from && iso <= b.to; });
  };
  BC.isRegular = function (s, iso) {
    return s.active && s.type === 'fixed' && s.days.indexOf(BC.dow(iso)) >= 0 && iso >= s.start && BC.classDay(iso);
  };

  /* ---------- sessions ---------- */
  BC.session = function (iso) {
    var ov = BC.overrides[iso] || {};
    var tt = BC.ttFor(iso)[BC.dow(iso)];
    var o = { iso: iso, ov: ov, cancelled: !!ov.cancelled, isClass: !!(tt && tt.on), regular: [], skipped: [], makeups: [], joins: [], onBreak: [], coming: [] };
    if (!o.isClass) { o.seats = 0; o.count = 0; o.free = 0; o.courtsToBook = 0; o.courts = 0; o.extra = 0; return o; }
    o.start = tt.start; o.end = tt.end;
    BC.students.forEach(function (s) {
      if (!s.active) return;
      if (BC.isRegular(s, iso)) {
        if (BC.inLongBreak(s.id, iso)) o.onBreak.push(s.id);
        else if (BC.skipRow(s.id, iso)) o.skipped.push(s.id);
        else o.regular.push(s.id);
      }
      if (BC.rows(s.id, 'makeup', function (c) { return c.date === iso; }).length) o.makeups.push(s.id);
      if (BC.rows(s.id, 'join', function (c) { return c.date === iso; }).length) o.joins.push(s.id);
    });
    o.courts = Math.max(0, Math.min(BC.config.venue_courts, ov.courts == null ? BC.config.venue_courts : ov.courts));   /* never more courts than the venue has */
    o.extra = ov.extra || 0;
    o.seats = o.courts * BC.config.seats_per_court + o.extra;
    o.coming = o.cancelled ? [] : o.regular.concat(o.makeups, o.joins);
    o.count = o.coming.length;
    o.free = Math.max(0, o.seats - o.count);
    o.over = o.count > o.seats;
    o.courtsToBook = Math.ceil(o.count / BC.config.seats_per_court);
    o.locked = BC.diff(BC.today, iso) < BC.config.advance_days;
    return o;
  };

  /* ---------- credits ---------- */
  BC.addSkipRow = function (sid, iso, created, breakId) {
    var ym = BC.ym(iso);
    var earned = BC.rows(sid, 'skip', function (c) { return c.credit && BC.ym(c.date) === ym; }).length;
    var row = { id: BC.nextId++, student: sid, type: 'skip', date: iso, credit: earned < BC.config.max_makeups_per_month, created: created || BC.today, cancelled: false, breakId: breakId || null };
    BC.changes.push(row);
    return row;
  };
  BC.makeupsIn = function (sid, ym) { return BC.rows(sid, 'makeup', function (c) { return BC.ym(c.date) === ym; }); };
  BC.capUsed = function (sid, ym) { return BC.makeupsIn(sid, ym).filter(function (m) { return m.source === 'skip'; }).length; };
  BC.makeupsLeft = function (sid, ym) { return Math.max(0, BC.config.max_makeups_per_month - BC.capUsed(sid, ym)); };
  BC.usedCreditIds = function (sid) {
    var o = {}; BC.rows(sid, 'makeup').forEach(function (m) { if (m.creditId) o[m.creditId] = 1; }); return o;
  };
  BC.availSkipCredits = function (sid, ym) {
    var used = BC.usedCreditIds(sid);
    return BC.rows(sid, 'skip', function (c) { return c.credit && BC.ym(c.date) === ym && !used[c.id]; });
  };
  BC.availCancelCredits = function (sid, ym) {
    var used = BC.usedCreditIds(sid);
    return BC.rows(sid, 'cancel_credit', function (c) {
      var m = BC.ym(c.date);
      return ym >= m && ym <= BC.addMonths(m, BC.config.cancel_credit_months) && !used[c.id];
    });
  };
  BC.creditSummary = function (sid, ym) {
    var left = BC.makeupsLeft(sid, ym);
    var skipC = Math.min(BC.availSkipCredits(sid, ym).length, left);
    var free = BC.availCancelCredits(sid, ym);
    var freeUntil = free.length ? BC.addMonths(BC.ym(free[0].date), BC.config.cancel_credit_months) : null;
    return { left: left, skipCredits: skipC, free: free.length, freeUntil: freeUntil };
  };
  BC.grantCancelCredits = function (iso, created) {
    var ses = BC.session(iso); var n = 0;
    // students who were booked: regular, plus those with a make-up or join that day
    ses.regular.forEach(function (sid) {
      BC.changes.push({ id: BC.nextId++, student: sid, type: 'cancel_credit', date: iso, created: created || BC.today, cancelled: false }); n++;
    });
    ses.makeups.forEach(function (sid) {
      BC.rows(sid, 'makeup', function (c) { return c.date === iso; }).forEach(function (m) { m.cancelled = true; });
    });
    ses.joins.forEach(function (sid) {
      BC.rows(sid, 'join', function (c) { return c.date === iso; }).forEach(function (m) { m.cancelled = true; });
    });
    return n;
  };

  /* ---------- billing ---------- */
  BC.payRec = function (sid, ym) {
    var k = sid + '|' + ym;
    if (!BC.payments[k]) BC.payments[k] = { paid: false, paidDate: null, amountPaid: 0, override: null, creditIn: 0 };
    return BC.payments[k];
  };
  BC.dueDate = function (s, ym) {
    var base = ym + '-' + pad(BC.config.pay_by_day);
    if (BC.ym(s.start) === ym) { var first = BC.addDays(s.start, BC.config.first_bill_days); return first > base ? first : base; }
    return base;
  };
  BC.isLate = function (sid) {
    var s = BC.student(sid), ym = BC.ym(BC.today);
    if (ym < BC.ym(s.start)) return false;
    if (BC.payRec(sid, ym).paid) return false;
    return BC.today > BC.dueDate(s, ym);
  };
  BC.lessonDates = function (s, ym) {
    return BC.monthDays(ym).filter(function (d) { return BC.classDay(d) && (s.type === 'fixed' ? s.days.indexOf(BC.dow(d)) >= 0 : true); });
  };
  BC.billedDates = function (s, ym) {
    return BC.lessonDates(s, ym).filter(function (d) { return d >= s.start && !BC.inLongBreak(s.id, d); });
  };
  /* The usual fee depends on days per week: 1 day = fee_1day, 2 or more = fee_2days. Flexible students use fee_1day unless the coach sets their own. */
  BC.baseFee = function (s) {
    if (s.fee) return s.fee;
    return s.type === 'fixed' && s.days.length >= 2 ? BC.config.fee_2days : BC.config.fee_1day;
  };
  /* Part-month bills are always rounded to the nearest 1,000 dong. A fixed rule, not a setting. */
  var ROUND = 1000;
  BC.calcAmount = function (s, ym) {
    var fee = BC.baseFee(s);
    if (!BC.config.proration) return fee;
    var full = BC.lessonDates(s, ym).length;
    if (!full) return fee;
    var billed = BC.billedDates(s, ym).length;
    return Math.round(fee * billed / full / ROUND) * ROUND;
  };
  BC.amountDue = function (s, ym) {
    var rec = BC.payRec(s.id, ym);
    if (rec.override != null) return rec.override;
    return Math.max(0, BC.calcAmount(s, ym) - (BC.config.credit_carry ? rec.creditIn : 0));
  };
  BC.recalcCredits = function (sid) {
    var s = BC.student(sid);
    Object.keys(BC.payments).forEach(function (k) {
      var p = k.split('|'); if (Number(p[0]) !== sid) return;
      var rec = BC.payments[k], ym = p[1];
      if (!rec.paid || rec.override != null || !BC.config.credit_carry) return;
      var diff = rec.amountPaid - (BC.calcAmount(s, ym));
      var next = BC.payRec(sid, BC.addMonths(ym, 1));
      next.creditIn = Math.max(0, diff);
    });
  };
  BC.setPaid = function (sid, ym, paid) {
    var rec = BC.payRec(sid, ym); var s = BC.student(sid);
    rec.paid = paid; rec.paidDate = paid ? BC.today : null;
    rec.amountPaid = paid ? BC.amountDue(s, ym) : 0;
    BC.recalcCredits(sid);
  };

  /* ---------- lesson changes (made by the COACH after the student asks on Zalo) ----------
     Two kinds of "no":
       hard = impossible (not their lesson, session cancelled, would break the books). Always refused.
       soft = a rule the coach may bend: notice, late payment, full session, no credit, cap of 3.
              Refused with a warning first. Passing { force: true } does it anyway and reports what was bent. */
  var fail = function (reason, extra) { return Object.assign({ ok: false, reason: reason }, extra || {}); };
  var daysAhead = function (iso) { return BC.diff(BC.today, iso); };
  var SOFT = { late: 1, notice: 1, noticeBreak: 1, full: 1, capReached: 1, noCredit: 1 };
  BC.isSoft = function (reason) { return !!SOFT[reason]; };
  var refuse = function (reason, o, W) {
    if (SOFT[reason] && o && o.force) { W.push(reason); return null; }
    return fail(reason);
  };

  BC.skip = function (sid, iso, o) {
    var s = BC.student(sid), f, W = [];
    if (s.type !== 'fixed') return fail('fixedOnly');
    if (!BC.isRegular(s, iso)) return fail('notRegular');
    if (BC.session(iso).cancelled) return fail('cancelled');
    if (BC.skipRow(sid, iso)) return fail('already');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    var row = BC.addSkipRow(sid, iso);
    return { ok: true, credit: row.credit, row: row, warned: W };
  };

  /* Undo a skip ("I will attend after all"). */
  BC.unskip = function (sid, iso, o) {
    var f, W = [];
    var row = BC.skipRow(sid, iso);
    if (!row) return fail('notFound');
    if (row.breakId) return fail('fromBreak');
    if (row.credit && BC.usedCreditIds(sid)[row.id]) return fail('creditUsed');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    row.cancelled = true;
    if (row.credit) {
      /* the freed place under the monthly cap goes to the earliest skip that got no credit */
      var ym = BC.ym(iso), none = BC.rows(sid, 'skip', function (c) { return !c.credit && !c.breakId && BC.ym(c.date) === ym; })[0];
      if (none) none.credit = true;
    }
    return { ok: true, warned: W };
  };

  BC.pickCredit = function (sid, ym) {
    var left = BC.makeupsLeft(sid, ym);
    var sk = BC.availSkipCredits(sid, ym), cc = BC.availCancelCredits(sid, ym);
    if (cc.length && BC.ym(cc[0].date) < ym) return { src: 'cancel', c: cc[0] };
    if (sk.length && left > 0) return { src: 'skip', c: sk[0] };
    if (cc.length) return { src: 'cancel', c: cc[0] };
    if (sk.length) return { reason: 'capReached' };
    return { reason: 'noCredit' };
  };

  /* A make-up. If there is no credit (or the cap of 3 is reached) the coach can still approve it as a
     "courtesy" make-up: it uses no credit and does not count toward the cap. */
  BC.makeup = function (sid, iso, o) {
    var s = BC.student(sid), f, W = [];
    if (s.type !== 'fixed') return fail('fixedOnly');
    var ses = BC.session(iso);
    if (!ses.isClass) return fail('notClass');
    if (ses.cancelled) return fail('cancelled');
    if (BC.isRegular(s, iso)) return fail('alreadyIn');   /* own regular day, skipped or not: nothing to make up */
    if (BC.inAnyBreak(sid, iso)) return fail('onBreak');
    if (BC.rows(sid, 'makeup', function (c) { return c.date === iso; }).length) return fail('already');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    var pick = BC.pickCredit(sid, BC.ym(iso));
    if (pick.reason) { if ((f = refuse(pick.reason, o, W))) return f; pick = { src: 'courtesy', c: { id: null } }; }
    if (ses.count >= ses.seats && (f = refuse('full', o, W))) return f;
    var row = { id: BC.nextId++, student: sid, type: 'makeup', date: iso, source: pick.src, creditId: pick.c.id, created: BC.today, cancelled: false };
    BC.changes.push(row);
    return { ok: true, free: pick.src === 'cancel', courtesy: pick.src === 'courtesy', row: row, warned: W };
  };

  BC.cancelMakeup = function (sid, iso, o) {
    var f, W = [];
    var row = BC.rows(sid, 'makeup', function (c) { return c.date === iso; })[0];
    if (!row) return fail('notFound');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    row.cancelled = true;
    return { ok: true, warned: W };
  };
  BC.moveMakeup = function (sid, fromIso, toIso, o) {
    var f, W = [];
    var row = BC.rows(sid, 'makeup', function (c) { return c.date === fromIso; })[0];
    if (!row) return fail('notFound');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(fromIso) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    row.cancelled = true;
    var r = BC.makeup(sid, toIso, o);
    if (!r.ok) { row.cancelled = false; return r; }
    return { ok: true, warned: W.concat(r.warned || []) };
  };

  BC.join = function (sid, iso, o) {
    var s = BC.student(sid), f, W = [];
    if (s.type !== 'flexible') return fail('flexOnly');
    var ses = BC.session(iso);
    if (!ses.isClass) return fail('notClass');
    if (ses.cancelled) return fail('cancelled');
    if (iso < s.start) return fail('beforeStart');
    if (BC.inLongBreak(sid, iso)) return fail('onBreak');
    if (BC.rows(sid, 'join', function (c) { return c.date === iso; }).length) return fail('already');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.flex_notice_days && (f = refuse('notice', o, W))) return f;
    if (ses.count >= ses.seats && (f = refuse('full', o, W))) return f;
    BC.changes.push({ id: BC.nextId++, student: sid, type: 'join', date: iso, created: BC.today, cancelled: false });
    return { ok: true, warned: W };
  };
  BC.leave = function (sid, iso, o) {
    var f, W = [];
    var row = BC.rows(sid, 'join', function (c) { return c.date === iso; })[0];
    if (!row) return fail('notFound');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(iso) < BC.config.flex_notice_days && (f = refuse('notice', o, W))) return f;
    row.cancelled = true;
    return { ok: true, warned: W };
  };

  BC.addBreak = function (sid, from, to, o) {
    var s = BC.student(sid), f, W = [];
    if (!from || !to || to < from) return fail('dateOrder');
    if (BC.breaksOf(sid).some(function (b) { return from <= b.to && to >= b.from; })) return fail('overlap');
    if (BC.isLate(sid) && (f = refuse('late', o, W))) return f;
    if (daysAhead(from) < BC.config.advance_days && (f = refuse('noticeBreak', o, W))) return f;
    var b = { id: BC.nextId++, student: sid, from: from, to: to, notified: BC.today, reduction: null, note: '' };
    var long = BC.isLong(b);
    BC.breaks.push(b);
    BC.changes.forEach(function (c) {
      if (c.student === sid && !c.cancelled && c.date >= from && c.date <= to && (c.type === 'makeup' || c.type === 'join')) c.cancelled = true;
    });
    if (!long && s.type === 'fixed') {
      BC.monthDaysBetween(from, to).forEach(function (d) {
        if (BC.isRegular(s, d) && !BC.skipRow(sid, d) && !BC.session(d).cancelled) BC.addSkipRow(sid, d, BC.today, b.id);
      });
    }
    BC.recalcCredits(sid);
    return { ok: true, long: long, brk: b, warned: W };
  };
  BC.monthDaysBetween = function (a, b) { var out = [], d = a; while (d <= b) { out.push(d); d = BC.addDays(d, 1); } return out; };
  BC.removeBreak = function (sid, id, o) {
    var f, W = [];
    var b = BC.breaks.filter(function (x) { return x.id === id && x.student === sid; })[0];
    if (!b) return fail('notFound');
    /* a skip made by this break may already have paid for a make-up: do not strand that make-up */
    var used = BC.usedCreditIds(sid);
    if (BC.changes.some(function (c) { return c.breakId === id && !c.cancelled && c.credit && used[c.id]; })) return fail('creditUsedBreak');
    if (daysAhead(b.from) < BC.config.advance_days && (f = refuse('notice', o, W))) return f;
    BC.changes.forEach(function (c) { if (c.breakId === id) c.cancelled = true; });
    BC.breaks = BC.breaks.filter(function (x) { return x.id !== id; });
    BC.recalcCredits(sid);
    return { ok: true, warned: W };
  };

  /* Switching a class day on or off. It starts today: nothing before today changes. */
  BC.dayImpact = function (dow) {
    var later = BC.changes.filter(function (c) { return !c.cancelled && (c.type === 'makeup' || c.type === 'join') && c.date >= BC.today && BC.dow(c.date) === dow; });
    var regular = BC.students.filter(function (s) { return s.active && s.type === 'fixed' && s.days.indexOf(dow) >= 0; });
    return { regular: regular.length, later: later.length, rows: later };
  };
  BC.setDay = function (dow, on) {
    var onN = [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return BC.timetable[d].on; }).length;
    if (!on && BC.timetable[dow].on && onN <= 1) return { ok: false, reason: 'lastDay' };
    if (!!BC.timetable[dow].on === !!on) return { ok: true, changed: false, cancelled: 0 };
    var imp = on ? { rows: [] } : BC.dayImpact(dow);
    BC.ttEdit(function (tt) { tt[dow].on = !!on; });
    imp.rows.forEach(function (c) { c.cancelled = true; });
    return { ok: true, changed: true, cancelled: imp.rows.length };
  };

  /* A change made with "Do it anyway" is written down with the rules it bent, so there is always a record. */
  (function () {
    var depth = 0;
    ['skip', 'unskip', 'makeup', 'cancelMakeup', 'moveMakeup', 'join', 'leave', 'addBreak', 'removeBreak'].forEach(function (name) {
      var f = BC[name];
      BC[name] = function () {
        var args = arguments, r; depth++;
        try { r = f.apply(null, args); } finally { depth--; }
        if (!depth && r && r.ok && r.warned && r.warned.length) {
          BC.changeLog.push({ id: BC.nextId++, at: BC.today, student: args[0], act: name, date: typeof args[1] === 'string' ? args[1] : null, bent: r.warned.slice() });
        }
        return r;
      };
    });
  })();

  /* what is on one day for one student (the calendar and the coach's day sheet both use this) */
  BC.dayInfo = function (s, iso) {
    var ses = BC.session(iso), n = s.type === 'fixed' ? BC.config.advance_days : BC.config.flex_notice_days;
    var i = { iso: iso, ses: ses, past: iso < BC.today, locked: BC.diff(BC.today, iso) < n, notice: n, kind: 'off' };
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
  };

  /* ---------- coach actions ---------- */
  /* What a student may ask the coach for on a day, and why not. Violations show up only when they apply:
     note = 'noCredit' | 'capReached' when a make-up is not covered, so the ask becomes an extra lesson. */
  BC.dayAsk = function (s, iso) {
    var i = BC.dayInfo(s, iso), kind = i.kind === 'full' ? 'free' : i.kind, out = { kind: kind, ask: '', note: '', locked: i.locked, past: i.past, row: i.row };
    if (i.past) return out;
    switch (kind) {
      case 'mine': out.ask = 'skip'; break;
      case 'skipped': out.ask = i.row.breakId ? '' : 'unskip'; break;
      case 'makeup': out.ask = 'changemk'; break;
      case 'join': out.ask = 'leave'; break;
      case 'free':
        if (s.type !== 'fixed') out.ask = 'join';
        else { var p = BC.pickCredit(s.id, BC.ym(iso)); if (p.reason) { out.ask = 'extra'; out.note = p.reason; } else out.ask = 'makeup'; }
        break;
    }
    return out;
  };
  BC.addStudent = function (o) {
    var id = BC.nextId++;
    var maxCode = Math.max.apply(null, [30].concat(BC.students.map(function (x) { return Number(x.code.slice(2)); })));
    var s = { id: id, name: o.name, type: o.type, days: o.type === 'fixed' ? o.days.slice().sort() : [], start: o.start, fee: o.fee || null, active: true, code: 'VM' + String(maxCode + 1).padStart(3, '0') };
    BC.students.push(s);
    return s;
  };
  BC.cancelSession = function (iso, note) {
    if (BC.session(iso).cancelled) return { ok: false, reason: 'already' };   /* never grant the free credits twice */
    var late = daysAhead(iso) < BC.config.advance_days;
    var n = BC.grantCancelCredits(iso, BC.today);
    BC.overrides[iso] = Object.assign({}, BC.overrides[iso], { cancelled: true, cancelledOn: BC.today, note: note || '' });
    return { ok: true, affected: n, late: late };
  };

  /* ---------- little drawings ---------- */
  BC.radar = function (cur, prev, lang) {
    lang = lang || BC.lang;
    var cx = 160, cy = 150, R = 92, n = 6;
    var pt = function (i, v, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = (r != null ? r : R * v / 10); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
    var poly = function (vals) { return BC.skills.map(function (k, i) { return pt(i, vals[k.id]).map(function (x) { return x.toFixed(1); }).join(','); }).join(' '); };
    var s = '<svg viewBox="0 0 320 300" class="radar" role="img" aria-label="Skills polygon">';
    [2, 4, 6, 8, 10].forEach(function (g) {
      s += '<polygon class="rg" points="' + BC.skills.map(function (k, i) { return pt(i, g).map(function (x) { return x.toFixed(1); }).join(','); }).join(' ') + '"/>';
    });
    BC.skills.forEach(function (k, i) { var p = pt(i, 10); s += '<line class="rg" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
    if (prev) s += '<polygon class="rp" points="' + poly(prev) + '"/>';
    s += '<polygon class="rc" points="' + poly(cur) + '"/>';
    BC.skills.forEach(function (k, i) {
      var p = pt(i, 0, R + 24), dx = p[0] - cx, anchor = Math.abs(dx) < 6 ? 'middle' : (dx > 0 ? 'start' : 'end');
      var q = pt(i, cur[k.id]);
      s += '<circle class="rd" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.5"/>';
      s += '<text class="rl" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 2).toFixed(1) + '" text-anchor="' + anchor + '">' + k[lang] + '</text>';
      var dl = prev ? cur[k.id] - prev[k.id] : 0;   /* the change since the last scoring is printed next to the number */
      s += '<text class="rv" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 12).toFixed(1) + '" text-anchor="' + anchor + '">' + cur[k.id] + (dl > 0 ? ' +' + dl : dl < 0 ? ' ' + dl : '') + '</text>';
    });
    return s + '</svg>';
  };
  BC.fakeQR = function (seed) {
    var N = 29, m = [], x = (seed * 7919 + 13) % 2147483647, r, c;
    for (r = 0; r < N; r++) { m.push([]); for (c = 0; c < N; c++) { x = (x * 48271) % 2147483647; m[r].push(x % 100 < 48 ? 1 : 0); } }
    var finder = function (r0, c0) {
      for (var i = -1; i <= 7; i++) for (var j = -1; j <= 7; j++) {
        var rr = r0 + i, cc = c0 + j; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        var edge = i === 0 || i === 6 || j === 0 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[rr][cc] = (i >= 0 && i <= 6 && j >= 0 && j <= 6 && (edge || core)) ? 1 : 0;
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    var s = '<svg viewBox="-2 -2 ' + (N + 4) + ' ' + (N + 4) + '" class="qr" shape-rendering="crispEdges" role="img" aria-label="Demo QR code"><rect x="-2" y="-2" width="' + (N + 4) + '" height="' + (N + 4) + '" fill="#fff"/>';
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (m[r][c]) s += '<rect x="' + c + '" y="' + r + '" width="1" height="1" fill="#111"/>';
    return s + '</svg>';
  };

  BC.defaults();
  BC.initToday();
})();
