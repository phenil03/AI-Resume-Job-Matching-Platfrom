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
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Upload Your Resume
          </h2>
          <p className="text-white/70 text-lg">
            Start your automated job application journey by uploading your resume
          </p>
        </div>

        <motion.div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
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
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
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
            <p className="text-white/60 mb-4">
              or click to browse files
            </p>
            <p className="text-sm text-white/50">
              Supports PDF, DOC, DOCX, TXT
            </p>
          </label>
        </motion.div>

        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-red-300">{error}</p>
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
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <feature.icon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <h4 className="font-semibold text-sm mb-1">{feature.label}</h4>
              <p className="text-xs text-white/60">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
