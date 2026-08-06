import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 120000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e=>console.log('nav:',e.message));
  await sleep(8000);
  const nameEl = await page.$('input[name="displayName"]');
  if (!nameEl) throw new Error('no name field');
  await nameEl.focus();
  // hard clear: select all repeatedly then backspace per char
  await page.evaluate(() => {
    const i = document.querySelector('input[name="displayName"]');
    i.focus(); i.setSelectionRange(0, i.value.length);
  });
  await page.keyboard.press('Backspace');
  await sleep(300);
  let v = await page.evaluate(() => document.querySelector('input[name="displayName"]').value);
  for (let k = 0; k < v.length + 5 && v.length; k++) {
    await page.keyboard.press('Backspace');
    v = await page.evaluate(() => document.querySelector('input[name="displayName"]').value);
  }
  await nameEl.type('金狗 · The Golden Dog', { delay: 40 });
  const check = await page.evaluate(() => document.querySelector('input[name="displayName"]').value);
  console.log('name now:', check);
  await page.evaluate(() => { const b=document.querySelector('[data-testid="Profile_Save_Button"]'); if(b) b.click(); });
  await sleep(6000);
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await sleep(9000);
  await page.screenshot({ path: '_x_final.png' });
  console.log('done', page.url());
} catch(e) { console.log('ERR', e.message); }
await sleep(4000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
