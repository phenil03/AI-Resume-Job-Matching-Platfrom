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
  // Page / Global Backgrounds
  [/bg-\[\#020617\]/g, 'bg-[#F8F9FB]'],
  [/bg-slate-900\/50/g, 'bg-[#FFFFFF]'],
  [/bg-slate-900/g, 'bg-[#FFFFFF]'],
  [/bg-slate-800\/50/g, 'bg-[#FFFFFF]'],
  [/bg-slate-800/g, 'bg-[#FFFFFF]'],
  [/bg-gray-900/g, 'bg-[#FFFFFF]'],
  [/bg-gray-800/g, 'bg-[#FFFFFF]'],
  [/bg-white\/5/g, 'bg-[#FFFFFF]'],
  [/bg-white\/10/g, 'bg-[#FFFFFF]'],
  [/bg-black\/40/g, 'bg-[#FFFFFF]'],

  // Gradients to solid primary
  [/bg-gradient-to-br from-blue-500 to-purple-600/g, 'bg-[#1D9E75]'],
  [/bg-gradient-to-r from-blue-500 to-purple-600/g, 'bg-[#1D9E75]'],
  [/bg-gradient-to-r from-blue-400 to-purple-400/g, 'bg-[#1D9E75]'],
  [/bg-gradient-to-r from-white to-white\/60/g, 'text-[#111111]'], // Used in App.tsx JobApplyAI heading
  [/bg-clip-text text-transparent/g, ''], // Remove gradient text clipping

  // Primary colors
  [/bg-blue-500\/20/g, 'bg-[#F8F9FB]'],
  [/bg-blue-500\/10/g, 'bg-[#E6F1FB]'],
  [/bg-blue-500/g, 'bg-[#1D9E75]'],
  [/bg-blue-600/g, 'bg-[#1D9E75]'],
  [/hover:bg-blue-600/g, 'hover:bg-[#0F6E56]'],
  [/text-blue-500/g, 'text-[#1D9E75]'],
  [/text-blue-400/g, 'text-[#1D9E75]'],
  [/border-blue-500/g, 'border-[#1D9E75]'],
  [/hover:text-blue-400/g, 'hover:text-[#1D9E75]'],
  [/hover:border-blue-500/g, 'hover:border-[#1D9E75]'],
  [/shadow-blue-500\/20/g, 'shadow-[#1D9E75]/20'],
  [/shadow-blue-500\/10/g, 'shadow-[#1D9E75]/10'],
  [/shadow-blue-500\/40/g, 'shadow-[#1D9E75]/40'],

  // Borders
  [/border-white\/10/g, 'border-[#E8E8E8]'],
  [/border-white\/20/g, 'border-[#E0E0E0]'],
  [/border-slate-800/g, 'border-[#E8E8E8]'],
  [/border-gray-800/g, 'border-[#E8E8E8]'],
  [/border-dashed/g, 'border-dashed border-[#E0E0E0]'],

  // Text
  [/text-white\/80/g, 'text-[#444444]'],
  [/text-white\/70/g, 'text-[#444444]'],
  [/text-white\/60/g, 'text-[#888888]'],
  [/text-white\/50/g, 'text-[#888888]'],
  [/text-white\/40/g, 'text-[#AAAAAA]'],
  [/text-white\/30/g, 'text-[#AAAAAA]'],
  [/text-white\/20/g, 'text-[#AAAAAA]'],
  [/hover:text-white\/70/g, 'hover:text-[#888888]'],
  [/hover:text-white/g, 'hover:text-[#111111]'],

  // Badges & States
  [/bg-green-500\/10/g, 'bg-[#E1F5EE]'],
  [/border-green-500\/20/g, 'border-transparent'],
  [/text-green-400/g, 'text-[#085041]'],
  [/text-green-500/g, 'text-[#1D9E75]'],
  [/bg-green-500/g, 'bg-[#1D9E75]'],
  [/border-green-500\/30/g, 'border-[#1D9E75]/30'],
  [/bg-green-500\/20/g, 'bg-[#E1F5EE]'],

  [/bg-yellow-500\/10/g, 'bg-[#FAEEDA]'],
  [/border-yellow-500\/20/g, 'border-transparent'],
  [/text-yellow-400/g, 'text-[#633806]'],

  [/bg-red-500\/10/g, 'bg-[#FCEBEB]'],
  [/bg-red-500\/20/g, 'bg-[#FCEBEB]'],
  [/border-red-500\/20/g, 'border-transparent'],
  [/border-red-500\/30/g, 'border-[#791F1F]/20'],
  [/text-red-400/g, 'text-[#791F1F]'],
  [/text-red-300/g, 'text-[#791F1F]'],
  [/hover:text-red-400/g, 'hover:text-[#791F1F]'],

  // Radius
  [/rounded-2xl/g, 'rounded-[12px]'],
  [/rounded-3xl/g, 'rounded-[12px]'],
  [/rounded-xl/g, 'rounded-[12px]'],
  [/rounded-lg/g, 'rounded-[8px]'],

  // Inputs
  [/focus:border-white\/30/g, 'focus:border-[#1D9E75]'],
  [/placeholder-white\/20/g, 'placeholder-[#AAAAAA]'],
];

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Custom logic for text-white:
    // If it's a primary button with bg-[#1D9E75], text-white is correct.
    // Let's just do global replacements first
    replacements.forEach(([regex, replacement]) => {
      content = content.replace(regex, replacement);
    });

    // Replace text-white with text-[#111111] in generic contexts
    // It's a bit risky to replace ALL text-white, but in a light theme, white text usually only appears on primary buttons.
    // For now, let's leave text-white as is, but we will change App.tsx global text color to text-[#444444].
    if (filePath.endsWith('App.tsx')) {
        content = content.replace('text-white', 'text-[#444444]');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated: ${filePath}`);
    }
  }
});
