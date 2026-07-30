import fs from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const out = process.argv[3];
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const img = fs.readFileSync('C:/Users/Singh/Downloads/DC floor plan.jpg').toString('base64');
const html = `<html><body style="margin:0">
<canvas id="c" width="913" height="1183"></canvas>
<script>
const rooms = ${JSON.stringify(d.rooms)};
const im = new Image();
im.onload = () => {
  const ctx = document.getElementById('c').getContext('2d');
  ctx.drawImage(im, 0, 0, 913, 1183);
  const cols = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe','#008080','#9a6324','#800000','#808000','#000075'];
  rooms.forEach((r, i) => {
    ctx.beginPath();
    r.polygon.forEach((p, j) => { const x = p.x*913, y = p.y*1183; j ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
    ctx.closePath();
    ctx.fillStyle = cols[i%cols.length] + '66'; ctx.fill();
    ctx.strokeStyle = cols[i%cols.length]; ctx.lineWidth = 3; ctx.stroke();
  });
  window.__done = true;
};
im.src = 'data:image/jpeg;base64,${img}';
</script></body></html>`;
fs.writeFileSync('overlay.html', html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 913, height: 1183 } });
await page.goto(pathToFileURL(process.cwd() + '/overlay.html').href);
await page.waitForFunction('window.__done === true', { timeout: 15000 });
await page.screenshot({ path: out });
console.log('wrote', out);
await browser.close();
