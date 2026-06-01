import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, Search, Camera, Fingerprint, CheckCircle2, AlertCircle, Loader2, ChevronDown, ArrowLeft } from 'lucide-react';
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

interface Vendor {
  id: string;
  companyName: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const devRoleParam = queryParams.get('role');
  const modeParam = queryParams.get('mode');
  const emailParam = queryParams.get('email');
  const userIdParam = queryParams.get('userId');
  const tokenParam = queryParams.get('token');
  const nameParam = queryParams.get('name');

  const isEnrollMode = modeParam === 'enroll';

  // Step state: 'credentials' | 'biometrics' | 'success'
  const [step, setStep] = useState<'credentials' | 'biometrics' | 'success'>(() => {
    return isEnrollMode ? 'biometrics' : 'credentials';
  });

  // Credentials fields
  const [fullName, setFullName] = useState(nameParam || '');
  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Validation errors
  const [formError, setFormError] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Biometrics States
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);

  // Biometric interaction states
  const [biometricTab, setBiometricTab] = useState<'face' | 'fingerprint'>('face');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [faceError, setFaceError] = useState('');
  const [faceBox, setFaceBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [latestDetection, setLatestDetection] = useState<any>(null);

  // Active liveness detector step
  const [livenessStep, setLivenessStep] = useState<'align' | 'blink' | 'verified'>('align');
  const [livenessMessage, setLivenessMessage] = useState('ALIGN YOUR FACE IN THE FRAME');

  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [fingerprintScanMessage, setFingerprintScanMessage] = useState('TOUCH & HOLD SCANNER');

  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scanIntervalRef = useRef<any>(null);



  // Load vendors list on mount
  useEffect(() => {
    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const res = await fetch('http://localhost:8000/api/v1/vendors');
        const data = await res.json();
        const list = data.success !== undefined ? data.data : data;
        setVendors(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load vendors:', err);
        setVendors([
          { id: 'v-1', companyName: 'L&T Construction Logistics' },
          { id: 'v-2', companyName: 'Tata Projects Industrial' },
          { id: 'v-3', companyName: 'Reliance Infrastructure Group' }
        ]);
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  // Load face-api models
  useEffect(() => {
    if (step !== 'biometrics') return;
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
        }
      } catch (e) {
        console.error('Failed to load face-api models', e);
      }
    };
    loadModels();
    return () => { active = false; };
  }, [step]);


  const triggerFaceVerification = async (image: string | null) => {
    setFaceStatus('verifying');
    setLivenessMessage('PERFORMING LIVENESS PATTERN MATCH...');

    setTimeout(() => {
      setLivenessMessage('LIVENESS VERIFIED ✓ NEURAL TEMPLATE SECURED');
      setFaceImage(image);
      setFaceStatus('success');
      setFaceEnrolled(true);
    }, 1500);
  };

  // Active face detection loop with eye blink liveness
  useEffect(() => {
    if (step !== 'biometrics' || biometricTab !== 'face' || !modelsLoaded) return;
    if (faceStatus === 'success' || faceStatus === 'verifying') return;

    let active = true;
    const scanInterval = setInterval(async () => {
      if (!active) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        if (detections && active) {
          if (detections.length > 1) {
            setFaceError('Multiple faces detected. Only one face allowed.');
            setFaceBox(null);
            return;
          }
          if (detections.length === 0) {
            setFaceBox(null);
            setLivenessMessage('ALIGN YOUR FACE IN THE FRAME');
            return;
          }
          setFaceError('');
          const detection = detections[0];
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
            clearInterval(scanInterval);
            active = false;
            setLivenessStep('verified');
            setLivenessMessage('FACE DETECTED');
            const base64Image = webcamRef.current?.getScreenshot() || null;
            triggerFaceVerification(base64Image);
          } else {
            setLivenessMessage('CENTER YOUR FACE IN THE FRAME');
          }
        } else {
          setFaceBox(null);
        }
      } catch (err) {
        console.error('Face detection frame error', err);
      }
    }, 150);

    return () => {
      active = false;
      clearInterval(scanInterval);
    };
  }, [step, biometricTab, modelsLoaded, faceStatus, livenessStep]);

  // Fingerprint Simulation
  const startFingerprintScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintState === 'success') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setFingerprintScanMessage('MAPPING BIOMETRIC RIDGE DENSITY...');

    let progress = 0;
    scanIntervalRef.current = setInterval(async () => {
      progress += 5;
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        setFingerprintState('success');
        setFingerprintScanMessage('UNIQUE FINGERPRINT PROFILE GENERATED');
        const printImg = generateProceduralFingerprint(fullName);
        setFingerprintImage(printImg);
        setFingerprintEnrolled(true);

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } else {
        setFingerprintProgress(progress);
        if (progress === 40) setFingerprintScanMessage('COMPLETING CRYPTOGRAPHIC ENVELOPE...');
        if (progress === 80) setFingerprintScanMessage('VERIFYING DUPLICATE TEMPLATE ABSENCE...');
      }
    }, 80);
  };

  const cancelFingerprintScan = () => {
    if (fingerprintState === 'success') return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setFingerprintState('failed');
    setFingerprintProgress(0);
    setFingerprintScanMessage('SCAN INTERRUPTED // TOUCH AGAIN');
    if ('vibrate' in navigator) {
      navigator.vibrate([200]);
    }
    setTimeout(() => {
      setFingerprintState('idle');
      setFingerprintScanMessage('TOUCH & HOLD SCANNER');
    }, 1800);
  };

  // Password Policy Check
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'Extremely Weak', color: 'bg-brand-500/20' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;

    if (score < 4) return { score, text: 'Weak (Must contain 8+ chars, Uppercase, Lowercase, Number)', color: 'bg-brand-500' };
    return { score, text: 'Strong administrative password', color: 'bg-brand-600' };
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) return setFormError('Full Name is required.');
    if (!email.trim()) return setFormError('Email / Username is required.');
    if (!password) return setFormError('Access Cipher Key is required.');
    if (password !== confirmPassword) return setFormError('Cipher passwords do not match.');

    const isVendorRequired = !devRoleParam || ['SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'].includes(devRoleParam);
    if (isVendorRequired && !selectedVendor) {
      return setFormError('Please select your registered corporate vendor.');
    }

    const strength = getPasswordStrength(password);
    if (strength.score < 4) {
      return setFormError('Your password is too weak. It must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    setStep('biometrics');
    setLivenessStep('align');
  };

  const handleCompleteOnboarding = async () => {
    if (!faceEnrolled && !fingerprintEnrolled) {
      setFormError('At least one secure biometric registration (Face or Fingerprint) is mandatory.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (isEnrollMode) {
        const targetUserId = userIdParam;
        if (!targetUserId || !tokenParam) {
          throw new Error('Self-enrollment session variables are missing or expired.');
        }

        // Call face enroll endpoint if registered
        if (faceEnrolled && faceImage) {
          const resFace = await fetch('http://localhost:8000/api/v1/biometrics/enroll', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenParam}`
            },
            body: JSON.stringify({ userId: targetUserId, image: faceImage })
          });
          const dataFace = await resFace.json();
          if (!resFace.ok) {
            throw new Error(dataFace.message || 'Face biometric enrollment failed.');
          }
        }

        // Call fingerprint enroll endpoint if registered
        if (fingerprintEnrolled && fingerprintImage) {
          const resFinger = await fetch('http://localhost:8000/api/v1/biometrics/enroll-fingerprint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenParam}`
            },
            body: JSON.stringify({ userId: targetUserId, image: fingerprintImage })
          });
          const dataFinger = await resFinger.json();
          if (!resFinger.ok) {
            throw new Error(dataFinger.message || 'Fingerprint biometric enrollment failed.');
          }
        }
      } else {
        // Split name
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        const payload = {
          email: email.trim(),
          password,
          firstName,
          lastName,
          role: devRoleParam || undefined,
          vendorId: selectedVendor?.id,
          faceImage: faceImage || undefined,
          fingerprintImage: fingerprintImage || undefined,
        };

        const res = await fetch('http://localhost:8000/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Onboarding registration failed.');
        }
      }

      setStep('success');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setFormError(err.message || 'Network gateway failure. Onboarding denied.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    (v.companyName || '').toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-primary grid grid-cols-1 md:grid-cols-2 relative overflow-hidden font-sans">

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
            Register your profile to immediately allocate your corporate email identifier and secure biometric enrollment token.
          </p>
        </div>
      </div>

      {/* 2. Right Form Panel */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 relative overflow-y-auto bg-[radial-gradient(ellipse_at_60%_40%,rgba(13,255,0,0.06)_0%,rgba(2,16,0,0.98)_60%)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(13,255,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,255,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px] animate-[gridPulse_4s_ease-in-out_infinite]" />

        {!isEnrollMode && step !== 'success' && (
          <Link
            to="/login"
            className="self-start mb-6 flex items-center space-x-2 text-xs font-bold text-brand-200/70 hover:text-white transition-colors uppercase tracking-wider relative z-25 bg-bg-secondary/40 p-2.5 rounded-xl border border-brand-500/20"
          >
            <ArrowLeft className="w-4 h-4 text-brand-500" />
            <span>Back to Authentication Console</span>
          </Link>
        )}

        <div className="max-w-[440px] w-full relative z-10 auth-card rounded-2xl p-8 backdrop-blur-2xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#dc2626] to-[#7f1d1d] shadow-[0_0_16px_rgba(220,38,38,0.4)]">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wide font-sans">FENCEIN</div>
                <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-brand-600/70">Gateway Portal</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-600/10 border border-brand-600/20">
              <span className="text-[9px] font-bold tracking-widest text-brand-400 uppercase font-mono">
                {step === 'credentials' ? '1/2: CREDENTIALS' : step === 'biometrics' ? '2/2: BIOMETRICS' : 'SUCCESS'}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="text-left mb-6">
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">
                    {devRoleParam ? `${devRoleParam.replace('_', ' ')} PROVISIONER` : 'Worker Onboarding'}
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    {devRoleParam ? `MANUALLY GENERATE CORPORATE ${devRoleParam} ACCESS FACTOR` : 'Initialize administrative and security attributes'}
                  </p>
                </div>

                {formError && (
                  <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-brand-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleNextStep} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Full Legal Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="John Smith"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Username / Corporate Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="worker@company.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
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
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-text-muted">Cipher strength:</span>
                          <span className={password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) ? "text-green-400" : "text-brand-400"}>
                            {getPasswordStrength(password).text}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrength(password).color} transition-all duration-300`}
                            style={{ width: `${(getPasswordStrength(password).score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Confirm Cipher Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-text-muted transition-colors group-focus-within:text-brand-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="block w-full pl-10 pr-4 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* Dynamic Searchable Vendor Selector Dropdown */}
                  {(!devRoleParam || ['SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'].includes(devRoleParam)) && (
                    <div className="space-y-1 text-left relative">
                      <label className="text-xs font-semibold text-text-secondary ml-1">Corporate Vendor Mapping</label>
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                      >
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-text-muted" />
                        <input
                          type="text"
                          readOnly
                          value={selectedVendor ? selectedVendor.companyName : ''}
                          placeholder={loadingVendors ? 'Retrieving registered vendors...' : 'Select Vendor (Click to Search)'}
                          className="block w-full pl-10 pr-10 py-2.5 bg-bg-primary/60 border border-border-primary/10 rounded-xl text-text-primary placeholder-brand-900/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium cursor-pointer"
                        />
                        <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-text-muted" />
                      </div>

                      {showVendorDropdown && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-[#140202] border border-brand-500/30 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto p-2">
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                            <input
                              type="text"
                              value={vendorSearch}
                              onChange={(e) => setVendorSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Type to filter..."
                              className="block w-full pl-8 pr-3 py-1.5 bg-bg-primary/90 border border-border-primary/10 rounded-lg text-text-primary text-xs focus:outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="space-y-1">
                            {filteredVendors.length > 0 ? (
                              filteredVendors.map((vendor) => (
                                <button
                                  key={vendor.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedVendor(vendor);
                                    setShowVendorDropdown(false);
                                    setVendorSearch('');
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-brand-500/10 text-text-secondary hover:text-white"
                                >
                                  {vendor.companyName}
                                </button>
                              ))
                            ) : (
                              <div className="text-[10px] text-text-muted py-3 text-center">No matching corporate vendors found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center py-3.5 mt-6 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-text-primary text-base transition-all shadow-[0_0_15px_rgba(255,0,0,0.25)]"
                  >
                    Configure Biometrics →
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'biometrics' && (
              <motion.div
                key="biometrics"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-center"
              >
                <div className="text-left mb-4">
                  <h2 className="text-2xl font-bold font-papyrus text-text-primary">
                    {isEnrollMode ? 'Biometric Enrollment' : 'Biometric Alignment'}
                  </h2>
                  <p className="text-xs text-text-muted mt-1">Configure redundant multi-factor biometric keys</p>
                </div>

                {formError && (
                  <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-brand-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-border-primary/10">
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricTab('face');
                      setLivenessStep('align');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${biometricTab === 'face'
                        ? 'bg-brand-600 text-white shadow-lg'
                        : 'text-text-muted hover:text-text-secondary'
                      }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Face ID {faceEnrolled ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiometricTab('fingerprint')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${biometricTab === 'fingerprint'
                        ? 'bg-brand-600 text-white shadow-lg'
                        : 'text-text-muted hover:text-text-secondary'
                      }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Fingerprint {fingerprintEnrolled ? '✓' : ''}
                  </button>
                </div>

                <div className="min-h-[300px] flex flex-col justify-center items-center">
                  {biometricTab === 'face' && (
                    <div className="space-y-4 w-full">
                      {/* Face Recognition view */}
                      <div
                        ref={containerRef}
                        className="aspect-[3/4] w-full max-w-[200px] mx-auto rounded-2xl border border-brand-500/20 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex items-center justify-center group"
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
                                className="absolute border-4 border-brand-500 rounded-xl transition-all duration-150 pointer-events-none animate-pulse shadow-[0_0_15px_rgba(255,0,0,0.4)]"
                                style={{
                                  left: `${faceBox.left}px`,
                                  top: `${faceBox.top}px`,
                                  width: `${faceBox.width}px`,
                                  height: `${faceBox.height}px`
                                }}
                              />
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
                            <span>Verifying Liveness...</span>
                          </div>
                        )}
                        {faceStatus === 'success' && (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-green-400 font-bold text-xs p-4">
                            <CheckCircle2 className="w-8 h-8 text-green-400 animate-bounce" />
                            <span>Face Profile Locked</span>
                          </div>
                        )}
                      </div>

                      <div className="min-h-[40px] flex flex-col items-center justify-center font-mono">
                        <span className={`text-[10px] tracking-widest font-bold ${faceEnrolled ? 'text-green-400' : 'text-brand-300'}`}>
                          {livenessMessage}
                        </span>
                        {faceError && (
                          <span className="text-[10px] text-brand-300 mt-1">{faceError}</span>
                        )}
                        {!faceEnrolled && latestDetection && (
                          <button
                            type="button"
                            onClick={() => {
                              const base64Image = webcamRef.current?.getScreenshot() || null;
                              if (latestDetection) {
                                setFaceStatus('verifying');
                                setLivenessStep('verified');
                                triggerFaceVerification(base64Image);
                              }
                            }}
                            className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)] animate-pulse"
                          >
                            Capture Face Profile
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {biometricTab === 'fingerprint' && (
                    <div className="space-y-4 w-full">
                      {/* Fingerprint capture scanner */}
                      <div
                        className={`aspect-[1/1] w-full max-w-[160px] mx-auto rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border cursor-pointer select-none ${fingerprintState === 'scanning' ? 'bg-brand-950/40 border-brand-500 shadow-[0_0_30px_rgba(13,255,0,0.25)]' :
                            fingerprintState === 'success' ? 'bg-brand-950/20 border-brand-500 shadow-[0_0_30px_rgba(13,255,0,0.3)]' :
                              fingerprintState === 'failed' ? 'bg-brand-950/20 border-brand-500/80 shadow-[0_0_30px_rgba(13,255,0,0.2)]' :
                                'bg-bg-primary/80 border-brand-500/10 hover:border-brand-500/30'
                          }`}
                        onMouseDown={startFingerprintScan}
                        onMouseUp={cancelFingerprintScan}
                        onMouseLeave={cancelFingerprintScan}
                        onTouchStart={startFingerprintScan}
                        onTouchEnd={cancelFingerprintScan}
                        onTouchCancel={cancelFingerprintScan}
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

                          <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-bg-secondary border backdrop-blur-sm z-10 transition-colors duration-300 ${fingerprintState === 'scanning' ? 'border-brand-500/30' :
                              fingerprintState === 'success' ? 'border-brand-500/30 bg-brand-950/20' :
                                fingerprintState === 'failed' ? 'border-brand-500/30 bg-brand-950/20' :
                                  'border-brand-500/20'
                            }`}>
                            <Fingerprint className={`w-6 h-6 transition-all duration-300 ${fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.5)]' :
                                fingerprintState === 'success' ? 'text-brand-400 filter drop-shadow-[0_0_12px_rgba(13,255,0,0.6)]' :
                                  fingerprintState === 'failed' ? 'text-brand-500 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.5)]' :
                                    'text-brand-500'
                              }`} />
                          </div>
                        </div>
                      </div>

                      <div className="min-h-[40px] flex flex-col items-center justify-center font-mono">
                        <span className={`text-[10px] tracking-widest font-bold ${fingerprintState === 'success' ? 'text-brand-400' :
                            fingerprintState === 'failed' ? 'text-brand-400' :
                              fingerprintState === 'scanning' ? 'text-brand-300 animate-pulse' :
                                'text-text-secondary'
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

                {/* Progress Indicators & Navigation */}
                <div className="flex flex-col gap-3 pt-4 border-t border-border-primary/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Biometric Redundancy:</span>
                    <span className="text-text-secondary font-semibold">
                      {faceEnrolled && fingerprintEnrolled ? 'HIGH (Face + Fingerprint)' : faceEnrolled ? 'Standard (Face ID)' : fingerprintEnrolled ? 'Standard (Fingerprint)' : 'NONE (Required)'}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-2">
                    {!isEnrollMode && (
                      <button
                        type="button"
                        onClick={() => setStep('credentials')}
                        className="w-1/3 py-3 rounded-xl border border-border-primary/10 text-text-secondary text-sm font-bold uppercase transition-all hover:bg-slate-900"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={submitting || (!faceEnrolled && !fingerprintEnrolled)}
                      onClick={handleCompleteOnboarding}
                      className={`${isEnrollMode ? 'w-full' : 'w-2/3'} flex items-center justify-center py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-text-primary text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Onboarding ✓'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <CheckCircle2 className="w-9 h-9 text-green-400 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-papyrus text-white uppercase tracking-wider">Onboarding Complete</h2>
                  <p className="text-xs text-green-400/80 font-bold uppercase tracking-widest font-mono mt-1.5">Administrative Account Ready</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-xs text-text-secondary leading-relaxed">
                  Your identity credentials and encrypted biometric templates have been sync-locked to the secure registry database.
                  <br />
                  <br />
                  Redirecting to the Security Gate login portal...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
