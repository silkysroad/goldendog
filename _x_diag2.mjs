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
  page.on('response', async r => {
    if (/update_profile/.test(r.url())) {
      let body = ''; try { body = await r.text(); } catch {}
      console.log('NET', r.status(), body.slice(0, 400));
      console.log('REQ BODY:', r.request().postData()?.slice(0, 500));
    }
  });
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  const el = await page.$('input[name="displayName"]');
  await el.focus(); await page.keyboard.press('End');
  for (let i = 0; i < 60; i++) await page.keyboard.press('Backspace');
  await el.type('金狗 The Golden Dog', { delay: 45 });
  await page.keyboard.press('Tab'); await sleep(800);
  const rect = await page.evaluate(() => { const b=[...document.querySelectorAll('[data-testid="Profile_Save_Button"]')].find(x=>x.offsetParent); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  await page.mouse.click(rect.x, rect.y);
  await sleep(9000);
  console.log('url after:', page.url());
} catch(e) { console.log('ERR', e.message); }
await sleep(3000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
