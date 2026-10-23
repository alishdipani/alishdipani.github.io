// Makes the link-preview (Open Graph) image: public/images/og-default.png, 1200×630.
// The research cartoon (an ink PNG, used as a mask) painted in the light-theme ink on the light
// background, with the name and the Home heading line beside it. Renders a small HTML page with the
// repo's self-hosted fonts in headless Chrome. Run: node tools/og/make.mjs (after changing the heading line).
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const INK = '#1B2430', BG = '#F1F4F8';
const heading = fs.readFileSync('src/pages/index.astro', 'utf8').match(/const headingLine = '([^']+)'/)[1];
const b64 = (f) => fs.readFileSync(f).toString('base64');
const font = (family, file, weight, style = 'normal') =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${b64(`node_modules/@fontsource/${file}.woff2`)})}`;

const html = `<!doctype html><meta charset="utf-8"><style>
${font('Nunito Sans', 'nunito-sans/files/nunito-sans-latin-700-normal', 700)}
${font('Source Serif 4', 'source-serif-4/files/source-serif-4-latin-400-normal', 400)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${BG};color:${INK};display:flex;align-items:center;gap:48px;padding:0 72px 0 60px}
.art{flex:none;width:490px;height:490px;background:${INK};
  mask:url(data:image/png;base64,${b64('public/images/home/hero-default.png')}) center/100% 100% no-repeat}
h1{font:700 68px/1.05 'Nunito Sans';margin-bottom:28px}
p{font:400 37px/1.3 'Source Serif 4'}
</style><div class="art"></div><div><h1>Alish Dipani</h1><p>${heading}</p></div>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/images/og-default.png' });
await browser.close();
console.log('public/images/og-default.png', Math.round(fs.statSync('public/images/og-default.png').size / 1024), 'KB');
