import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = 'file://' + process.cwd() + '/';
const page_ = process.env.PAGE || 'index.html';
const out = process.env.OUT || 'snap';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('gd_stamped', '1'); } catch (e) {} });

async function autoscroll() {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 1600));
}

// mobile
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
await page.goto(base + page_, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
await autoscroll();
await page.screenshot({ path: out + '_mobile.png', fullPage: true });
console.log('mobile scrollWidth:', await page.evaluate(() => document.documentElement.scrollWidth));

// desktop wide (couplets visible)
await page.setViewport({ width: 1560, height: 1000, deviceScaleFactor: 1 });
await page.goto(base + page_, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
await autoscroll();
await page.screenshot({ path: out + '_desktop.png', fullPage: true });
console.log('desktop scrollWidth:', await page.evaluate(() => document.documentElement.scrollWidth));

await browser.close();
