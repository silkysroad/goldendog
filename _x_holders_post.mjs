import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TWEET = `真金到手 🧧🐕

948 wallets have been paid real gold. 3.55 oz of XAUt, all time. every payout on-chain.

they held. gold arrived.

hatched on @flapdotsh 🦋

持狗者坐等分金 🥇
🜚 jingou.gold`;

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
        await sleep(300);
        // dismiss mention-typeahead ONLY if it's actually open, so Enter doesn't select a user
        const ta = await page.$('[data-testid="typeaheadDropdown"], [role="listbox"]');
        if (ta) { await page.keyboard.press('Escape').catch(() => {}); await sleep(150); await toEnd(); }
      }
      expect += (li > 0 ? '\n' : '') + lines[li];
      const cur = await page.evaluate(s => document.querySelector(s)?.innerText || '', sel);
      if (norm(cur) !== norm(expect)) {
        console.log(`  line ${li} drift: got "${norm(cur).slice(0,80)}" want "${norm(expect).slice(0,80)}"`);
        throw new Error('line-level drift on line ' + li);
      }
    }
    await sleep(600);
    const got = await page.evaluate(s => document.querySelector(s)?.innerText || '', sel);
    if (norm(got) !== norm(text)) {
      console.log('MISMATCH');
      console.log('want:', norm(text));
      console.log('got :', norm(got));
      throw new Error('content mismatch — aborting before post');
    }
    console.log('tweet verified');
  };

  await typeInto(0, TWEET);
  const fi = await page.$('input[data-testid="fileInput"]');
  if (!fi) throw new Error('no fileInput for image');
  await fi.uploadFile(DIR + '_holders_card.png');
  console.log('image attached, waiting for upload...');
  await sleep(10000);

  await page.screenshot({ path: DIR + '_hp1.png' });
  const clicked = await mouseClick('[data-testid="tweetButton"]');
  console.log('post clicked:', clicked);
  for (let w = 0; w < 30 && !tweetIds.length; w++) await sleep(1000);
  await sleep(3000);
  await page.screenshot({ path: DIR + '_hp2.png' });

  if (!tweetIds.length) throw new Error('no CreateTweet observed — not posted');
  console.log('RESULT posted id=' + tweetIds[0]);
} catch (e) {
  console.log('ERROR', e.message);
  try { const p = (await browser.pages())[0]; await p.screenshot({ path: DIR + '_hp_err.png' }); } catch {}
} finally {
  await browser.close();
}
