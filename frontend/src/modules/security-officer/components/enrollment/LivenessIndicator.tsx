import type { LivenessDiagnostic } from '../../types/enrollment.types';
import { Fingerprint, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LivenessIndicatorProps {
  liveness: LivenessDiagnostic | null;
  checking: boolean;
}

export default function LivenessIndicator({ liveness, checking }: LivenessIndicatorProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Fingerprint className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Liveness Engine</h3>
        </div>
        {checking ? (
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest animate-pulse">Running diagnostics...</span>
        ) : liveness ? (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
            liveness.passed ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-950/20 text-brand-400'
          }`}>
            {liveness.passed ? 'Passed' : 'Failed'}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idle</span>
        )}
      </div>

      {checking ? (
        <div className="py-4 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Analyzing face structures...</span>
        </div>
      ) : liveness ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">Micromovement Match</span>
            <span className="font-extrabold text-slate-200">{liveness.blinkDetected ? 'Detected' : 'Searching...'}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">Spoof Index Score</span>
            <span className="font-extrabold text-slate-200">{(liveness.spoofScore * 100).toFixed(1)}%</span>
          </div>

          {liveness.passed ? (
            <div className="p-3 bg-brand-500/5 rounded-xl border border-brand-500/10 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-brand-400 leading-relaxed font-semibold">
                Spoofing safeguard checks cleared. Liveness verification fully successful.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-brand-950/20 rounded-xl border border-brand-500/10 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-brand-400 leading-relaxed font-semibold">
                High probability of spoofing/static capture. Face must blink to clear liveness.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-2 text-center text-xs font-semibold text-slate-500">
          Waiting for face snapshot to run liveness check...
        </div>
      )}
    </div>
  );
}
