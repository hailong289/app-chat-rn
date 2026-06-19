const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LOGO = path.join(__dirname, '../src/assets/images/logo.png');
const ROOT = path.join(__dirname, '..');

const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const iosIcons = [
  { filename: '40.png', idiom: 'iphone', scale: '2x', size: '20x20' },
  { filename: '60.png', idiom: 'iphone', scale: '3x', size: '20x20' },
  { filename: '58.png', idiom: 'iphone', scale: '2x', size: '29x29' },
  { filename: '87.png', idiom: 'iphone', scale: '3x', size: '29x29' },
  { filename: '80.png', idiom: 'iphone', scale: '2x', size: '40x40' },
  { filename: '120.png', idiom: 'iphone', scale: '3x', size: '40x40' },
  { filename: '120.png', idiom: 'iphone', scale: '2x', size: '60x60' },
  { filename: '180.png', idiom: 'iphone', scale: '3x', size: '60x60' },
  { filename: '1024.png', idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
];

const iosPixelSizes = {
  '40.png': 40,
  '60.png': 60,
  '58.png': 58,
  '87.png': 87,
  '80.png': 80,
  '120.png': 120,
  '180.png': 180,
  '1024.png': 1024,
};

const srcIosDir = path.join(ROOT, 'src/assets/images/Assets.xcassets/AppIcon.appiconset');

function resizeWithSips(input, output, size) {
  execFileSync('sips', ['-z', String(size), String(size), input, '--out', output], {
    stdio: 'ignore',
  });
}

async function resizeImage(input, output, size) {
  const existingSrc = path.join(srcIosDir, path.basename(output));
  if (fs.existsSync(existingSrc) && path.basename(output) !== 'logo.png') {
    fs.copyFileSync(existingSrc, output);
    return;
  }

  try {
    const sharp = require('sharp');
    await sharp(input).resize(size, size).toFile(output);
  } catch {
    if (process.platform !== 'darwin') {
      throw new Error('sharp is unavailable and sips is only supported on macOS');
    }
    resizeWithSips(input, output, size);
  }
}

async function generateAndroidIcons() {
  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputDir = path.join(ROOT, 'android/app/src/main/res', folder);
    fs.mkdirSync(outputDir, { recursive: true });

    await resizeImage(LOGO, path.join(outputDir, 'ic_launcher.png'), size);
    await resizeImage(LOGO, path.join(outputDir, 'ic_launcher_round.png'), size);
    console.log(`✅ Android ${folder} (${size}x${size})`);
  }
}

async function generateIosIcons() {
  const outputDir = path.join(ROOT, 'ios/AppChatRN/Images.xcassets/AppIcon.appiconset');
  fs.mkdirSync(outputDir, { recursive: true });

  const generated = new Set();
  for (const [filename, pixelSize] of Object.entries(iosPixelSizes)) {
    if (generated.has(filename)) continue;
    generated.add(filename);
    await resizeImage(LOGO, path.join(outputDir, filename), pixelSize);
    console.log(`✅ iOS ${filename} (${pixelSize}x${pixelSize})`);
  }

  fs.writeFileSync(
    path.join(outputDir, 'Contents.json'),
    `${JSON.stringify({ images: iosIcons, info: { author: 'xcode', version: 1 } }, null, 2)}\n`,
  );
}

async function main() {
  await generateAndroidIcons();
  await generateIosIcons();
  console.log('✅ App icons generated from logo.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
