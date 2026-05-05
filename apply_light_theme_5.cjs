const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const replacements = [
  [/ring-white\/20/g, 'ring-[#E8E8E8]'],
  [/hover:bg-white\/8/g, 'hover:bg-[#F8F9FB]'],
  [/bg-white text-black font-black/g, 'bg-[#1D9E75] text-[#FFFFFF] font-black'],
  [/hover:bg-blue-400/g, 'hover:bg-[#0F6E56]'],
  [/bg-white\/\[0\.02\]/g, 'bg-[#FFFFFF]'],
  [/hover:bg-white\/\[0\.04\]/g, 'hover:bg-[#F8F9FB]'],
];

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(([regex, replacement]) => {
      content = content.replace(regex, replacement);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated micro-finals in: ${filePath}`);
    }
  }
});
