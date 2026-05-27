import { useState } from 'react';
import { useWorkerRegistration } from '../hooks/useWorkerRegistration';
import WorkerRegistrationForm from '../components/registration/WorkerRegistrationForm';
import RegistrationSuccessModal from '../components/registration/RegistrationSuccessModal';
import { ScanFace, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerRegistrationPage() {
  const {
    vendors,
    sites,
    shifts,
    loadingOptions,
    registering,
    result,
    error,
    registerWorker,
    resetResult
  } = useWorkerRegistration();

  const [modalOpen, setModalOpen] = useState(false);

  const handleRegister = async (data: any) => {
    try {
      const res = await registerWorker(data);
      if (res && res.success) {
        setModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetResult();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col relative overflow-x-hidden text-white font-sans">
      {/* Premium Cyber Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,255,0,0.06)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.04)_0%,transparent_50%)] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="border-b border-slate-900 bg-bg-primary/70 backdrop-blur-xl py-6 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard" 
            className="p-3 bg-bg-secondary border border-brand-500/20 hover:bg-brand-900/40 rounded-2xl text-brand-200/70 hover:text-white transition-all flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-3">
            <ClipboardCheck className="w-7 h-7 text-brand-500" />
            <div>
              <h1 className="text-lg font-black tracking-wide uppercase text-white font-papyrus">Workforce Kiosk</h1>
              <p className="text-xs text-brand-400 font-bold tracking-widest uppercase font-papyrus">Self-Onboarding Gateway</p>
            </div>
          </div>
        </div>

        <Link
          to="/security/face-enrollment"
          className="px-5 py-3 rounded-2xl bg-bg-secondary border border-brand-500/20 hover:bg-brand-900/40 hover:border-brand-500/20 text-brand-200/90 hover:text-white font-bold transition-all text-sm flex items-center space-x-2 shadow-lg"
        >
          <ScanFace className="w-5 h-5 text-brand-400" />
          <span>Face Enrollment Portal</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-8 max-w-4xl w-full mx-auto">
        <div className="w-full bg-bg-secondary/40 border border-brand-500/20/80 rounded-3xl p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-center">
          <div className="mb-10 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase font-papyrus">Worker Registration</h2>
            <p className="text-brand-200/70 mt-2 text-sm leading-relaxed font-medium">
              Self-guided check-in form for new industrial personnel. Enter your credential profile to allocate your gateway enrollment token.
            </p>
          </div>

          {loadingOptions ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
              <span className="text-xs font-bold text-brand-400/50 uppercase tracking-widest animate-pulse">Initializing Gateways...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 mb-6 rounded-2xl bg-brand-950/20 border border-brand-500/10 text-brand-400 text-sm font-semibold flex items-center justify-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <span>{error}</span>
                </div>
              )}

              <WorkerRegistrationForm
                vendors={vendors}
                sites={sites}
                shifts={shifts}
                onSubmit={handleRegister}
                loading={registering}
              />
            </>
          )}
        </div>
      </main>

      {/* Success Modal */}
      {result && (
        <RegistrationSuccessModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          workerRequestId={result.workerRequestId}
          qrCodeUrl={result.qrCodeUrl}
        />
      )}
    </div>
  );
}
