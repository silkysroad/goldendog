import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new'});
const p = await b.newPage();
await p.setViewport({width:1280, height:950});
await p.goto('file:///Users/silkbot/.openclaw/nameless-workspace/websites/goldendog/index.html', {waitUntil:'networkidle0', timeout:30000}).catch(()=>{});
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:'_brand_hero_check.png'});
await b.close();
