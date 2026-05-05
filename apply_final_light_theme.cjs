/**
 * Final Light Theme Application Script
 * Converts ALL remaining dark-mode Tailwind classes to the specified light theme palette.
 * Only touches color, background, border, and shadow classes. No logic, text, or layout changes.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walkDir(full, callback);
    else callback(full);
  });
}

// Ordered replacements — order matters for some overlapping patterns
const replacements = [
  // === App.tsx: Root container ===
  [/bg-\[#020617\]/g, 'bg-[#F8F9FB]'],
  [/text-white selection:bg-blue-500\/30 selection:text-blue-200/g, 'text-[#444444] selection:bg-[#1D9E75]/20 selection:text-[#111111]'],

  // === Background blobs (decorative) ===
  [/bg-blue-600\/10/g, 'bg-[#1D9E75]/5'],
  [/bg-purple-600\/10/g, 'bg-[#1D9E75]/3'],

  // === Logo icon ===
  [/bg-gradient-to-br from-blue-500 to-purple-600/g, 'bg-[#1D9E75]'],
  [/text-white fill-white\/20/g, 'text-[#FFFFFF]'],
  [/rotate-3 group-hover:rotate-12/g, 'group-hover:scale-105'],

  // === Brand name gradient ===
  [/bg-gradient-to-r from-white to-white\/60 bg-clip-text text-transparent/g, 'text-[#111111]'],
  [/bg-gradient-to-r from-white to-white\/40/g, 'text-[#111111]'],

  // === Status dot ===
  [/bg-blue-500 animate-ping/g, 'bg-[#1D9E75] animate-ping'],

  // === Subtitle / muted text ===
  [/text-white\/40/g, 'text-[#AAAAAA]'],
  [/text-white\/60/g, 'text-[#888888]'],
  [/text-white\/80/g, 'text-[#444444]'],
  [/text-white\/70/g, 'text-[#666666]'],
  [/text-white\/35/g, 'text-[#AAAAAA]'],
  [/text-white\/30/g, 'text-[#AAAAAA]'],

  // === Nav active / inactive ===
  [/text-blue-400 border-blue-500/g, 'text-[#1D9E75] border-[#1D9E75]'],
  [/border-transparent hover:text-white\/70/g, 'border-transparent hover:text-[#111111]'],
  [/border-transparent hover:text-\[#666666\]/g, 'border-transparent hover:text-[#111111]'],

  // === Bell / notification button ===
  [/bg-white\/5 border border-white\/10 rounded-xl hover:bg-white\/10 transition-all text-white\/60 hover:text-blue-400/g,
   'bg-[#FFFFFF] border border-[#E0E0E0] rounded-[8px] hover:bg-[#F8F9FB] transition-all text-[#888888] hover:text-[#1D9E75]'],

  // === Notification badge border ===
  [/border-2 border-\[#020617\]/g, 'border-2 border-[#FFFFFF]'],

  // === User info pill ===
  [/bg-white\/5 border border-white\/10 rounded-2xl/g, 'bg-[#FFFFFF] border border-[#E0E0E0] rounded-[12px]'],

  // === Avatar circle ===
  [/bg-blue-500 rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500\/20/g,
   'bg-[#1D9E75] rounded-[8px] flex items-center justify-center text-xs font-black text-[#FFFFFF] shadow-lg shadow-[#1D9E75]/20'],

  // === Logout button ===
  [/hover:bg-white\/10 rounded-lg text-white\/40 hover:text-red-400/g,
   'hover:bg-[#F8F9FB] rounded-[8px] text-[#AAAAAA] hover:text-red-500'],

  // === Sign In ghost button ===
  [/bg-white\/5 hover:bg-white\/10 border border-white\/10 rounded-xl text-sm font-bold/g,
   'bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#E0E0E0] rounded-[8px] text-sm font-bold text-[#444444]'],

  // === Progress step: active ===
  [/bg-blue-500\/20 border-2 border-blue-500 shadow-lg shadow-blue-500\/10/g,
   'bg-[#E1F5EE] border-2 border-[#1D9E75] shadow-lg shadow-[#1D9E75]/10'],

  // === Progress step: completed ===
  [/bg-green-500\/10 border border-green-500\/30 cursor-pointer hover:bg-green-500\/20/g,
   'bg-[#E1F5EE] border border-[#1D9E75]/30 cursor-pointer hover:bg-[#E1F5EE]'],

  // === Progress step: disabled ===
  [/bg-white\/5 border border-white\/10 opacity-40 cursor-not-allowed/g,
   'bg-[#F8F9FB] border border-[#E8E8E8] opacity-40 cursor-not-allowed'],

  // === Step icon: active ===
  [/bg-blue-500 shadow-lg shadow-blue-500\/40/g, 'bg-[#1D9E75] shadow-lg shadow-[#1D9E75]/30'],

  // === Step icon: completed ===
  [/bg-green-500/g, 'bg-[#1D9E75]'],

  // === Step icon: disabled ===
  [/bg-white\/10/g, 'bg-[#E8E8E8]'],

  // === Step connector line ===
  [/bg-green-500\/50/g, 'bg-[#1D9E75]/50'],
  [/bg-white\/10/g, 'bg-[#E8E8E8]'],

  // === Auth-required panel ===
  [/bg-slate-900\/50 border border-white\/10 rounded-3xl/g,
   'bg-[#FFFFFF] border border-[#E8E8E8] rounded-[12px]'],
  [/text-blue-500 mb-6/g, 'text-[#1D9E75] mb-6'],

  // === Auth-required button ===
  [/bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl/g, 'bg-[#1D9E75] rounded-[12px]'],
  [/shadow-xl shadow-blue-500\/20/g, 'shadow-xl shadow-[#1D9E75]/20'],

  // === Dashboard overlay ===
  [/bg-\[#020617\]\/95/g, 'bg-[#F8F9FB]/95'],

  // === Dashboard tab: active ===
  [/bg-blue-500 text-white shadow-xl shadow-blue-500\/20/g,
   'bg-[#1D9E75] text-[#FFFFFF] shadow-xl shadow-[#1D9E75]/20'],

  // === Dashboard tab: inactive ===
  [/bg-white\/5 border border-white\/10 text-white\/40 hover:text-white/g,
   'bg-[#FFFFFF] border border-[#E8E8E8] text-[#AAAAAA] hover:text-[#111111]'],

  // === Dashboard close button ===
  [/bg-white\/5 hover:bg-white\/10 border border-white\/10 rounded-2xl/g,
   'bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#E8E8E8] rounded-[12px]'],

  // === Auth modal backdrop ===
  [/bg-slate-950\/90/g, 'bg-black/40'],

  // === Loading spinner ===
  [/text-blue-500 animate-spin/g, 'text-[#1D9E75] animate-spin'],

  // === Various gradient buttons ===
  [/hover:from-blue-600 hover:to-purple-700/g, 'hover:bg-[#0F6E56]'],

  // === ATS score circle inner ===
  [/bg-slate-950 rounded-full/g, 'bg-[#FFFFFF] rounded-full'],

  // === ATS keyword badges (fix leftover dark text) ===
  [/text-green-300/g, 'text-[#085041]'],

  // === ATS detected domain button (leftover dark colors) ===
  [/border-cyan-400\/40 bg-cyan-400\/10 .* text-cyan-200/g, 'border-[#1D9E75]/30 bg-[#E1F5EE] text-[#085041]'],
  [/hover:border-cyan-300\/70 hover:bg-cyan-400\/15/g, 'hover:border-[#1D9E75] hover:bg-[#E1F5EE]'],

  // === ATS seniority text ===
  [/text-cyan-300\/90/g, 'text-[#1D9E75]'],
  [/text-cyan-400/g, 'text-[#1D9E75]'],

  // === ATS error panel (leftover dark text) ===
  [/text-red-200/g, 'text-[#791F1F]'],

  // === JobMatches summary banner text ===
  // (text-green-300 already handled above)

  // === AutoApply amber warning (leftover dark colors) ===
  [/text-amber-200/g, 'text-[#633806]'],
  [/text-amber-100\/80/g, 'text-[#633806]'],
  [/text-amber-300\/90/g, 'text-[#633806]'],

  // === ApplicationDashboard title gradient ===
  [/bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400/g, 'text-[#111111]'],

  // === ApplicationDashboard recruiter response bg ===
  [/bg-slate-950\/50/g, 'bg-[#F8F9FB]'],

  // === RecruiterInbox reply textarea bg ===
  [/bg-slate-950\/60/g, 'bg-[#FFFFFF]'],

  // === InterviewTracker title gradient ===
  [/from-white to-white\/40  uppercase/g, 'text-[#111111] uppercase'],

  // === Job type badges (leftover dark-mode colors) ===
  [/text-emerald-400 border-emerald-500\/30/g, 'text-[#085041] border-[#1D9E75]/30'],
  [/bg-emerald-500\/10/g, 'bg-[#E1F5EE]'],
  [/text-sky-400 border-sky-500\/30/g, 'text-[#0C447C] border-[#0C447C]/30'],
  [/bg-sky-500\/10/g, 'bg-[#E6F1FB]'],

  // === Portal colors (leftover dark mode) ===
  [/text-purple-400 border-purple-500\/30/g, 'text-purple-700 border-purple-300'],
  [/bg-purple-500\/20/g, 'bg-purple-50'],
  [/text-cyan-400 border-cyan-500\/30/g, 'text-[#0C447C] border-[#0C447C]/30'],
  [/bg-cyan-500\/20/g, 'bg-[#E6F1FB]'],
  [/text-sky-300 border-sky-500\/30/g, 'text-[#0C447C] border-[#0C447C]/30'],
  [/bg-sky-600\/20/g, 'bg-[#E6F1FB]'],
  [/text-indigo-300 border-indigo-500\/30/g, 'text-indigo-700 border-indigo-300'],
  [/bg-indigo-500\/20/g, 'bg-indigo-50'],
  [/text-orange-400 border-orange-500\/30/g, 'text-orange-700 border-orange-300'],
  [/bg-orange-500\/20/g, 'bg-orange-50'],

  // === Progress bar track backgrounds (white-on-white fix) ===
  // These are thin bars that would be invisible on white bg
  [/bg-\[#FFFFFF\] rounded-full h-2 overflow-hidden/g, 'bg-[#F0F0F0] rounded-full h-2 overflow-hidden'],
  [/bg-\[#FFFFFF\] h-1 rounded-full overflow-hidden/g, 'bg-[#F0F0F0] h-1 rounded-full overflow-hidden'],
  [/bg-\[#FFFFFF\] overflow-hidden/g, 'bg-[#F0F0F0] overflow-hidden'],
  [/bg-\[#FFFFFF\] rounded-full overflow-hidden/g, 'bg-[#F0F0F0] rounded-full overflow-hidden'],

  // === Activity sidebar line ===
  [/w-0\.5 bg-\[#FFFFFF\] rounded-full/g, 'w-0.5 bg-[#E8E8E8] rounded-full'],

  // === Fix checkbox unchecked border ===
  [/border-white\/30/g, 'border-[#E0E0E0]'],

  // === Fix leftover hover states that use white/x pattern ===
  [/hover:border-white\/30/g, 'hover:border-[#1D9E75]'],
  [/hover:border-white\/40/g, 'hover:border-[#1D9E75]'],

  // === InterviewTracker count badge ===
  [/bg-\[#FFFFFF\] text-\[#888888\] text-\[10px\] font-bold px-2 py-0\.5 rounded-full/g,
   'bg-[#F8F9FB] text-[#888888] text-[10px] font-bold px-2 py-0.5 rounded-full'],

  // === Fix ResumeUpload heading (bg-[#1D9E75] used as text color is wrong) ===
  // The heading has `bg-[#1D9E75]` with a trailing space — this was supposed to be text color
  [/className="text-3xl font-bold mb-3 bg-\[#1D9E75\] "/g, 'className="text-3xl font-bold mb-3 text-[#111111] "'],
  [/className="text-4xl font-black mb-3 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 "/g,
   'className="text-4xl font-black mb-3 text-[#111111] "'],
  [/className="text-3xl font-black bg-gradient-to-r from-white to-white\/40  uppercase tracking-tight"/g,
   'className="text-3xl font-black text-[#111111] uppercase tracking-tight"'],

  // === Fix interviewTracker decoration ===
  [/underline decoration-white\/10/g, 'underline decoration-[#E8E8E8]'],
];

let filesUpdated = 0;

walkDir(srcDir, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.css')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    filesUpdated++;
    console.log(`✓ Updated: ${path.relative(__dirname, filePath)}`);
  }
});

console.log(`\nDone. ${filesUpdated} file(s) updated.`);
