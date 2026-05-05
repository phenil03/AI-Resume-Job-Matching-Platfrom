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
  // Auth.tsx specific invisible text fixes
  [/bg-\[\#FFFFFF\] p-10 text-\[\#FFFFFF\]/g, 'bg-[#FFFFFF] p-10 text-[#111111]'],
  [/bg-\[\#FFFFFF\] px-6 text-xs font-bold uppercase tracking-widest text-\[\#FFFFFF\]/g, 'bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#111111]'],
  [/text-\[\#FFFFFF\]\/90/g, 'text-[#111111]/90'],
  [/text-\[\#FFFFFF\]\/75/g, 'text-[#444444]'],
  [/text-\[\#FFFFFF\]\/45/g, 'text-[#AAAAAA]'],
  [/text-\[\#FFFFFF\] mb-2/g, 'text-[#111111] mb-2'], // ATSAnalysis section titles
  
  // ATSAnalysis missed
  [/bg-slate-950\/70 px-4 py-3 text-sm text-\[\#FFFFFF\]/g, 'bg-[#FFFFFF] px-4 py-3 text-sm text-[#111111]'],
  [/focus:ring-blue-500\/60/g, 'focus:ring-[#1D9E75]'],
  [/focus:ring-blue-500/g, 'focus:ring-[#1D9E75]'],
  
  // Auth missed gradient
  [/bg-gradient-to-r from-blue-500 to-indigo-600/g, 'bg-[#1D9E75]'],
  [/border-white\/5/g, 'border-[#E0E0E0]'],

  // App.tsx
  [/bg-blue-500/g, 'bg-[#1D9E75]'],
  [/text-blue-500/g, 'text-[#1D9E75]'],
  [/shadow-blue-500/g, 'shadow-[#1D9E75]'],
  [/border-blue-500/g, 'border-[#1D9E75]'],

  // Catch any rogue blue-500
  [/blue-500/g, '[#1D9E75]'],
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
      console.log(`Updated ultra-finals in: ${filePath}`);
    }
  }
});
