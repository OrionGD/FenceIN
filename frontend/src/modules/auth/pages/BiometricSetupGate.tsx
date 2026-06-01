import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { logFrontendAction } from '@/utils/terminalLogger';
import { Camera, Fingerprint, Shield, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';

const generateProceduralFingerprint = (name: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  const cx = 128;
  const cy = 128;
  
  const seed = name.length;
  
  for (let r = 20 + (seed % 5); r < 110; r += 7) {
    ctx.beginPath();
    for (let theta = 0; theta < Math.PI * 2.1; theta += 0.05) {
      const wave = Math.sin(theta * 6 + r) * 1.5;
      const noiseX = Math.cos(theta * 3) * 0.8;
      const radius = r + wave + noiseX;
      
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius * 1.2;
      
      if (theta === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  return canvas.toDataURL('image/png');
};

export default function BiometricSetupGate() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuthStore();

  // If not logged in, boot out to login immediately
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
    }
  }, [user, token, navigate]);

  // Tab and Enrollment state
  const [activeTab, setActiveTab] = useState<'face' | 'fingerprint'>('face');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  // Face scanner states
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [faceBox, setFaceBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [latestDetection, setLatestDetection] = useState<any>(null);
  const [livenessMessage, setLivenessMessage] = useState('ALIGN YOUR FACE IN THE FRAME');

  // Load face models
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        if (active) {
          setModelsLoaded(true);
          setFaceStatus('scanning');
        }
      } catch (e) {
        console.error('Failed to load face-api models', e);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  // Face detection loop
  useEffect(() => {
    if (activeTab !== 'face' || !modelsLoaded || faceEnrolled || faceStatus === 'success' || faceStatus === 'verifying') return;

    let active = true;
    const scanInterval = setInterval(async () => {
      if (!active) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        if (detection && active) {
          setError('');
          setLatestDetection(detection);
          const box = detection.detection.box;
          const clientWidth = video.clientWidth;
          const clientHeight = video.clientHeight;
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;
          const scaleX = clientWidth / videoWidth;
          const scaleY = clientHeight / videoHeight;
          const width = box.width * scaleX;
          const height = box.height * scaleY;
          const left = clientWidth - width - (box.x * scaleX);
          const top = box.y * scaleY;
          setFaceBox({ left, top, width, height });

          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const isAligned = centerX > videoWidth * 0.25 && centerX < videoWidth * 0.75 && centerY > videoHeight * 0.2 && centerY < videoHeight * 0.8;

          if (isAligned) {
            setLivenessMessage('FACE POSITION COMPLIANT ✓ READY TO REGISTER');
          } else {
            setLivenessMessage('CENTER YOUR FACE IN THE FRAME');
          }
        } else {
          setFaceBox(null);
          setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
        }
      } catch (err) {
        console.error('Face detection error in setup gate', err);
      }
    }, 200);

    return () => {
      active = false;
      clearInterval(scanInterval);
    };
  }, [activeTab, modelsLoaded, faceEnrolled, faceStatus]);

  // Handle Face Capture & API Registration
  const captureFace = async () => {
    if (!latestDetection || !webcamRef.current) return;
    setFaceStatus('verifying');
    setLivenessMessage('EXTRACTING NEURAL DESCRIPTORS...');
    setError('');

    try {
      const base64Image = webcamRef.current.getScreenshot();
      if (!base64Image) {
        throw new Error('Webcam screenshot capture returned null.');
      }

      const res = await fetch('http://localhost:3456/api/v1/biometrics/face/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Face enrollment failed.');
      }

      setFaceEnrolled(true);
      setFaceStatus('success');
      setLivenessMessage('FACE PROFILE SECURELY LOCKED ✓');
      logFrontendAction('COMPLETED compliance Face ID onboarding.', user?.email || 'unknown');
      updateUser({ faceEnrolled: true });
    } catch (err: any) {
      setFaceStatus('error');
      setLivenessMessage('ENROLLMENT DENIED');
      setError(err.message || 'Face analysis failed.');
      logFrontendAction(`FAILED Face ID compliance onboarding: ${err.message}`, user?.email || 'unknown');
    }
  };

  // Fingerprint Scanner States
  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [fingerprintScanMessage, setFingerprintScanMessage] = useState('TOUCH & HOLD SCANNER');
  const scanIntervalRef = useRef<any>(null);

  const startFingerprintScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintEnrolled || fingerprintState === 'success') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setFingerprintScanMessage('READING RIDGE GEOMETRY...');
    setError('');

    let progress = 0;
    scanIntervalRef.current = setInterval(async () => {
      progress += 5;
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        try {
          setFingerprintScanMessage('COMPLETING TEMPLATE AUDIT...');
          const userName = (user?.firstName || 'User') + ' ' + (user?.lastName || '');
          const printImg = generateProceduralFingerprint(userName);

          const res = await fetch('http://localhost:3456/api/v1/biometrics/fingerprint/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: user?.id, image: printImg })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Fingerprint enrollment failed.');
          }

          setFingerprintEnrolled(true);
          setFingerprintState('success');
          setFingerprintScanMessage('FINGERPRINT LOCKED ✓');
          logFrontendAction('COMPLETED compliance Fingerprint onboarding.', user?.email || 'unknown');
          updateUser({ fingerprintEnrolled: true });
        } catch (err: any) {
          setFingerprintState('failed');
          setFingerprintScanMessage('REGISTRATION ERROR');
          setError(err.message || 'Fingerprint mapping failed.');
          logFrontendAction(`FAILED Fingerprint compliance onboarding: ${err.message}`, user?.email || 'unknown');
        }
      } else {
        setFingerprintProgress(progress);
        if (progress === 30) setFingerprintScanMessage('DECRYPTING VAULT KEY...');
        if (progress === 70) setFingerprintScanMessage('CHECKING MINUTIAE DENSITY...');
      }
    }, 70);
  };

  const cancelFingerprintScan = () => {
    if (fingerprintEnrolled || fingerprintState === 'success') return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setFingerprintState('failed');
    setFingerprintProgress(0);
    setFingerprintScanMessage('SCAN INTERRUPTED');
    if ('vibrate' in navigator) {
      navigator.vibrate([200]);
    }
    setTimeout(() => {
      setFingerprintState('idle');
      setFingerprintScanMessage('TOUCH & HOLD SCANNER');
    }, 1500);
  };

  // Role compliance properties
  const isCriticalRole = false; // Set to false to always enable the "Skip setup for now" option for testing

  // Handle skip action
  const handleSkip = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3456/api/v1/biometrics/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'user_skipped_compliance_gate' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Skip request rejected.');
      }

      updateUser({ biometricSkipped: true });
      logFrontendAction('SKIPPED compliance biometric setup gate (Audited event).', user?.email || 'unknown');
      
      setSuccess('Biometric compliance skipped. Redirecting to operational console...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Authorization server rejected skip bypass.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGate = () => {
    if (!faceEnrolled && !fingerprintEnrolled) return;
    setSuccess('Biometric compliance verified. Accessing Dashboard...');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgba(0,100,0,0.15)_0%,rgba(2,8,2,1)_70%)]">
      {/* Sci-fi background grid */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(13,255,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(13,255,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="max-w-[460px] w-full bg-slate-900/60 border border-brand-500/20 rounded-3xl p-8 shadow-[0_0_80px_rgba(13,255,0,0.08)] backdrop-blur-2xl relative z-10 space-y-6">
        {/* Glow border line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>

        {/* Portal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#166534] to-[#064e3b] border border-brand-500/30 shadow-[0_0_15px_rgba(13,255,0,0.25)]">
              <Shield className="w-5 h-5 text-brand-400" />
            </div>
            <div className="text-left">
              <h2 className="text-white font-extrabold text-sm tracking-wide">FENCEIN SYSTEM</h2>
              <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-brand-500">Compliance Gateway</div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[9px] font-bold text-brand-400 uppercase tracking-widest font-mono">
            Onboarding
          </div>
        </div>

        {/* Warning Notification Banner */}
        <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl flex gap-3 text-left">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">Biometric Redundancy Control</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Operational compliance policies require the mapping of Face ID or Fingerprint details to prevent keyless geofence spoofing.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 animate-pulse" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-semibold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-400 animate-bounce" />
            <span>{success}</span>
          </div>
        )}

        {/* Tabs switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('face')}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
              activeTab === 'face'
                ? 'bg-brand-600/20 border border-brand-500/40 text-brand-400 shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Face Scan {faceEnrolled ? '✓' : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fingerprint')}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
              activeTab === 'fingerprint'
                ? 'bg-brand-600/20 border border-brand-500/40 text-brand-400 shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            Fingerprint {fingerprintEnrolled ? '✓' : ''}
          </button>
        </div>

        {/* Scanner view bodies */}
        <div className="min-h-[260px] flex flex-col justify-center items-center relative py-2">
          {activeTab === 'face' && (
            <div className="space-y-5 w-full">
              {/* Webcam oval frame wrapper */}
              <div
                ref={containerRef}
                className="aspect-[3/4] w-full max-w-[190px] mx-auto rounded-3xl border-2 border-brand-500/30 bg-slate-950 overflow-hidden relative shadow-2xl flex items-center justify-center"
              >
                {modelsLoaded ? (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                      className="object-cover h-full w-full opacity-90 -scale-x-100"
                    />

                    {faceBox && (
                      <div
                        className="absolute border-[3px] border-brand-500 rounded-2xl pointer-events-none animate-pulse shadow-[0_0_15px_rgba(13,255,0,0.5)]"
                        style={{
                          left: `${faceBox.left}px`,
                          top: `${faceBox.top}px`,
                          width: `${faceBox.width}px`,
                          height: `${faceBox.height}px`
                        }}
                      />
                    )}

                    {(faceStatus === 'scanning' || faceStatus === 'verifying') && (
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent top-0 animate-[scan_2s_infinite] shadow-[0_0_10px_rgba(13,255,0,0.6)] pointer-events-none" />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                    <span className="text-[10px] font-mono text-brand-400/70 tracking-widest">LOADING VISION MODEL...</span>
                  </div>
                )}

                {faceStatus === 'verifying' && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center space-x-2 text-brand-400 font-bold text-xs p-4">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Verifying Identity...</span>
                  </div>
                )}
                
                {faceStatus === 'success' && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-2 text-green-400 font-bold text-xs p-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400 animate-bounce" />
                    <span>Face Enrolled</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center font-mono">
                <span className={`text-[10px] tracking-widest font-bold uppercase ${faceEnrolled ? 'text-green-400' : 'text-brand-300 animate-pulse'}`}>
                  {livenessMessage}
                </span>
                
                {!faceEnrolled && latestDetection && (
                  <button
                    type="button"
                    onClick={captureFace}
                    className="mt-4 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(13,255,0,0.4)] cursor-pointer"
                  >
                    Enroll Facial Scan
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'fingerprint' && (
            <div className="space-y-6 w-full flex flex-col items-center">
              {/* Fingerprint scanning pad */}
              <div
                className={`aspect-[1/1] w-full max-w-[160px] rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border cursor-pointer select-none ${
                  fingerprintState === 'scanning'
                    ? 'bg-slate-950 border-brand-500 shadow-[0_0_35px_rgba(13,255,0,0.35)] scale-[1.03]'
                    : fingerprintState === 'success'
                    ? 'bg-slate-950 border-green-500 shadow-[0_0_35px_rgba(34,197,94,0.35)]'
                    : fingerprintState === 'failed'
                    ? 'bg-slate-950 border-brand-500/50 shadow-[0_0_20px_rgba(13,255,0,0.2)]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-brand-500/30'
                }`}
                onMouseDown={startFingerprintScan}
                onMouseUp={cancelFingerprintScan}
                onMouseLeave={cancelFingerprintScan}
                onTouchStart={startFingerprintScan}
                onTouchEnd={cancelFingerprintScan}
                onTouchCancel={cancelFingerprintScan}
              >
                <div className="absolute inset-0 bg-[radial-gradient(rgba(13,255,0,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                {fingerprintState === 'scanning' && (
                  <>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                      className="absolute w-20 h-20 border border-brand-500 rounded-full pointer-events-none"
                    />
                    <motion.div
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_10px_rgba(13,255,0,0.9)] z-20 pointer-events-none"
                    />
                  </>
                )}

                <div className="relative flex items-center justify-center">
                  {fingerprintState === 'scanning' && (
                    <svg className="absolute w-20 h-20 -rotate-90 pointer-events-none">
                      <circle cx="40" cy="40" r="35" className="stroke-slate-900 fill-none stroke-2" />
                      <circle
                        cx="40" cy="40" r="35"
                        className="stroke-brand-500 fill-none stroke-2 transition-all duration-75"
                        strokeDasharray={2 * Math.PI * 35}
                        strokeDashoffset={2 * Math.PI * 35 * (1 - fingerprintProgress / 100)}
                      />
                    </svg>
                  )}

                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border backdrop-blur-sm z-10 transition-all duration-300 ${
                    fingerprintState === 'scanning'
                      ? 'border-brand-500/50 bg-brand-950/20'
                      : fingerprintState === 'success'
                      ? 'border-green-500/50 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}>
                    <Fingerprint className={`w-7 h-7 transition-all duration-300 ${
                      fingerprintState === 'scanning'
                        ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.6)]'
                        : fingerprintState === 'success'
                        ? 'text-green-400 filter drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                        : 'text-slate-600'
                    }`} />
                  </div>
                </div>
              </div>

              <div className="min-h-[40px] flex flex-col items-center justify-center font-mono">
                <span className={`text-[10px] tracking-widest font-bold uppercase ${
                  fingerprintState === 'success' ? 'text-green-400' :
                  fingerprintState === 'failed' ? 'text-brand-300 animate-pulse' :
                  fingerprintState === 'scanning' ? 'text-brand-400 animate-pulse' :
                  'text-slate-400'
                }`}>
                  {fingerprintScanMessage}
                </span>
                {fingerprintState === 'scanning' && (
                  <span className="text-[9px] text-brand-400/80 mt-1">{fingerprintProgress}% CAPTURED</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audit Status Controls & Footer Actions */}
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Security Index:</span>
            <span className="text-slate-300 font-bold uppercase tracking-wider">
              {faceEnrolled && fingerprintEnrolled
                ? 'High Redundancy ✓'
                : faceEnrolled
                ? 'Standard Face ID ✓'
                : fingerprintEnrolled
                ? 'Standard Fingerprint ✓'
                : 'NON-COMPLIANT ⚠️'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Proceed to Dashboard Button (Active only after enrollment) */}
            <button
              type="button"
              disabled={!faceEnrolled && !fingerprintEnrolled}
              onClick={handleCompleteGate}
              className="w-full flex items-center justify-center py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-900 font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_20px_rgba(13,255,0,0.15)] disabled:shadow-none"
            >
              Verify Compliance & Enter
            </button>

            {/* Audited Skip Section (For non-critical roles) */}
            {isCriticalRole ? (
              <span className="text-[10px] font-bold text-brand-300 leading-relaxed text-left block bg-brand-500/5 p-3 rounded-xl border border-brand-500/20">
                ⚠️ Administrator security policy mandates biometric profile enrollment. Skip option disabled for your role level.
              </span>
            ) : (
              <button
                type="button"
                disabled={loading || faceEnrolled || fingerprintEnrolled}
                onClick={handleSkip}
                className="w-full py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-black uppercase tracking-wider transition-all hover:bg-slate-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Skip setup for now (Audit Logged)'}
              </button>
            )}
          </div>
        </div>
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
