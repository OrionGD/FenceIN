import { CheckCircle2, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerRequestId: string;
  qrCodeUrl: string;
}

export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  workerRequestId,
  qrCodeUrl
}: RegistrationSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(workerRequestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Onboarding Request Created</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Please present this Enrollment Token at the Security Gate Kiosk to enroll your biometric profile.
            </p>

            {/* Token Badge */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mt-6 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Enrollment ID</span>
                <span className="font-mono text-base font-black text-emerald-400 tracking-wider">{workerRequestId}</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
              >
                {copied ? <span className="text-xs text-emerald-400 font-bold">Copied!</span> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* QR Code Container */}
            <div className="mt-8 mb-6 flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-900">
                <img src={qrCodeUrl} alt="Enrollment Token QR" className="w-36 h-36" />
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">
              PENDING SECURITY ENROLLMENT
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 py-3.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-white font-bold transition-all"
            >
              Done, close portal
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
