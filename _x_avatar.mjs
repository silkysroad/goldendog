import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 120000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
let saveResult = 'no update_profile call seen';
let avatarNet = '';
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  page.on('response', async r => {
    const u = r.url();
    if (/update_profile/.test(u)) {
      let body=''; try { body = await r.text(); } catch {}
      console.log('NET profile', r.status(), body.slice(0,150));
      saveResult = r.status() === 200 ? 'saved' : 'http ' + r.status() + ' ' + body.slice(0,120);
    }
    if (/update_profile_image|profile_image/.test(u) && r.request().method() === 'POST') {
      avatarNet = 'avatar http ' + r.status();
      console.log('NET avatar', r.status());
    }
  });
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e=>console.log('nav:',e.message));
  await sleep(9000);
  await page.screenshot({ path: DIR + '_av0.png' });

  // --- avatar upload: the avatar file input is the last input[type=file]
  const inputs = await page.$$('input[type=file]');
  console.log('file inputs:', inputs.length);
  if (!inputs.length) throw new Error('no file inputs on settings page');
  await inputs[inputs.length - 1].uploadFile(DIR + '_x_pfp.jpg');
  await sleep(4000);
  await page.screenshot({ path: DIR + '_av1.png' });
  // crop modal -> Apply
  const applied = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="applyButton"]');
    if (b) { b.click(); return true; } return false;
  });
  console.log('applyButton:', applied);
  await sleep(3000);
  await page.screenshot({ path: DIR + '_av2.png' });

  // --- fix display name if still mangled
  const cur = await page.evaluate(() => document.querySelector('input[name="displayName"]')?.value);
  console.log('current name:', JSON.stringify(cur));
  if (cur !== '金狗 · The Golden Dog') {
    const el = await page.$('input[name="displayName"]');
    await el.focus(); await page.keyboard.press('End');
    for (let i = 0; i < 80; i++) await page.keyboard.press('Backspace');
    await el.type('金狗 · The Golden Dog', { delay: 40 });
    await page.keyboard.press('Tab'); await sleep(800);
  }

  // --- save via real mouse click
  const rect = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-testid="Profile_Save_Button"]')].find(x => x.offsetParent);
    if (!b) return null;
    const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (rect) { await page.mouse.click(rect.x, rect.y); console.log('save clicked'); }
  else console.log('no visible save button');
  await sleep(10000);
  await page.screenshot({ path: DIR + '_av3.png' });

  // --- verify on public profile
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 45000 }).catch(()=>{});
  await sleep(7000);
  await page.screenshot({ path: DIR + '_av_final.png' });
  const shown = await page.evaluate(() => ({
    name: document.querySelector('[data-testid="UserName"]')?.innerText?.split('\n')[0],
    avatar: document.querySelector('[data-testid^="UserAvatar-Container"] img')?.src,
  }));
  console.log('PROFILE:', JSON.stringify(shown));
} catch(e) { console.log('ERR', e.message); }
console.log('SAVE RESULT:', saveResult, '|', avatarNet);
await sleep(3000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
