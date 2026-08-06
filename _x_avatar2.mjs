import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 180000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
let profileSave = 'no update_profile seen', avatarPost = 'no avatar POST seen';
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  page.on('response', async r => {
    const u = r.url(); const m = r.request().method();
    if (/update_profile/.test(u)) {
      let body=''; try { body = await r.text(); } catch {}
      profileSave = r.status() === 200 ? 'saved 200' : 'http ' + r.status() + ' ' + body.slice(0,100);
      console.log('NET update_profile', r.status());
    }
    if (m === 'POST' && /(profile_image|profile_banner|media\/upload)/.test(u)) {
      console.log('NET', u.replace(/^https:\/\/[^/]+/,'').slice(0,60), r.status());
      if (/profile_image/.test(u)) avatarPost = 'profile_image ' + r.status();
    }
  });
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e=>console.log('nav:',e.message));
  await sleep(9000);

  // recon all file inputs
  const recon = await page.evaluate(() =>
    [...document.querySelectorAll('input[type=file]')].map((i,ix)=>({
      ix, tid: i.getAttribute('data-testid'), aria: i.getAttribute('aria-label'),
      accept: i.getAttribute('accept'),
      inModal: !!i.closest('[aria-modal="true"], [role="dialog"]'),
    }))
  );
  console.log('RECON', JSON.stringify(recon));

  // pick avatar input: aria-label mentions avatar, else 2nd input inside the dialog
  let pickIx = recon.find(r => /avatar/i.test(r.aria || ''))?.ix;
  if (pickIx === undefined) {
    const inModal = recon.filter(r => r.inModal);
    if (inModal.length >= 2) pickIx = inModal[1].ix;
    else if (inModal.length === 1) pickIx = inModal[0].ix;
  }
  console.log('picked input ix:', pickIx);
  if (pickIx === undefined) throw new Error('no avatar input found');

  const inputs = await page.$$('input[type=file]');
  await inputs[pickIx].uploadFile(DIR + '_x_pfp.jpg');
  await sleep(5000);
  await page.screenshot({ path: DIR + '_av2_crop.png' });

  // crop dialog -> apply
  const applied = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="applyButton"]');
    if (b) { b.click(); return true; } return false;
  });
  console.log('applyButton:', applied);
  await sleep(3000);
  await page.screenshot({ path: DIR + '_av2_staged.png' });

  // Save — avatar only, no field edits
  const rect = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-testid="Profile_Save_Button"]')].find(x => x.offsetParent);
    if (!b) return null;
    const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (rect) { await page.mouse.click(rect.x, rect.y); console.log('save clicked'); }
  else console.log('no visible save button');
  await sleep(10000);

  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 45000 }).catch(()=>{});
  await sleep(7000);
  await page.screenshot({ path: DIR + '_av2_final.png' });
} catch(e) { console.log('ERR', e.message); }
console.log('RESULT profile:', profileSave, '| avatar:', avatarPost);
await sleep(2000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
