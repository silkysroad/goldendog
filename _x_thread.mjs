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

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 240000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,1000','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});

const tweetIds = [];
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  page.on('response', async r => {
    if (/CreateTweet/.test(r.url()) && r.request().method() === 'POST') {
      let body = ''; try { body = await r.text(); } catch {}
      console.log('NET CreateTweet', r.status());
      const ids = [...body.matchAll(/"rest_id":"(\d+)"/g)].map(m => m[1]);
      if (ids.length) { tweetIds.push(...ids); console.log('IDS', ids.join(',')); }
      if (r.status() !== 200) console.log('BODY', body.slice(0, 300));
    }
  });

  await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('nav:', e.message));
  await sleep(8000);
  await page.screenshot({ path: DIR + '_th0.png' });

  const typeInto = async (idx, text) => {
    const sel = `[data-testid="tweetTextarea_${idx}"]`;
    await page.waitForSelector(sel, { timeout: 20000 });
    await page.click(sel);
    await sleep(500);
    await page.evaluate((s, t) => {
      const el = document.querySelector(s);
      el.focus();
      document.execCommand('insertText', false, t);
    }, sel, text);
    await sleep(800);
  };

  // tweet 1 + image
  await typeInto(0, TWEETS[0]);
  const fi = await page.$('input[data-testid="fileInput"]');
  if (!fi) throw new Error('no fileInput for image');
  await fi.uploadFile(DIR + '_launch_card.png');
  console.log('image attached, waiting for upload...');
  await sleep(9000);
  await page.screenshot({ path: DIR + '_th1.png' });

  // remaining tweets
  for (let i = 1; i < TWEETS.length; i++) {
    const add = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('[data-testid="addButton"]')].find(b => b.offsetParent && !b.disabled) || null;
    });
    const el = add.asElement();
    if (!el) throw new Error('addButton not found at tweet ' + i);
    await el.click();
    await sleep(1200);
    await typeInto(i, TWEETS[i]);
    console.log('tweet', i + 1, 'typed');
  }
  await page.screenshot({ path: DIR + '_th2.png' });

  // post all
  const posted = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-testid="tweetButton"]')].find(x => x.offsetParent);
    if (!b) return 'no button';
    const label = b.innerText;
    b.click();
    return 'clicked: ' + label;
  });
  console.log('POST', posted);
  await sleep(15000);
  await page.screenshot({ path: DIR + '_th3.png' });

  if (!tweetIds.length) throw new Error('no CreateTweet 200 observed — thread may not have posted');
  const firstId = tweetIds[0];
  console.log('FIRST_ID', firstId);

  // pin tweet 1
  await page.goto(`https://x.com/GoldenDogBSC/status/${firstId}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(7000);
  const caret = await page.evaluateHandle(() => [...document.querySelectorAll('[data-testid="caret"]')].find(b => b.offsetParent) || null);
  const caretEl = caret.asElement();
  if (!caretEl) throw new Error('caret not found for pin');
  await caretEl.click();
  await sleep(2000);
  await page.screenshot({ path: DIR + '_th4.png' });
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
  await sleep(4000);

  // verify pin on profile
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  const pinnedVisible = await page.evaluate(() => document.body.innerText.includes('Pinned'));
  console.log('pinned label visible on profile:', pinnedVisible);
  await page.screenshot({ path: DIR + '_th5.png' });
  console.log('RESULT posted=' + tweetIds.length + ' first=' + firstId + ' pinned=' + pinnedVisible);
} catch (e) {
  console.log('ERROR', e.message);
} finally {
  await browser.close();
}
