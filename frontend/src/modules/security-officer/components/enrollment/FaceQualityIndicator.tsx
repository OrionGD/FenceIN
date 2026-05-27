import type { BiometricQualityMetrics } from '../../types/enrollment.types';
import { ShieldCheck, Eye, Sun, UserCheck, AlertCircle } from 'lucide-react';

interface FaceQualityIndicatorProps {
  quality: BiometricQualityMetrics | null;
}

export default function FaceQualityIndicator({ quality }: FaceQualityIndicatorProps) {
  if (!quality) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 text-center text-slate-500 font-bold text-xs uppercase tracking-wider">
        Awaiting Face Detection...
      </div>
    );
  }

  const scorePct = Math.round(quality.qualityScore * 100);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Biometric Diagnostic</h3>
        <span className={`text-xs font-black px-2 py-0.5 rounded ${
          scorePct > 75 ? 'bg-brand-500/10 text-brand-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          Score: {scorePct}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Centered */}
        <div className="flex items-center space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
          <UserCheck className={`w-4 h-4 ${quality.isCentered ? 'text-brand-400' : 'text-amber-400'}`} />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alignment</span>
            <span className="font-extrabold text-slate-200 block truncate">{quality.isCentered ? 'Centered' : 'Not Centered'}</span>
          </div>
        </div>

        {/* Eyes Visible */}
        <div className="flex items-center space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
          <Eye className={`w-4 h-4 ${quality.eyesVisible ? 'text-brand-400' : 'text-brand-400'}`} />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Eyes</span>
            <span className="font-extrabold text-slate-200 block truncate">{quality.eyesVisible ? 'Visible' : 'Obstructed'}</span>
          </div>
        </div>

        {/* Lighting */}
        <div className="flex items-center space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
          <Sun className={`w-4 h-4 ${quality.brightness > 50 && quality.brightness < 210 ? 'text-brand-400' : 'text-amber-400'}`} />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lighting</span>
            <span className="font-extrabold text-slate-200 block truncate">
              {quality.brightness < 50 ? 'Too Dark' : quality.brightness > 210 ? 'Too Bright' : 'Optimal'}
            </span>
          </div>
        </div>

        {/* Sharpness */}
        <div className="flex items-center space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
          <ShieldCheck className={`w-4 h-4 ${!quality.isBlurry ? 'text-brand-400' : 'text-brand-400'}`} />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sharpness</span>
            <span className="font-extrabold text-slate-200 block truncate">{!quality.isBlurry ? 'Sharp' : 'Blurry'}</span>
          </div>
        </div>
      </div>
      
      {quality.qualityScore <= 0.7 && (
        <div className="p-3 bg-brand-950/20 rounded-xl border border-brand-500/10 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-brand-400 leading-relaxed font-semibold">
            Biometric score is below 70% threshold. Hold still and face camera directly to optimize scan.
          </p>
        </div>
      )}
    </div>
  );
}
