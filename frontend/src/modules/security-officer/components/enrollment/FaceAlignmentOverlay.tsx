import type { BiometricQualityMetrics } from '../../types/enrollment.types';

interface FaceAlignmentOverlayProps {
  quality: BiometricQualityMetrics | null;
}

export default function FaceAlignmentOverlay({ quality }: FaceAlignmentOverlayProps) {
  let statusText = 'Align your face within the oval';
  let statusColor = 'border-slate-700/50 text-slate-400';
  let ovalColor = 'border-slate-500/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.85)]';

  if (quality) {
    if (quality.qualityScore > 0.8) {
      statusText = 'Face aligned! Hold still...';
      statusColor = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
      ovalColor = 'border-emerald-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] shadow-emerald-500/20';
    } else if (!quality.isCentered) {
      statusText = 'Center your face in the oval';
      statusColor = 'border-amber-500/20 bg-amber-500/10 text-amber-400';
      ovalColor = 'border-amber-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.85)]';
    } else if (quality.isBlurry) {
      statusText = 'Move slowly, image is blurry';
      statusColor = 'border-amber-500/20 bg-amber-500/10 text-amber-400';
    } else if (quality.brightness < 50) {
      statusText = 'Ensure proper ambient lighting';
      statusColor = 'border-amber-500/20 bg-amber-500/10 text-amber-400';
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden z-10">
      {/* Target Oval Cutout */}
      <div 
        className={`w-52 h-72 rounded-[100px] border-4 transition-all duration-300 relative flex items-center justify-center ${ovalColor}`}
      >
        {/* Dynamic Scan Line */}
        {quality?.qualityScore && quality.qualityScore > 0.8 ? (
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-0 animate-[scan_2s_infinite] shadow-[0_0_8px_#10b981]" />
        ) : null}
      </div>

      {/* Dynamic Guideline Card */}
      <div className={`absolute bottom-6 px-5 py-2.5 rounded-full border backdrop-blur-md text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-xl ${statusColor}`}>
        {statusText}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
