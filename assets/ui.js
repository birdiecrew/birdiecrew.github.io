/* Birdie Crew: small UI helpers shared by both pages (sheets, toasts, icons, copy). */
(function () {
  'use strict';
  var UI = (window.UI = {});
  /* the address of the assets folder, so the logo is found from both pages */
  UI.assets = (function () { var c = document.currentScript; return c && c.src ? c.src.replace(/[^/]*$/, '') : ''; })();

  /* the divider between two different facts on one line. aria-hidden, so a screen reader does not read it out. */
  UI.SEP = ' <span class="sep" aria-hidden="true">|</span> ';
  UI.h = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.$ = function (sel, root) { return (root || document).querySelector(sel); };
  UI.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var P = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.4 3.4 0 0 1 0 6.4M18 14.5c2.2.7 3.5 2.6 3.5 5.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16.5 15h1.5"/><path d="M6 6l9-3 2 3"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    cal2: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M13 14h3M8 17.5h3"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    seat: '<path d="M7 4v8h10M7 12v8M17 12v8"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    save: '<path d="M12 4v10M7.5 10l4.5 4.5 4.5-4.5M5 19h14"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    court: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14M3 12h18"/>'
  };
  UI.icon = function (name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };

  /* toast */
  UI.toast = function (msg, kind) {
    var root = UI.$('#toast-root');
    if (!root) { root = document.createElement('div'); root.id = 'toast-root'; root.className = 'toast-root'; document.body.appendChild(root); }
    var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; t.setAttribute('role', 'status');
    root.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  };

  /* copy to clipboard (works on file:// too, with a fallback) */
  UI.copy = function (text, okMsg) {
    var done = function () { UI.toast(okMsg || 'Copied'); };
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); return; }
    } catch (e) { /* fall through */ }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); done();
    }
  };

  /* bottom sheet */
  var sheetEl = null, onCloseCb = null;
  UI.sheet = {
    open: function (html, opts) {
      opts = opts || {};
      UI.sheet.close(true);
      var back = document.createElement('div'); back.className = 'sheet-back';
      back.className = 'sheet-back' + (opts.page ? ' page' : '');
      back.innerHTML = '<div class="sheet' + (opts.full ? ' full' : '') + (opts.page ? ' page' : '') + '" role="dialog" aria-modal="true">' + (opts.page ? '' : '<div class="grab"></div>') + html + '</div>';
      document.body.appendChild(back); sheetEl = back; onCloseCb = opts.onClose || null;
      document.body.style.overflow = 'hidden'; document.body.classList.add('sheet-open');
      back.addEventListener('click', function (e) {
        if (e.target === back || e.target.closest('[data-close]')) UI.sheet.close();
      });
      if (opts.onOpen) opts.onOpen(back.firstChild);
      return back.firstChild;
    },
    el: function () { return sheetEl ? sheetEl.firstChild : null; },
    close: function (silent) {
      if (!sheetEl) return;
      sheetEl.remove(); sheetEl = null; document.body.style.overflow = ''; document.body.classList.remove('sheet-open');
      var cb = onCloseCb; onCloseCb = null;
      if (cb && !silent) cb();
    }
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') UI.sheet.close(); });

  /* the header of a full-screen page: a back arrow and a title */
  UI.pageHead = function (title, sub, backLabel) {
    return '<div class="page-h"><button class="btn icon sm ghost" data-close aria-label="' + UI.h(backLabel || 'Back') + '">' + UI.icon('back') + '</button><div class="grow"><h2>' + title + '</h2>' + (sub ? '<div class="muted small">' + sub + '</div>' : '') + '</div></div>';
  };
  /* one small button that switches between Vietnamese and English; it shows the language it switches TO */
  UI.langBtn = function (cur) {
    var to = cur === 'vi' ? 'EN' : 'VI';
    return '<button class="btn sm langbtn" data-lang-to="' + to.toLowerCase() + '" aria-label="' + (to === 'EN' ? 'English' : 'Tiếng Việt') + '">' + to + '</button>';
  };

  /* confirm dialog: returns a Promise<boolean> */
  UI.confirm = function (o) {
    return new Promise(function (resolve) {
      var back = document.createElement('div'); back.className = 'dialog-back';
      back.innerHTML = '<div class="dialog" role="alertdialog" aria-modal="true"><h2>' + UI.h(o.title || '') + '</h2>' +
        (o.body ? '<p class="muted" style="margin-top:8px">' + o.body + '</p>' : '') +
        '<div class="row" style="margin-top:18px;justify-content:flex-end"><button class="btn" data-v="0">' + UI.h(o.cancel || 'Cancel') +
        '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-v="1">' + UI.h(o.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(back);
      back.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]');
        if (b || e.target === back) { back.remove(); resolve(!!(b && b.getAttribute('data-v') === '1')); }
      });
    });
  };

  /* theme: System / Light / Dark, remembered in the browser */
  UI.theme = {
    get: function () { try { return localStorage.getItem('bc_theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } },
    set: function (v) {
      try { localStorage.setItem('bc_theme', v); } catch (e) { /* ignore */ }
      document.documentElement.setAttribute('data-theme', v);
    }
  };
  UI.themeBtn = function () {
    var dark = UI.theme.get() === 'dark', label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    return '<button class="btn icon sm themebtn" data-theme-cycle aria-label="' + label + '" title="' + label + '">' + UI.icon(dark ? 'sun' : 'moon') + '</button>';
  };
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-theme-cycle]')) return;
    UI.theme.set(UI.theme.get() === 'dark' ? 'light' : 'dark');
    UI.$$('[data-theme-cycle]').forEach(function (x) { x.outerHTML = UI.themeBtn(); });
  });

  /* pictures: the page logo and each student's photo.
     Kept in this browser's localStorage (the page picture is also saved in the coach's file). */
  UI.pics = {
    get: function (k) { try { return localStorage.getItem('bc_pic_' + k) || ''; } catch (e) { return ''; } },
    set: function (k, v) { try { localStorage.setItem('bc_pic_' + k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem('bc_pic_' + k); } catch (e) { /* ignore */ } }
  };
  UI.logoSrc = function () { return UI.pics.get('logo') || UI.assets + 'logo.svg'; };
  UI.logo = function (size) { var n = size || 36; return '<img class="logo-img" src="' + UI.logoSrc() + '" alt="" style="width:' + n + 'px;height:' + n + 'px">'; };
  UI.applyFavicon = function () {
    var l = document.querySelector('link[rel="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = UI.logoSrc();
  };
  /* pick an image, crop it to a centred square, shrink it, hand back a small JPEG (data URL) */
  UI.pickImage = function (size, done) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var side = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = size;
          c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          var q = 0.85, out = c.toDataURL('image/jpeg', q);
          while (out.length > 40000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          done(out);
        };
        img.onerror = function () { UI.toast('Not a picture', 'bad'); };
        img.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
    inp.click();
  };
  /* a round avatar: the photo if there is one, else the first letter */
  UI.avatarInner = function (id, name) {
    return UI.h(String(name || '?').charAt(0).toUpperCase());   /* no student photos: fewer personal details to keep */
  };
  UI.applyFavicon();

  UI.fmtNum =function (n) { return new Intl.NumberFormat('en-US').format(n); };
})();
