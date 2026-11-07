/* A made-up class for trying the app ("Sample" on the start screen) and for the tests. It is not part of anyone's real data.
   It lives on one fixed day, so the whole class makes sense whatever day it really is. */
(function () {
  'use strict';
  var BC = window.BC;
  BC.SAMPLE_DAY = '2026-11-05';
  BC.seed = function () {
    BC.defaults();
    BC.today = BC.SAMPLE_DAY;
    BC.meta = { sample: true, setup: true };
    BC.overrides = {
      '2026-11-12': { extra: 1 },
      '2026-11-14': { courts: 3 },
      '2026-11-24': { cancelled: true, cancelledOn: '2026-11-02', note: 'Sân đóng cửa vì có sự kiện' }
    };
    BC.videos = {
      smash: { title: 'Đập cầu: lấy lực từ chân, không phải từ tay', len: '8:12', url: 'https://www.youtube.com/results?search_query=badminton+smash' },
      net: { title: 'Chơi lưới: lắc cầu và bổng sát lưới', len: '6:40', url: 'https://www.youtube.com/results?search_query=badminton+net' },
      footwork: { title: 'Di chuyển: bước đệm và bước đầu tiên', len: '9:05', url: 'https://www.youtube.com/results?search_query=badminton+footwork' },
      defense: { title: 'Phòng thủ: đọc cú đập, chắn thấp', len: '7:30', url: 'https://www.youtube.com/results?search_query=badminton+defense' },
      serve: { title: 'Giao cầu: luật giao ngắn và thói quen', len: '5:48', url: '' },
      stamina: { title: 'Thể lực: 15 phút tập trên sân', len: '12:20', url: 'https://www.youtube.com/results?search_query=badminton+stamina' }
    };

    var T = [2, 4], MW = [1, 3], SS = [6, 0], WS = [3, 6], MT = [1, 4], TS = [2, 0];
    var specs = [
      ['Minh', 'fixed', T], ['Hùng', 'fixed', T], ['Thảo', 'fixed', T], ['Quang', 'fixed', T],
      ['Linh', 'fixed', T], ['Nam', 'fixed', T], ['Mai', 'fixed', T], ['Đức', 'fixed', T],
      ['Trang', 'fixed', T], ['Khoa', 'fixed', T], ['Phong', 'fixed', T], ['Lan', 'fixed', T],
      ['Bình', 'fixed', T, '2026-10-12'], ['Cường', 'fixed', T, '2026-10-12'], ['Hà', 'fixed', T, '2026-11-17'],
      ['Dũng', 'fixed', T, '2026-11-10'], ['Hoa', 'fixed', T, '2026-11-10'],
      ['Ngọc', 'fixed', MW], ['Alex', 'fixed', MW, null, 1000000], ['Yến', 'fixed', MW], ['Bảo', 'fixed', MW],
      ['Chi', 'fixed', MW], ['Sơn', 'fixed', MW], ['Vy', 'fixed', MW], ['Long', 'fixed', MW],
      ['Hạnh', 'fixed', SS], ['Duy', 'fixed', SS], ['My', 'fixed', SS], ['Hải', 'fixed', SS],
      ['Thu', 'fixed', SS], ['Emma', 'fixed', SS],
      ['Kiên', 'fixed', WS], ['Nhi', 'fixed', WS], ['Việt', 'fixed', WS], ['An', 'fixed', WS],
      ['Tâm', 'fixed', MT], ['Oanh', 'fixed', [2]], ['Khánh', 'fixed', [0]],
      ['Tuấn', 'flexible', []], ['Giang', 'flexible', [], null, 1300000]
    ];
    BC.students = specs.map(function (sp, i) {
      var id = BC.nextId++;
      return {
        id: id, name: sp[0], type: sp[1], days: sp[2].slice(), start: sp[3] || '2026-09-01',
        fee: sp[4] || null, active: true,
        code: 'VM' + String(id + 30).padStart(3, '0')
      };
    });

    BC.changes = []; BC.breaks = []; BC.payments = {}; BC.changeLog = []; BC.scores = {};
    var by = function (name) { return BC.students.filter(function (s) { return s.name === name; })[0]; };
    BC.byName = by;

    // Skips, make-ups and joins already on the books
    var skip = function (n, d, created) { BC.addSkipRow(by(n).id, d, created || '2026-10-20'); };
    var makeup = function (n, d, fromSkipDate) {
      var s = by(n);
      var sk = BC.rows(s.id, 'skip', function (c) { return c.date === fromSkipDate; })[0];
      BC.changes.push({ id: BC.nextId++, student: s.id, type: 'makeup', date: d, source: 'skip', creditId: sk.id, created: '2026-10-25', cancelled: false });
    };
    var join = function (n, d) { BC.changes.push({ id: BC.nextId++, student: by(n).id, type: 'join', date: d, created: '2026-10-28', cancelled: false }); };

    skip('Lan', '2026-11-03', '2026-10-24');
    makeup('Lan', '2026-11-08', '2026-11-03');
    skip('Lan', '2026-11-19', '2026-11-01');
    skip('Minh', '2026-11-10'); skip('Minh', '2026-11-12');
    skip('Hùng', '2026-11-12'); skip('Thảo', '2026-11-10');
    skip('Alex', '2026-11-09'); makeup('Alex', '2026-11-14', '2026-11-09');
    skip('Hạnh', '2026-11-08'); skip('Duy', '2026-11-14'); skip('My', '2026-11-14');
    skip('Việt', '2026-11-07'); makeup('Việt', '2026-11-15', '2026-11-07');
    skip('Tâm', '2026-11-02'); makeup('Tâm', '2026-11-11', '2026-11-02');
    join('Tuấn', '2026-11-07'); join('Tuấn', '2026-11-09'); join('Tuấn', '2026-11-14'); join('Tuấn', '2026-11-16');
    join('Giang', '2026-11-10'); join('Giang', '2026-11-12'); join('Giang', '2026-11-15');

    // A long break (Quang) and a short break (Mai)
    BC.breaks.push({ id: BC.nextId++, student: by('Quang').id, from: '2026-11-17', to: '2026-11-30', notified: '2026-11-02', reduction: null, note: 'Đi du lịch cùng gia đình' });
    var mb = { id: BC.nextId++, student: by('Mai').id, from: '2026-11-09', to: '2026-11-18', notified: '2026-10-28', reduction: null, note: 'Thi học kỳ' };
    BC.breaks.push(mb);
    ['2026-11-10', '2026-11-12', '2026-11-17'].forEach(function (d) { BC.addSkipRow(mb.student, d, '2026-10-28', mb.id); });

    // The coach cancelled 24 Nov: affected students got a free credit
    BC.grantCancelCredits('2026-11-24', '2026-11-02');

    // Payments: September and October paid for everyone; November partly
    var unpaid = ['Hùng', 'Chi', 'Duy', 'Nhi', 'Tâm', 'Giang', 'Emma', 'Cường', 'Hà', 'Dũng'];
    BC.students.forEach(function (s, i) {
      ['2026-09', '2026-10'].forEach(function (ym) {
        if (ym < BC.ym(s.start)) return;
        var r = BC.payRec(s.id, ym); r.paid = true; r.paidDate = ym + '-0' + (1 + (i % 4)); r.amountPaid = BC.amountDue(s, ym);
      });
      if (unpaid.indexOf(s.name) < 0) {
        var r2 = BC.payRec(s.id, '2026-11'); r2.paid = true; r2.paidDate = '2026-11-0' + (1 + (i % 4)); r2.amountPaid = BC.amountDue(s, '2026-11');
      }
    });

    // Scores
    var noScores = ['Bình', 'Cường', 'Hà', 'Dũng', 'Hoa'];
    var keys = BC.skills.map(function (k) { return k.id; });
    BC.students.forEach(function (s) {
      if (noScores.indexOf(s.name) >= 0) return;
      var cur = {}, prv = {};
      keys.forEach(function (k, j) { cur[k] = 3 + ((s.id * 7 + j * 3) % 6); prv[k] = Math.max(1, cur[k] - (1 + ((s.id + j) % 2))); });
      BC.scores[s.id] = [{ date: '2026-08-29', v: prv }, { date: s.id % 3 === 0 ? '2026-08-29' : '2026-10-28', v: cur }];
      if (s.id % 3 === 0) BC.scores[s.id] = [{ date: '2026-08-29', v: cur }];
    });
    BC.scores[by('Lan').id] = [
      { date: '2026-08-29', v: { smash: 5, net: 4, footwork: 3, defense: 5, serve: 6, stamina: 4 } },
      { date: '2026-10-28', v: { smash: 6, net: 5, footwork: 4, defense: 6, serve: 7, stamina: 5 } }
    ];
  };
})();
