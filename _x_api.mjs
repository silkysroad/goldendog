import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, protocolTimeout: 120000,
  userDataDir: '/Users/silkbot/.openclaw/nameless-workspace/.gd-chrome',
  args: ['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,950','--no-first-run','--no-default-browser-check'],
  defaultViewport: null,
});
try {
  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await sleep(6000);
  const res = await page.evaluate(async (bearer) => {
    const ct0 = document.cookie.split('; ').find(c => c.startsWith('ct0='))?.slice(4);
    const r = await fetch('https://api.x.com/1.1/account/update_profile.json', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + decodeURIComponent(bearer),
        'x-csrf-token': ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'content-type': 'application/x-www-form-urlencoded',
      },
      credentials: 'include',
      body: 'name=' + encodeURIComponent('金狗 · The Golden Dog'),
    });
    const t = await r.text();
    return { status: r.status, body: t.slice(0, 300) };
  }, BEARER);
  console.log(JSON.stringify(res, null, 1));
} catch(e) { console.log('ERR', e.message); }
await sleep(2000);
browser.close().catch(()=>{});
setTimeout(() => process.exit(0), 3000);
