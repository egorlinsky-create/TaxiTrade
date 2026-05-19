#!/usr/bin/env node
/**
 * Export store screenshots as PNGs using Puppeteer.
 * Usage: node export.js [--appstore] [--playmarket] [--all]
 * Default: --all
 *
 * Requires: npm install puppeteer
 * Output: ./output/  directory
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'output');

const APPSTORE_SLIDES = [
  { id: 's1', name: 'appstore-1-home' },
  { id: 's2', name: 'appstore-2-fines' },
  { id: 's3', name: 'appstore-3-orders' },
  { id: 's4', name: 'appstore-4-epl' },
  { id: 's5', name: 'appstore-5-car' },
];

const PLAYMARKET_SLIDES = [
  { id: 'p1', name: 'playmarket-1-home' },
  { id: 'p2', name: 'playmarket-2-fines' },
  { id: 'p3', name: 'playmarket-3-orders' },
  { id: 'p4', name: 'playmarket-4-epl' },
  { id: 'p5', name: 'playmarket-5-car' },
  { id: 'feature-graphic', name: 'playmarket-feature-graphic' },
];

async function captureElement(page, selector, outPath, width, height) {
  const el = await page.$(selector);
  if (!el) {
    console.error(`  ✗ Element not found: ${selector}`);
    return;
  }
  await el.screenshot({
    path: outPath,
    type: 'png',
    clip: { x: 0, y: 0, width, height },
  });
  console.log(`  ✓ ${path.basename(outPath)}`);
}

async function exportAppStore(browser) {
  console.log('\n📱 App Store screenshots (1290×2796)');
  const file = path.resolve(__dirname, 'appstore-screenshots.html');
  const page = await browser.newPage();
  await page.setViewport({ width: 1290, height: 2796, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle0' });

  for (const slide of APPSTORE_SLIDES) {
    const outPath = path.join(OUT_DIR, `${slide.name}.png`);
    await page.evaluate((id) => {
      document.querySelectorAll('.slide').forEach(el => el.style.display = 'none');
      const target = document.getElementById(id);
      if (target) target.style.display = 'flex';
    }, slide.id);
    await new Promise(r => setTimeout(r, 200));
    const el = await page.$(`#${slide.id}`);
    if (el) {
      await el.screenshot({ path: outPath, type: 'png' });
      console.log(`  ✓ ${slide.name}.png`);
    } else {
      console.error(`  ✗ #${slide.id} not found`);
    }
  }
  await page.close();
}

async function exportPlayMarket(browser) {
  console.log('\n🤖 Play Market screenshots (1080×1920) + Feature Graphic (1024×500)');
  const file = path.resolve(__dirname, 'playmarket-screenshots.html');
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`, { waitUntil: 'networkidle0' });

  for (const slide of PLAYMARKET_SLIDES) {
    const isFeature = slide.id === 'feature-graphic';
    const w = isFeature ? 1024 : 1080;
    const h = isFeature ? 500 : 1920;

    if (isFeature) {
      await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
    } else {
      await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    }

    const outPath = path.join(OUT_DIR, `${slide.name}.png`);
    await page.evaluate((id) => {
      document.querySelectorAll('.slide, #feature-graphic').forEach(el => el.style.display = 'none');
      const target = document.getElementById(id);
      if (target) target.style.display = 'flex';
    }, slide.id);
    await new Promise(r => setTimeout(r, 200));
    const el = await page.$(`#${slide.id}`);
    if (el) {
      await el.screenshot({ path: outPath, type: 'png' });
      console.log(`  ✓ ${slide.name}.png`);
    } else {
      console.error(`  ✗ #${slide.id} not found`);
    }
  }
  await page.close();
}

async function main() {
  const args = process.argv.slice(2);
  const doAppStore = args.length === 0 || args.includes('--all') || args.includes('--appstore');
  const doPlayMarket = args.length === 0 || args.includes('--all') || args.includes('--playmarket');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created output dir: ${OUT_DIR}`);
  }

  console.log('Launching browser…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    if (doAppStore) await exportAppStore(browser);
    if (doPlayMarket) await exportPlayMarket(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n✅ Done — files saved to ${OUT_DIR}/`);
  console.log('\nFile list:');
  fs.readdirSync(OUT_DIR).sort().forEach(f => {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f}  (${(size / 1024).toFixed(0)} KB)`);
  });
}

main().catch(err => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
