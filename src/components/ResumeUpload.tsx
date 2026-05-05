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
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FFFFFF] backdrop-blur-sm border border-[#E8E8E8] rounded-[12px] p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-[#111111] ">
            Upload Your Resume
          </h2>
          <p className="text-[#444444] text-lg">
            Start your automated job application journey by uploading your resume
          </p>
        </div>

        <motion.div
          className={`border-2 border-dashed border-[#E0E0E0] rounded-[12px] p-12 text-center transition-all ${
            dragActive 
              ? 'border-[#1D9E75] bg-[#E6F1FB]' 
              : 'border-[#E0E0E0] hover:border-[#1D9E75] hover:bg-[#FFFFFF]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
        >
          <input
            type="file"
            id="resume-upload"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleChange}
            disabled={uploading}
          />
          
          <label htmlFor="resume-upload" className="cursor-pointer">
            <motion.div
              className="w-20 h-20 mx-auto mb-6 bg-[#1D9E75] rounded-[12px] flex items-center justify-center"
              whileHover={{ rotate: 5, scale: 1.1 }}
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <Upload className="w-10 h-10" />
              )}
            </motion.div>
            
            <h3 className="text-xl font-semibold mb-2">
              {uploading ? 'Uploading...' : 'Drop your resume here'}
            </h3>
            <p className="text-[#888888] mb-4">
              or click to browse files
            </p>
            <p className="text-sm text-[#888888]">
              Supports PDF, DOC, DOCX, TXT
            </p>
          </label>
        </motion.div>

        {error && (
          <div className="mt-6 bg-[#FCEBEB] border border-[#791F1F]/20 rounded-[12px] p-4 text-center">
            <p className="text-[#791F1F]">{error}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: FileText, label: 'ATS Optimization', desc: 'Get instant score' },
            { icon: CheckCircle, label: 'Smart Matching', desc: 'Find best jobs' },
            { icon: Upload, label: 'Auto Apply', desc: 'Apply automatically' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[12px] p-4 text-center"
            >
              <feature.icon className="w-8 h-8 mx-auto mb-2 text-[#1D9E75]" />
              <h4 className="font-semibold text-sm mb-1">{feature.label}</h4>
              <p className="text-xs text-[#888888]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
