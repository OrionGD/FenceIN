import { ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnrollmentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerName: string;
  workerRequestId: string;
}

export default function EnrollmentSuccessModal({
  isOpen,
  onClose,
  workerName,
  workerRequestId
}: EnrollmentSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] text-center overflow-hidden z-10"
          >
            {/* Cyber highlights */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mx-auto w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-9 h-9 text-brand-400" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Worker Profile Activated</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Biometric template successfully bound to database account record for:
            </p>

            {/* Worker Details Badge */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mt-6 text-left space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Worker Name (ID)</span>
                <span className="text-base font-black text-white tracking-wider">
                  {workerName} <span className="font-mono text-xs text-brand-400 font-extrabold ml-1">({workerRequestId})</span>
                </span>
              </div>
              <div className="border-t border-slate-800/40 pt-2 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Account Status</span>
                  <span className="font-sans text-xs font-black text-brand-400 tracking-wider">ACTIVE</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Attendance Mode</span>
                  <span className="font-sans text-xs font-black text-brand-400 tracking-wider">ENABLED</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs font-semibold text-brand-400 uppercase tracking-widest flex items-center justify-center space-x-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              <span>Biometric Geofence Gate Synced</span>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-8 py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold transition-all shadow-[0_0_20px_rgba(13,255,0,0.2)]"
            >
              Complete Onboarding
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
