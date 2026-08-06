/* 金狗 — gold_stats.json updater.
 * Incrementally scans XAUt transfers of the flap dividend vault (the contract
 * that actually pays holders) from the last recorded block, updates the
 * baseline file, and commits + pushes so the live site stays truthful.
 *
 * Sources of truth:
 *   dividend vault: 0x8244f4bbe2eb2ed76d5d92f09eb8af2c2f7012cb  (token.dividendContract())
 *   payouts  = XAUt transfers FROM the vault to holders
 *   inflow   = XAUt transfers TO the vault (tax revenue via taxProcessor)
 * Wallet count note: `wallets` is monotonically grown from newly seen payout
 * recipients; recipients seen before the baseline are already counted.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATS = join(ROOT, 'gold_stats.json');
const WALLETS = join(ROOT, 'scripts', 'wallets_seen.json');

const XAUT = '0x21caef8a43163eea865baee23b9c2e327696a3bf';
const DIV = '0x8244f4bbe2eb2ed76d5d92f09eb8af2c2f7012cb';
const PAD_DIV = '0x' + '0'.repeat(24) + DIV.slice(2);
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://rpc-bsc.48.club',
  'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
];
let rpcI = 0;
async function rpc(method, params) {
  let lastErr;
  for (let a = 0; a < 30; a++) {
    const url = RPCS[rpcI % RPCS.length]; rpcI++;
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'rpc');
      return j.result;
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 300 + a * 100)); }
  }
  throw lastErr;
}

const stats = JSON.parse(readFileSync(STATS, 'utf8'));
let walletsSeen = new Set();
try { walletsSeen = new Set(JSON.parse(readFileSync(WALLETS, 'utf8'))); } catch {}

const latest = parseInt(await rpc('eth_blockNumber', []), 16) - 20;
const from0 = stats.asOfBlock + 1;
if (from0 > latest) { console.log('up to date'); process.exit(0); }

let outWei = 0n, outN = 0, inWei = 0n, inN = 0;
let biggest = BigInt(Math.round(stats.biggestOz * 1e6)), biggestTx = stats.biggestTx;
const newWallets = new Set();

for (let f = from0; f <= latest; f += 4900) {
  const t = Math.min(f + 4899, latest);
  const range = { address: XAUT, fromBlock: '0x' + f.toString(16), toBlock: '0x' + t.toString(16) };
  const outs = await rpc('eth_getLogs', [{ ...range, topics: [TRANSFER, PAD_DIV] }]);
  for (const l of outs) {
    const v = BigInt(l.data);
    outWei += v; outN++;
    const dst = '0x' + l.topics[2].slice(-40).toLowerCase();
    if (!walletsSeen.has(dst)) { walletsSeen.add(dst); newWallets.add(dst); }
    if (v > biggest) { biggest = v; biggestTx = l.transactionHash; }
  }
  const ins = await rpc('eth_getLogs', [{ ...range, topics: [TRANSFER, null, PAD_DIV] }]);
  for (const l of ins) { inWei += BigInt(l.data); inN++; }
}

stats.asOfBlock = latest;
stats.asOfTs = Math.floor(Date.now() / 1000);
stats.outOz = +(stats.outOz + Number(outWei) / 1e6).toFixed(6);
stats.outCount += outN;
stats.inOz = +(stats.inOz + Number(inWei) / 1e6).toFixed(6);
stats.inCount += inN;
stats.wallets += newWallets.size;
stats.biggestOz = Number(biggest) / 1e6;
stats.biggestTx = biggestTx;

writeFileSync(STATS, JSON.stringify(stats, null, 1) + '\n');
writeFileSync(WALLETS, JSON.stringify([...walletsSeen]));
console.log('updated:', JSON.stringify({ newOutOz: Number(outWei) / 1e6, newPayouts: outN, newWallets: newWallets.size, asOfBlock: latest }));

try {
  execSync('git add gold_stats.json scripts/wallets_seen.json && git -c user.name=goldstats -c user.email=goldstats@jingou.gold commit -m "gold_stats: refresh from chain" && git push', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('git push skipped:', e.message); }
