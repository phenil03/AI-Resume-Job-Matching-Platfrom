import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, Target, Calendar, Clock, ChevronRight, GripVertical, Building2 } from 'lucide-react';

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

  const columns: { id: Job['status']; title: string }[] = [
    { id: 'applied', title: 'Applied' },
    { id: 'shortlisted', title: 'Shortlisted' },
    { id: 'interviewing', title: 'Interview Scheduled' },
    { id: 'offered', title: 'Offer / Rejected' }
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
    <div className="h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent uppercase tracking-tight">Pipeline Tracker</h2>
          <p className="text-white/40 text-sm font-medium uppercase tracking-widest mt-1">Manage your career progression</p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Add Job
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <form onSubmit={addJob} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Job Title</label>
                <input 
                  type="text" 
                  value={newJob.title}
                  onChange={e => setNewJob({...newJob, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500/50"
                  placeholder="e.g. Staff Engineer"
                  autoFocus
                />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Company</label>
                <input 
                  type="text" 
                  value={newJob.company}
                  onChange={e => setNewJob({...newJob, company: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500/50"
                  placeholder="e.g. Google"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button type="submit" className="flex-1 md:flex-none px-8 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-blue-400 transition-colors">Save</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
        {columns.map(col => (
          <div 
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, col.id)}
            className="flex flex-col gap-4 rounded-3xl bg-white/[0.02] border border-white/5 p-4 min-h-full transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{col.title}</h3>
              <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {jobs.filter(j => j.status === col.id).length}
              </span>
            </div>

            {jobs.filter(j => j.status === col.id).map((job) => (
              <motion.div
                key={job.id}
                layoutId={job.id}
                draggable
                onDragStartCapture={e => onDragStart(e, job.id)}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 cursor-grab active:cursor-grabbing group hover:bg-white/10 transition-all border-l-4 border-l-blue-500/40"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-sm leading-tight uppercase tracking-tight group-hover:text-blue-400 transition-colors">{job.title}</h4>
                  <GripVertical className="w-4 h-4 text-white/10 group-hover:text-white/30" />
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-white/50 underline decoration-white/10 underline-offset-4">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="font-bold">{job.company}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {job.date.split('-')[1]}/{job.date.split('-')[2]}
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 font-black text-xs">
                      <Target className="w-3.5 h-3.5" />
                      {job.matchScore}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {jobs.filter(j => j.status === col.id).length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                <Briefcase className="w-8 h-8 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Empty</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
