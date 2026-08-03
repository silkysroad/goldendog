/* 金狗 — interaction layer. injected, shared by both editions. */
(function () {
  var ZH = (document.documentElement.lang || "").indexOf("zh") === 0;
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PAIR_API = "https://api.dexscreener.com/latest/dex/pairs/bsc/0x1CE038394B2E11ebd6D7Cc44E7F98c9D195832f0";

  /* ---------- paper grain ---------- */
  var grain = document.createElement("div");
  grain.className = "grain";
  document.body.appendChild(grain);

  /* ---------- reading progress (gold thread over the red band) ---------- */
  var prog = document.createElement("div");
  prog.className = "progress";
  document.body.appendChild(prog);
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }, { passive: true });

  /* ---------- seal-stamp preloader (once per session) ---------- */
  if (!REDUCED && !sessionStorage.getItem("gd_stamped")) {
    var pre = document.createElement("div");
    pre.className = "preloader";
    pre.innerHTML = '<div class="pre-seal zh">金<br>狗</div><div class="pre-cap">' +
      (ZH ? "黄金底池 · 持狗得金" : "GOLD-BOTTOMED · HOLD THE DOG") + "</div>";
    document.body.appendChild(pre);
    document.body.classList.add("locked");
    setTimeout(function () {
      pre.classList.add("done");
      document.body.classList.remove("locked");
      sessionStorage.setItem("gd_stamped", "1");
      setTimeout(function () { pre.remove(); }, 800);
    }, 1250);
  }

  /* ---------- sticky masthead shadow ---------- */
  var header = document.querySelector("header");
  if (header) {
    window.addEventListener("scroll", function () {
      header.classList.toggle("stuck", window.scrollY > 40);
    }, { passive: true });
  }

  /* ---------- live ticker (dexscreener) ---------- */
  var ticker = document.createElement("div");
  ticker.className = "ticker";
  ticker.innerHTML = '<div class="ticker-track"><div class="tgroup" id="tg1"><span class="titem">' +
    (ZH ? "正在连线金库…" : "DIALING THE VAULT…") + '</span></div><div class="tgroup" id="tg2"></div></div>';
  if (header) header.insertAdjacentElement("afterend", ticker);

  function money(n) {
    n = +n;
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n.toFixed(2);
  }
  function priceFmt(p) {
    p = +p;
    return p >= 0.01 ? "$" + p.toFixed(4) : "$" + p.toPrecision(3);
  }
  function chgSpan(v) {
    v = +v;
    var cls = v >= 0 ? "up" : "down";
    var sign = v >= 0 ? "▲" : "▼";
    return '<b class="' + cls + '">' + sign + " " + Math.abs(v).toFixed(1) + "%</b>";
  }

  function renderTicker(p) {
    var items;
    if (ZH) {
      items = [
        "金狗 " + priceFmt(p.priceUsd),
        "24H " + chgSpan(p.priceChange.h24),
        "市值 " + money(p.marketCap || p.fdv),
        "24H 交易量 " + money(p.volume.h24),
        "底池 " + money(p.liquidity.usd) + " · XAUt",
        "持有即分金 · 无需领取"
      ];
    } else {
      items = [
        "金狗 " + priceFmt(p.priceUsd),
        "24H " + chgSpan(p.priceChange.h24),
        "MCAP " + money(p.marketCap || p.fdv),
        "VOL 24H " + money(p.volume.h24),
        "POOL " + money(p.liquidity.usd) + " · XAUt",
        "HOLDERS PAID IN GOLD · NO CLAIM"
      ];
    }
    var html = items.map(function (i) { return '<span class="titem">' + i + "</span>"; })
      .join('<span class="tsep">◆</span>') + '<span class="tsep">◆</span>';
    var g1 = document.getElementById("tg1"), g2 = document.getElementById("tg2");
    if (g1) g1.innerHTML = html;
    if (g2) g2.innerHTML = html;
    ticker.classList.add("live");
  }

  function feed() {
    fetch(PAIR_API).then(function (r) { return r.json(); }).then(function (j) {
      var p = (j.pairs && j.pairs[0]) || j.pair;
      if (p) renderTicker(p);
    }).catch(function () { /* the vault is quiet; keep last print */ });
  }
  feed();
  setInterval(feed, 60000);

  /* ---------- scroll reveals ---------- */
  var rvSel = [".sec-head", ".hero-sub", ".ca-bar", ".lore-grid .lede", ".pull", ".timeline .row",
    ".defn", ".mech-diagram", ".fig-cap", ".index .item", ".mech-line", ".bar-chart",
    ".gold-copy", ".stat", ".stats .note", ".chart-wrap", ".foot-grid > div", ".colophon"].join(",");
  var rvEls = Array.prototype.slice.call(document.querySelectorAll(rvSel));
  rvEls.forEach(function (el, i) {
    el.classList.add("rv");
    el.style.transitionDelay = (Math.min(i % 6, 4) * 70) + "ms";
  });

  /* ---------- bar chart grows in ---------- */
  var bars = Array.prototype.slice.call(document.querySelectorAll(".bar-chart .bar i"));
  bars.forEach(function (b) {
    b.dataset.w = b.style.width;
    if (!REDUCED) b.style.width = "0%";
  });

  /* ---------- mechanics diagram draws itself ---------- */
  var svg = document.querySelector(".mech-diagram svg");
  if (svg && !REDUCED) {
    var shapes = Array.prototype.slice.call(svg.querySelectorAll("path,rect,circle"));
    shapes.forEach(function (s) {
      if (s.closest("marker")) return;
      var len;
      try { len = s.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
    });
    var texts = Array.prototype.slice.call(svg.querySelectorAll("text"));
    texts.forEach(function (t) { t.style.opacity = "0"; });
    svg.dataset.armed = "1";
  }

  function playSvg() {
    if (!svg || svg.dataset.played) return;
    svg.dataset.played = "1";
    var shapes = Array.prototype.slice.call(svg.querySelectorAll("path,rect,circle"));
    var i = 0;
    shapes.forEach(function (s) {
      if (s.closest("marker")) return;
      if (!s.style.strokeDasharray) return;
      s.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1) " + (i * 110) + "ms";
      s.style.strokeDashoffset = "0";
      i++;
    });
    var texts = Array.prototype.slice.call(svg.querySelectorAll("text"));
    texts.forEach(function (t, k) {
      t.style.transition = "opacity .6s ease " + (500 + k * 60) + "ms";
      t.style.opacity = "1";
    });
  }

  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.classList.contains("mech-diagram")) playSvg();
        if (en.target.classList.contains("bar-chart")) {
          Array.prototype.slice.call(en.target.querySelectorAll(".bar i")).forEach(function (b, k) {
            setTimeout(function () { b.style.width = b.dataset.w; }, 150 + k * 130);
          });
        }
        io.unobserve(en.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
    rvEls.forEach(function (el) { io.observe(el); });
  } else {
    rvEls.forEach(function (el) { el.classList.add("in"); });
    bars.forEach(function (b) { b.style.width = b.dataset.w; });
    playSvg();
  }

  /* ---------- gold foil shimmer ---------- */
  Array.prototype.slice.call(document.querySelectorAll(".gold-char, .goldnum")).forEach(function (el) {
    el.classList.add("foil");
  });

  /* ---------- hero plate parallax drift ---------- */
  var plate = document.querySelector(".hero-plate");
  if (plate && !REDUCED) {
    window.addEventListener("scroll", function () {
      var y = Math.min(window.scrollY, 700);
      plate.style.transform = "rotate(1.5deg) translateY(" + y * 0.06 + "px)";
    }, { passive: true });
  }
})();
