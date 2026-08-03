/* 金狗 — the vault, live. your browser reads BNB Chain directly. no backend. */
(function () {
  var ZH = (document.documentElement.lang || '').indexOf('zh') === 0;
  var XAUT = '0x21caef8a43163eea865baee23b9c2e327696a3bf';
  var PAIR = '0x1ce038394b2e11ebd6d7cc44e7f98c9d195832f0';
  var TOKEN = '0xb5e29d5abefc2ede88d17d161d5b840174497777';
  var TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  var RPCS = ['https://bsc-rpc.publicnode.com', 'https://bsc-mainnet.public.blastapi.io'];
  var LOGS_RPC = 'https://bsc-mainnet.public.blastapi.io'; /* 10-block windows, reliable */
  var rpcId = 0, reqId = 1;

  var elLedger = document.getElementById('ledger');
  if (!elLedger) return;
  var elOz = document.getElementById('v-oz');
  var elOzUsd = document.getElementById('v-oz-usd');
  var elPx = document.getElementById('v-px');
  var elFlow = document.getElementById('v-flow');
  var elFlowSub = document.getElementById('v-flow-sub');
  var elScan = document.getElementById('v-scan');

  function rpc(url, method, params) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: reqId++, method: method, params: params })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error(j.error.message || 'rpc error');
      return j.result;
    });
  }
  function anyRpc(method, params) {
    var u = RPCS[rpcId % RPCS.length];
    return rpc(u, method, params).catch(function () {
      rpcId++;
      return rpc(RPCS[rpcId % RPCS.length], method, params);
    });
  }

  /* ---------- vault stats: gold in the pool, priced ---------- */
  var xautUsd = 0, poolOz = 0;
  function fmt(n, d) { return (+n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: d == null ? 2 : d }); }

  function refreshVault() {
    anyRpc('eth_call', [{ to: XAUT, data: '0x70a08231' + '0'.repeat(24) + PAIR.slice(2) }, 'latest'])
      .then(function (res) {
        poolOz = parseInt(res, 16) / 1e6;
        if (elOz) elOz.textContent = fmt(poolOz, 3);
        paintUsd();
      }).catch(function () {});
    fetch('https://api.dexscreener.com/latest/dex/tokens/' + XAUT)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var ps = (j.pairs || []).filter(function (p) {
          return p.baseToken && p.baseToken.address && p.baseToken.address.toLowerCase() === XAUT;
        });
        ps.sort(function (a, b) { return ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0); });
        if (ps[0]) { xautUsd = +ps[0].priceUsd || 0; }
        if (elPx && xautUsd) elPx.textContent = '$' + fmt(xautUsd, 0);
        paintUsd();
      }).catch(function () {});
  }
  function paintUsd() {
    if (elOzUsd && poolOz && xautUsd) elOzUsd.textContent = (ZH ? '≈ $' : '≈ $') + fmt(poolOz * xautUsd, 0) + (ZH ? ' 实物黄金' : ' of physical gold');
  }
  refreshVault();
  setInterval(refreshVault, 60000);

  /* ---------- the gold ledger: tail XAUt transfers around the pool ---------- */
  var rows = [];         /* {block, tx, dir, oz, from, to, ts} */
  var seen = {};
  var head = 0, newestScanned = 0, oldestScanned = 0;
  var blockTs = {};      /* blockNumber -> unix ts */
  var BACKFILL_TARGET_ROWS = 10;
  var BACKFILL_MAX_BLOCKS = 3000;
  var WINDOW = 10;

  function short(a) { return a.slice(0, 6) + '…' + a.slice(-4); }

  function classify(l) {
    var from = '0x' + l.topics[1].slice(-40);
    var to = '0x' + l.topics[2].slice(-40);
    var f = from.toLowerCase(), t = to.toLowerCase();
    if (f !== PAIR && t !== PAIR && f !== TOKEN && t !== TOKEN) return null;
    var dir;
    if (f === TOKEN) dir = 'drop';           /* contract paying holders — the event */
    else if (t === PAIR) dir = 'in';         /* gold entering the pool (buys) */
    else if (f === PAIR) dir = 'out';        /* gold leaving the pool (sells / reward route) */
    else dir = 'in';
    return {
      block: parseInt(l.blockNumber, 16),
      tx: l.transactionHash,
      dir: dir,
      oz: parseInt(l.data, 16) / 1e6,
      from: from, to: to
    };
  }

  function tsFor(block) {
    if (blockTs[block]) return Promise.resolve(blockTs[block]);
    return anyRpc('eth_getBlockByNumber', ['0x' + block.toString(16), false]).then(function (b) {
      var ts = parseInt(b.timestamp, 16);
      blockTs[block] = ts;
      return ts;
    }).catch(function () { return 0; });
  }

  function ago(ts) {
    if (!ts) return '';
    var s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
    if (ZH) {
      if (s < 60) return s + ' 秒前';
      if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
      if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
      return Math.floor(s / 86400) + ' 天前';
    }
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function labelFor(r) {
    if (r.dir === 'drop') return ZH ? '分金 · 空投给持有者' : 'GOLD DROP · to holders';
    if (r.dir === 'in') return ZH ? '入池 · 买狗' : 'GOLD IN · buy';
    return ZH ? '出池 · 卖狗' : 'GOLD OUT · sell';
  }

  function render() {
    rows.sort(function (a, b) { return b.block - a.block; });
    var top = rows.slice(0, 14);
    elLedger.innerHTML = top.map(function (r) {
      var cls = r.dir === 'drop' ? 'drop' : r.dir;
      var sign = r.dir === 'in' ? '+' : '−';
      return '<li class="lrow ' + cls + '">' +
        '<span class="ldir">' + labelFor(r) + '</span>' +
        '<span class="loz">' + sign + ' ' + r.oz.toFixed(4) + ' <i>oz</i></span>' +
        '<span class="lwho mono">' + short(r.dir === 'in' ? r.from : r.to) + '</span>' +
        '<span class="lts">' + ago(r.ts) + '</span>' +
        '<a class="ltx mono" href="https://bscscan.com/tx/' + r.tx + '" target="_blank" rel="noopener">tx ↗</a>' +
        '</li>';
    }).join('');
    /* hourly flow */
    var hourAgo = Date.now() / 1000 - 3600;
    var flow = 0, n = 0;
    rows.forEach(function (r) { if (r.ts && r.ts > hourAgo) { flow += r.oz; n++; } });
    if (elFlow) elFlow.textContent = flow ? fmt(flow, 3) : '—';
    if (elFlowSub) elFlowSub.textContent = n
      ? (ZH ? n + ' 笔转移 · 最近一小时' : n + ' transfers · last hour')
      : (ZH ? '静默中 · 等待下一笔' : 'quiet · awaiting the next move');
  }

  function ingest(logs) {
    var added = [];
    (logs || []).forEach(function (l) {
      var r = classify(l);
      if (!r) return;
      var k = r.tx + ':' + l.logIndex;
      if (seen[k]) return;
      seen[k] = 1;
      rows.push(r); added.push(r);
    });
    if (!added.length) return;
    Promise.all(added.map(function (r) {
      return tsFor(r.block).then(function (ts) { r.ts = ts; });
    })).then(render);
    render();
  }

  function getWindow(from, to) {
    return rpc(LOGS_RPC, 'eth_getLogs', [{
      address: XAUT,
      fromBlock: '0x' + from.toString(16),
      toBlock: '0x' + to.toString(16),
      topics: [TRANSFER]
    }]);
  }

  function scanStatus(msg) { if (elScan) elScan.textContent = msg; }

  function start() {
    anyRpc('eth_blockNumber', []).then(function (h) {
      head = parseInt(h, 16);
      newestScanned = head;
      oldestScanned = head + 1;
      backfill();
      setInterval(tail, 9000);
    }).catch(function () {
      scanStatus(ZH ? '节点无响应 · 稍后重试' : 'nodes quiet · retrying');
      setTimeout(start, 15000);
    });
  }

  var backfilling = false;
  function backfill() {
    if (backfilling) return;
    backfilling = true;
    function step() {
      var have = rows.length;
      var scanned = (head - oldestScanned) + 1;
      if (have >= BACKFILL_TARGET_ROWS || scanned >= BACKFILL_MAX_BLOCKS) {
        backfilling = false;
        scanStatus(ZH
          ? '已回读 ' + Math.max(scanned, 0) + ' 个区块 · 实时监听中'
          : 'read back ' + Math.max(scanned, 0) + ' blocks · now tailing live');
        return;
      }
      var to = oldestScanned - 1;
      var from = to - (WINDOW - 1);
      oldestScanned = from;
      scanStatus(ZH
        ? '回读链上区块 ' + from + '…'
        : 'reading chain, block ' + from + '…');
      getWindow(from, to).then(ingest).catch(function () {}).then(function () {
        setTimeout(step, 450);
      });
    }
    step();
  }

  function tail() {
    anyRpc('eth_blockNumber', []).then(function (h) {
      var newHead = parseInt(h, 16);
      if (newHead <= newestScanned) return;
      var from = newestScanned + 1;
      var chunks = [];
      while (from <= newHead) {
        var to = Math.min(from + WINDOW - 1, newHead);
        chunks.push([from, to]);
        from = to + 1;
      }
      /* cap the burst; if we're far behind just take the newest few windows */
      if (chunks.length > 6) chunks = chunks.slice(-6);
      newestScanned = newHead;
      head = newHead;
      chunks.reduce(function (p, c) {
        return p.then(function () { return getWindow(c[0], c[1]).then(ingest).catch(function () {}); });
      }, Promise.resolve());
    }).catch(function () {});
    /* keep 'ago' fresh */
    render();
  }

  render();
  start();
})();
