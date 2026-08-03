import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url=process.env.URL||'https://jingou.gold/';const tag=process.env.TAG||'en';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{try{sessionStorage.setItem('gd_stamped','1')}catch(e){}});
await p.setViewport({width:1600,height:1000,deviceScaleFactor:1});
await p.goto(url,{waitUntil:'networkidle2',timeout:60000});
await new Promise(r=>setTimeout(r,2500));
const H=await p.evaluate(()=>document.documentElement.scrollHeight);
let i=0;
for(let y=0;y<H-200;y+=950){
  await p.evaluate(y=>window.scrollTo(0,y),y);
  await new Promise(r=>setTimeout(r,1400));
  await p.screenshot({path:`_vp_${tag}_${String(i).padStart(2,'0')}.png`});
  i++;
}
console.log('shots',i,'height',H);
await b.close();
