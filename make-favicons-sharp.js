const sharp = require('sharp');
const fs = require('fs');

async function main() {
  console.log("Fetching image...");
  const response = await fetch('https://i.im.ge/QMHXEV6/TradeLog_Logo.png');
  const buffer = await response.arrayBuffer();
  
  console.log("Writing 32x32...");
  await sharp(buffer).resize(32, 32).toFile('./public/favicon-32x32.png');
  
  console.log("Writing 16x16...");
  await sharp(buffer).resize(16, 16).toFile('./public/favicon-16x16.png');
  
  console.log("Writing apple touch icon...");
  await sharp(buffer).resize(180, 180).toFile('./public/apple-touch-icon.png');
  
  // Since sharp doesn't export .ico directly easily without plugins, we'll just save a 32x32 png to favicon.ico
  console.log("Writing favicon.ico (as PNG format)...");
  await sharp(buffer).resize(32, 32).toFile('./public/favicon.ico');
  
  console.log("Done!");
}

main().catch(console.error);
