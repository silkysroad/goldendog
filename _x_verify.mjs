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
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  let v = await page.evaluate(() => document.querySelector('input[name="displayName"]')?.value);
  console.log('current saved name:', JSON.stringify(v));
  if (v !== '金狗 · The Golden Dog') {
    const el = await page.$('input[name="displayName"]');
    await el.focus();
    await page.keyboard.press('End');
    for (let i = 0; i < 60; i++) await page.keyboard.press('Backspace');
    await el.type('金狗 · The Golden Dog', { delay: 45 });
    await sleep(500);
    v = await page.evaluate(() => document.querySelector('input[name="displayName"]').value);
    console.log('typed:', JSON.stringify(v));
    await page.evaluate(() => { const b=document.querySelector('[data-testid="Profile_Save_Button"]'); if(b) { b.scrollIntoView(); b.click(); } });
    await sleep(7000);
    console.log('post-save url:', page.url());
  }
  // hard reload profile to verify
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await sleep(9000);
  const shown = await page.evaluate(() => document.querySelector('[data-testid="UserName"]')?.textContent);
  console.log('profile shows:', JSON.stringify(shown));
  await page.screenshot({ path: '_x_final2.png' });
} catch(e) { console.log('ERR', e.message); }
await sleep(4000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
