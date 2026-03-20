const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertImage(file) {
  const filePath = path.join(__dirname, 'public', file);
  if (!fs.existsSync(filePath)) return;
  
  const ext = path.extname(file);
  const baseName = path.basename(file, ext);
  const newFilePath = path.join(__dirname, 'public', `${baseName}.webp`);

  try {
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(newFilePath);
    console.log(`Converted ${file} to ${baseName}.webp successfully`);
  } catch (err) {
    console.error(`Failed to convert ${file}:`, err);
  }
}

async function main() {
  await convertImage('bg-red.png');
  await convertImage('bg-lotus.png');
  await convertImage('bg-tree.png');
}

main();
