// One-shot generator: OG/Twitter/icon/apple-icon from public/jfauto-logo.png.
// Run once after replacing the logo, then keep outputs committed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = path.resolve(import.meta.dirname, '..');
const source = path.join(repoRoot, 'public', 'jfauto-logo.png');
const appDir = path.join(repoRoot, 'app');

await mkdir(appDir, { recursive: true });

// The source PNG has a faint baked-in checker pattern (transparency indicator
// from its export pipeline). A linear tone curve crushes near-white pixels to
// pure white without darkening the logo.
const logo = await sharp(await readFile(source))
  .linear(1.35, -45)
  .png()
  .toBuffer();

// Overwrite source with cleaned version so the in-app <Logo> renders without
// the checker pattern. Idempotent — second run is a no-op.
await writeFile(source, logo);

// Brand background (matches viewport themeColor in app/layout.tsx).
const dark = { r: 5, g: 7, b: 10, alpha: 1 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function compose({ width, height, padding, background, output }) {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const resized = await sharp(logo)
    .resize({ width: innerW, height: innerH, fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const canvas = await sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
  await writeFile(output, canvas);
  console.log(`wrote ${path.relative(repoRoot, output)} (${width}x${height})`);
}

// 1200x630 OpenGraph card on white (logo's native ground).
await compose({
  width: 1200,
  height: 630,
  padding: 80,
  background: white,
  output: path.join(appDir, 'opengraph-image.png'),
});

// Twitter summary_large_image — same dimensions work.
await compose({
  width: 1200,
  height: 630,
  padding: 80,
  background: white,
  output: path.join(appDir, 'twitter-image.png'),
});

// Square icons on dark brand background to match site chrome.
await compose({
  width: 512,
  height: 512,
  padding: 48,
  background: dark,
  output: path.join(appDir, 'icon.png'),
});

await compose({
  width: 180,
  height: 180,
  padding: 18,
  background: dark,
  output: path.join(appDir, 'apple-icon.png'),
});
