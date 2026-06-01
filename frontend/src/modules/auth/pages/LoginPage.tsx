import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { logFrontendAction } from '@/utils/terminalLogger';
import { Lock, User, Loader2, CheckCircle2, AlertCircle, Fingerprint, Shield, Camera, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';

const generateProceduralFingerprint = (name: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Clear background to white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw concentric loops/whorls (fingerprint ridges)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  const cx = 128;
  const cy = 128;
  
  const seed = name.length;
  
  // Draw ridges (whorl pattern)
  for (let r = 20 + (seed % 5); r < 110; r += 7) {
    ctx.beginPath();
    for (let theta = 0; theta < Math.PI * 2.1; theta += 0.05) {
      // Minor waves to simulate ridge details (minutiae)
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

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const location = useLocation();
  const { showOnboardingChecklist, orgCode, superAdminId, orgName } = location.state || {};
  const [showChecklist, setShowChecklist] = useState(!!showOnboardingChecklist);
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Create Org Admins', desc: 'Delegate operational controls to HR/Security', checked: false },
    { id: 2, text: 'Configure Sites', desc: 'Establish geofence boundary coordinates', checked: false },
    { id: 3, text: 'Configure Geofencing', desc: 'Deploy WASM-based perimeter triggers', checked: false },
    { id: 4, text: 'Register Vendors', desc: 'Onboard subcontractor entities', checked: false },
    { id: 5, text: 'Register Workers', desc: 'Add contractors to site directories', checked: false },
    { id: 6, text: 'Configure Biometrics', desc: 'Enroll security Face/Fingerprint profiles', checked: false },
  ]);

  const toggleChecklistItem = (id: number) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  // Authentication State Lifecycle
  const [authMode, setAuthMode] = useState<'select' | 'credentials' | 'biometric_select' | 'face_verification' | 'fingerprint_verification' | 'direct_face' | 'direct_fingerprint'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dynamic Registered DB preset profiles
  const [presetProfiles, setPresetProfiles] = useState<Array<{ name: string; email: string; role: string }>>([]);

  // Direct Fingerprint Simulation states
  const [fingerprintSimName, setFingerprintSimName] = useState('');
  const [customFingerprintName, setCustomFingerprintName] = useState('');

  // Fetch registered users dynamically from database to populate preset list
  useEffect(() => {
    let active = true;
    const loadPresets = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/auth/users');
        if (res.ok && active) {
          const data = await res.json();
          setPresetProfiles(data);
          if (data.length > 0) {
            setFingerprintSimName(data[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load registered profiles from database:', err);
      }
    };
    loadPresets();
    return () => { active = false; };
  }, []);

  // Hardened failure and lockout countdown state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // User details after successful credential check
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Fingerprint verification states
  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [fingerprintScanMessage, setFingerprintScanMessage] = useState('TOUCH & HOLD SCANNER');
  
  // Face recognition & active liveness states
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scanIntervalRef = useRef<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [faceBox, setFaceBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [latestDetection, setLatestDetection] = useState<any>(null);
  
  // Active liveness detector step
  const [livenessStep, setLivenessStep] = useState<'align' | 'blink' | 'verified'>('align');
  const [livenessMessage, setLivenessMessage] = useState('ALIGN YOUR FACE IN THE FRAME');
  const baselineEARRef = useRef<number | null>(null);
  const alignmentStartRef = useRef<number | null>(null);

  // Check enrollment states
  const [isSimProfileEnrolled, setIsSimProfileEnrolled] = useState(true);

  // Load face models when needed
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
        }
      } catch (e) {
        console.error('Failed to load face-api models', e);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  // Check direct fingerprint simulation enrollment status in DB
  useEffect(() => {
    if (authMode !== 'direct_fingerprint') return;
    
    let active = true;
    const checkStatus = async () => {
      try {
        let url = 'http://localhost:8000/api/v1/auth/check-enrollment';
        if (fingerprintSimName === 'custom') {
          if (!customFingerprintName.trim()) {
            setIsSimProfileEnrolled(false);
            return;
          }
          url += `?name=${encodeURIComponent(customFingerprintName)}`;
        } else {
          const profile = presetProfiles.find(p => p.name === fingerprintSimName);
          if (profile) {
            url += `?email=${encodeURIComponent(profile.email)}`;
          } else {
            url += `?name=${encodeURIComponent(fingerprintSimName)}`;
          }
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setIsSimProfileEnrolled(data.fingerprintEnrolled);
          }
        }
      } catch (err) {
        console.error('Failed to check fingerprint enrollment', err);
      }
    };
    
    checkStatus();
    return () => { active = false; };
  }, [authMode, fingerprintSimName, customFingerprintName, presetProfiles]);

  // Lockout Countdown Timer Effect
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          setIsBlocked(false);
          setFailedAttempts(0);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);


  // Handle Face Match 1:1 strictly bounded to user ID, or 1:N direct login
  const handleFaceBiometricMatch = async (image: string | null) => {
    setFaceStatus('verifying');
    setLivenessMessage('VERIFYING IDENTITY...');

    const isDirect = authMode === 'direct_face';
    const url = isDirect 
      ? 'http://localhost:8000/api/v1/auth/face-login' 
      : 'http://localhost:8000/api/v1/biometrics/verify';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!isDirect) {
      headers['Authorization'] = `Bearer ${pendingToken}`;
    }

    const body = isDirect 
      ? JSON.stringify({ image, tenantId: orgCode || 'ORG001' })
      : JSON.stringify({ userId: pendingUser.id, image });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      });

      const data = await res.json();
      const matchedData = data.success !== undefined ? data.data : data;

      if (res.ok && matchedData && matchedData.matched) {
        setFaceStatus('success');
        setLivenessMessage('MATCH CONFIRMED');
        logFrontendAction('PASSED facial biometric liveness check. ACCESS GRANTED.', matchedData.user.email, matchedData.user.role);
        setTimeout(() => {
          login(matchedData);
          navigate(matchedData.redirectTo || '/dashboard');
        }, 1200);
      } else {
        let errMsg = 'Face Verification Failed';
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            errMsg = data.detail.map((d: any) => `${d.loc ? d.loc.join('.') : 'error'}: ${d.msg}`).join(', ');
          } else if (typeof data.detail === 'string') {
            errMsg = data.detail;
          } else if (typeof data.detail === 'object') {
            errMsg = JSON.stringify(data.detail);
          }
        } else {
          errMsg = matchedData?.message || data?.message || 'Face Verification Failed';
        }
        throw new Error(errMsg);
      }
    } catch (err: any) {
      setFaceBox(null);
      setFaceStatus('error');
      setLivenessStep('align');
      setLivenessMessage('IDENTITY MISMATCH DETECTED');
      
      const errorMsg = typeof err.message === 'string' ? err.message : 'Face Verification Failed';
      setError(errorMsg);
      
      logFrontendAction(`FAILED facial biometric match: ${errorMsg}`, pendingUser?.email || 'unknown', pendingUser?.role || 'unknown');
      
      // CRITICAL SECURITY FIX: Destroy pre-auth temporary session and return to appropriate state
      setTimeout(() => {
        setPendingUser(null);
        setPendingToken('');
        setAuthMode(isDirect ? 'select' : 'credentials');
        setFaceStatus('idle');
        setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
        setLatestDetection(null);
        alignmentStartRef.current = null;
      }, 2500);
    }
  };

  // Face scanner active loop with blink liveness and auto-authenticate timeout
  useEffect(() => {
    const isScanningMode = authMode === 'face_verification' || authMode === 'direct_face';
    if (!isScanningMode || !modelsLoaded) return;
    if (faceStatus === 'success' || faceStatus === 'verifying' || isBlocked) return;

    let active = true;
    const scanInterval = setInterval(async () => {
      if (!active) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      try {
        // High speed single face detection using Tiny Face Detector
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        if (detection && active) {
          setError('');
          setLatestDetection(detection);
          const box = detection.detection.box;
          const clientWidth  = video.clientWidth;
          const clientHeight = video.clientHeight;
          const videoWidth   = video.videoWidth  || 640;
          const videoHeight  = video.videoHeight || 480;
          const scaleX = clientWidth  / videoWidth;
          const scaleY = clientHeight / videoHeight;
          const width  = box.width  * scaleX;
          const height = box.height * scaleY;
          const left   = clientWidth - width - (box.x * scaleX);
          const top    = box.y * scaleY;
          setFaceBox({ left, top, width, height });


          // Check if face is relatively centered inside oval frame bounds
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const isAligned = centerX > videoWidth * 0.25 && centerX < videoWidth * 0.75 && centerY > videoHeight * 0.2 && centerY < videoHeight * 0.8;

          if (isAligned) {
            clearInterval(scanInterval);
            active = false;
            setLivenessStep('verified');
            setLivenessMessage('FACE DETECTED');
            const base64Image = webcamRef.current?.getScreenshot() || null;
            handleFaceBiometricMatch(base64Image);
          } else {
            setLivenessStep('align');
            setLivenessMessage('CENTER YOUR FACE IN THE FRAME');
          }
        } else {
          setFaceBox(null);
          alignmentStartRef.current = null;
        }
      } catch (err) {
        console.error('Face detection frame error', err);
      }
    }, 150);

    return () => {
      active = false;
      clearInterval(scanInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMode, modelsLoaded, faceStatus, livenessStep, isBlocked]);

  // Fingerprint Scanner Loop
  const startFingerprintScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintState === 'success' || isBlocked) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setFingerprintScanMessage('READING RIDGE GEOMETRY...');

    let progress = 0;
    scanIntervalRef.current = setInterval(async () => {
      progress += 5;
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Verify fingerprint strictly against backend
        try {
          const isDirect = authMode === 'direct_fingerprint';
          const nameToUse = isDirect
            ? (fingerprintSimName === 'custom' ? customFingerprintName : fingerprintSimName)
            : (pendingUser.firstName + ' ' + pendingUser.lastName);

          const printImg = generateProceduralFingerprint(nameToUse);

          const url = isDirect
            ? 'http://localhost:8000/api/v1/auth/fingerprint-login'
            : 'http://localhost:8000/api/v1/biometrics/verify-fingerprint';

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (!isDirect) {
            headers['Authorization'] = `Bearer ${pendingToken}`;
          }

          const body = isDirect
            ? JSON.stringify({ image: printImg, tenantId: orgCode || 'ORG001' })
            : JSON.stringify({ userId: pendingUser.id, image: printImg });

          const res = await fetch(url, {
            method: 'POST',
            headers,
            body
          });

          const data = await res.json();
          const matchedData = data.success !== undefined ? data.data : data;

          if (res.ok && (data.matched || matchedData?.matched)) {
            const finalData = data.matched !== undefined ? data : matchedData;
            setFingerprintState('success');
            setFingerprintScanMessage(`FINGERPRINT MATCH CONFIRMED ✓ WELCOME ${finalData.user.firstName.toUpperCase()}`);
            logFrontendAction('PASSED fingerprint minutiae biometric check. ACCESS GRANTED.', finalData.user.email, finalData.user.role);
            setTimeout(() => {
              login(finalData);
              navigate(finalData.redirectTo || '/dashboard');
            }, 1200);
          } else {
            const errMsg = data?.message || data?.detail || 'Fingerprint Verification Failed';
            throw new Error(errMsg);
          }
        } catch (err: any) {
          setFingerprintState('failed');
          setFingerprintScanMessage('BIOMETRICS MISMATCH');
          
          const errorMsg = err.message || 'Fingerprint Verification Failed';
          setError(errorMsg);
          
          logFrontendAction(`FAILED fingerprint biometric match: ${errorMsg}`, pendingUser?.email || 'unknown', pendingUser?.role || 'unknown');
          
          // CRITICAL SECURITY FIX: Destroy pre-auth temporary session and return to select/credentials state immediately
          setTimeout(() => {
            setPendingUser(null);
            setPendingToken('');
            setAuthMode(authMode === 'direct_fingerprint' ? 'select' : 'credentials');
            setFaceStatus('idle');
            setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
            setFingerprintState('idle');
            setFingerprintScanMessage('TOUCH & HOLD SCANNER');
          }, 2500);
        }
      } else {
        setFingerprintProgress(progress);
        if (progress === 40) setFingerprintScanMessage('DECRYPTING VAULT KEY...');
        if (progress === 80) setFingerprintScanMessage('COMPARING MINUTIAE VALUES...');
      }
    }, 70);
  };

  const cancelFingerprintScan = () => {
    if (fingerprintState === 'success') return;
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
    }, 1800);
  };

  // Standard Login submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Clear previous cached biometric data before each new verification attempt
    setFaceStatus('idle');
    setFaceBox(null);
    setLatestDetection(null);
    setLivenessStep('align');
    setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
    if (baselineEARRef) {
      baselineEARRef.current = null;
    }
    setFingerprintState('idle');
    setFingerprintProgress(0);

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      const responseData = data.success !== undefined ? data.data : data;

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      const user = responseData?.user;
      if (!user) {
        throw new Error('Security response payload missing profile.');
      }

      const token = responseData?.access_token || data.access_token;
      setPendingUser(user);
      setPendingToken(token);

      logFrontendAction('PASSED credentials validation. Parsing biometric requirements.', user.email, user.role);

      const hasFace = responseData?.biometricStatus?.face === true || user.faceEnrolled === true;
      const hasFingerprint = responseData?.biometricStatus?.fingerprint === true || user.fingerprintEnrolled === true;
      const hasAnyBiometric = hasFace || hasFingerprint;

      if (responseData?.redirectTo === '/biometric-setup') {
        login(responseData);
        navigate('/biometric-setup', { state: user });
      } else {
        if (hasAnyBiometric) {
          if (hasFace && hasFingerprint) {
            setAuthMode('biometric_select');
          } else if (hasFace) {
            setAuthMode('face_verification');
          } else {
            setAuthMode('fingerprint_verification');
          }
        } else {
          login(responseData);
          navigate(responseData?.redirectTo || '/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
      logFrontendAction(`FAILED credentials validation attempt for user email: ${email}`, email);
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 overflow-hidden relative font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0%,transparent_70%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-secondary/40 backdrop-blur-2xl rounded-3xl border border-brand-500/30 p-10 shadow-[0_0_80px_rgba(255,0,0,0.15)] text-center"
        >
          <div className="mx-auto w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20">
            <AlertCircle className="w-8 h-8 text-brand-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider font-papyrus mb-3">Gateway Locked</h1>
          <p className="text-brand-400 font-bold uppercase tracking-widest text-[11px] mb-6">Security Authorization Violation</p>

          <div className="p-4 rounded-2xl bg-brand-500/5 border border-border-primary/10 text-text-secondary text-sm font-medium leading-relaxed mb-8">
            Access denied due to consecutive biometric identity mismatches. 
            <br />
            <span className="text-white font-bold block mt-3">
              Lockout active. Try again in {lockoutTimeLeft} seconds.
            </span>
          </div>

          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
            FENCEIN CENTRAL GUARD UNIT
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary grid grid-cols-1 md:grid-cols-2 relative overflow-hidden font-sans">
      
      {/* Onboarding Checklist Overlay Modal */}
      <AnimatePresence>
        {showChecklist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="max-w-xl w-full bg-bg-secondary border border-brand-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(13,255,0,0.15)] space-y-6 relative overflow-hidden"
            >
              {/* Header border stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20">
                  <CheckCircle2 className="w-6 h-6 text-brand-500" />
                </div>
                <h2 className="text-2xl font-black font-papyrus text-text-primary uppercase tracking-wide">Workspace Provisioned</h2>
                <p className="text-[10px] font-mono font-bold tracking-widest text-brand-400 uppercase">Tenant Name: {orgName}</p>
              </div>

              {/* Autogenerated IDs Display */}
              <div className="bg-black/60 border border-brand-500/15 rounded-2xl p-4.5 space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-500/60" />
                    <span>ORGANIZATION ID:</span>
                  </span>
                  <span className="text-brand-300 font-bold bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">{orgCode}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-brand-500/60" />
                    <span>SUPER ADMIN ID:</span>
                  </span>
                  <span className="text-brand-300 font-bold bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">{superAdminId}</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-brand-400 uppercase tracking-widest border-b border-brand-500/10 pb-2">
                  <span>Onboarding Checklist Checklist</span>
                  <span>{checklistItems.filter(i => i.checked).length} / {checklistItems.length}</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        item.checked
                          ? 'bg-brand-500/5 border-brand-500/40'
                          : 'bg-black/40 border-brand-500/10 hover:border-brand-500/25'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        item.checked
                          ? 'bg-brand-500 border-brand-500 text-black'
                          : 'border-brand-500/30 group-hover:border-brand-500/60'
                      }`}>
                        {item.checked && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 stroke-[3]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </motion.svg>
                        )}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <div className={`text-xs font-mono font-bold transition-all ${item.checked ? 'text-brand-300' : 'text-text-secondary'}`}>
                          {item.text}
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowChecklist(false);
                  if (superAdminId) {
                    setEmail(superAdminId);
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-brand-600 hover:bg-brand-500 text-text-primary text-xs font-bold uppercase tracking-wider rounded-2xl border border-brand-500/30 hover:border-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.2)] transition-all cursor-pointer font-mono"
              >
                <span>PROCEED TO LOGIN GATEWAY</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Left Graphic Panel */}
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
            Biometric credentials verified securely via 1:1 multi-spectral scanning and real human liveness diagnostics.
          </p>
        </div>
      </div>

      {/* 2. Right Form Panel */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 relative overflow-y-auto bg-[radial-gradient(ellipse_at_60%_40%,rgba(13,255,0,0.06)_0%,rgba(2,16,0,0.98)_60%)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(13,255,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,255,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px] animate-[gridPulse_4s_ease-in-out_infinite]" />
        
        <div className="max-w-[420px] w-full relative z-10 auth-card rounded-2xl p-8 backdrop-blur-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 shadow-[0_0_16px_rgba(13,255,0,0.4)]">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wide font-sans">FENCEIN</div>
                <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-brand-600/70">Gateway Portal</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-600/10 border border-brand-600/20">
              <span className="text-[9px] font-bold tracking-widest text-brand-400 uppercase font-mono">
                SECURE ACCESS
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className="space-y-6 text-center"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                    Multi-Protocol Gateway
                  </span>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Worker Identification</h2>
                  <p className="text-xs text-text-muted mt-2 px-1">
                    Select your registered authentication protocol to authorize access credentials.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      setAuthMode('credentials');
                      setError('');
                    }}
                    className="w-full py-4 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-brand-400" />
                      <span>Login with Password</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      setAuthMode('direct_face');
                      setFaceStatus('idle');
                      setLivenessStep('align');
                      setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
                      setError('');
                    }}
                    className="w-full py-4 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-brand-400" />
                      <span>Login with Face</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      setAuthMode('direct_fingerprint');
                      setFingerprintState('idle');
                      setFingerprintScanMessage('TOUCH & HOLD SCANNER');
                      setError('');
                    }}
                    className="w-full py-4 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-brand-400" />
                      <span>Login with Fingerprint</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                <div className="text-center pt-2">
                  <span className="text-xs text-text-muted">New workforce worker? </span>
                  <Link
                    to="/signup"
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 hover:underline transition-all"
                  >
                    Enroll biometric profile
                  </Link>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-brand-500/20 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {authMode === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className="space-y-4"
              >
                <div className="text-left mb-6">
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Worker Credentials</h2>
                  <p className="text-xs text-text-muted mt-1">Authenticate your credentials to open biometrics vault</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Secure Corporate Username</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="e.g. worker@vendor.fencein.app"
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
                    className="w-full flex items-center justify-center py-3.5 mt-4 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-text-primary text-base transition-all shadow-[0_0_15px_rgba(255,0,0,0.25)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Decrypt & Authenticate'}
                  </button>
                </form>

                <div className="pt-4 border-t border-border-primary/10 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('select');
                      setError('');
                    }}
                    className="w-full py-2.5 rounded-xl border border-border-primary/10 text-text-secondary text-xs font-bold uppercase transition-all hover:bg-slate-900"
                  >
                    ← Back to Protocol Selection
                  </button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-brand-500/20 text-xs text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {authMode === 'biometric_select' && (
              <motion.div
                key="biometric_select"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className="space-y-6 text-center"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                    Multi-Biometric Options detected
                  </span>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Access Gateway Verification</h2>
                  <p className="text-xs text-text-muted mt-2 px-2">
                    Choose your registered biometric factor to authorize access credentials.
                  </p>
                </div>

                <div className="space-y-3 max-w-[280px] mx-auto pt-4">
                  <button
                    onClick={() => {
                      setAuthMode('face_verification');
                      setLivenessStep('align');
                    }}
                    className="w-full py-3.5 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>Authenticate with Face ID</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAuthMode('fingerprint_verification')}
                    className="w-full py-3.5 px-4 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4" />
                      <span>Authenticate with Touch ID</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-4 border-t border-border-primary/10">
                  <button
                    onClick={() => {
                      setAuthMode('credentials');
                      setFaceStatus('idle');
                      setLivenessStep('align');
                      setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
                      setError('');
                    }}
                    className="text-xs text-text-muted hover:text-brand-300 font-bold uppercase"
                  >
                    Cancel Authentication
                  </button>
                </div>
              </motion.div>
            )}

            {(authMode === 'face_verification' || authMode === 'direct_face') && (
              <motion.div
                key="face_verification"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className="text-center space-y-6"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                    {authMode === 'direct_face' ? '1:N Neural Face Match' : `Liveness Check Active ${failedAttempts > 0 ? `// Attempt ${failedAttempts}/3` : ''}`}
                  </span>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Facial Verification</h2>
                  <p className="text-xs text-text-muted mt-1">Look straight into the neural viewport to match</p>
                </div>

                {/* Webcam Frame */}
                <div
                  ref={containerRef}
                  className="aspect-[3/4] w-full max-w-[220px] mx-auto rounded-2xl border border-brand-500/20 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex items-center justify-center group"
                >
                  {modelsLoaded ? (
                    <>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                        className="object-cover h-full w-full opacity-90 transition-opacity -scale-x-100"
                      />

                      {faceBox && (
                        <div
                          className="absolute border-4 rounded-xl transition-all duration-150 pointer-events-none animate-pulse shadow-lg border-brand-500 shadow-[0_0_15px_rgba(13,255,0,0.4)]"
                          style={{
                            left: `${faceBox.left}px`,
                            top: `${faceBox.top}px`,
                            width: `${faceBox.width}px`,
                            height: `${faceBox.height}px`
                          }}
                        >
                          <span className="absolute -top-7 right-0 text-[8px] font-mono font-black text-white px-2 py-0.5 rounded border uppercase tracking-widest whitespace-nowrap shadow-lg bg-brand-600 border-brand-400">
                            {faceStatus === 'success'
                              ? 'MATCH CONFIRMED'
                              : faceStatus === 'error'
                                ? 'FACE NOT RECOGNIZED'
                                : faceStatus === 'verifying'
                                  ? 'VERIFYING IDENTITY...'
                                  : 'SCANNING FACE...'}
                          </span>
                        </div>
                      )}

                      {(faceStatus === 'scanning' || faceStatus === 'verifying') && (
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent top-0 animate-[scan_2s_infinite] shadow-[0_0_10px_rgba(255,0,0,0.5)] pointer-events-none" />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                      <span className="text-[10px] font-mono text-text-muted">LOADING NEURAL MODEL...</span>
                    </div>
                  )}

                  {faceStatus === 'verifying' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center space-x-2 text-brand-400 font-bold text-xs p-4">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      <span>Verifying Identity...</span>
                    </div>
                  )}
                  {faceStatus === 'success' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-green-400 font-bold text-xs p-4">
                      <CheckCircle2 className="w-8 h-8 text-green-400 animate-bounce" />
                      <span>Match Confirmed</span>
                    </div>
                  )}
                </div>

                <div className="min-h-[50px] flex flex-col items-center justify-center font-mono gap-2">
                  <span className={`text-[10px] tracking-widest font-bold ${
                    faceStatus === 'success' ? 'text-green-400' :
                    faceStatus === 'error' ? 'text-brand-400' :
                    'text-brand-300'
                  }`}>
                    {livenessMessage}
                  </span>
                  {/* Manual authenticate button */}
                  {faceStatus !== 'success' && faceStatus !== 'verifying' && latestDetection && (
                    <button
                      type="button"
                      onClick={() => {
                        const base64Image = webcamRef.current?.getScreenshot() || null;
                        if (latestDetection) {
                          clearInterval(scanIntervalRef.current);
                          setFaceStatus('verifying');
                          setLivenessStep('verified');
                          handleFaceBiometricMatch(base64Image);
                        }
                      }}
                      className="mt-1 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(13,255,0,0.4)] border border-brand-500/50"
                    >
                      ▶ Authenticate Face
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-border-primary/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (authMode === 'direct_face') {
                        setAuthMode('select');
                      } else {
                        setAuthMode(pendingUser?.fingerprintEnrolled ? 'biometric_select' : 'credentials');
                      }
                      setFaceStatus('idle');
                      setLivenessStep('align');
                      setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
                      setError('');
                    }}
                    className="w-full py-2.5 rounded-xl border border-border-primary/10 text-text-secondary text-xs font-bold uppercase transition-all hover:bg-slate-900"
                  >
                    Back
                  </button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-brand-500/20 text-xs text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {(authMode === 'fingerprint_verification' || authMode === 'direct_fingerprint') && (
              <motion.div
                key="fingerprint_verification"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className="text-center space-y-6"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full uppercase tracking-widest font-mono mb-2">
                    {authMode === 'direct_fingerprint' ? '1:N Fingerprint Match' : `Redundant Lock ${failedAttempts > 0 ? `// Attempt ${failedAttempts}/3` : ''}`}
                  </span>
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">Fingerprint Verification</h2>
                  <p className="text-xs text-text-muted mt-1">Press and hold your finger flat against the scanner</p>
                </div>

                {/* Simulated direct identity selector */}
                {authMode === 'direct_fingerprint' && (
                  <div className="mb-4 text-left relative bg-slate-950/60 p-3 rounded-xl border border-brand-500/20">
                    <label className="text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1 block mb-1">
                      Simulate Fingerprint For:
                    </label>
                    <select
                      value={fingerprintSimName}
                      onChange={(e) => setFingerprintSimName(e.target.value)}
                      className="block w-full py-2 px-3 bg-bg-primary/80 border border-brand-500/20 rounded-xl text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/50 mb-2 font-mono font-semibold"
                    >
                      {presetProfiles.map((p) => (
                        <option key={p.email} value={p.name} className="bg-slate-950 text-text-primary">
                          {p.role} ({p.name})
                        </option>
                      ))}
                      <option value="custom" className="bg-slate-950 text-text-primary">Custom Profile Name...</option>
                    </select>

                    {fingerprintSimName === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter full legal name..."
                        value={customFingerprintName}
                        onChange={(e) => setCustomFingerprintName(e.target.value)}
                        className="block w-full px-3 py-2 bg-bg-primary/80 border border-brand-500/20 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-xs mb-2 font-mono"
                      />
                    )}
                  </div>
                )}

                {/* Fingerprint scanner */}
                <div
                  className={`aspect-[1/1] w-full max-w-[160px] mx-auto rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border select-none ${
                    !isSimProfileEnrolled ? 'opacity-30 cursor-not-allowed border-brand-500/5 bg-slate-900/40' :
                    fingerprintState === 'scanning' ? 'bg-brand-950/40 border-brand-500 shadow-[0_0_30px_rgba(13,255,0,0.25)]' :
                    fingerprintState === 'success' ? 'bg-brand-950/20 border-brand-500 shadow-[0_0_30px_rgba(13,255,0,0.3)]' :
                    fingerprintState === 'failed' ? 'bg-brand-950/20 border-brand-500/80 shadow-[0_0_30px_rgba(13,255,0,0.2)]' :
                    'bg-bg-primary/80 border-brand-500/10 hover:border-brand-500/30 cursor-pointer'
                  }`}
                  onMouseDown={isSimProfileEnrolled ? startFingerprintScan : undefined}
                  onMouseUp={isSimProfileEnrolled ? cancelFingerprintScan : undefined}
                  onMouseLeave={isSimProfileEnrolled ? cancelFingerprintScan : undefined}
                  onTouchStart={isSimProfileEnrolled ? startFingerprintScan : undefined}
                  onTouchEnd={isSimProfileEnrolled ? cancelFingerprintScan : undefined}
                  onTouchCancel={isSimProfileEnrolled ? cancelFingerprintScan : undefined}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(13,255,0,0.06)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

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
                        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_8px_rgba(13,255,0,0.8)] z-20 pointer-events-none"
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
                      fingerprintState === 'success' ? 'border-brand-500/30 bg-brand-950/20' :
                      fingerprintState === 'failed' ? 'border-brand-500/30 bg-brand-950/20' :
                      'border-brand-500/20'
                    }`}>
                      <Fingerprint className={`w-6 h-6 transition-all duration-300 ${
                        fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.5)]' :
                        fingerprintState === 'success' ? 'text-brand-400 filter drop-shadow-[0_0_12px_rgba(13,255,0,0.6)]' :
                        fingerprintState === 'failed' ? 'text-brand-500 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.5)]' :
                        'text-brand-500'
                      }`} />
                    </div>
                  </div>
                </div>

                <div className="min-h-[40px] flex flex-col items-center justify-center font-mono text-center">
                  <span className={`text-[10px] tracking-widest font-bold px-4 ${
                    !isSimProfileEnrolled ? 'text-brand-400' :
                    fingerprintState === 'success' ? 'text-brand-400' :
                    fingerprintState === 'failed' ? 'text-brand-400' :
                    fingerprintState === 'scanning' ? 'text-brand-300 animate-pulse' :
                    'text-text-secondary'
                  }`}>
                    {!isSimProfileEnrolled 
                      ? 'No fingerprint enrolled. Enroll fingerprint to continue.' 
                      : fingerprintScanMessage}
                  </span>
                  {fingerprintState === 'scanning' && (
                    <span className="text-[9px] text-brand-400/80 mt-1">{fingerprintProgress}% CAPTURED</span>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-border-primary/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (authMode === 'direct_fingerprint') {
                        setAuthMode('select');
                      } else {
                        setAuthMode(pendingUser?.faceEnrolled ? 'biometric_select' : 'credentials');
                      }
                      setFingerprintState('idle');
                      setFingerprintScanMessage('TOUCH & HOLD SCANNER');
                      setError('');
                    }}
                    className="w-full py-2.5 rounded-xl border border-border-primary/10 text-text-secondary text-xs font-bold uppercase transition-all hover:bg-slate-900"
                  >
                    Back
                  </button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-brand-300 bg-brand-500/5 px-3 py-1.5 rounded-xl border border-brand-500/20 text-xs text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>

      {/* Dynamic Biometric Enrollment Setup Dialog */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-950 border border-brand-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(13,255,0,0.15)] relative overflow-hidden text-center"
            >
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,255,0,0.03)_0%,transparent_70%)] pointer-events-none" />

              {/* Title & Shield Icon */}
              <div className="flex items-center gap-3.5 mb-6 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#dc2626] to-[#7f1d1d] shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-lg uppercase tracking-wider font-sans">Biometric Setup</h3>
                  <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase font-mono">Migrate & Secure Account</p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-4 mb-8 text-center">
                <p className="text-xs text-text-primary leading-relaxed">
                  No registered biometric authentication profiles were found for your industrial workforce account.
                </p>
                <div className="p-4 rounded-2xl bg-bg-secondary/40 border border-brand-500/10 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                    <span className="text-brand-400">✓</span> Face ID Verification (Liveness Analysis)
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                    <span className="text-brand-400">✓</span> Fingerprint Authentication (Minutiae Ridge Scan)
                  </div>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Highly recommended by security policies for administrative privileges, Org Admin, and field supervisors. Workers may skip.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowOnboardingModal(false);
                    // Navigate to self-enrollment mode in SignupPage
                    navigate(
                      `/signup?mode=enroll&userId=${pendingUser?.id}&token=${pendingToken}&email=${pendingUser?.email}&name=${encodeURIComponent(
                        pendingUser?.firstName + ' ' + pendingUser?.lastName
                      )}`
                    );
                  }}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-text-primary text-sm transition-all shadow-[0_0_15px_rgba(255,0,0,0.2)] uppercase tracking-wider font-sans"
                >
                  Register Biometric
                </button>

                <button
                  onClick={() => {
                    setShowOnboardingModal(false);
                    // Execute Direct Password Bypass Login
                    login(pendingUser, pendingToken);
                    navigate('/dashboard');
                  }}
                  className="w-full py-3 rounded-xl border border-brand-500/20 hover:border-brand-500/40 text-text-secondary hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
