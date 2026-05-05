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
  // Leftovers
  [/text-blue-200/g, 'text-[#FFFFFF]'],
  [/bg-purple-600\/10/g, 'bg-[#1D9E75]/10'],
  [/border-\[\#020617\]/g, 'border-[#FFFFFF]'],
  [/text-white\/35/g, 'text-[#888888]'],
  [/bg-\[\#020617\]\/95/g, 'bg-[#F8F9FB]/95'],
  [/bg-\[\#020617\]\/50/g, 'bg-[#F8F9FB]/50'],
  [/bg-\[\#020617\]/g, 'bg-[#F8F9FB]'],
  [/text-white\/10/g, 'text-[#E8E8E8]'],
  [/text-white/g, 'text-[#FFFFFF]'], // Actually, inside components, if it's text-white, it might be on a green background. Let's see. Wait, we shouldn't change all text-white globally without caution.
  // Wait, if it's text-white and the background is white, it will be invisible. Let's assume most text-white that remain are on primary buttons.
  
  // Specific replacements
  [/shadow-blue-500/g, 'shadow-[#1D9E75]'],
  [/shadow-purple-500\/20/g, 'shadow-[#1D9E75]/10'],
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
      console.log(`Updated leftovers in: ${filePath}`);
    }
  }
});
