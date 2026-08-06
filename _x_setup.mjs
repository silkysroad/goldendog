import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false,
  userDataDir: '/Users/silkbot/.openclaw/browser/openclaw/user-data',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check','--hide-crash-restore-bubble'],
  defaultViewport: null,
});
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto('https://x.com/settings/profile', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e=>console.log('nav:',e.message));
  await sleep(8000);
  const info = await page.evaluate(() => {
    const files = [...document.querySelectorAll('input[type=file]')].map(i => ({
      testid: i.getAttribute('data-testid'), aria: i.getAttribute('aria-label'), accept: i.getAttribute('accept')
    }));
    const fields = [...document.querySelectorAll('input[name],textarea[name]')].map(i => ({
      tag: i.tagName, name: i.name, value: i.value
    }));
    const btns = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'))
      .filter(t => /save|apply|Profile|ocf/i.test(t));
    return { url: location.href, files, fields, btns: [...new Set(btns)] };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: '_x_modal.png' });
} catch(e) { console.log('ERR', e.message); }
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
