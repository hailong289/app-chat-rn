const fs = require('fs');
const sharp = require('sharp');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, size] of Object.entries(sizes)) {
  const outputDir = `android/app/src/main/res/${folder}`;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  sharp('./src/assets/images/logo.png')
    .resize(size, size)
    .toFile(`${outputDir}/ic_launcher.png`)
    .then(() => console.log(`✅ Created ${folder}/ic_launcher.png (${size}x${size})`))
    .catch(console.error);
}
