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
  page.on('response', r => { if (/update_profile|UserUpdate|onboarding\/task/.test(r.url())) console.log('NET', r.status(), r.url().slice(0,120)); });
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(8000);
  const el = await page.$('input[name="displayName"]');
  await el.focus(); await page.keyboard.press('End');
  for (let i = 0; i < 60; i++) await page.keyboard.press('Backspace');
  await el.type('金狗 · The Golden Dog', { delay: 45 });
  await page.keyboard.press('Tab'); await sleep(800);
  const diag = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="Profile_Save_Button"]')];
    const info = btns.map(b => { const r = b.getBoundingClientRect(); return { r: {x:r.x,y:r.y,w:r.width,h:r.height}, visible: !!b.offsetParent, disabled: b.disabled || b.getAttribute('aria-disabled') }; });
    const b0 = btns.find(b => b.offsetParent);
    let top = null;
    if (b0) { const r = b0.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); top = e ? (e.tagName + ' ' + (e.getAttribute('data-testid')||'') + ' ' + e.textContent.slice(0,20)) : 'null'; }
    return { count: btns.length, info, top };
  });
  console.log('DIAG', JSON.stringify(diag, null, 1));
  // dispatch full pointer sequence on visible button
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-testid="Profile_Save_Button"]')].find(x => x.offsetParent);
    if (!b) return;
    const r = b.getBoundingClientRect();
    const opts = { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width/2, clientY: r.y + r.height/2, button: 0 };
    for (const t of ['pointerover','pointerenter','pointerdown','mousedown','pointerup','mouseup','click']) {
      b.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, opts) : new MouseEvent(t, opts));
    }
  });
  await sleep(9000);
  console.log('url after:', page.url());
  await page.screenshot({ path: '_x_diag.png' });
} catch(e) { console.log('ERR', e.message); }
await sleep(3000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
