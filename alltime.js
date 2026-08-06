/* 金狗 — the payout record. every ounce the vault has ever paid out, counted. */
(function () {
  var ZH = (document.documentElement.lang || '').indexOf('zh') === 0;
  var XAUT = '0x21caef8a43163eea865baee23b9c2e327696a3bf';

  var elOz = document.getElementById('at-oz');
  if (!elOz) return;
  var elUsd = document.getElementById('at-usd');
  var elWall = document.getElementById('ingot-wall');
  var elCap = document.getElementById('ingot-cap');
  var elN = document.getElementById('at-n');
  var elW = document.getElementById('at-w');
  var elBig = document.getElementById('at-big');
  var elBigTx = document.getElementById('at-big-tx');
  var elIn = document.getElementById('at-in');

  var base = null;          /* gold_stats.json */
  var extraOz = 0;          /* live payouts since the baseline block */
  var extraN = 0;
  var extraIn = 0;
  var xautUsd = 0;
  var shown = 0;            /* number currently displayed */
  var armed = false;        /* section has scrolled into view */
  var counted = false;      /* first big count-up done */
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(n, d) { return (+n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: d == null ? 2 : d }); }
  function totalOz() { return (base ? base.outOz : 0) + extraOz; }

  /* ---------- the ingot wall ---------- */
  var UNITS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250];
  var unit = 1, lit = 0;

  function pickUnit(oz) {
    for (var i = 0; i < UNITS.length; i++) {
      if (Math.ceil(oz / UNITS[i]) <= 96) return UNITS[i];
    }
    return UNITS[UNITS.length - 1];
  }
  function unitLabel(u) {
    var s = u >= 1 ? u : (u % 0.25 === 0 ? u.toFixed(2).replace(/0$/, '') : u.toFixed(1));
    return ZH ? ('每锭 = ' + s + ' 盎司实物黄金') : ('each ingot = ' + s + ' oz of physical gold');
  }
  function buildWall() {
    if (!elWall) return;
    var oz = totalOz();
    unit = pickUnit(oz);
    var full = Math.floor(oz / unit);
    var frac = (oz / unit) - full;
    var count = full + (frac > 0.02 ? 1 : 0);
    var html = '';
    for (var i = 0; i < count; i++) {
      var partial = (i === count - 1 && frac > 0.02 && full < count);
      html += '<svg class="ing' + (partial ? ' part' : '') + '" style="transition-delay:' + Math.min(i * 26, 1600) + 'ms"><use href="#orn-yuanbao-jin"/></svg>';
    }
    elWall.innerHTML = html;
    lit = count;
    if (elCap) elCap.textContent = unitLabel(unit) + (ZH ? ' · 共 ' + count + ' 锭' : ' · ' + count + ' ingots and counting');
    if (armed) requestAnimationFrame(function () { elWall.classList.add('lit'); });
  }
  function growWall() {
    /* a live payout crossed an ingot boundary — mint another ingot */
    var oz = totalOz();
    var count = Math.floor(oz / unit) + ((oz / unit) % 1 > 0.02 ? 1 : 0);
    if (count > lit + 40 || pickUnit(oz) !== unit) { buildWall(); return; }
    while (lit < count) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('class', 'ing fresh');
      s.innerHTML = '<use href="#orn-yuanbao-jin"/>';
      elWall.appendChild(s);
      lit++;
    }
    if (elCap) elCap.textContent = unitLabel(unit) + (ZH ? ' · 共 ' + lit + ' 锭' : ' · ' + lit + ' ingots and counting');
  }

  /* ---------- the counter ---------- */
  var animId = 0;
  function animateTo(target, ms) {
    var from = shown, id = ++animId, t0 = null;
    if (reduced || ms <= 0) { shown = target; paint(); return; }
    function step(t) {
      if (id !== animId) return;
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / ms, 1);
      p = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
      shown = from + (target - from) * p;
      paint();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function paint() {
    elOz.textContent = fmt(shown, 2);
    if (elUsd && xautUsd) {
      elUsd.textContent = (ZH ? '≈ $' : '≈ $') + fmt(shown * xautUsd, 0) +
        (ZH ? ' 实物黄金 · 按今日金价' : ' of physical gold · at today’s price');
    }
  }
  function refreshStats() {
    if (!base) return;
    if (elN) elN.textContent = fmt(base.outCount + extraN, 0);
    if (elW) elW.textContent = fmt(base.wallets, 0);
    if (elIn) elIn.textContent = fmt(base.inOz + extraIn, 2);
    if (elBig && base.biggestOz) {
      elBig.textContent = fmt(base.biggestOz, 3);
      if (elBigTx && base.biggestTx) elBigTx.href = 'https://bscscan.com/tx/' + base.biggestTx;
    }
  }

  /* ---------- data ---------- */
  fetch('gold_stats.json?t=' + Math.floor(Date.now() / 600000))
    .then(function (r) { return r.json(); })
    .then(function (j) {
      base = j;
      refreshStats();
      buildWall();
      if (armed && !counted) { counted = true; animateTo(totalOz(), 2000); }
    })
    .catch(function () { if (elCap) elCap.textContent = ZH ? '账本暂时够不着 · 稍后再来' : 'ledger out of reach · try again shortly'; });

  fetch('https://api.dexscreener.com/latest/dex/tokens/' + XAUT)
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var ps = (j.pairs || []).filter(function (p) {
        return p.baseToken && p.baseToken.address && p.baseToken.address.toLowerCase() === XAUT;
      });
      ps.sort(function (a, b) { return ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0); });
      if (ps[0]) { xautUsd = +ps[0].priceUsd || 0; paint(); }
    }).catch(function () {});

  /* live payouts from the vault ledger (vault.js feeds this) */
  window.__goldLive = function (r) {
    if (!base || r.block <= base.asOfBlock) return;
    if (r.dir === 'fill') { extraIn += r.oz; refreshStats(); return; }
    if (r.dir !== 'drop') return;
    extraOz += r.oz; extraN++;
    refreshStats();
    if (counted) { animateTo(totalOz(), 500); growWall(); }
  };

  /* fire the count-up when the section is seen */
  var sec = document.getElementById('alltime');
  if ('IntersectionObserver' in window && sec) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        armed = true;
        if (elWall) elWall.classList.add('lit');
        if (base && !counted) { counted = true; animateTo(totalOz(), 2000); }
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(sec);
  } else {
    armed = true; counted = true;
    if (elWall) elWall.classList.add('lit');
    if (base) animateTo(totalOz(), 0);
  }
})();
