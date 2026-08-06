import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TWEETS = [
`🧧🐕 金狗 has arrived 🧵

every trade feeds the dog. the dog pays holders in real gold. not points. not promises. XAUt, gold in your wallet 🥇

真金不怕火炼
real gold fears no fire 🔥

🜚 jingou.gold`,
`📜 the lore:

for centuries the dog-beater chased the golden dog, stick in hand, sure he could take the gold by force 🏏

he always left with nothing.

打狗人空手而归
the dog-beater leaves empty-handed 🈳`,
`then @eth_cedric put out the call: the next 80M golden dog on @flapdotsh 🦋

the community answered with the most literal dog possible. a golden dog that pays actual gold 🐕🥇

持狗者坐等分金
the holder sits and shares the gold 🧧`,
`⚙️ how it works:
🐕 every buy and sell pays a reward tax
🥇 rewards auto-convert to XAUt, tokenized gold backed by the real thing
💸 straight to holder wallets. no claiming, no staking, no dashboard

hatched on @flapdotsh, running on BNB Chain 🟡`,
`⏰ why now:

binance shipped bStocks, $500M AUM in seven weeks 📈
@flapdotsh opened RWA pairs on BNB Chain, memes paired against tokenized stocks and gold 🥇
the meme × RWA rail runs straight to binance.

the dog is standing on it 🐕`,
`no roadmap theater. one promise, kept every block:

hold the dog, receive gold 🐕🥇

金狗 · the golden dog
🜚 jingou.gold

打狗人空手而归 🈳
持狗者坐等分金 🧧`,
];

const norm = s => s.replace(/\s+/g, ' ').trim();

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 300000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,1000','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});

const tweetIds = [];
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  const cdp = await page.target().createCDPSession();
  page.on('response', async r => {
    if (/CreateTweet/.test(r.url()) && r.request().method() === 'POST') {
      let body = ''; try { body = await r.text(); } catch {}
      console.log('NET CreateTweet', r.status());
      const ids = [...body.matchAll(/"rest_id":"(\d+)"/g)].map(m => m[1]);
      if (ids.length) { tweetIds.push(...new Set(ids)); console.log('IDS', [...new Set(ids)].join(',')); }
      if (r.status() !== 200) console.log('BODY', body.slice(0, 300));
    }
  });

  await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('nav:', e.message));
  await sleep(8000);

  // if a saved-draft picker or unsent modal shows, dismiss cleanly by starting fresh
  const dismissed = await page.evaluate(() => {
    const discard = [...document.querySelectorAll('[role="button"], button')].find(b => /^(discard|delete)$/i.test(b.innerText?.trim()));
    if (discard) { discard.click(); return 'discarded'; }
    return 'none';
  });
  console.log('draft dialog:', dismissed);
  await sleep(2000);

  const mouseClick = async sel => {
    const rect = await page.evaluate(s => {
      const el = [...document.querySelectorAll(s)].find(x => x.offsetParent);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!rect) return false;
    await page.mouse.click(rect.x, rect.y);
    return true;
  };

  const typeInto = async (idx, text) => {
    const sel = `[data-testid="tweetTextarea_${idx}"]`;
    await page.waitForSelector(sel, { timeout: 20000 });
    await mouseClick(sel);
    await sleep(600);
    const toEnd = () => page.evaluate(s => {
      const el = document.querySelector(s);
      el.focus();
      const sn = window.getSelection();
      sn.selectAllChildren(el);
      sn.collapseToEnd();
    }, sel);
    const lines = text.split('\n');
    let expect = '';
    for (let li = 0; li < lines.length; li++) {
      await toEnd();
      await sleep(120);
      if (li > 0) { await page.keyboard.press('Enter'); await sleep(150); }
      if (lines[li]) {
        await cdp.send('Input.insertText', { text: lines[li] });
        await sleep(250);
      }
      expect += (li > 0 ? '\n' : '') + lines[li];
      const cur = await page.evaluate(s => document.querySelector(s)?.innerText || '', sel);
      if (norm(cur) !== norm(expect)) {
        console.log(`  line ${li} drift in tweet ${idx + 1}: got "${norm(cur).slice(0,80)}" want "${norm(expect).slice(0,80)}"`);
        throw new Error('line-level drift on tweet ' + (idx + 1) + ' line ' + li);
      }
    }
    await sleep(600);
    const got = await page.evaluate(s => document.querySelector(s)?.innerText || '', sel);
    if (norm(got) !== norm(text)) {
      console.log('MISMATCH tweet', idx + 1);
      console.log('want:', norm(text));
      console.log('got :', norm(got));
      throw new Error('content mismatch on tweet ' + (idx + 1) + ' — aborting before post');
    }
    console.log('tweet', idx + 1, 'verified');
  };

  await typeInto(0, TWEETS[0]);
  const fi = await page.$('input[data-testid="fileInput"]');
  if (!fi) throw new Error('no fileInput for image');
  await fi.uploadFile(DIR + '_launch_card.png');
  console.log('image attached, waiting for upload...');
  await sleep(10000);

  for (let i = 1; i < TWEETS.length; i++) {
    const ok = await mouseClick('[data-testid="addButton"]');
    if (!ok) throw new Error('addButton not clickable at tweet ' + i);
    await sleep(1500);
    await typeInto(i, TWEETS[i]);
  }
  await page.screenshot({ path: DIR + '_th2b.png' });

  // real mouse click on Post all
  const clicked = await mouseClick('[data-testid="tweetButton"]');
  console.log('post all clicked:', clicked);
  // wait up to 30s for CreateTweet
  for (let w = 0; w < 30 && tweetIds.length < 6; w++) await sleep(1000);
  await sleep(3000);
  await page.screenshot({ path: DIR + '_th3b.png' });

  if (!tweetIds.length) throw new Error('no CreateTweet observed — not posted');
  const firstId = tweetIds[0];
  console.log('FIRST_ID', firstId, 'total', tweetIds.length);

  // pin tweet 1
  await page.goto(`https://x.com/GoldenDogBSC/status/${firstId}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(7000);
  const caretRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid="caret"]')].find(b => b.offsetParent);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!caretRect) throw new Error('caret not found for pin');
  await page.mouse.click(caretRect.x, caretRect.y);
  await sleep(2500);
  const pinClicked = await page.evaluate(() => {
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(m => /pin to your profile/i.test(m.innerText));
    if (item) { item.click(); return true; } return false;
  });
  console.log('pin menu item:', pinClicked);
  await sleep(2000);
  const confirmed = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (b) { b.click(); return true; } return false;
  });
  console.log('pin confirm:', confirmed);
  await sleep(5000);

  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  const pinnedVisible = await page.evaluate(() => document.body.innerText.includes('Pinned'));
  await page.screenshot({ path: DIR + '_th5b.png' });
  console.log('RESULT posted=' + tweetIds.length + ' first=' + firstId + ' pinned=' + pinnedVisible);
} catch (e) {
  console.log('ERROR', e.message);
  try { const p = (await browser.pages())[0]; await p.screenshot({ path: DIR + '_th_err.png' }); } catch {}
} finally {
  await browser.close();
}
