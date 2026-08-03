import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url=process.env.URL||'https://jingou.gold/';
const tag=process.env.TAG||'en';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{try{sessionStorage.setItem('gd_stamped','1')}catch(e){}});
for(const w of [1280,1440,1920,2560]){
  await p.setViewport({width:w,height:900,deviceScaleFactor:1});
  await p.goto(url,{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
  await p.evaluate(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}window.scrollTo(0,0);});
  await new Promise(r=>setTimeout(r,1500));
  const diag=await p.evaluate((w)=>{
    const sw=document.documentElement.scrollWidth;
    const bad=[];
    document.querySelectorAll('*').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.width===0||r.height===0)return;
      if(r.right>w+2||r.left<-2){bad.push((el.tagName+'.'+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:String(el.className||'')).split(' ')[0]).slice(0,50)+' L'+Math.round(r.left)+' R'+Math.round(r.right));}
      // text clipped
      if(el.children.length===0&&el.scrollWidth>el.clientWidth+2&&getComputedStyle(el).overflow!=='visible'){bad.push('CLIP '+el.tagName+' "'+(el.textContent||'').trim().slice(0,30)+'"');}
    });
    return {sw, h:document.documentElement.scrollHeight, bad:[...new Set(bad)].slice(0,14)};
  },w);
  console.log('W'+w, 'scrollWidth='+diag.sw, 'height='+diag.h, JSON.stringify(diag.bad));
  await p.screenshot({path:`_qa_${tag}_${w}.png`,fullPage:true});
}
await b.close();
