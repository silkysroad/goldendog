import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{try{sessionStorage.setItem('gd_stamped','1')}catch(e){}});
for(const [pg,tag] of [['index.html','en'],['zh.html','zh']]){
  for(const [w,h,mob] of [[390,844,true],[1280,900,false]]){
    await p.setViewport({width:w,height:h,deviceScaleFactor:mob?1.5:1,isMobile:mob,hasTouch:mob});
    await p.goto('http://localhost:8123/'+pg,{waitUntil:'networkidle2',timeout:45000}).catch(()=>{});
    await p.evaluate(async()=>{const hh=document.documentElement.scrollHeight;for(let y=0;y<hh;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50));}});
    await new Promise(r=>setTimeout(r,2600));
    await p.evaluate(()=>{document.getElementById('alltime').scrollIntoView({block:'start'});});
    await new Promise(r=>setTimeout(r,2600));
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth);
    const counter=await p.evaluate(()=>document.getElementById('at-oz').textContent);
    const ingots=await p.evaluate(()=>document.querySelectorAll('#ingot-wall .ing').length);
    const cap=await p.evaluate(()=>document.getElementById('ingot-cap').textContent);
    console.log(tag,w,'scrollWidth',sw,'counter',counter,'ingots',ingots,'cap:',cap);
    const sec=await p.$('#alltime');
    await sec.screenshot({path:'/tmp/at_'+tag+'_'+w+'.png'});
  }
}
await b.close();
