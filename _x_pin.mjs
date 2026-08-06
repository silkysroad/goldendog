import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ID = '2085157359689629855';

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 180000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,1000','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  page.on('response', r => { if (/PinTweet/.test(r.url())) console.log('NET PinTweet', r.status()); });
  await page.goto(`https://x.com/GoldenDogBSC/status/${ID}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  const caretRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid="caret"]')].find(b => b.offsetParent);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!caretRect) throw new Error('caret not found');
  await page.mouse.click(caretRect.x, caretRect.y);
  await sleep(2500);
  const pinClicked = await page.evaluate(() => {
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(m => /pin to your profile/i.test(m.innerText));
    if (item) { item.click(); return item.innerText; } return null;
  });
  console.log('pin menu item:', pinClicked);
  await sleep(2000);
  const confirmed = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (b) { const t = b.innerText; b.click(); return t; } return null;
  });
  console.log('pin confirm:', confirmed);
  await sleep(5000);
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(9000);
  const check = await page.evaluate(() => {
    const pinned = document.body.innerText.includes('Pinned');
    const posts = [...document.querySelectorAll('[data-testid="tweet"]')].length;
    return { pinned, posts };
  });
  console.log('RESULT', JSON.stringify(check));
  await page.screenshot({ path: DIR + '_pin_verify.png' });
} catch (e) {
  console.log('ERROR', e.message);
  try { const p = (await browser.pages())[0]; await p.screenshot({ path: DIR + '_pin_err.png' }); } catch {}
} finally {
  await browser.close();
}
