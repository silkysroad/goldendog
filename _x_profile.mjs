import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = '/Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e=>console.log('nav:',e.message));
  await sleep(8000);
  await page.screenshot({ path: '_x_pr0.png' });
  const recon = await page.evaluate(() => ({
    url: location.href,
    files: [...document.querySelectorAll('input[type=file]')].map((i,ix)=>({ix, tid:i.getAttribute('data-testid'), aria:i.getAttribute('aria-label')})),
    fields: [...document.querySelectorAll('input[name],textarea[name]')].map(i=>({tag:i.tagName,n:i.name,v:i.value})),
  }));
  console.log('RECON', JSON.stringify(recon));
  const fileInputs = await page.$$('input[type=file]');
  if (fileInputs.length >= 2) {
    // banner first
    await fileInputs[0].uploadFile(DIR + '_x_banner.png');
    await sleep(4000);
    await page.screenshot({ path: '_x_pr1.png' });
    await page.evaluate(() => { const b=document.querySelector('[data-testid="applyButton"]'); if(b) b.click(); });
    await sleep(3000);
    // avatar
    const fi2 = await page.$$('input[type=file]');
    await fi2[fi2.length-1].uploadFile(DIR + '_x_pfp.jpg');
    await sleep(4000);
    await page.screenshot({ path: '_x_pr2.png' });
    await page.evaluate(() => { const b=document.querySelector('[data-testid="applyButton"]'); if(b) b.click(); });
    await sleep(3000);
  } else console.log('unexpected file inputs:', fileInputs.length);
  // text fields
  const setField = async (sel, val) => {
    const el = await page.$(sel);
    if (!el) { console.log('missing', sel); return; }
    await el.click({ clickCount: 3 });
    await page.keyboard.down('Meta'); await page.keyboard.press('a'); await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await el.type(val, { delay: 25 });
  };
  await setField('input[name="displayName"]', '金狗 · The Golden Dog');
  await setField('textarea[name="description"]', 'The Golden Dog. Every trade pays rewards. The rewards land as real gold, XAUt, in every holder\'s wallet. 真金不怕火炼. 打狗人空手而归 · 持狗者坐等分金');
  await setField('input[name="location"]', 'BSC');
  await setField('input[name="url"]', 'https://jingou.gold');
  await sleep(800);
  await page.screenshot({ path: '_x_pr3.png' });
  await page.evaluate(() => { const b=document.querySelector('[data-testid="Profile_Save_Button"]'); if(b) b.click(); });
  await sleep(6000);
  await page.screenshot({ path: '_x_pr4.png' });
  console.log('after save URL:', page.url());
  // view final profile
  await page.goto('https://x.com/GoldenDogBSC', { waitUntil: 'networkidle2', timeout: 45000 }).catch(()=>{});
  await sleep(6000);
  await page.screenshot({ path: '_x_final.png' });
} catch(e) { console.log('ERR', e.message); try{const p=(await browser.pages())[0]; await p.screenshot({path:'_x_prerr.png'});}catch{} }
await sleep(4000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
