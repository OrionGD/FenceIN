import { useRef, useState } from 'react';
import { useEnrollment } from '../hooks/useEnrollment';
import { useFaceCapture } from '../hooks/useFaceCapture';
import { useLivenessDetection } from '../hooks/useLivenessDetection';
import { useEnrollmentStore } from '../store/enrollment.store';
import EnrollmentCamera from '../components/enrollment/EnrollmentCamera';
import FaceAlignmentOverlay from '../components/enrollment/FaceAlignmentOverlay';
import FaceQualityIndicator from '../components/enrollment/FaceQualityIndicator';
import LivenessIndicator from '../components/enrollment/LivenessIndicator';
import EnrollmentPreview from '../components/enrollment/EnrollmentPreview';
import EnrollmentSuccessModal from '../components/enrollment/EnrollmentSuccessModal';
import { ScanFace, UserCheck, ArrowLeft, RefreshCw, Sparkles, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerFaceEnrollmentPage() {
  const webcamRef = useRef<any>(null);
  
  const {
    pendingRequests,
    loadingRequests,
    selectedRequest,
    enrolling,
    selectRequest,
    submitEnrollment,
    refreshRequests
  } = useEnrollment();

  const {
    modelsLoaded,
    loadingModels,
    analyzeFrame,
    captureFrame
  } = useFaceCapture(webcamRef);

  const {
    checking: checkingLiveness,
    performLivenessCheck
  } = useLivenessDetection();

  const {
    quality,
    liveness,
    captureFrame: frameData,
    error,
    reset
  } = useEnrollmentStore();

  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const handleFrameAnalysis = async () => {
    await analyzeFrame();
  };

  const handleCapture = async () => {
    const isQualityPassed = await captureFrame();
    if (!isQualityPassed) return;

    const video = webcamRef.current?.video;
    if (video) {
      await performLivenessCheck(video);
    }
  };

  const handleConfirmEnrollment = async () => {
    const success = await submitEnrollment();
    if (success) {
      setSuccessModalOpen(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    selectRequest(null); // Clear selection and reset store
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col relative text-white font-sans overflow-x-hidden">
      {/* Cyber ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.06)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-bg-primary/70 backdrop-blur-xl py-6 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <Link 
            to="/security/register-worker" 
            className="p-3 bg-bg-secondary border border-brand-500/20 hover:bg-brand-900/40 rounded-2xl text-brand-200/70 hover:text-white transition-all flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-3">
            <ScanFace className="w-7 h-7 text-green-500" />
            <div>
              <h1 className="text-lg font-black tracking-wide uppercase text-white font-papyrus">Biometric Vault</h1>
              <p className="text-xs text-green-500 font-bold tracking-widest uppercase font-papyrus">Personnel Enrollment Portal</p>
            </div>
          </div>
        </div>

        <button
          onClick={refreshRequests}
          disabled={loadingRequests}
          className="p-3 rounded-2xl bg-bg-secondary border border-brand-500/20 hover:bg-brand-900/40 hover:border-emerald-500/20 text-brand-200/90 hover:text-white font-bold transition-all text-sm flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 text-green-500 ${loadingRequests ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 max-w-7xl w-full mx-auto">
        {/* Left Column: Queue selection */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-bg-secondary/40 border border-brand-500/20/80 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="font-papyrus">Pending Enrollment Queue</span>
            </h2>

            {loadingRequests ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-brand-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-brand-400/50 uppercase tracking-widest animate-pulse">Scanning Requests...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-12 text-center text-brand-400/50 space-y-2">
                <UserMinus className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs font-bold uppercase tracking-wider">No Pending Requests</p>
                <p className="text-[10px] text-slate-600 font-medium max-w-xs mx-auto">
                  New workers must register details at the kiosk tablet to enqueue their profile token.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {pendingRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => selectRequest(request.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col space-y-1.5 ${
                      selectedRequest?.id === request.id
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                        : 'bg-bg-primary/60 border-slate-850 hover:bg-bg-secondary hover:border-brand-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-black text-white">
                        {request.firstName} {request.lastName}
                      </span>
                      <span className="font-mono text-[9px] font-bold bg-bg-secondary text-brand-200/70 px-1.5 py-0.5 rounded border border-brand-500/20">
                        {request.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-brand-200/70 font-semibold uppercase tracking-wider">
                      <span>Blood: {request.bloodGroup}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-yellow-500 rounded">
                        PENDING SCAN
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected request card details */}
          {selectedRequest && (
            <div className="bg-bg-secondary/40 border border-brand-500/20/80 rounded-3xl p-6 shadow-xl backdrop-blur-xl text-left space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span>Personnel Card Detail</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-brand-400/50 uppercase tracking-widest block">Aadhaar (Govt ID)</span>
                    <span className="font-mono font-bold text-brand-100">{selectedRequest.govId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-400/50 uppercase tracking-widest block">Contact Mobile</span>
                    <span className="font-semibold text-brand-100">{selectedRequest.phone}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-400/50 uppercase tracking-widest block">Home Address</span>
                  <p className="font-semibold text-brand-200/90 leading-relaxed">{selectedRequest.address}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Center/Right Column: Live camera validation area */}
        <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Camera Widget */}
          <div className="bg-bg-secondary/40 border border-brand-500/20/80 rounded-3xl p-8 shadow-xl backdrop-blur-xl flex flex-col justify-between h-[520px] overflow-hidden relative">
            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-bg-primary/80 p-2 rounded-xl backdrop-blur-sm border border-brand-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">LIVE FEED</span>
            </div>

            {selectedRequest ? (
              <div className="flex-1 w-full max-w-[280px] mx-auto rounded-2xl border-2 border-brand-500/20/80 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex items-center justify-center">
                {frameData ? (
                  <EnrollmentPreview
                    frame={frameData}
                    onRetake={reset}
                    onSubmit={handleConfirmEnrollment}
                    loading={enrolling}
                  />
                ) : (
                  <>
                    <EnrollmentCamera
                      webcamRef={webcamRef}
                      onFrame={handleFrameAnalysis}
                      isActive={modelsLoaded && !!selectedRequest}
                    />

                    {/* Oval frame overlay */}
                    <FaceAlignmentOverlay quality={quality} />

                    {/* Capture action button */}
                    {quality?.qualityScore && quality.qualityScore > 0.8 ? (
                      <button
                        onClick={handleCapture}
                        className="absolute bottom-6 z-20 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105"
                      >
                        Capture Biometrics
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-brand-400/50 space-y-3">
                <ScanFace className="w-16 h-16 text-slate-800 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Select a pending request to scan</span>
              </div>
            )}
          </div>

          {/* Right Column Sub-widgets: Quality Indicator and Liveness safeguarding */}
          <div className="flex flex-col space-y-6 justify-between h-[520px]">
            {loadingModels ? (
              <div className="flex-1 bg-bg-secondary/40 border border-brand-500/20/80 rounded-3xl flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-2 border-brand-500/20 border-t-red-500 rounded-full animate-spin" />
                <span className="text-xs font-bold text-brand-400/50 uppercase tracking-widest">Loading Biometric Models...</span>
              </div>
            ) : (
              <>
                <FaceQualityIndicator quality={quality} />
                <LivenessIndicator liveness={liveness} checking={checkingLiveness} />
              </>
            )}

            {error && (
              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400 text-xs font-bold text-left flex items-start space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Success Modal */}
      {selectedRequest && (
        <EnrollmentSuccessModal
          isOpen={successModalOpen}
          onClose={handleCloseSuccessModal}
          workerName={`${selectedRequest.firstName} ${selectedRequest.lastName}`}
          workerRequestId={selectedRequest.id}
        />
      )}
    </div>
  );
}
