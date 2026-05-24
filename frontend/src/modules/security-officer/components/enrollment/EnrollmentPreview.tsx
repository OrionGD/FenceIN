import { Camera } from 'lucide-react';

interface EnrollmentPreviewProps {
  frame: string | null;
  onRetake: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function EnrollmentPreview({ frame, onRetake, onSubmit, loading }: EnrollmentPreviewProps) {
  if (!frame) return null;

  return (
    <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-6">
      {/* Background Frame Preview */}
      <div className="flex-1 w-full max-w-[280px] mx-auto rounded-2xl border-2 border-slate-800 bg-slate-900 overflow-hidden relative shadow-2xl">
        <img src={frame} alt="Captured Face" className="object-cover w-full h-full" />
        
        {/* Quality overlay */}
        <div className="absolute bottom-4 left-4 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
          Verification Frame Locked
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Link Biometrics ^& Activate</span>
          )}
        </button>

        <button
          onClick={onRetake}
          disabled={loading}
          className="w-full py-3 px-4 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
        >
          <Camera className="w-5 h-5" />
          <span>Retake Capture</span>
        </button>
      </div>
    </div>
  );
}
