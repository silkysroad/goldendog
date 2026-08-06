import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 340 });
await page.goto('file://' + process.cwd() + '/_pfp_test.html', { waitUntil: 'networkidle2' }).catch(()=>{});
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: '_pfp_test.png' });
await browser.close(); console.log('ok');
