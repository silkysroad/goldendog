import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const scene = process.argv[2] || 'run_scene.html';
const outdir = process.argv[3] || 'frames_run';
const frames = parseInt(process.argv[4] || '240', 10);
fs.mkdirSync(outdir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
await page.goto('file://' + process.cwd() + '/' + scene, { waitUntil: 'networkidle2', timeout: 45000 });
await page.waitForFunction('typeof renderFrame === "function"');
// wait for image load
await new Promise(r => setTimeout(r, 1200));
const el = await page.$('#c');
for (let i = 0; i < frames; i++) {
  await page.evaluate((fi) => renderFrame(fi), i);
  await el.screenshot({ path: `${outdir}/f${String(i).padStart(4, '0')}.png` });
  if (i % 30 === 0) console.log('frame', i);
}
await browser.close();
console.log('captured', frames);
