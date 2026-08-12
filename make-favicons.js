const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');

async function main() {
  console.log("Reading image...");
  const imgUrl = 'https://i.im.ge/QMHXEV6/TradeLog_Logo.png';
  const img = await Jimp.read(imgUrl);
  
  console.log("Writing 32x32...");
  await img.clone().resize(32, 32).writeAsync('./public/favicon-32x32.png');
  
  console.log("Writing 16x16...");
  await img.clone().resize(16, 16).writeAsync('./public/favicon-16x16.png');
  
  console.log("Writing apple touch icon...");
  await img.clone().resize(180, 180).writeAsync('./public/apple-touch-icon.png');
  
  console.log("Writing ICO...");
  const buf = await pngToIco(['./public/favicon-32x32.png', './public/favicon-16x16.png']);
  fs.writeFileSync('./public/favicon.ico', buf);
  console.log("Done!");
}

main().catch(console.error);
