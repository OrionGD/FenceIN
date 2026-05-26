import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkerRegistration } from '../../security-officer/hooks/useWorkerRegistration';
import WorkerRegistrationForm from '../../security-officer/components/registration/WorkerRegistrationForm';
import RegistrationSuccessModal from '../../security-officer/components/registration/RegistrationSuccessModal';
import { Shield, ClipboardCheck, ArrowLeft, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignupPage() {
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
  const navigate = useNavigate();

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
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-primary grid grid-cols-1 md:grid-cols-2 relative overflow-hidden" style={{fontFamily: "'Inter', sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes gridPulse { 0%,100% { opacity:0.03; } 50% { opacity:0.07; } }
        .auth-card { background: linear-gradient(145deg, rgba(15,5,5,0.95), rgba(20,8,8,0.98)); border: 1px solid rgba(220,38,38,0.12); box-shadow: 0 0 0 1px rgba(220,38,38,0.05), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(220,38,38,0.04); }
      `}</style>

      {/* Left Column: Visual Banner */}
      <div className="relative hidden md:flex flex-col justify-end p-12 overflow-hidden border-r border-border-primary/10 select-none">
        <img 
          src="/login_visual_banner.png" 
          alt="Workforce Control Gateway" 
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/80 via-transparent to-brand-950/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-lg">
          <span className="inline-block px-3 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono">
            Secure Operating System v6.0
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight font-papyrus uppercase leading-tight">
            Streamlining Onboarding Across Diverse Industrial Vendors.
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            Register your profile to immediately allocate your corporate email identifier and secure biometric enrollment token.
          </p>
        </div>
      </div>

      {/* Right Column: Scrollable Signup Form */}
      <div className="flex flex-col items-center justify-start p-6 md:p-10 relative overflow-y-auto max-h-screen" style={{background: 'radial-gradient(ellipse at 60% 40%, rgba(80,0,0,0.18) 0%, rgba(8,2,2,0.98) 60%)'}}>
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage: 'linear-gradient(rgba(220,38,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', animation: 'gridPulse 4s ease-in-out infinite'}} />
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{background: 'radial-gradient(circle at top right, rgba(220,38,38,0.08), transparent 70%)'}} />
        <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none" style={{background: 'radial-gradient(circle at bottom left, rgba(220,38,38,0.06), transparent 70%)'}} />

        {/* Back Link */}
        <Link 
          to="/login"
          className="self-start mb-6 flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider relative z-25 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          <span>Back to Authentication Console</span>
        </Link>

        <div className="max-w-[640px] w-full relative z-10 auth-card rounded-3xl p-8 backdrop-blur-2xl mb-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', boxShadow: '0 0 16px rgba(220,38,38,0.4)'}}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wide">FENCEIN</div>
                <div className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{color: 'rgba(220,38,38,0.7)'}}>Secure Portal</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)'}}>
              <ClipboardCheck className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[9px] font-bold tracking-widest text-red-400 uppercase font-mono">WORKER REGISTRATION</span>
            </div>
          </div>

          <div className="mb-8 text-left">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase font-papyrus">Worker Onboarding</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Create your worker account. A corporate email ID ending in <span className="text-red-400 font-bold">@vendor.fencein.app</span> will be generated automatically, alongside a constant temporary password.
            </p>
          </div>

          {loadingOptions ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-2 border-slate-800 border-t-red-500 rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse font-mono">Resolving Gateways...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 mb-6 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-semibold flex items-center justify-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
      </div>

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
