import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Calling backend endpoint
      const res = await fetch('http://localhost:3456/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-slate-400 mt-3 text-sm font-medium">Authenticate to access the enterprise portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3"
            >
              <div className="flex-1 text-red-400 text-sm font-medium leading-relaxed">
                {error}
              </div>
            </motion.div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400 text-slate-500">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-base"
                placeholder="admin@fencein.app"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
               <label className="text-sm font-semibold text-slate-300">Password</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400 text-slate-500">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-base"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-4 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 font-bold text-white text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Authenticate'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
