import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Target, 
  Calendar, 
  Clock, 
  GripVertical, 
  Building2, 
  Zap, 
  Info,
  CheckCircle,
  XCircle,
  TrendingUp,
  Briefcase
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  date: string;
  matchScore: number;
  status: 'applied' | 'shortlisted' | 'interviewing' | 'offered';
}

const INITIAL_JOBS: Job[] = [
  { id: '1', title: 'Senior Frontend Engineer', company: 'TechFlow', date: '2024-03-15', matchScore: 94, status: 'interviewing' },
  { id: '2', title: 'React Developer', company: 'Innovate AI', date: '2024-03-18', matchScore: 88, status: 'shortlisted' },
  { id: '3', title: 'Cloud Architect', company: 'Amazon', date: '2024-03-20', matchScore: 90, status: 'applied' }
];

export default function InterviewTracker() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', company: '' });

  const columns: { id: Job['status']; title: string, icon: any, color: string }[] = [
    { id: 'applied', title: 'Applied', icon: Briefcase, color: 'text-blue-500' },
    { id: 'shortlisted', title: 'Shortlisted', icon: TrendingUp, color: 'text-purple-500' },
    { id: 'interviewing', title: 'Interviewing', icon: Calendar, color: 'text-[#1D9E75]' },
    { id: 'offered', title: 'Offer/Final', icon: CheckCircle, color: 'text-amber-500' }
  ];

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('jobId', id);
  };

  const onDrop = (e: React.DragEvent, status: Job['status']) => {
    const jobId = e.dataTransfer.getData('jobId');
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status } : job
    ));
  };

  const addJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.company) return;
    
    const job: Job = {
      id: Date.now().toString(),
      title: newJob.title,
      company: newJob.company,
      date: new Date().toISOString().split('T')[0],
      matchScore: Math.floor(Math.random() * 20) + 75,
      status: 'applied'
    };
    
    setJobs([...jobs, job]);
    setNewJob({ title: '', company: '' });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#111111] tracking-tighter uppercase leading-none">Pipeline Tracker</h2>
          <div className="flex items-center gap-2 mt-2">
            <Info className="w-3 h-3 text-[#1D9E75]" />
            <p className="text-[10px] text-[#AAAAAA] font-black uppercase tracking-[0.2em]">Drag cards to update your career stage</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="group flex items-center gap-2 px-6 py-3 bg-[#111111] text-white rounded-[16px] text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[#1D9E75] shadow-xl shadow-black/10 active:scale-95"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Add Job Position
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D9E75]/5 rounded-full blur-3xl" />
            <form onSubmit={addJob} className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Position Title</label>
                <input 
                  type="text" 
                  value={newJob.title}
                  onChange={e => setNewJob({...newJob, title: e.target.value})}
                  className="w-full bg-[#F8F9FB] border border-[#E8E8E8] rounded-[14px] px-4 py-3 text-xs font-bold text-[#111111] focus:outline-none focus:ring-4 focus:ring-[#1D9E75]/10"
                  placeholder="e.g. Lead Developer"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Company Name</label>
                <input 
                  type="text" 
                  value={newJob.company}
                  onChange={e => setNewJob({...newJob, company: e.target.value})}
                  className="w-full bg-[#F8F9FB] border border-[#E8E8E8] rounded-[14px] px-4 py-3 text-xs font-bold text-[#111111] focus:outline-none focus:ring-4 focus:ring-[#1D9E75]/10"
                  placeholder="e.g. Google"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-[#1D9E75] text-white font-black rounded-[14px] text-[10px] uppercase tracking-widest hover:bg-[#0F6E56] transition-all shadow-lg shadow-[#1D9E75]/20">Save</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-3 bg-gray-50 text-gray-400 font-black rounded-[14px] text-[10px] uppercase hover:bg-gray-100 transition-all">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board - Compact & High Density */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
        {columns.map(col => (
          <div 
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, col.id)}
            className="flex flex-col gap-3 rounded-[24px] bg-white border border-[#E8E8E8] p-3 transition-all hover:border-[#1D9E75]/20 shadow-sm"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <div className="flex items-center gap-2">
                <col.icon className={`w-3.5 h-3.5 ${col.color}`} />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#111111]">{col.title}</h3>
              </div>
              <span className="bg-[#F8F9FB] text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-lg border border-gray-100">
                {jobs.filter(j => j.status === col.id).length}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {jobs.filter(j => j.status === col.id).map((job) => (
                  <motion.div
                    key={job.id}
                    layoutId={job.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    draggable
                    onDragStartCapture={e => onDragStart(e, job.id)}
                    className="bg-[#F8F9FB] border border-[#E8E8E8] rounded-[18px] p-4 cursor-grab active:cursor-grabbing group hover:bg-white hover:border-[#1D9E75]/30 hover:shadow-xl hover:shadow-black/[0.04] transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#1D9E75]/5 to-transparent blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <h4 className="font-black text-xs text-[#111111] leading-tight group-hover:text-[#1D9E75] transition-colors">{job.title}</h4>
                      <GripVertical className="w-4 h-4 text-gray-200 group-hover:text-gray-400 shrink-0" />
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <Building2 className="w-3 h-3" />
                        {job.company}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                        <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {job.date.split('-')[1]}/{job.date.split('-')[2]}
                        </div>
                        <div className="flex items-center gap-1 text-[#1D9E75] font-black text-[10px]">
                          <Zap className="w-3 h-3 fill-current" />
                          {job.matchScore}%
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {jobs.filter(j => j.status === col.id).length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#F0F0F0] rounded-[20px] opacity-30 grayscale">
                  <Target className="w-6 h-6 mb-2 text-gray-300" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Stationary</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
