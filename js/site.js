/* NEX 站点脚本 — 无依赖，约 12KB，只做页面真实需要的事 */
(function () {
  'use strict';
  var C = window.NEX || {};
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function set(sel, v) { var el = q(sel); if (el && v !== undefined && v !== null) el.textContent = v; }

  function getJSON(url, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 7000);
    return fetch(url, ctl ? { cache: 'no-store', signal: ctl.signal } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { clearTimeout(t); return d; }, function (e) { clearTimeout(t); throw e; });
  }

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, isErr) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', !!isErr);
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }

  /* ---------- copy ---------- */
  function legacyCopy(text, ok, fail) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var done = document.execCommand('copy');
      document.body.removeChild(ta);
      done ? ok() : fail();
    } catch (e) { fail(); }
  }
  function initCopy() {
    qa('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var ok = function () {
          toast('已复制 ' + text);
          var label = btn.querySelector('[data-label]');
          if (label) {
            var old = label.textContent;
            label.textContent = '已复制';
            setTimeout(function () { label.textContent = old; }, 1600);
          }
        };
        var fail = function () { toast('复制失败，请手动选中地址：' + text, true); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text, ok, fail); });
        else legacyCopy(text, ok, fail);
      });
    });
  }

  /* ---------- theme ---------- */
  function initTheme() {
    var root = document.documentElement;
    var btns = qa('#theme-toggle');
    if (!btns.length) return;
    function paint(light) {
      root.classList.toggle('theme-light', light);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', light ? '#f4f5f0' : '#14171a');
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', light ? 'true' : 'false');
        b.setAttribute('aria-label', light ? '切换到深色' : '切换到浅色');
      });
    }
    paint(root.classList.contains('theme-light'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var light = !root.classList.contains('theme-light');
        paint(light);
        try { localStorage.setItem('nex-theme', light ? 'light' : 'dark'); } catch (e) {}
      });
    });
  }

  /* ---------- nav ---------- */
  function initNav() {
    var burger = q('#nav-burger'), menu = q('#mnav');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
      });
    }
    var page = document.body.getAttribute('data-page');
    if (page) qa('.nav-links a').forEach(function (a) {
      if (a.getAttribute('data-page') === page) a.setAttribute('aria-current', 'page');
    });
    set('#year', new Date().getFullYear());
  }

  /* ---------- live: server entry ---------- */
  function plain(s) {
    return String(s || '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
  function applyStatus(d) {
    if (!d) return;
    set('#live-online', d.players && d.players.online != null ? d.players.online : '—');
    set('#live-max', d.players && d.players.max != null ? d.players.max : '—');
    set('#live-ver', d.version || C.version || '');
    if (d.icon) { var ic = q('#live-icon'); if (ic && ic.src.indexOf('data:') !== 0) ic.src = d.icon; }
  }
  function checkRoutes() {
    var rows = qa('[data-route]');
    rows.forEach(function (el) {
      var ip = el.getAttribute('data-route');
      var url = C.statusAPI + '?ip=' + encodeURIComponent(ip) + '&port=' + (el.getAttribute('data-port') || '25565');
      var paint = function (d) {
        var on = d && d.status === 'online';
        el.classList.toggle('is-off', !on);
        var st = q('.st', el);
        if (st) st.textContent = on ? '在线' : '离线';
        if (on && el.getAttribute('data-main') === '1') applyStatus(d);
      };
      var gone = function () {
        el.classList.add('is-off');
        var st = q('.st', el);
        if (st) st.textContent = '未响应';
      };
      // 接口有时候很慢（十几秒），先给一次重试再判失败
      getJSON(url, 14000)
        .then(paint)
        .catch(function () {
          setTimeout(function () {
            getJSON(url, 14000).then(paint).catch(gone);
          }, 1200);
        });
    });
  }

  /* ---------- live: host figures ---------- */
  function fmtUptime(h) {
    if (typeof h !== 'number' || isNaN(h)) return '—';
    if (h >= 24) return Math.round(h / 24) + ' 天';
    return Math.round(h) + ' 小时';
  }
  function checkHost() {
    getJSON('/api/host', 6000).then(function (d) {
      if (!d || !d.ok) throw new Error('no data');
      set('#fig-cpu', d.cpu + '%');
      set('#fig-mem', d.memPercent + '%');
      set('#fig-mem-note', '已用 ' + Math.round((d.memUsedMB || 0) / 1024) + ' / ' + (d.memTotalGB || '—') + ' GB');
      set('#fig-inst', (d.running || 0) + ' / ' + (d.total || 0));
      set('#fig-uptime', fmtUptime(d.uptime));
      set('#fig-host', d.hostname || '');
      var live = q('#host-live');
      if (live) live.textContent = '数据实时读取，15 秒刷新';
    }).catch(function () {
      ['#fig-cpu', '#fig-mem', '#fig-inst', '#fig-uptime'].forEach(function (s) { set(s, '—'); });
      var live = q('#host-live');
      if (live) live.textContent = '监测接口暂时没有响应，稍后自动重试';
    });
  }

  /* ---------- reveal ---------- */
  function initReveal() {
    var els = qa('[data-rise]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    els.forEach(function (el) {
      var scope = el.closest('.section') || document.body;
      el.setAttribute('data-i', qa('[data-rise]', scope).indexOf(el));
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.animationDelay = Math.min(parseInt(el.getAttribute('data-i') || 0, 10), 4) * 70 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- interactive photo grid ---------- */
  function initGrid() {
    var plane = q('.gm-plane');
    if (!plane) return;
    var imgs = [];
    for (var i = 1; i <= 18; i++) imgs.push('/picture/gridmotion/g' + (i < 10 ? '0' + i : i) + '.jpg');
    var okImg = typeof Window !== 'undefined';
    var rows = 4, cols = 7, html = '';
    for (var r = 0; r < rows; r++) {
      html += '<div class="gm-row">';
      for (var c = 0; c < cols; c++) {
        html += '<div class="gm-cell"><img src="' + imgs[(r * cols + c) % imgs.length] + '" alt="" width="640" height="512" loading="lazy" decoding="async"></div>';
      }
      html += '</div>';
    }
    plane.innerHTML = html;
    if (reduce) { plane.style.transform = 'translate(-50%,-50%) rotate(-15deg)'; return; }

    var rowEls = Array.prototype.slice.call(plane.children);
    var weights = [0.72, 0.5, 0.34, 0.2];
    var mouseX = window.innerWidth / 2, cur = mouseX, raf = null;
    function step() {
      cur += (mouseX - cur) * 0.055;
      var base = (cur / window.innerWidth - 0.5) * 300;
      for (var i = 0; i < rowEls.length; i++) {
        var dir = i % 2 ? -1 : 1;
        rowEls[i].style.transform = 'translate3d(' + (base * dir * weights[i % 4]).toFixed(2) + 'px,0,0)';
      }
      raf = Math.abs(mouseX - cur) > 0.4 ? requestAnimationFrame(step) : null;
    }
    function wake() { if (!raf) raf = requestAnimationFrame(step); }
    window.addEventListener('mousemove', function (e) { mouseX = e.clientX; wake(); }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (e.touches[0]) { mouseX = e.touches[0].clientX; wake(); } }, { passive: true });
    window.addEventListener('resize', wake);
  }

  /* ---------- quotes ---------- */
  function initQuote() {
    var box = q('#quote');
    if (!box || !C.quotes || !C.quotes.length) return;
    box.textContent = C.quotes[Math.floor(Math.random() * C.quotes.length)];
  }

  /* ---------- donate: turnstile + modals ---------- */
  var payMethods = {
    wechat: { label: '微信支付', qr: '/picture/pay-wechat.jpg', rec: true },
    alipay: { label: '支付宝', qr: '/picture/pay-alipay.jpg' },
    afdian: { label: '爱发电', qr: '/picture/pay-aifadian.jpg' }
  };
  function openModal(id) { var el = document.getElementById(id); if (el) { el.classList.add('show'); el.setAttribute('aria-hidden', 'false'); } }
  function closeModal(id) { var el = document.getElementById(id); if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); } }

  /* 人机验证暂时停用：Cloudflare Turnstile 在国内网络经常加载不出来，会挡住真实赞助。
     需要恢复时：把 donate.html 里的 turnstile 脚本加回来，并在上面 openModal 后加 setTimeout(renderTurnstile, 120)。 */
  function renderTurnstile() {
    var el = q('#hcaptcha-container');
    var st = q('#hcaptcha-status');
    if (!el) return;
    el.innerHTML = '';
    if (typeof window.turnstile === 'undefined') {
      if (st) st.textContent = '验证组件没加载出来：刷新页面重试，或在官方群里问服主。';
      return;
    }
    try {
      window.turnstile.render(el, {
        sitekey: '0x4AAAAAAEQuKMYlZlIyDl-l',
        theme: 'dark',
        callback: function (token) {
          if (st) st.textContent = '正在校验…';
          fetch('/api/pay-turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
          }).then(function (r) { return r.json(); }).then(function (d) {
            if (d && d.success) {
              var area = q('#hcaptcha-area'), list = q('#pay-methods-container');
              if (area) area.style.display = 'none';
              if (list) list.style.display = '';
            } else {
              if (st) st.textContent = '验证未通过，请重试';
              if (window.turnstile) window.turnstile.reset();
            }
          }).catch(function () {
            if (st) st.textContent = '校验失败，请重试';
            if (window.turnstile) window.turnstile.reset();
          });
        },
        'expired-callback': function () {
          if (st) st.textContent = '验证已过期，请重新验证';
          if (window.turnstile) window.turnstile.reset();
        },
        'error-callback': function () { if (st) st.textContent = '验证出错，请重试'; }
      });
    } catch (e) { if (st) st.textContent = '验证组件异常，请刷新页面'; }
  }
  window.onTurnstileLoaded = function () { window.__turnstileReady = true; };

  function initDonate() {
    qa('.offer-act [data-plan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var plan = btn.getAttribute('data-plan');
        var methods = (btn.getAttribute('data-methods') || '').split(',').filter(function (m) { return payMethods[m]; });
        var nameEl = q('#pay-plan-name');
        var hcArea = q('#hcaptcha-area');
        var list = q('#pay-methods-container');
        var st = q('#hcaptcha-status');
        if (nameEl) nameEl.textContent = plan;
        if (hcArea) hcArea.style.display = 'none';
        if (list) list.style.display = '';
        if (list) {
          list.innerHTML = '';
          methods.forEach(function (m) {
            var info = payMethods[m];
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'pay-method';
            b.innerHTML = '<span>' + info.label + '</span>' + (info.rec ? '<span class="rec">推荐</span>' : '');
            b.addEventListener('click', function () {
              closeModal('pay-method-modal');
              var t = q('#qr-title'), i = q('#qr-img'), fb = q('#qr-fallback');
              if (t) t.textContent = plan + ' · ' + info.label;
              if (i) {
                i.style.display = 'none';
                if (fb) fb.style.display = '';
                i.onload = function () { i.style.display = 'block'; if (fb) fb.style.display = 'none'; };
                i.onerror = function () { i.style.display = 'none'; if (fb) fb.style.display = ''; };
                i.src = info.qr;
              }
              openModal('pay-qr-modal');
            });
            list.appendChild(b);
          });
        }
        openModal('pay-method-modal');
      });
    });
    qa('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { closeModal(b.getAttribute('data-close')); });
    });
    var back = q('#btn-back-pay');
    if (back) back.addEventListener('click', function () { closeModal('pay-qr-modal'); openModal('pay-method-modal'); });
  }

  /* ---------- changelog: wiki sync ---------- */
  function initChangelog() {
    var box = q('#wiki-body');
    if (!box) return;
    var raw = 'https://raw.githubusercontent.com/wiki/Nexservermc/Nexserver/' + encodeURIComponent('更新日志') + '.md';
    var mirror = 'https://raw.gitmirror.com/wiki/Nexservermc/Nexserver/' + encodeURIComponent('更新日志') + '.md';
    var sources = ['/api/wiki-changelog', raw, mirror];
    var meta = q('#wiki-meta');
    function attempt(i, fresh) {
      if (i >= sources.length) {
        box.innerHTML = '<p>同步失败，请直接前往 <a href="' + (C.social ? C.social.wiki : '#') + '/wiki" target="_blank" rel="noopener">官方 Wiki 更新日志</a> 查看。</p>';
        if (meta) meta.textContent = '同步失败';
        return;
      }
      var url = sources[i] + (fresh && i === 0 ? '?fresh=1' : '');
      fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (body) {
        if (!body || body.length < 20) throw new Error('empty');
        var html;
        if (window.marked) { try { html = window.marked.parse(body); } catch (e) { html = null; } }
        if (!html) {
          var pre = document.createElement('pre');
          pre.textContent = body;
          box.innerHTML = '';
          box.appendChild(pre);
        } else box.innerHTML = html;
        if (meta) meta.textContent = '已同步 ' + new Date().toLocaleString('zh-CN', { hour12: false });
      }).catch(function () { attempt(i + 1, fresh); });
    }
    attempt(0, false);
    var refresh = q('#wiki-refresh');
    if (refresh) refresh.addEventListener('click', function () { if (meta) meta.textContent = '正在重新同步…'; attempt(0, true); });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNav();
    initCopy();
    initReveal();
    initGrid();
    initQuote();
    if (q('[data-route]')) {
      checkRoutes();
      setTimeout(function () {
        setInterval(checkRoutes, C.statusInterval || 20000);
      }, 4000);
    }
    if (q('#fig-cpu')) { checkHost(); setInterval(checkHost, C.hostInterval || 15000); }
    if (document.getElementById('pay-method-modal')) initDonate();
    initChangelog();
  });
})();
