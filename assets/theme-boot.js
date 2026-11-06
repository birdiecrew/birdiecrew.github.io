/* Applies a manually chosen light or dark theme before the page draws. Its own file, so the pages need no inline script. */
try { var t = localStorage.getItem("bc_theme"); if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); } catch (e) { /* ignore */ }
