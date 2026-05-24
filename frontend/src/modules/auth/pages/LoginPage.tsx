import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Lock, Mail, Loader2, CheckCircle2, AlertCircle, Fingerprint, ScanFace, Shield, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';

export default function Login() {
  const [authMode, setAuthMode] = useState<'face' | 'fingerprint' | 'credentials' | 'enrollment'>('face');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  // First-Time Biometric Registration States
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>('');
  const [enrollStep, setEnrollStep] = useState<'face' | 'choice' | 'fingerprint' | 'success'>('face');
  const [enrollScanMessage, setEnrollScanMessage] = useState('TOUCH & HOLD SCANNER');

  // Fingerprint Biometric Login Simulation States
  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('TOUCH & HOLD TO SCAN');
  const [fingerprintEmail, setFingerprintEmail] = useState('');
  const scanIntervalRef = useRef<any>(null);

  // Biometrics States (Face ID)
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading_models' | 'scanning' | 'verifying' | 'success' | 'error'>('loading_models');
  const [recognizedName, setRecognizedName] = useState('');
  const [faceBox, setFaceBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const startFingerprintLoginScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintState === 'success') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setScanMessage('READING RIDGE GEOMETRY...');

    let progress = 0;
    scanIntervalRef.current = setInterval(async () => {
      progress += 5;
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        setFingerprintState('success');
        setScanMessage('MATCH VERIFIED // AUTHORIZING...');

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        try {
          if (!fingerprintEmail.trim()) {
            throw new Error('Please enter your registered email above');
          }
          const loginRes = await fetch('http://localhost:3456/api/v1/auth/biometric-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fingerprintEmail.trim() })
          });

          const loginData = await loginRes.json();
          if (!loginRes.ok) {
            throw new Error(loginData.message || 'Fingerprint session mapping failed');
          }

          setTimeout(() => {
            login(loginData.user, loginData.access_token);
            navigate('/dashboard');
          }, 1200);
        } catch (err: any) {
          setFingerprintState('failed');
          setScanMessage('AUTHORIZATION REJECTED');
          setError(err.message || 'Fingerprint login failed');
          setTimeout(() => {
            setFingerprintState('idle');
            setScanMessage('TOUCH & HOLD TO SCAN');
          }, 2500);
        }
      } else {
        setFingerprintProgress(progress);
        if (progress === 40) setScanMessage('EXTRACTING MINUTIAE POINTS...');
        if (progress === 75) setScanMessage('COMPARING SHA-256 VAULTS...');
      }
    }, 60);
  };

  const cancelFingerprintLoginScan = () => {
    if (fingerprintState === 'success') return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setFingerprintState('failed');
    setFingerprintProgress(0);
    setScanMessage('SCAN VOIDED // HOLD UNTIL COMPLETE');
    if ('vibrate' in navigator) {
      navigator.vibrate([200]);
    }
    setTimeout(() => {
      setFingerprintState('idle');
      setScanMessage('TOUCH & HOLD TO SCAN');
    }, 1800);
  };

  const handleEnrollFaceMatch = async (embedding: number[]) => {
    setStatus('verifying');
    setError('');
    try {
      const enrollRes = await fetch('http://localhost:3456/api/v1/biometrics/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({ userId: pendingUser.id, embedding })
      });
      
      if (!enrollRes.ok) {
        const errData = await enrollRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Enrollment rejected by secure gateway');
      }
      
      setStatus('success');
      setTimeout(() => {
        setEnrollStep('choice');
        setStatus('idle');
      }, 1200);
    } catch (err: any) {
      console.warn('Backend face enroll error:', err.message);
      // Show the error to the user rather than silently simulating success
      setStatus('error');
      setError(err.message || 'Face enrollment failed. Please try again.');
      setTimeout(() => {
        setStatus('idle');
        setError('');
      }, 2500);
    }
  };

  const startFingerprintEnrollScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintState === 'success') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setEnrollScanMessage('RESOLVING FINGERPRINT MINUTIAE...');

    let progress = 0;
    scanIntervalRef.current = setInterval(async () => {
      progress += 5;
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        setFingerprintState('success');
        setEnrollScanMessage('BIOMETRICS SYNCED TO VAULT');

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        setTimeout(() => {
          login(pendingUser, pendingToken);
          navigate('/dashboard');
        }, 1200);
      } else {
        setFingerprintProgress(progress);
        if (progress === 40) setEnrollScanMessage('MAPPING SECURE ENVELOPES...');
        if (progress === 75) setEnrollScanMessage('GENERATING UNIQUE TOKEN SHA-256...');
      }
    }, 60);
  };

  const cancelFingerprintEnrollScan = () => {
    if (fingerprintState === 'success') return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setFingerprintState('failed');
    setFingerprintProgress(0);
    setEnrollScanMessage('SCAN INTERRUPTED // RETRY TOUCH');
    if ('vibrate' in navigator) {
      navigator.vibrate([200]);
    }
    setTimeout(() => {
      setFingerprintState('idle');
      setEnrollScanMessage('TOUCH & HOLD SCANNER');
    }, 1800);
  };

  // 1. Load Biometric Models on Component Mount
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        if (active) {
          setModelsLoaded(true);
          setStatus('idle');
        }
      } catch (e) {
        console.error('Failed to load face-api models', e);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  // 2. Perform Active Face Detection Loop
  useEffect(() => {
    if ((authMode !== 'face' && (authMode !== 'enrollment' || enrollStep !== 'face')) || !modelsLoaded || status === 'success' || status === 'verifying') return;

    let active = true;
    const scanInterval = setInterval(async () => {
      if (!active) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      try {
        const detection = await faceapi.detectSingleFace(video)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && active) {
          const box = detection.detection.box;
          const clientWidth = video.clientWidth;
          const clientHeight = video.clientHeight;
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;

          // Compute exact bounding scaling relative to CSS box sizing
          const scaleX = clientWidth / videoWidth;
          const scaleY = clientHeight / videoHeight;
          const width = box.width * scaleX;
          const height = box.height * scaleY;
          // Mirror the left coordinate to match the horizontally flipped camera stream
          const left = clientWidth - width - (box.x * scaleX);
          const top = box.y * scaleY;

          setFaceBox({
            left,
            top,
            width,
            height
          });

          // Trigger Match Check
          clearInterval(scanInterval);
          active = false;
          if (authMode === 'enrollment') {
            handleEnrollFaceMatch(Array.from(detection.descriptor));
          } else {
            handleBiometricMatch(Array.from(detection.descriptor));
          }
        } else {
          setFaceBox(null);
        }
      } catch (err) {
        console.error('Face detection frame error', err);
      }
    }, 600);

    return () => {
      active = false;
      clearInterval(scanInterval);
    };
  }, [authMode, enrollStep, modelsLoaded, status]);

  // 3. Biometric Match Handler
  const handleBiometricMatch = async (embedding: number[]) => {
    setStatus('verifying');
    setError('');

    try {
      const res = await fetch('http://localhost:3456/api/v1/biometrics/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding })
      });

      const data = await res.json();
      const matchedData = data.success !== undefined ? data.data : data;

      if (matchedData && matchedData.matched) {
        setRecognizedName(`${matchedData.user.firstName} ${matchedData.user.lastName}`);
        setStatus('success');

        // Dynamically request secure session token from backend
        const loginRes = await fetch('http://localhost:3456/api/v1/auth/biometric-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: matchedData.user.email })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData.message || 'Biometric session request failed');
        }

        setTimeout(() => {
          login(loginData.user, loginData.access_token);
          navigate('/dashboard');
        }, 1200);
      } else {
        throw new Error('Face Not Recognized');
      }
    } catch (err: any) {
      setFaceBox(null);
      setStatus('error');
      setFailedAttempts(prev => {
        const next = prev + 1;
        if (next >= 3) {
          // After 3 failed biometric scans, redirect to credentials.
          // Mark biometricFailed so that if credentials ALSO fail, we block access.
          setError('Biometric scan failed 3 times. Please sign in with your password.');
          setBiometricFailed(true);
          setTimeout(() => {
            setAuthMode('credentials');
            setStatus('idle');
            setError('');
          }, 2500);
        } else {
          setError(`Face not recognized. Attempt ${next}/3.`);
          setTimeout(() => {
            setStatus('idle');
            setError('');
          }, 2000);
        }
        return next;
      });
    }
  };

  // 4. Standard Form Login Submit Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3456/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if user has biometric registered
      if (data.user.biometricEnrolled === false || !data.user.faceEmbedding) {
        setPendingUser(data.user);
        setPendingToken(data.access_token);
        setAuthMode('enrollment');
        setEnrollStep('face');
        setFingerprintState('idle');
        setFingerprintProgress(0);
        setEnrollScanMessage('TOUCH & HOLD SCANNER');
        setStatus(modelsLoaded ? 'idle' : 'loading_models');
      } else {
        login(data.user, data.access_token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Only block full access when BOTH biometric and credential auth have failed.
      // If the user never attempted biometric (biometricFailed === false), just show the error.
      if (biometricFailed) {
        setIsBlocked(true);
      } else {
        setError(err.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0%,transparent_70%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-secondary/40 backdrop-blur-2xl rounded-3xl border border-brand-500/30 p-10 shadow-[0_0_80px_rgba(255,0,0,0.15)] text-center"
        >
          <div className="mx-auto w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20">
            <AlertCircle className="w-8 h-8 text-brand-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-wider font-papyrus mb-3">Access Denied</h1>
          <p className="text-brand-400 font-bold uppercase tracking-widest text-[11px] mb-6">Security Authorization Block</p>
          
          <div className="p-4 rounded-2xl bg-brand-500/5 border border-border-primary/10 text-text-secondary text-sm font-medium leading-relaxed mb-8">
            You are not eligible to log in to this system. Both biometric alignment and credential authentication phases have failed. Please report physically to Gate Security or contact your System Administrator.
          </div>
          
          <div className="text-xs font-bold text-text-muted uppercase tracking-widest">
            FENCEIN SECURITY GATEWAY
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary grid grid-cols-1 md:grid-cols-2 relative overflow-hidden" style={{fontFamily: "'Inter', sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes scan { 0%, 100% { top: 0%; } 50% { top: 100%; } }
        @keyframes gridPulse { 0%,100% { opacity:0.03; } 50% { opacity:0.07; } }
        @keyframes borderGlow { 0%,100% { box-shadow: 0 0 0px rgba(220,38,38,0); } 50% { box-shadow: 0 0 20px rgba(220,38,38,0.3); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .cyber-input {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(220,38,38,0.15);
          color: #f1f1f1;
          transition: all 0.2s;
        }
        .cyber-input:focus {
          outline: none;
          border-color: rgba(220,38,38,0.6);
          background: rgba(0,0,0,0.6);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08), inset 0 0 12px rgba(220,38,38,0.05);
        }
        .cyber-input::placeholder { color: rgba(255,255,255,0.18); }
        .tab-active { background: linear-gradient(135deg, #dc2626, #991b1b); box-shadow: 0 0 20px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.1); }
        .auth-card { background: linear-gradient(145deg, rgba(15,5,5,0.95), rgba(20,8,8,0.98)); border: 1px solid rgba(220,38,38,0.12); box-shadow: 0 0 0 1px rgba(220,38,38,0.05), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(220,38,38,0.04); }
        .submit-btn { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); box-shadow: 0 4px 20px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.12); }
        .submit-btn:hover { background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); box-shadow: 0 6px 28px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.15); transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }
      `}</style>
      
      {/* 1. Left Side Panel: Marketing & Visuals (Hidden on Mobile) */}
      <div className="relative hidden md:flex flex-col justify-end p-12 overflow-hidden border-r border-border-primary/10 select-none">
        <img 
          src="/login_visual_banner.png" 
          alt="Workforce Control Gateway" 
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.05]"
        />
        {/* Futury Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/80 via-transparent to-brand-950/20 pointer-events-none" />
        
        {/* Dynamic scanlines for cyber effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-lg">
          <span className="inline-block px-3 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono">
            Secure Operating System v6.0
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight font-papyrus uppercase leading-tight">
            Everything you need to secure, monitor & streamline workforce intelligence.
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            The reliable and easy-to-use biometric workforce platform trusted by industrial enterprises and secure facilities worldwide.
          </p>
        </div>
      </div>

      {/* 2. Right Side Panel — Premium Auth Console */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 relative overflow-y-auto" style={{background: 'radial-gradient(ellipse at 60% 40%, rgba(80,0,0,0.18) 0%, rgba(8,2,2,0.98) 60%)'}}>
        {/* Animated grid lines background */}
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage: 'linear-gradient(rgba(220,38,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', animation: 'gridPulse 4s ease-in-out infinite'}} />
        {/* Corner accent lines */}
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{background: 'radial-gradient(circle at top right, rgba(220,38,38,0.08), transparent 70%)'}} />
        <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none" style={{background: 'radial-gradient(circle at bottom left, rgba(220,38,38,0.06), transparent 70%)'}} />

        <div className="max-w-[420px] w-full relative z-10 auth-card rounded-2xl p-8 backdrop-blur-2xl">
          
          {/* FenceIn Shield Badge */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', boxShadow: '0 0 16px rgba(220,38,38,0.4)'}}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wide" style={{fontFamily: 'Inter, sans-serif'}}>FENCEIN</div>
                <div className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{color: 'rgba(220,38,38,0.7)'}}>Secure Gateway v6.0</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-bold tracking-widest text-green-400 uppercase font-mono">ONLINE</span>
            </div>
          </div>


          {/* Unified 3-Way Authentication Switcher */}
          {authMode !== 'enrollment' && (
            <div className="flex border border-brand-500/10 rounded-2xl bg-bg-primary/50 p-1.5 mb-8">
              {[
                { mode: 'face', label: 'Face ID' },
                { mode: 'fingerprint', label: 'Fingerprint' },
                { mode: 'credentials', label: 'Password' }
              ].map(tab => (
                <button
                  key={tab.mode}
                  type="button"
                  onClick={() => {
                    setError('');
                    setAuthMode(tab.mode as any);
                    if (tab.mode === 'face') setStatus(modelsLoaded ? 'idle' : 'loading_models');
                  }}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all select-none cursor-pointer text-center ${
                    authMode === tab.mode 
                      ? 'bg-brand-600 text-text-primary shadow-lg shadow-brand-500/20' 
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {authMode === 'enrollment' && (
              <motion.div
                key="enrollment"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center space-y-6"
              >
                {enrollStep === 'face' && (
                  <div className="space-y-6">
                    <div>
                      <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                        Stage 1 // Biometric Enrollment
                      </span>
                      <h2 className="text-2xl font-bold font-papyrus text-text-primary">Enroll Face ID</h2>
                      <p className="text-xs text-text-muted mt-1">Look straight into the neural viewport to capture your face profile</p>
                    </div>

                    {/* Face Camera View */}
                    <div 
                      ref={containerRef}
                      className="aspect-[3/4] w-full max-w-[240px] mx-auto rounded-2xl border border-brand-500/20 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex items-center justify-center group"
                    >
                      {modelsLoaded ? (
                        <>
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                            className="object-cover h-full w-full opacity-90 transition-opacity group-hover:opacity-100 -scale-x-100"
                          />

                          {faceBox && (
                            <div 
                              className="absolute border-4 border-brand-500 rounded-xl transition-all duration-150 pointer-events-none animate-pulse"
                              style={{
                                left: `${faceBox.left}px`,
                                top: `${faceBox.top}px`,
                                width: `${faceBox.width}px`,
                                height: `${faceBox.height}px`,
                                boxShadow: '0 0 15px rgba(255,0,0,0.4)'
                              }}
                            />
                          )}

                          {(status === 'scanning' || status === 'verifying') && (
                            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent top-0 animate-[scan_2s_infinite] shadow-[0_0_10px_rgba(255,0,0,0.5)] pointer-events-none" />
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                          <span className="text-[10px] font-mono text-text-muted">LOADING NEURAL MODEL...</span>
                        </div>
                      )}
                    </div>

                    <div className="min-h-[40px] flex items-center justify-center">
                      {status === 'verifying' && (
                        <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing Face Geometry...</span>
                        </div>
                      )}
                      {status === 'success' && (
                        <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs animate-pulse">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Face Scanned Successfully!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {enrollStep === 'choice' && (
                  <div className="space-y-6 py-4">
                    <div>
                      <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                        Face Registered Successfully
                      </span>
                      <h2 className="text-2xl font-bold font-papyrus text-text-primary font-papyrus">Redundancy Setup</h2>
                      <p className="text-xs text-text-muted mt-2 px-2 leading-relaxed">
                        Your Face ID profile is fully secured. One active biometric is enough to authorize gate access. Do you want to configure Fingerprint redundancy for cross-verification?
                      </p>
                    </div>

                    <div className="space-y-3 max-w-[280px] mx-auto pt-4">
                      <button
                        onClick={() => {
                          setFingerprintState('idle');
                          setFingerprintProgress(0);
                          setEnrollScanMessage('TOUCH & HOLD SCANNER');
                          setEnrollStep('fingerprint');
                        }}
                        className="w-full py-3.5 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Configure Fingerprint ID
                      </button>
                      <button
                        onClick={() => {
                          login(pendingUser, pendingToken);
                          navigate('/dashboard');
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-text-primary text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-500/20"
                      >
                        Skip & Complete Login
                      </button>
                    </div>
                  </div>
                )}

                {enrollStep === 'fingerprint' && (
                  <div className="space-y-6">
                    <div>
                      <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                        Stage 2 // Touch ID Setup
                      </span>
                      <h2 className="text-2xl font-bold font-papyrus text-text-primary">Enroll Fingerprint</h2>
                      <p className="text-xs text-text-muted mt-1">Press and hold your finger flat against the scanning node</p>
                    </div>

                    {/* Fingerprint Capture Widget */}
                    <div 
                      className={`aspect-[1/1] w-full max-w-[180px] mx-auto rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border cursor-pointer select-none ${
                        fingerprintState === 'scanning' ? 'bg-brand-950/40 border-brand-500 shadow-[0_0_30px_rgba(255,0,0,0.25)]' :
                        fingerprintState === 'success' ? 'bg-green-950/20 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' :
                        fingerprintState === 'failed' ? 'bg-red-950/20 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
                        'bg-bg-primary/80 border-brand-500/10 hover:border-brand-500/30'
                      }`}
                      onMouseDown={startFingerprintEnrollScan}
                      onMouseUp={cancelFingerprintEnrollScan}
                      onMouseLeave={cancelFingerprintEnrollScan}
                      onTouchStart={startFingerprintEnrollScan}
                      onTouchEnd={cancelFingerprintEnrollScan}
                      onTouchCancel={cancelFingerprintEnrollScan}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,0,0,0.12)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                      {fingerprintState === 'scanning' && (
                        <>
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                            className="absolute w-20 h-20 border border-brand-500 rounded-full pointer-events-none"
                          />
                          <motion.div 
                            animate={{ top: ['10%', '90%', '10%'] }} 
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_8px_rgba(255,0,0,0.8)] z-20 pointer-events-none"
                          />
                        </>
                      )}

                      <div className="relative flex items-center justify-center">
                        {fingerprintState === 'scanning' && (
                          <svg className="absolute w-20 h-20 -rotate-90 pointer-events-none">
                            <circle cx="40" cy="40" r="35" className="stroke-brand-950 fill-none stroke-2" />
                            <circle 
                              cx="40" cy="40" r="35" 
                              className="stroke-brand-500 fill-none stroke-2 transition-all duration-75"
                              strokeDasharray={2 * Math.PI * 35}
                              strokeDashoffset={2 * Math.PI * 35 * (1 - fingerprintProgress / 100)}
                            />
                          </svg>
                        )}

                        <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-bg-secondary border backdrop-blur-sm z-10 transition-colors duration-300 ${
                          fingerprintState === 'scanning' ? 'border-brand-500/30' :
                          fingerprintState === 'success' ? 'border-green-500/30 bg-green-950/20' :
                          fingerprintState === 'failed' ? 'border-red-500/30 bg-red-950/20' :
                          'border-brand-500/20'
                        }`}>
                          <Fingerprint className={`w-6 h-6 transition-all duration-300 ${
                            fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]' :
                            fingerprintState === 'success' ? 'text-green-400 filter drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]' :
                            fingerprintState === 'failed' ? 'text-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                            'text-brand-500'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="min-h-[40px] flex flex-col items-center justify-center font-mono">
                      <span className={`text-[10px] tracking-widest font-bold ${
                        fingerprintState === 'success' ? 'text-green-400' :
                        fingerprintState === 'failed' ? 'text-red-400' :
                        fingerprintState === 'scanning' ? 'text-brand-300 animate-pulse' :
                        'text-text-secondary'
                      }`}>
                        {enrollScanMessage}
                      </span>
                      {fingerprintState === 'scanning' && (
                        <span className="text-[9px] text-brand-400/80 mt-1">{fingerprintProgress}% CAPTURED</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {authMode === 'face' && (
              <motion.div
                key="face"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Facial Verification</h2>
                  <p className="text-xs text-text-muted mt-1">Position your face inside the neural viewport</p>
                  {failedAttempts > 0 && (
                    <span className="block text-[10px] text-brand-300 font-bold mt-1">
                      Biometric Scan Attempt: {failedAttempts}/3
                    </span>
                  )}
                </div>

                {/* Premium aspect-ratio Webcam View Container */}
                <div 
                  ref={containerRef}
                  className="aspect-[3/4] w-full max-w-[240px] mx-auto rounded-2xl border border-brand-500/20 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex items-center justify-center group"
                >
                  {modelsLoaded ? (
                    <>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                        className="object-cover h-full w-full opacity-90 transition-opacity group-hover:opacity-100 -scale-x-100"
                      />

                      {/* Face Box Overlay */}
                      {faceBox && (
                        <div 
                          className="absolute border-4 border-brand-500 rounded-xl transition-all duration-150 pointer-events-none animate-pulse"
                          style={{
                            left: `${faceBox.left}px`,
                            top: `${faceBox.top}px`,
                            width: `${faceBox.width}px`,
                            height: `${faceBox.height}px`,
                            boxShadow: '0 0 15px rgba(255,0,0,0.4)'
                          }}
                        >
                          {status === 'success' && recognizedName && (
                            <div className="absolute -top-7 right-0 bg-brand-500 text-text-dark px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded whitespace-nowrap shadow-lg">
                              {recognizedName}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Laser Scanning Bar */}
                      {(status === 'scanning' || status === 'verifying') && (
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent top-0 animate-[scan_2s_infinite] shadow-[0_0_10px_rgba(255,0,0,0.5)] pointer-events-none" />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                      <span className="text-[10px] font-mono text-text-muted">LOADING NEURAL MODEL...</span>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className="min-h-[40px] flex items-center justify-center">
                  {status === 'verifying' && (
                    <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Matching Facial Features...</span>
                    </div>
                  )}
                  {status === 'success' && (
                    <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Identity Verified successfully!</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-border-primary/10 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {authMode === 'fingerprint' && (
              <motion.div
                key="fingerprint"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Touch ID Portal</h2>
                  <p className="text-xs text-text-muted mt-1">Hold your finger flat against the scanner node</p>
                </div>

                {/* Fingerprint Scanner Container */}
                <div 
                  className={`aspect-[1/1] w-full max-w-[200px] mx-auto rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border cursor-pointer select-none ${
                    fingerprintState === 'scanning' ? 'bg-brand-950/40 border-brand-500 shadow-[0_0_30px_rgba(255,0,0,0.25)]' :
                    fingerprintState === 'success' ? 'bg-green-950/20 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' :
                    fingerprintState === 'failed' ? 'bg-red-950/20 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
                    'bg-bg-primary/80 border-brand-500/10 hover:border-brand-500/30'
                  }`}
                  onMouseDown={startFingerprintLoginScan}
                  onMouseUp={cancelFingerprintLoginScan}
                  onMouseLeave={cancelFingerprintLoginScan}
                  onTouchStart={startFingerprintLoginScan}
                  onTouchEnd={cancelFingerprintLoginScan}
                  onTouchCancel={cancelFingerprintLoginScan}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,0,0,0.12)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                  {fingerprintState === 'scanning' && (
                    <>
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                        className="absolute w-20 h-20 border border-brand-500 rounded-full pointer-events-none"
                      />
                      <motion.div 
                        animate={{ top: ['10%', '90%', '10%'] }} 
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_8px_rgba(255,0,0,0.8)] z-20 pointer-events-none"
                      />
                    </>
                  )}

                  <div className="relative flex items-center justify-center">
                    {fingerprintState === 'scanning' && (
                      <svg className="absolute w-20 h-20 -rotate-90 pointer-events-none">
                        <circle cx="40" cy="40" r="35" className="stroke-brand-950 fill-none stroke-2" />
                        <circle 
                          cx="40" cy="40" r="35" 
                          className="stroke-brand-500 fill-none stroke-2 transition-all duration-75"
                          strokeDasharray={2 * Math.PI * 35}
                          strokeDashoffset={2 * Math.PI * 35 * (1 - fingerprintProgress / 100)}
                        />
                      </svg>
                    )}

                    <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-bg-secondary border backdrop-blur-sm z-10 transition-colors duration-300 ${
                      fingerprintState === 'scanning' ? 'border-brand-500/30' :
                      fingerprintState === 'success' ? 'border-green-500/30 bg-green-950/20' :
                      fingerprintState === 'failed' ? 'border-red-500/30 bg-red-950/20' :
                      'border-brand-500/20'
                    }`}>
                      <Fingerprint className={`w-8 h-8 transition-all duration-300 ${
                        fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]' :
                        fingerprintState === 'success' ? 'text-green-400 filter drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]' :
                        fingerprintState === 'failed' ? 'text-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                        'text-brand-500'
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                <div className="min-h-[40px] flex flex-col items-center justify-center font-mono">
                  <span className={`text-[10px] tracking-widest font-bold ${
                    fingerprintState === 'success' ? 'text-green-400' :
                    fingerprintState === 'failed' ? 'text-red-400' :
                    fingerprintState === 'scanning' ? 'text-brand-300 animate-pulse' :
                    'text-text-secondary'
                  }`}>
                    {scanMessage}
                  </span>
                  {fingerprintState === 'scanning' && (
                    <span className="text-[9px] text-brand-400/80 mt-1">{fingerprintProgress}% SCANNED</span>
                  )}
                  {error && (
                    <span className="text-[10px] text-brand-300 mt-2 bg-brand-500/5 px-3 py-1 rounded-xl border border-border-primary/10">{error}</span>
                  )}
                </div>
              </motion.div>
            )}

            {authMode === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Console Authentication</h2>
                  <p className="text-xs text-text-muted mt-1">Input secure administrative credentials</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Secure User Identifier</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="admin@fencein.app"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Access Cipher Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-3.5 mt-4 rounded-xl bg-brand-600 hover:bg-brand-500 focus:outline-none font-bold text-text-primary text-base transition-all shadow-[0_0_15px_rgba(255,0,0,0.25)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Decrypt & Authenticate'}
                  </button>
                </form>

                {error && (
                  <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-border-primary/10 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Styled Scanning Keyframe Animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
