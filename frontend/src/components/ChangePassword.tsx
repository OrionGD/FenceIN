import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChangePasswordProps {
  forceMode?: boolean;
  onSuccess?: () => void;
}

export default function ChangePassword({ forceMode = false, onSuccess }: ChangePasswordProps) {
  const { token, logout, user, login } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3456/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setSuccess(true);
      
      // Update local zustand store state
      if (user) {
        login({ ...user, mustChangePassword: false }, token!);
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${forceMode ? 'p-8 bg-slate-900 border border-red-500/30 shadow-[0_0_80px_rgba(239,68,68,0.15)] rounded-3xl backdrop-blur-2xl' : 'p-6 bg-slate-900/50 border border-slate-800 rounded-2xl'}`}>
      <div className="text-center mb-6">
        <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${forceMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
          {forceMode ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
        </div>
        <h2 className="text-2xl font-black text-white font-papyrus uppercase tracking-wide">
          {forceMode ? 'Password Reset Required' : 'Change Cipher Key'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {forceMode 
            ? 'This is a secure initial login. You must update your constant temporary password before entering the console.' 
            : 'Maintain authorization protocol by regularly updating your credentials.'}
        </p>
      </div>

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6 space-y-3"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
          <span className="block text-emerald-400 font-bold text-sm tracking-wide uppercase">Credentials Decrypted & Updated</span>
          <p className="text-xs text-slate-500 font-medium">Securing gate vectors... Standby.</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">Current/Temporary Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm font-medium"
                placeholder={forceMode ? "Enter Temp@FenceIn2026" : "Current Password"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">New Access Cipher</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm font-medium"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">Verify Access Cipher</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm font-medium"
                placeholder="Confirm password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-500/5 px-3 py-2 rounded-xl border border-red-500/10 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            {forceMode && (
              <button
                type="button"
                onClick={logout}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Abort Login
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-white flex items-center justify-center ${forceMode ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.25)]'}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply New Cipher'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
