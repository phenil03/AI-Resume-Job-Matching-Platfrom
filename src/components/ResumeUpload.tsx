import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

interface Resume {
  id: number;
  filename: string;
  content: string;
  ats_score: number | null;
  created_at: string;
}

interface Props {
  onResumeUploaded: (resume: Resume) => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function ResumeUpload({ onResumeUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const features = [
    {
      icon: FileText,
      label: 'ATS Optimization',
      desc: 'AI-driven keyword analysis to improve Applicant Tracking System performance.'
    },
    {
      icon: CheckCircle,
      label: 'Smart Matching',
      desc: 'Skill-based job pairing tuned to real openings and cleaner recommendations.'
    },
    {
      icon: Upload,
      label: 'Auto Apply',
      desc: 'Automated submission flows for the highest-confidence opportunities.'
    }
  ];

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      console.log('Uploading file:', file.name, file.type, file.size);
      
      let content = "";
      let isBinary = false;

      if (file.type === "text/plain") {
        content = await file.text();
      } else {
        // For PDF/Binary, we send base64 to the backend
        isBinary = true;
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      console.log('Sending to API...', isBinary ? '(Binary/Base64)' : '(Text)');
      const res = await fetch(`${API_BASE}/api/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: content,
          file_type: file.type,
          is_binary: isBinary
        })
      });

      console.log('API response status:', res.status);
      
      if (res.ok) {
        const resume = await res.json();
        console.log('Resume uploaded successfully:', resume);
        onResumeUploaded(resume);
      } else {
        const errorText = await res.text();
        console.error('Upload failed:', errorText);
        setError(errorText || 'Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px]"
      >
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-[26px] font-black tracking-[-0.04em] text-[#111111]">
            Upload Your Resume
          </h2>
          <p className="text-[14px] text-[#6c7f77]">
            Start your automated job application journey by uploading your resume
          </p>
        </div>

        <motion.div
          className={`mx-auto max-w-[900px] rounded-[18px] border p-10 text-center transition-all md:p-14 ${
            dragActive 
              ? 'border-[#a8d2c3] bg-[#f8fcfa] shadow-[0_16px_36px_rgba(12,122,91,0.08)]' 
              : 'border-[#e4ebe7] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.04)] hover:border-[#c7ddd4]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          whileHover={{ y: -2 }}
        >
          <input
            type="file"
            id="resume-upload"
            className="hidden"
            accept=".pdf,.docx,.rtf,.txt"
            onChange={handleChange}
            disabled={uploading}
          />
          
          <label htmlFor="resume-upload" className="cursor-pointer">
            <motion.div
              className="mx-auto mb-8 flex h-[82px] w-[82px] items-center justify-center rounded-[14px] bg-[#dfece6] text-[#0C7A5B]"
              whileHover={{ scale: 1.04 }}
            >
              {uploading ? (
                <Loader2 className="h-9 w-9 animate-spin" />
              ) : (
                <Upload className="h-9 w-9" />
              )}
            </motion.div>
            
            <h3 className="mb-2 text-[22px] font-black tracking-[-0.03em] text-[#1d2b26] md:text-[24px]">
              {uploading ? 'Uploading...' : 'Drag and drop your file here'}
            </h3>
            <p className="mb-8 text-[13px] leading-5 text-[#7d8f88]">
              Support for PDF, DOCX, RTF, and TXT formats.
              <br />
              Max file size 10MB.
            </p>
            <span className="inline-flex min-w-[180px] items-center justify-center rounded-[8px] bg-[#086b54] px-8 py-4 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(8,107,84,0.25)] transition-transform hover:-translate-y-0.5">
              {uploading ? 'Uploading...' : 'Browse Files'}
            </span>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.24em] text-[#869a92]">
              Supports PDF, DOCX, RTF, TXT
            </p>
          </label>
        </motion.div>

        {error && (
          <div className="mt-6 rounded-[16px] border border-[#791F1F]/20 bg-[#FCEBEB] p-4 text-center">
            <p className="text-[#791F1F]">{error}</p>
          </div>
        )}

        <div className="mt-20 text-center">
          <p className="mb-8 text-[10px] font-black uppercase tracking-[0.34em] text-[#a8b8b1]">
            Included With Your Subscription
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[16px] border border-[#edf2ef] bg-white p-6 text-left shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            >
              <feature.icon className="mb-5 h-5 w-5 text-[#0C7A5B]" />
              <h4 className="mb-3 text-[18px] font-bold tracking-[-0.02em] text-[#1F2A27]">{feature.label}</h4>
              <p className="text-[13px] leading-6 text-[#76847F]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
