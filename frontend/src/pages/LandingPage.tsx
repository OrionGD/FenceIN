import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, BrainCircuit, Activity, Users } from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500); // 2.5s cinematic loader
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-50"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <ShieldCheck className="w-24 h-24 text-blue-500" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-blue-400 rounded-full w-32 h-32 -m-4"
              />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase"
            >
              FenceIn OS
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 text-sm text-slate-400 animate-pulse"
            >
              Initializing Security Protocols...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 flex flex-col min-h-screen"
          >
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">FenceIn</span>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto py-12 md:py-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md"
              >
                <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">System Operational v2.0</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight"
              >
                Next-Generation <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">Biometric Security</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg md:text-2xl text-slate-400 max-w-3xl mb-12 leading-relaxed font-light"
              >
                Unify your workforce management with AI-powered face recognition, offline-first geofencing, and real-time enterprise intelligence.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 w-full max-w-lg mx-auto"
              >
                <button
                  onClick={() => navigate('/login')}
                  className="group flex items-center justify-center space-x-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)] hover:-translate-y-1 w-full sm:w-auto"
                >
                  <span>Enter System</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/kiosk')}
                  className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white rounded-2xl font-bold text-lg transition-all w-full sm:w-auto hover:-translate-y-1"
                >
                  Launch Kiosk
                </button>
              </motion.div>

              {/* Feature Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full"
              >
                {[
                  { icon: BrainCircuit, title: 'AI Analytics', desc: 'Predictive fatigue tracking and actionable workforce intelligence.' },
                  { icon: Activity, title: 'Resilient Sync', desc: 'Uninterrupted operations with IndexedDB offline-first architecture.' },
                  { icon: Users, title: 'Contractor Hub', desc: 'Granular vendor, shift, and multi-tier organizational management.' },
                ].map((feat, i) => (
                  <div key={i} className="group bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm text-left hover:bg-slate-800/80 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-2">
                    <div className="bg-slate-800/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <feat.icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                    <p className="text-slate-400 text-base leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </motion.div>
            </main>
            
            <footer className="py-6 text-center text-slate-600 text-sm mt-auto">
              &copy; {new Date().getFullYear()} FenceIn Enterprise. All security protocols active.
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
