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
  [/hover:text-blue-300/g, 'hover:text-[#1D9E75]'],
  [/text-blue-300\/80/g, 'text-[#888888]'],
  [/text-blue-300\/90/g, 'text-[#444444]'],
  [/text-blue-300/g, 'text-[#1D9E75]'],
  [/decoration-blue-400\/40/g, 'decoration-[#1D9E75]/40'],
  [/hover:text-cyan-300/g, 'hover:text-[#1D9E75]'],
  [/bg-blue-900\/20/g, 'bg-[#E6F1FB]'],
  [/border-blue-700\/30/g, 'border-[#0C447C]/30'],
  [/text-blue-400/g, 'text-[#1D9E75]'],
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
      console.log(`Updated final leftovers in: ${filePath}`);
    }
  }
});
