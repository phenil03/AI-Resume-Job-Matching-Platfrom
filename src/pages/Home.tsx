import { motion } from 'framer-motion';
import { ArrowRight, FileText, Target, Zap, Shield, Sparkles, Briefcase, Bot, Clock, User, CheckCircle } from 'lucide-react';

interface HomeProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function Home({ onStart, onLogin }: HomeProps) {
  const stats = [
    { label: "Jobs Matched", value: "2.5M+", icon: Briefcase },
    { label: "Success Rate", value: "94%", icon: Target },
    { label: "Time Saved", value: "15hrs/wk", icon: Clock },
    { label: "Active Users", value: "50k+", icon: User },
  ];

  const steps = [
    {
      icon: FileText,
      title: "1. Upload Resume",
      desc: "Drop your PDF or Word document. Our AI instantly extracts and structures your experience."
    },
    {
      icon: Target,
      title: "2. ATS Analysis",
      desc: "Get an immediate score against top industry ATS algorithms with actionable improvements."
    },
    {
      icon: Briefcase,
      title: "3. Smart Matching",
      desc: "Our engine scans thousands of live roles to find the perfect fit for your specific skills."
    },
    {
      icon: Zap,
      title: "4. Auto Apply",
      desc: "One click applies to multiple matched roles, saving you hours of tedious form filling."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#444444] selection:bg-[#1D9E75]/30 selection:text-[#FFFFFF] overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFFFF]/80 backdrop-blur-md border-b border-[#E8E8E8]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D9E75] rounded-[12px] flex items-center justify-center shadow-lg shadow-[#1D9E75]/20">
              <Zap className="w-5 h-5 text-[#FFFFFF]" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#111111]">ResumeMatch AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-sm font-semibold text-[#444444] hover:text-[#111111] transition-colors">
              Log In
            </button>
            <button 
              onClick={onStart}
              className="px-5 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-[#FFFFFF] rounded-[8px] text-sm font-bold transition-all shadow-lg shadow-[#1D9E75]/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#1D9E75]/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[20px] bg-[#E1F5EE] border border-[#1D9E75]/20 text-[#085041] mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Next-Gen Career Automation</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-[#111111] tracking-tight leading-[1.1] mb-6"
          >
            Your career journey, <br className="hidden md:block" />
            <span className="text-[#1D9E75]">fully autonomous.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#888888] mb-10 max-w-2xl mx-auto"
          >
            Upload your resume once. Our AI optimizes it for ATS, finds the perfect roles, and applies automatically on your behalf.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-[#1D9E75] hover:bg-[#0F6E56] text-[#FFFFFF] rounded-[12px] text-base font-bold transition-all shadow-xl shadow-[#1D9E75]/20 flex items-center justify-center gap-2 group"
            >
              Start Free Analysis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-2 text-[#444444] text-sm font-medium">
              <Shield className="w-4 h-4 text-[#1D9E75]" />
              No credit card required
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Statistics */}
      <section className="border-y border-[#E8E8E8] bg-[#FFFFFF] py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto w-12 h-12 bg-[#F8F9FB] rounded-[12px] flex items-center justify-center mb-4 text-[#1D9E75]">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-[#111111] mb-1">{stat.value}</div>
                <div className="text-sm font-semibold text-[#888888] uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Step-by-Step Workflow */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-[#111111] mb-4">How It Works</h2>
          <p className="text-[#888888] max-w-xl mx-auto">Four simple steps to automate your job search and land your dream role faster than ever.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E8E8E8] hover:shadow-lg transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8F9FB] rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
              <div className="w-12 h-12 bg-[#E1F5EE] text-[#085041] rounded-[8px] flex items-center justify-center mb-6">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#111111] mb-3">{step.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Core Intelligence */}
      <section className="bg-[#FFFFFF] border-y border-[#E8E8E8] py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-black text-[#111111] mb-6">
                Powered by Advanced <br />
                <span className="text-[#1D9E75]">AI Core Intelligence</span>
              </h2>
              <p className="text-[#444444] mb-8 leading-relaxed">
                Our proprietary AI engine doesn't just keyword match. It understands context, evaluates your career trajectory, and identifies transferable skills that traditional ATS systems miss.
              </p>
              <ul className="space-y-4">
                {[
                  "Semantic skill extraction and mapping",
                  "Real-time ATS probability scoring",
                  "Automated cover letter personalization",
                  "Smart application pacing to avoid spam filters"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#111111] font-medium">
                    <div className="w-6 h-6 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-[#1D9E75]" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#1D9E75]/20 to-transparent rounded-[12px] blur-2xl -z-10" />
              <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[12px] p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-[#F8F9FB] rounded-[8px] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-[#1D9E75]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#111111]">Core Engine Status</div>
                    <div className="text-sm text-[#1D9E75] flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]"></span>
                      </span>
                      Online & Learning
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: "Parsing Accuracy", value: "99.8%", progress: "w-[99.8%]" },
                    { label: "Matching Algorithm", value: "v4.2.1", progress: "w-[85%]" },
                    { label: "Daily Applications", value: "12,450", progress: "w-[75%]" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#888888] font-medium">{item.label}</span>
                        <span className="text-[#111111] font-bold">{item.value}</span>
                      </div>
                      <div className="h-2 bg-[#F8F9FB] rounded-full overflow-hidden">
                        <div className={`h-full bg-[#1D9E75] rounded-full ${item.progress}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 text-center max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-[#111111] mb-6">Ready to upgrade your job search?</h2>
        <p className="text-[#888888] text-lg mb-10">Join thousands of professionals who have automated their way to better career opportunities.</p>
        <button 
          onClick={onStart}
          className="px-8 py-4 bg-[#1D9E75] hover:bg-[#0F6E56] text-[#FFFFFF] rounded-[12px] text-base font-bold transition-all shadow-xl shadow-[#1D9E75]/20 inline-flex items-center gap-2 group"
        >
          Get Started For Free
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#E8E8E8] py-8 text-center text-sm text-[#AAAAAA]">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} ResumeMatch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
