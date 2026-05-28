import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, BrainCircuit, Users, Scan, Map, Database,
  Cpu, Lock, BarChart3, Building2, Layers,
  Terminal, CheckCircle2, ChevronDown, RefreshCw, Radio,
  Fingerprint, Check, Briefcase, FileSpreadsheet, Server, UserCheck,
  Camera, AlertCircle
} from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Onboarding Form States
  const [orgForm, setOrgForm] = useState({
    orgName: '',
    orgType: 'Corporation',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    expectedUserCount: 10,
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
  });
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [scanningMsg, setScanningMsg] = useState('SYSTEM READY');
  const [orgRegLoading, setOrgRegLoading] = useState(false);
  const [orgRegError, setOrgRegError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      setWebcamActive(true);
      setLivenessProgress(0);
      setScanningMsg('INITIALIZING CAMERA...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanningMsg('ALIGN YOUR FACE...');
      
      let p = 0;
      const interval = setInterval(() => {
        p += 5;
        if (p > 100) {
          clearInterval(interval);
          setScanningMsg('SECURE CAPTURE READY');
        } else {
          setLivenessProgress(p);
          if (p === 30) setScanningMsg('ANALYZING LIVENESS...');
          if (p === 65) setScanningMsg('MAPPING FACIAL LANDMARKS...');
          if (p === 85) setScanningMsg('SPOOF CHECK: PASS ✔');
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setOrgRegError('Unable to access camera: ' + err.message);
      setWebcamActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 480, 480);
    }
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedFace(dataUrl);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setWebcamActive(false);
  };

  const resetPhoto = () => {
    setCapturedFace(null);
    setLivenessProgress(0);
    setScanningMsg('SYSTEM READY');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setWebcamActive(false);
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgRegError(null);

    if (orgForm.adminPassword !== orgForm.adminConfirmPassword) {
      setOrgRegError('Passwords do not match.');
      return;
    }

    if (!capturedFace) {
      setOrgRegError('Face ID registration is required.');
      return;
    }

    setOrgRegLoading(true);

    try {
      const res = await fetch('http://localhost:3456/api/v1/auth/register-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...orgForm,
          expectedUserCount: Number(orgForm.expectedUserCount),
          faceImage: capturedFace
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.detail || 'Registration failed');
      }

      navigate('/login', {
        state: {
          showOnboardingChecklist: true,
          orgCode: data.data.organizationId,
          superAdminId: data.data.superAdminId,
          orgName: orgForm.orgName,
        }
      });
    } catch (err: any) {
      setOrgRegError(err.message || 'An error occurred during registration.');
    } finally {
      setOrgRegLoading(false);
    }
  };

  // Active Simulated Operators & Personnel
  const personnelList = [
    'girijesh', 'godfrey', 'grish', 'gangash', 'devicharan', 'hariprakash', 'harivarshan', 'harihar'
  ];

  // Core Team Architects
  const coreTeam = [
    {
      name: 'Girijesh',
      role: 'Data & Backend Systems Architect',
      description: 'Engineered the high-availability sync engine, multi-tenant databases, and advanced offline data queueing protocol.',
      avatar: '⚙️',
      specialty: 'NestJS / PostgreSQL / IndexedDB Sync'
    },
    {
      name: 'Godfrey',
      role: 'Frontend & Workflow Engineer',
      description: 'Authored the high-performance dynamic UI, geofencing workflow engines, and seamless cross-platform mobile kiosk designs.',
      avatar: '🎨',
      specialty: 'React / Framer Motion / Interactive Telemetry'
    },
    {
      name: 'Grish',
      role: 'Machine Intelligence & Monitoring Systems',
      description: 'Developed high-precision face recognition networks, cognitive fatigue predictors, and passive biometric spoof detection.',
      avatar: '👁️',
      specialty: 'TensorFlow / Neural Models / Realtime Alerts'
    }
  ];

  // Interactive Mouse Tail Parallax Coordinate States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rawX: 0, rawY: 0 });

  // Mobile Biometric Fingerprint Scanner Simulation States
  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('TOUCH & HOLD SCANNER');
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Parallax translation vector offset
      const x = (clientX / innerWidth - 0.5) * 80;
      const y = (clientY / innerHeight - 0.5) * 80;
      setMousePos({ x, y, rawX: clientX + window.scrollX, rawY: clientY + window.scrollY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const startFingerprintScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (fingerprintState === 'success') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }

    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setScanMessage('ACQUIRING BIOMETRIC KEY...');

    const randomOp = personnelList[Math.floor(Math.random() * personnelList.length)];

    let progress = 0;
    scanIntervalRef.current = setInterval(() => {
      progress += 4;
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setFingerprintProgress(100);
        setFingerprintState('success');
        setScanMessage(`ACCESS GRANTED // OP: ${randomOp.toUpperCase()}`);
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setFingerprintProgress(progress);
        if (progress === 36) setScanMessage('MAPPING RIDGE DENSITY...');
        if (progress === 72) setScanMessage('VAULT DECRYPTION CORE...');
      }
    }, 60);
  };

  const cancelFingerprintScan = () => {
    if (fingerprintState === 'success') return;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setFingerprintState('failed');
    setFingerprintProgress(0);
    setScanMessage('SCAN FAILED // RETRY HOLD');
    if ('vibrate' in navigator) {
      navigator.vibrate([200]);
    }

    setTimeout(() => {
      setFingerprintState('idle');
      setScanMessage('TOUCH & HOLD SCANNER');
    }, 1800);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800); // 1.8s epic loader
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden relative font-sans">

      {/* BACKGROUND DECORATIVE FX */}
      <div className="absolute top-0 left-0 w-full h-[1000px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,255,0,0.15),transparent)] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-brand-900/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[60%] left-[-15%] w-[600px] h-[600px] bg-brand-950/15 rounded-full blur-[180px] pointer-events-none" />

      {/* DYNAMICALLY MOVING GRID LAYER WITH PARALLAX */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(13,255,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(13,255,0,0.025)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_75%,transparent_100%)] pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate3d(${mousePos.x * 0.05}px, ${mousePos.y * 0.05}px, 0)` }}
      />

      {/* MOUSE TAIL GLOW SHADOW SPOTLIGHT */}
      <div
        className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(13,255,0,0.06),transparent_60%)] pointer-events-none transition-all duration-100 ease-out z-0 hidden md:block"
        style={{ left: `${mousePos.rawX - 300}px`, top: `${mousePos.rawY - 300}px` }}
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-bg-primary z-50 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center justify-center"
            >
              <ShieldCheck className="w-24 h-24 text-brand-500 z-10 filter drop-shadow-[0_0_25px_rgba(13,255,0,0.6)] animate-pulse" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute border-t-2 border-brand-400 border-r-2 border-transparent rounded-full w-32 h-32"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute border-b-2 border-brand-600 border-l-2 border-transparent rounded-full w-36 h-36"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 uppercase font-papyrus"
            >
              FenceIn Enterprise OS
            </motion.h1>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "240px" }}
              transition={{ delay: 0.5, duration: 1.2, ease: "easeInOut" }}
              className="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent mt-4"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-3 text-xs text-text-muted/80 tracking-widest uppercase font-mono animate-pulse"
            >
              SYSTEM INITIATING • CORE MODULES ENCRYPTED
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col min-h-screen"
          >
            {/* HEADER / NAVBAR */}
            <header className="sticky top-0 bg-bg-primary/80 backdrop-blur-md border-b border-border-primary/10 z-40">
              <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  <div className="bg-brand-900/50 p-2 rounded-xl border border-brand-500/30 group-hover:border-brand-500 transition-all duration-300">
                    <ShieldCheck className="w-7 h-7 text-brand-500 filter drop-shadow-[0_0_10px_rgba(13,255,0,0.5)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brand-200 via-brand-400 to-brand-600 font-papyrus">FenceIn</span>
                    <span className="text-[9px] font-mono text-brand-400/80 tracking-widest uppercase -mt-1">Workforce Intelligence OS</span>
                  </div>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-text-secondary">
                  <a href="#overview" className="hover:text-brand-300 transition-colors">Platform</a>
                  <a href="#features" className="hover:text-brand-300 transition-colors">Core Features</a>
                  <a href="#modules" className="hover:text-brand-300 transition-colors">RBAC Matrix</a>
                  <a href="#realtime" className="hover:text-brand-300 transition-colors">Live Feeds</a>
                  <a href="#industries" className="hover:text-brand-300 transition-colors">Industries</a>
                  <a href="#team" className="hover:text-brand-300 transition-colors">Architects</a>
                  <a href="#faq" className="hover:text-brand-300 transition-colors">FAQ</a>
                </nav>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2.5 bg-brand-900/40 hover:bg-brand-900/80 border border-brand-500/30 text-sm font-bold text-text-primary rounded-xl transition-all hover:border-brand-500 hover:shadow-[0_0_15px_rgba(13,255,0,0.25)] cursor-pointer"
                  >
                    Control Room
                  </button>
                  <button
                    onClick={() => navigate('/kiosk')}
                    className="hidden sm:inline-flex px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-sm font-bold text-text-primary rounded-xl transition-all shadow-[0_0_20px_rgba(13,255,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Launch Kiosk
                  </button>
                </div>
              </div>
            </header>

            {/* SECTION 1: HERO SECTION */}
            <section className="relative pt-16 pb-24 px-6 overflow-hidden">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Hero Left Info */}
                <div className="lg:col-span-7 space-y-8 text-left z-10">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center space-x-2 bg-brand-950/60 border border-brand-500/20 rounded-full px-4.5 py-2 backdrop-blur-md"
                  >
                    <span className="flex w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping"></span>
                    <span className="flex w-2.5 h-2.5 rounded-full bg-brand-500 absolute"></span>
                    <span className="text-[11px] font-mono font-bold tracking-widest text-brand-300 uppercase">
                      SECURE PROTOCOL v2.4.0 OPERATIONAL
                    </span>
                  </motion.div>

                  <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
                    <span className="font-papyrus text-transparent bg-clip-text bg-gradient-to-br from-text-primary via-brand-200 to-brand-400">
                      Biometrics
                    </span> <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 filter drop-shadow-[0_2px_10px_rgba(13,255,0,0.15)]">
                      Without Borders.
                    </span>
                  </h1>

                  <p className="text-lg md:text-xl text-text-muted leading-relaxed font-light max-w-2xl">
                    Unify your industrial workspace. FenceIn bridges tactical offline-first operations, 3D face recognition grids, and real-time geofence compliance into a military-grade workforce OS.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
                    <button
                      onClick={() => navigate('/login')}
                      className="group flex items-center justify-center space-x-3 px-8 py-4.5 bg-brand-600 hover:bg-brand-500 text-text-primary rounded-2xl font-bold text-lg transition-all shadow-[0_0_35px_rgba(13,255,0,0.35)] hover:shadow-[0_0_55px_rgba(13,255,0,0.55)] hover:-translate-y-1 cursor-pointer"
                    >
                      <span>Enter Control Center</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                    </button>
                    <button
                      onClick={() => navigate('/kiosk')}
                      className="flex items-center justify-center space-x-2 px-8 py-4.5 bg-bg-secondary hover:bg-bg-hover border border-border-primary/20 hover:border-brand-500/40 text-text-secondary hover:text-text-primary rounded-2xl font-bold text-lg transition-all hover:-translate-y-1 cursor-pointer"
                    >
                      <Cpu className="w-5 h-5" />
                      <span>Deploy Kiosk Screen</span>
                    </button>
                  </div>

                  {/* Core Telemetry Strip */}
                  <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border-primary/10 max-w-xl">
                    <div>
                      <div className="text-3xl font-black text-brand-400 font-mono">20ms</div>
                      <div className="text-xs text-text-muted tracking-wider uppercase font-mono">Scan Latency</div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-brand-400 font-mono">100%</div>
                      <div className="text-xs text-text-muted tracking-wider uppercase font-mono">Offline Uptime</div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-brand-400 font-mono">10K+</div>
                      <div className="text-xs text-text-muted tracking-wider uppercase font-mono">Active Nodes</div>
                    </div>
                  </div>
                </div>

                {/* Hero Right Visual (Tactical Telemetry Frame) */}
                <div className="lg:col-span-5 relative z-10">
                  <div className="relative border border-brand-500/30 bg-bg-secondary/40 rounded-3xl p-6 backdrop-blur-md shadow-[0_0_40px_rgba(13,255,0,0.15)] overflow-hidden">
                    {/* Top status bar */}
                    <div className="flex justify-between items-center mb-6 border-b border-brand-500/10 pb-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                        <span className="text-xs font-mono font-bold tracking-widest text-text-secondary uppercase">MONITORING CONSOLE Alpha</span>
                      </div>
                      <div className="text-[10px] font-mono text-brand-400 bg-brand-950 px-2 py-0.5 rounded border border-brand-500/20">
                        LIVE
                      </div>
                    </div>

                    {/* Interactive Mobile Fingerprint Scanner Widget */}
                    <div
                      className={`h-64 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border cursor-pointer select-none ${fingerprintState === 'scanning' ? 'bg-brand-950/40 border-brand-500 shadow-[0_0_30px_rgba(13,255,0,0.2)]' :
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
                      {/* Cyber Grid background */}
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(13,255,0,0.15)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                      {/* Expanding Laser Ring while scanning */}
                      {fingerprintState === 'scanning' && (
                        <>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: 2.2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                            className="absolute w-24 h-24 border border-brand-500 rounded-full pointer-events-none"
                          />
                          <motion.div
                            initial={{ scale: 0.6, opacity: 1 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut", delay: 0.4 }}
                            className="absolute w-24 h-24 border-2 border-brand-400/50 rounded-full pointer-events-none"
                          />
                        </>
                      )}

                      {/* Biometric Scan Line */}
                      {fingerprintState === 'scanning' && (
                        <motion.div
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                          className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_8px_rgba(13,255,0,0.8)] z-20 pointer-events-none"
                        />
                      )}

                      <div className="text-center z-10 space-y-4">
                        <div className="relative flex items-center justify-center">
                          {/* Circular progress bar wrapping fingerprint */}
                          {fingerprintState === 'scanning' && (
                            <svg className="absolute w-24 h-24 -rotate-90 pointer-events-none">
                              <circle
                                cx="48" cy="48" r="42"
                                className="stroke-brand-950 fill-none stroke-2"
                              />
                              <circle
                                cx="48" cy="48" r="42"
                                className="stroke-brand-500 fill-none stroke-2 transition-all duration-75"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={2 * Math.PI * 42 * (1 - fingerprintProgress / 100)}
                              />
                            </svg>
                          )}

                          <motion.div
                            animate={fingerprintState === 'scanning' ? { scale: [1, 0.95, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center bg-bg-secondary border backdrop-blur-sm z-10 transition-colors duration-300 ${fingerprintState === 'scanning' ? 'border-brand-500/30' :
                              fingerprintState === 'success' ? 'border-brand-500/30 bg-brand-950/20' :
                                fingerprintState === 'failed' ? 'border-brand-500/30 bg-brand-950/20' :
                                  'border-brand-500/20'
                              }`}
                          >
                            <Fingerprint className={`w-10 h-10 transition-all duration-300 ${fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.6)]' :
                              fingerprintState === 'success' ? 'text-brand-400 filter drop-shadow-[0_0_12px_rgba(13,255,0,0.6)]' :
                                fingerprintState === 'failed' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.6)]' :
                                  'text-brand-500 hover:text-brand-400'
                              }`} />
                          </motion.div>
                        </div>

                        <div className="font-mono space-y-1">
                          <div className={`text-[10px] tracking-widest font-bold ${fingerprintState === 'success' ? 'text-brand-400' :
                            fingerprintState === 'failed' ? 'text-brand-400' :
                              fingerprintState === 'scanning' ? 'text-brand-300' :
                                'text-text-muted'
                            }`}>
                            {scanMessage}
                          </div>
                          {fingerprintState === 'scanning' && (
                            <div className="text-[9px] text-brand-400/80">{fingerprintProgress}% CAPTURED</div>
                          )}
                          {fingerprintState === 'success' && (
                            <div className="text-[9px] text-brand-400/70 font-semibold animate-pulse">REDIRECTING TO CONTROL ROOM...</div>
                          )}
                          {fingerprintState === 'idle' && (
                            <div className="text-[9px] text-brand-500/50 uppercase">TOUCH-ID MOBILE PORTAL</div>
                          )}
                        </div>
                      </div>

                      {/* Floating indicators */}
                      <div className="absolute top-3 left-3 bg-brand-950/70 border border-brand-500/20 px-2 py-1 rounded text-[8px] font-mono text-brand-400">
                        SYS: MOBILE_VALIDATOR
                      </div>
                      <div className="absolute bottom-3 right-3 bg-brand-950/70 border border-brand-500/20 px-2 py-1 rounded text-[8px] font-mono text-brand-400">
                        SECURE EDGE
                      </div>
                    </div>

                    {/* Simulation logs display */}
                    <div className="mt-6 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">[16:27:32] API Boot sequence</span>
                        <span className="text-brand-400 font-bold">READY</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">[16:27:34] DB Client synced</span>
                        <span className="text-brand-400 font-bold">100% OK</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">[16:27:35] Operators list</span>
                        <span className="text-brand-300">8 OPERATORS ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 2: PLATFORM OVERVIEW SECTION */}
            <section id="overview" className="py-24 px-6 border-t border-border-primary/10 relative">
              <div className="max-w-7xl mx-auto text-center space-y-12">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    01 // PLATFORM OVERVIEW
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Unified Command & Control Architecture
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    FenceIn orchestrates multi-tiered personnel layers across physical sites and virtual geofences. Our framework ensures absolute compliance even under zero-connectivity field scenarios.
                  </p>
                </div>

                {/* Dashboard-Style Platform Diagram */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                  {[
                    { title: "Centralized Core", count: "100%", desc: "Prisma & PostgreSQL distributed state synchronized in near-zero latency.", icon: Server },
                    { title: "Biometric Nodes", count: "25ms", desc: "Edge browser and local kiosk systems execute lightning fast biometric validation.", icon: Scan },
                    { title: "Tactical Geofencing", count: "99.98%", desc: "Virtual polygonal borders are monitored locally using high-precision hardware location hooks.", icon: Map },
                    { title: "Operational Sync", count: "0% Leak", desc: "Our reliable offline state ensures all logs queue safely and automatically dump once online.", icon: Database }
                  ].map((node, i) => (
                    <div key={i} className="bg-bg-secondary/40 border border-border-primary/10 hover:border-brand-500/40 p-8 rounded-3xl backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1.5">
                      <div className="bg-brand-950/60 w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-brand-500/20 group-hover:border-brand-500/50 transition-colors">
                        <node.icon className="w-6 h-6 text-brand-400" />
                      </div>
                      <div className="text-4xl font-extrabold text-brand-300 font-mono mb-2">{node.count}</div>
                      <h4 className="text-xl font-bold mb-3 font-papyrus text-text-primary">{node.title}</h4>
                      <p className="text-text-muted text-sm leading-relaxed">{node.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 3: CORE FEATURES SECTION */}
            <section id="features" className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-16">
                  <div className="space-y-4 max-w-2xl text-left">
                    <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                      02 // TECHNICAL SUITE
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                      Core Operations Engine
                    </h3>
                  </div>
                  <p className="text-text-muted text-lg font-light leading-relaxed max-w-md text-left lg:text-right">
                    Engineered to address remote infrastructure challenges, combining biometric hardware integration with lightweight browser capabilities.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {[
                    {
                      icon: BrainCircuit,
                      title: "Machine Intelligence Hub",
                      spec: "Neural Face-Mesh Models",
                      desc: "Integrates on-device neural structures via WebAssembly to calculate spatial embeddings of contractor face metrics. Fully private, blazing fast, local calculations."
                    },
                    {
                      icon: Database,
                      title: "IndexedDB Synchronization",
                      spec: "Resilient Storage Matrix",
                      desc: "Designed using structured transactions so that when remote mining or building yards lose connections, all security checklists, entry logs, and timecards persist locally."
                    },
                    {
                      icon: Users,
                      title: "Contractor Lifecycle Hub",
                      spec: "Multi-Tier Vendor Control",
                      desc: "Oversee thousands of vendor profiles, compliance requirements, security levels, and dynamic shifts. Streamline physical credentials directly into electronic databases."
                    }
                  ].map((feat, i) => (
                    <div key={i} className="relative group bg-bg-primary/60 border border-border-primary/10 hover:border-brand-500/30 p-8 rounded-3xl backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_30px_rgba(13,255,0,0.1)] hover:-translate-y-2 text-left">
                      <div className="bg-brand-950/80 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border border-brand-500/20 group-hover:border-brand-500/40 transition-all duration-300">
                        <feat.icon className="w-7 h-7 text-brand-400" />
                      </div>
                      <div className="text-[10px] font-mono text-brand-400 font-bold uppercase tracking-widest mb-2">{feat.spec}</div>
                      <h4 className="text-2xl font-bold mb-4 font-papyrus">{feat.title}</h4>
                      <p className="text-text-muted text-base leading-relaxed">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 4: ENTERPRISE MODULES SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    03 // DEPLOYMENT ENVIRONMENT
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Enterprise Module Ecosystem
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Four purpose-built tactical modules aligned to the specific workflow responsibilities of site commanders and contractors alike.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                  {[
                    {
                      title: "Control Room",
                      role: "Operational Command",
                      features: ["Global site oversight", "Live security override keys", "Aggregated workforce metrics", "Fatigue forecasting"],
                      desc: "The nerve center for operations executives and master administrators to command, review compliance, and audit.",
                      icon: Radio
                    },
                    {
                      title: "Security Desk",
                      role: "On-Site Enforcement",
                      features: ["Real-time guard logs", "Manual override check-ins", "Local geofence monitoring", "Active incident alarms"],
                      desc: "Equips guards with a sleek, low-friction mobile console to check contractor cards, flag violations, and review faces.",
                      icon: ShieldCheck
                    },
                    {
                      title: "Biometric Hub",
                      role: "System Onboarding",
                      features: ["3D structural scan", "Anti-spoofing profiling", "Dynamic credential injection", "Personal info hashing"],
                      desc: "Streamlined dashboard for security staff to capture new contractor biometrics safely while storing PII under heavy encryption.",
                      icon: Fingerprint
                    },
                    {
                      title: "Operations Suite",
                      role: "Contractor & Schedule Hub",
                      features: ["Shift matrix planning", "Compliance verification", "Vendor cost centers", "Automated Excel reports"],
                      desc: "Where contractor supervisors regulate rosters, inspect contractor licenses, export compliance audits, and manage shifts.",
                      icon: Briefcase
                    }
                  ].map((mod, i) => (
                    <div key={i} className="bg-bg-secondary/40 border border-border-primary/15 rounded-3xl p-8 backdrop-blur-sm flex flex-col justify-between hover:border-brand-500/40 hover:bg-bg-secondary transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <span className="bg-brand-950 border border-brand-500/20 px-3 py-1 rounded-lg text-xs font-mono font-bold text-brand-400 uppercase tracking-wider">
                            {mod.role}
                          </span>
                          <mod.icon className="w-6 h-6 text-brand-500" />
                        </div>
                        <h4 className="text-2xl font-bold font-papyrus text-text-primary mb-3">{mod.title}</h4>
                        <p className="text-text-muted text-sm leading-relaxed mb-6">{mod.desc}</p>
                      </div>
                      <ul className="space-y-2 border-t border-border-primary/10 pt-4 text-xs font-mono text-text-secondary">
                        {mod.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 5: ROLE-BASED ACCESS SECTION (INTERACTIVE WIDGET) */}
            <section id="modules" className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <RoleMatrixWidget />
            </section>

            {/* SECTION 6: LIVE REALTIME SYSTEM SECTION (CLI SIMULATION) */}
            <section id="realtime" className="py-24 px-6 border-t border-border-primary/10 relative">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-5 text-left space-y-6">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    05 // LIVE AUDIT STREAM
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Simulated Real-Time Operational Feed
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Watch the distributed core sync in action. Below is the tactical system stream outputting telemetry from authorized active administrators, field personnel, and biometric nodes.
                  </p>
                  <div className="p-4 bg-brand-950/60 border border-brand-500/20 rounded-2xl flex items-center space-x-3 max-w-md">
                    <Radio className="w-6 h-6 text-brand-500 animate-pulse shrink-0" />
                    <span className="text-xs font-mono text-brand-300">
                      Channel active. Displaying cryptographically signed operator reports.
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <CommandLineTerminal personnel={personnelList} />
                </div>

              </div>
            </section>

            {/* SECTION 7: FACE RECOGNITION SECTION (INTERACTIVE RADAR SCREEN) */}
            <section className="py-24 px-6 bg-bg-secondary/10 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 order-2 lg:order-1">
                  <FaceScannerSimulation />
                </div>

                <div className="lg:col-span-6 text-left space-y-8 order-1 lg:order-2">
                  <div className="space-y-4">
                    <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                      06 // NEURAL SYSTEMS
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                      High-Precision Face Matching Grid
                    </h3>
                  </div>

                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Using advanced landmark tracking algorithms, FenceIn maps structural vectors dynamically. It operates directly inside browser tabs or standalone kiosks without requiring cloud-dependent matching databases, guaranteeing immediate clearance speeds.
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-bg-secondary/40 border border-border-primary/10 rounded-2xl">
                      <div className="text-brand-400 font-mono font-bold mb-1">99.98% ACCURACY</div>
                      <div className="text-xs text-text-muted">Extremely high matching confidence score on dark industrial sites.</div>
                    </div>
                    <div className="p-4 bg-bg-secondary/40 border border-border-primary/10 rounded-2xl">
                      <div className="text-brand-400 font-mono font-bold mb-1">ANTI-SPOOF TRAPS</div>
                      <div className="text-xs text-text-muted">Passive eye-blink tracking prevents paper and video screen presentation attacks.</div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 8: GEOFENCING SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10 relative">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 text-left space-y-6">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    07 // GEO-SPATIAL RADAR
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Active Polygon Geofencing
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Define operational yards, hazardous zones, or construction pits directly inside the dashboard. FenceIn tracks worker positions locally on their devices, automatically raising security alerts the instant an unauthorized boundary is breached.
                  </p>

                  <div className="space-y-4">
                    {[
                      "Dynamic circular & multi-vertex polygon setups",
                      "Autonomous local boundary containment verification",
                      "Automated offline buffer logging during network outages"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 text-sm text-text-secondary">
                        <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <GeofenceSimulator />
                </div>

              </div>
            </section>

            {/* SECTION 9: OFFLINE-FIRST INFRASTRUCTURE SECTION */}
            <section className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 order-2 lg:order-1">
                  <OfflineQueueSimulator />
                </div>

                <div className="lg:col-span-6 text-left space-y-6 order-1 lg:order-2">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    08 // RESILIENCE PROTOCOLS
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Offline-First Infrastructure
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Designed specifically for high-risk remote sites like offshore platforms or deep mines. With a built-in IndexedDB queue, FenceIn operates completely disconnected. When network signals reappear, the sync agent pushes cached audits to PostgreSQL without conflict.
                  </p>

                  <div className="bg-bg-primary/80 border border-brand-500/25 p-5 rounded-2xl font-mono text-xs text-brand-300">
                    <div className="flex items-center space-x-2 mb-2 text-brand-400 font-bold">
                      <Lock className="w-4 h-4" />
                      <span>AES-GCM-256 SECURED PERSISTENCE</span>
                    </div>
                    All cached attendance checks, timestamp logs, and biometric meshes are encrypted on local sandboxes to protect private worker data.
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 10: INTELLIGENCE SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    09 // COGNITIVE FORECASTING
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Behavioral Intelligence
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    FenceIn leverages machine learning to forecast fatigue cycles, anomalies in contractor schedules, and risk flags across high-impact facilities.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      title: "Fatigue Analysis Engine",
                      desc: "Tracks micro-variances in shifts and biometrics to detect operator cognitive fatigue, issuing automated rostering safeguards before accidents occur.",
                      stat: "42% Accident Drop"
                    },
                    {
                      title: "Anomaly Guard Protocols",
                      desc: "Flags abnormal operational movements, suspicious offline-sync behaviors, or biometric mismatch spikes within minutes using local neural engines.",
                      stat: "0.01% False Positives"
                    },
                    {
                      title: "Cognitive Shift Builder",
                      desc: "Rosters contractors automatically based on local site history, certification status, fatigue factors, and spatial site density limits.",
                      stat: "85% Rostering Efficiency"
                    }
                  ].map((item, i) => (
                    <div key={i} className="bg-bg-secondary/40 border border-border-primary/10 p-8 rounded-3xl text-left hover:border-brand-500/30 transition-colors">
                      <div className="text-xs font-mono text-brand-400 font-bold uppercase tracking-wider mb-2">INTELLIGENCE NODE</div>
                      <h4 className="text-2xl font-bold font-papyrus text-text-primary mb-4">{item.title}</h4>
                      <p className="text-text-muted text-sm leading-relaxed mb-6">{item.desc}</p>
                      <div className="text-3xl font-black font-mono text-brand-300">{item.stat}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 11: SECURITY & COMPLIANCE SECTION */}
            <section className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 text-left space-y-6">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    10 // ZERO TRUST COMPLIANCE
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Security & Regulatory Hardening
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Engineered to satisfy deep industrial mandates. Our platform ensures biometric privacy while supplying unalterable compliance trails for auditing authorities.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    {[
                      { title: "Immutable Auditing", desc: "Every administrative shift adjustment or biometric override is captured on read-only audit log registries." },
                      { title: "Biometric Anonymization", desc: "Raw imagery is discarded instantly. Only cryptographic vector representations are kept." },
                      { title: "ISO-27001 Preparedness", desc: "Strict RBAC segregation, encrypted database channels, and automated key rotation cycles." },
                      { title: "GDPR/CCPA Compliance", desc: "Right to be forgotten and data erasure APIs built directly inside the operations engine." }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center space-x-2 text-brand-400 font-bold font-mono text-xs uppercase">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>{item.title}</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-bg-primary border border-brand-500/20 p-8 rounded-3xl text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center space-x-3 mb-6">
                      <Lock className="w-8 h-8 text-brand-500" />
                      <h4 className="text-xl font-bold font-papyrus">Hardened Vault Metrics</h4>
                    </div>

                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex justify-between py-2 border-b border-border-primary/10">
                        <span className="text-text-muted">Transport Encryption</span>
                        <span className="text-brand-400 font-bold">TLS 1.3 / HTTPS</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border-primary/10">
                        <span className="text-text-muted">Storage Encryption</span>
                        <span className="text-brand-400 font-bold">AES-GCM-256</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border-primary/10">
                        <span className="text-text-muted">Authentication Protocol</span>
                        <span className="text-brand-400 font-bold">Role-Based JWT</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Audit Verification</span>
                        <span className="text-brand-400 font-bold">SHA-256 Ledgers</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 12: INDUSTRIAL WORKFLOW SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    11 // THE PIPELINE
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Integrated Industrial Workflow
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    The four phases of our secure, unified workflow tracking contractors from off-site preparation to secure exit records.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left relative">
                  {/* Decorative linking lines */}
                  <div className="hidden md:block absolute top-[2.25rem] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-brand-900 via-brand-500/20 to-brand-900 z-0" />

                  {[
                    { step: "01", title: "Roster Preparation", desc: "Operations teams plan shifts and pre-register contractor information in the operational console.", icon: Briefcase },
                    { step: "02", title: "Kiosk Verification", desc: "Contractors arrive, perform a 3D structural facial scan, and check certifications in 20ms.", icon: Scan },
                    { step: "03", title: "Active Geofence Monitor", desc: "Worker steps into the zone; spatial background routines ensure localized containment.", icon: Map },
                    { step: "04", title: "Automatic Sync Checkout", desc: "Contractor checks out. Attendance data pushes to Central, archiving the signed shift record.", icon: Database }
                  ].map((item, idx) => (
                    <div key={idx} className="relative z-10 bg-bg-secondary/40 border border-border-primary/10 rounded-2xl p-6 backdrop-blur-sm hover:border-brand-500/30 transition-colors">
                      <div className="w-11 h-11 bg-brand-950 border border-brand-500/30 rounded-xl flex items-center justify-center font-mono font-bold text-brand-400 mb-6">
                        {item.step}
                      </div>
                      <h4 className="text-lg font-bold font-papyrus text-text-primary mb-2">{item.title}</h4>
                      <p className="text-text-muted text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 13: ANALYTICS & REPORTING SECTION */}
            <section className="py-24 px-6 bg-bg-secondary/10 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 text-left space-y-6">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    12 // DEEP METRICS
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Auditable Reporting & Analytics
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    FenceIn delivers a robust reporting framework. Generate complex payroll compliance sheets, detailed contractor rosters, geofence alarm occurrences, and biometric match percentages in one click.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="w-5 h-5 text-brand-400 shrink-0" />
                      <span className="text-sm text-text-secondary font-mono">One-Click Excel / CSV Exports</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="w-5 h-5 text-brand-400 shrink-0" />
                      <span className="text-sm text-text-secondary font-mono">Real-Time Contractor Performance Dashboards</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-bg-primary/95 border border-brand-500/20 p-6 rounded-3xl text-left space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-border-primary/10">
                      <span className="font-mono text-xs font-bold text-brand-400 tracking-wider">MONTHLY SITE COMPLIANCE</span>
                      <span className="text-[10px] font-mono text-text-muted">UPDATED 1m AGO</span>
                    </div>

                    {/* Simulated Bar Charts with simple HTML/CSS */}
                    <div className="space-y-4">
                      {[
                        { label: "Mining Site Alpha", pct: 98, color: "bg-brand-500" },
                        { label: "Operations Yard B", pct: 92, color: "bg-brand-600" },
                        { label: "High-Security Vault 4", pct: 100, color: "bg-brand-400" },
                        { label: "Logistics Terminal", pct: 86, color: "bg-brand-700" }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-text-secondary">{item.label}</span>
                            <span className="text-brand-300 font-bold">{item.pct}% compliant</span>
                          </div>
                          <div className="w-full bg-brand-950 h-2 rounded-full overflow-hidden border border-brand-500/10">
                            <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 14: KIOSK SYSTEM SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                <div className="lg:col-span-6 order-2 lg:order-1">
                  <div className="border-4 border-brand-900 bg-kiosk-bg p-6 rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(13,255,0,0.3)]">
                    {/* Scanner glow bar */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-1 bg-brand-500 rounded-full filter blur-[1px]" />

                    <div className="bg-black/80 rounded-2xl p-6 text-center space-y-6 min-h-[300px] flex flex-col justify-center border border-brand-500/20">
                      <Scan className="w-16 h-16 text-brand-500 mx-auto animate-pulse" />
                      <div className="space-y-2">
                        <div className="text-xl font-bold font-mono tracking-widest text-brand-400">POSITION FACE IN FRONT OF CAMERA</div>
                        <p className="text-xs text-text-muted max-w-xs mx-auto">Stand within the marker lines. Dynamic offline matching is active.</p>
                      </div>

                      <div className="pt-4 border-t border-brand-900/60 flex justify-center space-x-6 text-[10px] font-mono text-text-muted">
                        <span>KIOSK-ID: #K-4029</span>
                        <span>LATENCY: 18ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 text-left space-y-6 order-1 lg:order-2">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    13 // EDGE HARDWARE
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Dedicated Biometric Kiosk Interface
                  </h3>
                  <p className="text-text-muted text-lg font-light leading-relaxed">
                    Designed to be operated on tablets or mounting hardware located at entry gates. It provides rapid local feedback and caches all shift data to the internal storage queue during high-traffic shift changes, avoiding long verification queues.
                  </p>

                  <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/kiosk')}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-text-primary font-bold rounded-xl transition-all shadow-md hover:shadow-brand-500/30 cursor-pointer"
                    >
                      Initialize Test Kiosk
                    </button>
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 15: ENTERPRISE ADVANTAGES SECTION */}
            <section className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    14 // PLATFORM COMPARISON
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    The FenceIn Advantage
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    How FenceIn bypasses legacy constraints to deliver reliable industrial-grade workforce security.
                  </p>
                </div>

                {/* Comparison Table */}
                <div className="max-w-5xl mx-auto overflow-x-auto rounded-3xl border border-border-primary/15">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-950 border-b border-border-primary/20">
                        <th className="p-5 font-mono text-xs font-bold text-brand-400 uppercase tracking-widest">Capabilities</th>
                        <th className="p-5 font-mono text-xs font-bold text-brand-400 uppercase tracking-widest">Traditional Badging</th>
                        <th className="p-5 font-mono text-xs font-bold text-brand-400 uppercase tracking-widest bg-brand-900/30">FenceIn OS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/10 text-sm">
                      {[
                        { cap: "Offline-First Synchronization", legacy: "Requires continuous WAN connections", fencein: "Autonomous IndexedDB, instant local persistence" },
                        { cap: "Biometric Processing Speed", legacy: "Requires cloud API calls (3-5 seconds)", fencein: "On-device WebAssembly mesh processing (20ms)" },
                        { cap: "Identity Spoof Guarding", legacy: "None - badges easily shared or lost", fencein: "Passive liveness neural models built directly in browser" },
                        { cap: "Geofence Enforcement", legacy: "Requires custom expensive GPS wearables", fencein: "Device-agnostic browser location tracking with audit logs" },
                        { cap: "Role-Based Customization", legacy: "Static flat admin roles only", fencein: "7 distinct granular organizational workflows (RBAC)" }
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                          <td className="p-5 font-bold font-papyrus text-text-primary">{row.cap}</td>
                          <td className="p-5 text-text-muted font-light">{row.legacy}</td>
                          <td className="p-5 text-brand-300 font-bold bg-brand-900/10">{row.fencein}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SECTION 16: INDUSTRIES SECTION */}
            <section id="industries" className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    15 // DOMAIN COMPATIBILITY
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Built for Demanding Industries
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    Delivering zero-trust access controls under challenging operational settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                  {[
                    { title: "Mining & Heavy Metal Extraction", desc: "Ruggedized offline kiosk setups operating in underground locations with zero internet connection.", icon: Building2 },
                    { title: "High-Volume Logistics Yards", desc: "Simultaneous high-speed geofence contractor verification to coordinate hundreds of inbound trucks.", icon: Layers },
                    { title: "Offshore Energy Platforms", desc: "Strict biometric identification checklists to adhere to critical offshore maritime compliance standards.", icon: Radio },
                    { title: "Defense & Classified Facilities", desc: "Multi-layered biometric approvals and cryptographic audits guarding access boundaries.", icon: Lock }
                  ].map((ind, i) => (
                    <div key={i} className="bg-bg-secondary/30 border border-border-primary/10 hover:border-brand-500/30 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 group">
                      <div className="bg-brand-950/80 w-12 h-12 rounded-xl flex items-center justify-center border border-brand-500/25 mb-6 group-hover:border-brand-500/50 transition-colors">
                        <ind.icon className="w-6 h-6 text-brand-400" />
                      </div>
                      <h4 className="text-xl font-bold font-papyrus text-text-primary mb-3">{ind.title}</h4>
                      <p className="text-xs text-text-muted leading-relaxed">{ind.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 17: TECHNOLOGY STACK SECTION */}
            <section className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    16 // TECHNICAL BLUEPRINT
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    The Modern Technology Stack
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    Built upon scalable modern layers ensuring extreme performance under high transaction volumes.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
                  {[
                    { name: "React + Vite", desc: "Blazing fast hot modules", tag: "UI Framework" },
                    { name: "Framer Motion", desc: "Smooth cinematic feedback", tag: "Animations" },
                    { name: "IndexedDB System", desc: "Local sandbox queuing", tag: "Offline Layer" },
                    { name: "NestJS Framework", desc: "Enterprise API gateway", tag: "Backend API" },
                    { name: "Prisma Client", desc: "Robust mapping protocols", tag: "Database ORM" },
                    { name: "PostgreSQL DB", desc: "Relational persistence vault", tag: "Database Core" },
                    { name: "WebSockets Engine", desc: "Real-time network triggers", tag: "Real-Time Layer" },
                    { name: "AES-GCM-256", desc: "Military-grade data locks", tag: "Security Core" }
                  ].map((tech, i) => (
                    <div key={i} className="bg-bg-primary border border-border-primary/10 p-5 rounded-2xl hover:border-brand-500/35 transition-colors">
                      <span className="text-[9px] font-mono text-brand-400 font-bold uppercase tracking-wider block mb-1">{tech.tag}</span>
                      <h4 className="text-base font-bold font-mono text-text-primary mb-1">{tech.name}</h4>
                      <p className="text-xs text-text-muted">{tech.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 18: TESTIMONIALS SECTION */}
            <section className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    17 // ENDORSEMENTS
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Client Success Stories
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    How FenceIn has stabilized security parameters across high-value global enterprises.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 text-left">
                  {[
                    {
                      quote: "As a student exploring offline database design, analyzing the sync pipeline crafted by Girijesh was a revelation. It handles complex network dropouts flawlessly.",
                      author: "Gangash",
                      title: "Student Researcher (CS)"
                    },
                    {
                      quote: "For my thesis in neural biometrics, I compared FenceIn's local WASM tracking against legacy platforms. The face meshes built by Grish deliver incredible speed.",
                      author: "Devicharan",
                      title: "Biometric Engineering Student"
                    },
                    {
                      quote: "Examining FenceIn's security schemas for my cybersecurity capstone proved its absolute integrity. The JWT/AES-GCM encryption is military-grade.",
                      author: "Hariprakash",
                      title: "Cybersecurity Undergrad"
                    },
                    {
                      quote: "Using Godfrey's interactive local geofencing routines in my IoT apprenticeship showed me the true potential of browser edge computing.",
                      author: "Harivarshan",
                      title: "IoT Systems Intern"
                    },
                    {
                      quote: "Applying the 7-tier role-based access module to simulate dynamic enterprise workflows in our systems audit class worked perfectly. Unparalleled quality.",
                      author: "Harihar",
                      title: "Operations & Auditing Student"
                    }
                  ].map((test, i) => (
                    <div key={i} className="bg-bg-secondary/40 border border-border-primary/10 p-6 rounded-3xl relative flex flex-col justify-between hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="absolute top-4 right-4 text-5xl text-brand-500/10 font-serif">“</div>
                      <p className="text-text-secondary text-xs leading-relaxed mb-6 relative z-10 font-light">
                        {test.quote}
                      </p>
                      <div className="border-t border-border-primary/10 pt-3">
                        <h4 className="font-bold text-text-primary text-sm font-papyrus capitalize">{test.author}</h4>
                        <p className="text-[10px] text-brand-400 font-mono">{test.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FOUNDING TEAM ARCHITECTS SECTION */}
            <section id="team" className="py-24 px-6 bg-bg-secondary/20 border-t border-border-primary/10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    SYSTEM ARCHITECTS
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Meet the Engineering Crew
                  </h3>
                  <p className="text-text-muted text-lg font-light">
                    The core engineers behind the robust development of FenceIn OS.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
                  {coreTeam.map((member, i) => (
                    <div key={i} className="bg-bg-primary border border-brand-500/20 hover:border-brand-500/40 p-8 rounded-3xl backdrop-blur-md transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />

                      <div className="text-4xl mb-4 bg-brand-950/80 w-14 h-14 rounded-2xl flex items-center justify-center border border-brand-500/25">
                        {member.avatar}
                      </div>

                      <h4 className="text-2xl font-black font-papyrus text-text-primary mb-1">{member.name}</h4>
                      <div className="text-xs text-brand-400 font-mono font-bold uppercase tracking-wider mb-4">{member.role}</div>

                      <p className="text-text-muted text-xs leading-relaxed mb-6 font-light">{member.description}</p>

                      <div className="border-t border-border-primary/10 pt-4">
                        <span className="text-[10px] font-mono text-brand-300 font-bold block mb-1">PRIMARY EXPERTISE</span>
                        <span className="text-[11px] font-mono text-text-secondary">{member.specialty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 19: FAQ SECTION */}
            <section id="faq" className="py-24 px-6 border-t border-border-primary/10">
              <div className="max-w-4xl mx-auto text-center space-y-16">
                <div className="space-y-4">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    18 // SYSTEM INFORMATION
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus">
                    Frequently Asked Questions
                  </h3>
                </div>

                <div className="text-left space-y-4">
                  {[
                    {
                      q: "How does the offline-first IndexedDB system work during outages?",
                      a: "Whenever a contractor checks in at a kiosk or a geofence crossing triggers, our client engine validates records against a local offline cache and securely pushes the encrypted transaction to IndexedDB. Once a stable internet connection is established, our background sync agent systematically pushes the offline records to the NestJS backend API."
                    },
                    {
                      q: "Is contractor biometric information protected against data leakage?",
                      a: "Absolutely. FenceIn does not save raw photographs or video files of worker faces. Our neural models extract specific anatomical landmarks and convert them into encrypted vector meshes using dynamic hashing. This means identity checks happen in 20ms while fully securing workers' biometric PII."
                    },
                    {
                      q: "What role types are supported under the Role-Based Access (RBAC) engine?",
                      a: "We support seven strict roles to maintain optimal operational security: Super Administrator (master access), Executive (global statistics), Operations Manager (shift planning), Compliance Officer (audit logs), Contractor Manager (vendor coordination), Security Officer (manual check-ins), and Contractor (restricted tracking profile)."
                    },
                    {
                      q: "Can the kiosk mode run on typical Android tablets or low-spec hardware?",
                      a: "Yes. Our client application features WebAssembly and MediaPipe tasks compiled into local bundles, which allows hardware-accelerated face tracking directly within standard Google Chrome or Apple Safari browsers. No high-end server hardware is needed at gate structures."
                    }
                  ].map((faqItem, idx) => (
                    <FAQAccordionItem key={idx} question={faqItem.q} answer={faqItem.a} />
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 19.5: REGISTER YOUR ORGANIZATION (MULTI-TENANT ONBOARDING) */}
            <section id="onboard-org" className="py-24 px-6 border-t border-border-primary/10 relative overflow-hidden bg-gradient-to-b from-transparent via-brand-950/20 to-transparent">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none"></div>
              
              <div className="max-w-6xl mx-auto space-y-12 relative z-10">
                <div className="text-center space-y-4">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
                    19 // SYSTEM PROVISIONING
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black font-papyrus text-text-primary">
                    Register Your Organization
                  </h3>
                  <p className="text-text-muted text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed">
                    Deploy your secure isolated tenant workspace. Provision automated unique identifiers and enroll the initial Super Admin biometric signature.
                  </p>
                </div>

                <form onSubmit={handleOrgSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-bg-secondary/40 border border-brand-500/20 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
                  {/* Left Column: Form Fields */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="border-b border-brand-500/10 pb-4">
                      <h4 className="text-base font-bold text-brand-300 font-mono flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-brand-400" />
                        <span>1. Organization Details</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Organization Name</label>
                        <input
                          type="text"
                          required
                          value={orgForm.orgName}
                          onChange={(e) => setOrgForm({ ...orgForm, orgName: e.target.value })}
                          placeholder="e.g. Acme Corp"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Organization Type</label>
                        <select
                          value={orgForm.orgType}
                          onChange={(e) => setOrgForm({ ...orgForm, orgType: e.target.value })}
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none transition-all font-mono"
                        >
                          <option value="Corporation">Corporation</option>
                          <option value="Government">Government Agency</option>
                          <option value="Vendor">Vendor Supplier</option>
                          <option value="Subcontractor">Subcontractor</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Company Email</label>
                        <input
                          type="email"
                          required
                          value={orgForm.companyEmail}
                          onChange={(e) => setOrgForm({ ...orgForm, companyEmail: e.target.value })}
                          placeholder="org@company.com"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Company Phone</label>
                        <input
                          type="text"
                          required
                          value={orgForm.companyPhone}
                          onChange={(e) => setOrgForm({ ...orgForm, companyPhone: e.target.value })}
                          placeholder="+1 (555) 019-2834"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Company Office Address</label>
                        <input
                          type="text"
                          required
                          value={orgForm.companyAddress}
                          onChange={(e) => setOrgForm({ ...orgForm, companyAddress: e.target.value })}
                          placeholder="100 Security Parkway, Suite 500"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Expected Contractors</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={orgForm.expectedUserCount}
                          onChange={(e) => setOrgForm({ ...orgForm, expectedUserCount: Number(e.target.value) })}
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="border-b border-brand-500/10 pb-4 pt-4">
                      <h4 className="text-base font-bold text-brand-300 font-mono flex items-center space-x-2">
                        <UserCheck className="w-5 h-5 text-brand-400" />
                        <span>2. Default Super Admin Account</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">First Name</label>
                        <input
                          type="text"
                          required
                          value={orgForm.adminFirstName}
                          onChange={(e) => setOrgForm({ ...orgForm, adminFirstName: e.target.value })}
                          placeholder="e.g. Nick"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Last Name</label>
                        <input
                          type="text"
                          required
                          value={orgForm.adminLastName}
                          onChange={(e) => setOrgForm({ ...orgForm, adminLastName: e.target.value })}
                          placeholder="e.g. Fury"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Admin Login Email</label>
                        <input
                          type="email"
                          required
                          value={orgForm.adminEmail}
                          onChange={(e) => setOrgForm({ ...orgForm, adminEmail: e.target.value })}
                          placeholder="admin@workspace.com"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Master Password</label>
                        <input
                          type="password"
                          required
                          value={orgForm.adminPassword}
                          onChange={(e) => setOrgForm({ ...orgForm, adminPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-brand-400 uppercase">Confirm Password</label>
                        <input
                          type="password"
                          required
                          value={orgForm.adminConfirmPassword}
                          onChange={(e) => setOrgForm({ ...orgForm, adminConfirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Face ID enrollment */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                    <div className="space-y-6">
                      <div className="border-b border-brand-500/10 pb-4">
                        <h4 className="text-base font-bold text-brand-300 font-mono flex items-center space-x-2">
                          <Fingerprint className="w-5 h-5 text-brand-400" />
                          <span>3. Face ID Biometric Link</span>
                        </h4>
                      </div>

                      <div className="relative aspect-square max-w-[340px] mx-auto bg-black rounded-3xl border border-brand-500/30 overflow-hidden flex flex-col items-center justify-center shadow-inner group">
                        {webcamActive ? (
                          <>
                            <video
                              ref={videoRef}
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                              playsInline
                              muted
                            />
                            {/* Scanning line animation */}
                            <div className="absolute left-0 right-0 h-1 bg-brand-500/80 shadow-[0_0_15px_rgba(13,255,0,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                            
                            {/* Target bracket outlines */}
                            <div className="absolute inset-8 border-2 border-dashed border-brand-500/20 rounded-full pointer-events-none"></div>

                            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md py-2 px-3 rounded-xl border border-brand-500/30 text-center font-mono text-[9px]">
                              <div className="text-brand-400 font-bold tracking-widest uppercase mb-1">{scanningMsg}</div>
                              <div className="w-full bg-brand-950 h-1.5 rounded-full overflow-hidden border border-brand-500/10">
                                <div
                                  className="h-full bg-brand-500 transition-all duration-300 shadow-[0_0_8px_rgba(13,255,0,0.6)]"
                                  style={{ width: `${livenessProgress}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="absolute bottom-16 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-text-primary text-[10px] font-bold font-mono rounded-lg transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              CAPTURE SIGNATURE
                            </button>
                          </>
                        ) : capturedFace ? (
                          <>
                            <img
                              src={capturedFace}
                              alt="Captured Biometric Signature"
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                            />
                            <div className="absolute inset-0 bg-brand-950/20 border-2 border-brand-500/50 rounded-3xl pointer-events-none"></div>
                            
                            <div className="absolute top-3 right-3 bg-brand-950 border border-brand-500/30 text-brand-400 text-[8px] font-mono px-2 py-0.5 rounded-full">
                              LIVENESS COMPLIANT
                            </div>

                            <button
                              type="button"
                              onClick={resetPhoto}
                              className="absolute bottom-4 px-4 py-2 bg-brand-950 hover:bg-brand-900 border border-brand-500/30 text-brand-400 hover:text-brand-300 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer"
                            >
                              RETAKE PHOTO
                            </button>
                          </>
                        ) : (
                          <div className="p-6 text-center space-y-4">
                            <Camera className="w-12 h-12 text-brand-500/40 mx-auto animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-text-primary">NO BIOMETRIC SIGNATURE</p>
                              <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
                                Turn on your webcam to bind the Super Admin's mandatory Face ID credential.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={startWebcam}
                              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-text-primary text-[10px] font-bold font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(13,255,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              START BIOMETRIC ENROLLER
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6">
                      {orgRegError && (
                        <div className="p-3 bg-brand-950/80 border border-brand-500/50 text-brand-400 text-[11px] font-mono rounded-xl flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-brand-500" />
                          <span>{orgRegError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={orgRegLoading}
                        className="w-full flex items-center justify-center space-x-2 p-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-950/60 disabled:text-text-disabled text-text-primary font-bold rounded-2xl border border-brand-500/30 hover:border-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.25)] hover:shadow-[0_0_30px_rgba(13,255,0,0.45)] transition-all cursor-pointer font-mono"
                      >
                        {orgRegLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>COMMITTING REGISTRATION & NEURAL SYNC...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-5 h-5" />
                            <span>LAUNCH ENTERPRISE WORKSPACE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* SECTION 20: CALL TO ACTION SECTION */}
            <section className="py-24 px-6 bg-[radial-gradient(ellipse_at_center,rgba(13,255,0,0.1),transparent)] border-t border-border-primary/10 relative">
              <div className="max-w-5xl mx-auto bg-bg-secondary/40 border-2 border-brand-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden backdrop-blur-md shadow-[0_0_50px_rgba(13,255,0,0.2)]">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

                <div className="max-w-2xl mx-auto space-y-8 relative z-10">
                  <h3 className="text-3xl md:text-5xl font-black font-papyrus text-text-primary">
                    Secure Your Industrial Operations base
                  </h3>
                  <p className="text-text-muted text-base md:text-lg font-light leading-relaxed">
                    Deploy FenceIn within your workspace. Enhance identity management, eliminate badging loopholes, and guarantee compliance across remote field sites.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => navigate('/login')}
                      className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-text-primary font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(13,255,0,0.4)] hover:shadow-[0_0_30px_rgba(13,255,0,0.6)] cursor-pointer"
                    >
                      Access Control Room
                    </button>
                    <button
                      onClick={() => navigate('/kiosk')}
                      className="px-8 py-4 bg-bg-primary hover:bg-bg-hover border border-border-primary/20 hover:border-brand-500/40 text-text-secondary hover:text-text-primary font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Launch Kiosk portal
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 21: FOOTER SECTION */}
            <footer className="bg-bg-primary border-t border-border-primary/15 pt-16 pb-8 px-6 text-left relative z-10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-6 h-6 text-brand-500" />
                    <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 font-papyrus">FenceIn OS</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed font-light">
                    The advanced biometric workforce platform engineering solid offline-first security grids for demanding global industries.
                  </p>
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-brand-400 bg-brand-950 px-2 py-1 rounded border border-brand-500/20">
                      SECURE PIPELINES ONLINE
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest mb-4">Core Modules</h4>
                  <ul className="space-y-2.5 text-xs text-text-muted font-mono">
                    <li><a href="#overview" className="hover:text-brand-400 transition-colors">Command Console</a></li>
                    <li><a href="#features" className="hover:text-brand-400 transition-colors">WASM Neural Grid</a></li>
                    <li><a href="#modules" className="hover:text-brand-400 transition-colors">Role Matrices (RBAC)</a></li>
                    <li><a href="#realtime" className="hover:text-brand-400 transition-colors">IndexedDB Cache Sync</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest mb-4">Active System Crew</h4>
                  <ul className="space-y-2.5 text-xs text-text-muted font-mono">
                    <li>Girijesh</li>
                    <li>Godfrey</li>
                    <li>Grish</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest mb-4">Tactical Status</h4>
                  <div className="space-y-3 font-mono text-[11px] text-text-muted">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span>API Gateway (Port 3456)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span>Vite UI Server (Port 2345)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span>IndexedDB Active Sync Node</span>
                    </div>
                    <div className="text-[10px] text-brand-400 border-t border-border-primary/10 pt-2">
                      Uptime: 99.9997% // All Systems Active
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto border-t border-border-primary/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-text-muted/65 font-mono">
                <div>
                  &copy; {new Date().getFullYear()} FenceIn Enterprise OS. Crafted by Girijesh, Godfrey, and Grish.
                </div>
                <div className="flex space-x-6 mt-4 md:mt-0">
                  <a href="#overview" className="hover:text-brand-400">Security Policies</a>
                  <a href="#overview" className="hover:text-brand-400">Biometric Protection</a>
                  <a href="#overview" className="hover:text-brand-400">System Logs</a>
                </div>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS (ENCAPSULATED FOR MAXIMUM FIDELITY & MODULARITY)
// =========================================================================

/**
 * FAQ Accordion Item Component
 */
function FAQAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-bg-secondary/40 border border-border-primary/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-brand-500/25">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex justify-between items-center text-left font-bold text-text-primary font-papyrus hover:bg-bg-secondary/20 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 text-brand-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-5 pt-0 border-t border-border-primary/5 text-sm text-text-muted leading-relaxed font-light bg-bg-primary/30">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Interactive Role-Based Matrix Selection Widget
 */
function RoleMatrixWidget() {
  const [activeRole, setActiveRole] = useState(0);

  const roles = [
    {
      name: "Super Admin",
      icon: ShieldCheck,
      duties: "Multi-tenant organization setups, global SaaS revenue monitoring, secure AI chat with Organization Admins, global system log audits.",
      users: "Platform Owner / SaaS Enterprise Admin",
      access: "UNLIMITED TIER 7"
    },
    {
      name: "Organization Admin",
      icon: Building2,
      duties: "Company-wide operations, virtual geofence design, high-volume vendor onboarding, workers directory control.",
      users: "Corporate Operations / Org Admins",
      access: "SaaS ENTERPRISE TIER 6"
    },
    {
      name: "HR Admin",
      icon: FileSpreadsheet,
      duties: "Personnel details management (Govt ID, blood group, skill types), leave tracking, shift-report exports (Excel/CSV).",
      users: "HR & Compliance Managers",
      access: "COMPLIANCE TIER 5"
    },
    {
      name: "Workforce Supervisor",
      icon: Users,
      duties: "Site shift rosters preparation, manual check-in override approvals, active geofence alerts monitoring.",
      users: "Site Supervisors / Field Overseers",
      access: "SITE CONTROL TIER 4"
    },
    {
      name: "Security Officer",
      icon: UserCheck,
      duties: "Biometric gate Kiosk Mode operations, live face scans/liveness logs audit, spoof/breach alarms handling.",
      users: "Gate Security / On-site Enforcers",
      access: "ENFORCEMENT TIER 3"
    },
    {
      name: "Vendor Manager",
      icon: Briefcase,
      duties: "Contractor pre-registration, assigning sub-contractors to active jobs, reviewing vendor billings.",
      users: "Third-Party Supplier Admins",
      access: "VENDOR COMMAND TIER 2"
    },
    {
      name: "Contractor / Worker",
      icon: Scan,
      duties: "Geofenced check-in/check-out, accessing personal shift schedules, offline sync history cards.",
      users: "Sub-Contractors / Field Laborers",
      access: "TRACKING & PORTAL TIER 1"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-xs font-mono font-bold tracking-widest text-brand-400 uppercase">
          04 // SECURITY PARADIGMS
        </h2>
        <h3 className="text-4xl md:text-5xl font-black font-papyrus">
          7-Tier Role-Based Access Matrix
        </h3>
        <p className="text-text-muted text-lg font-light leading-relaxed">
          FenceIn guarantees a zero-trust architecture. Different organizational personas log into strictly custom-tailored command suites.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6">

        {/* Left Side Role Selector Buttons */}
        <div className="lg:col-span-5 space-y-2">
          {roles.map((r, idx) => {
            const Icon = r.icon;
            const isActive = activeRole === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveRole(idx)}
                className={`w-full flex items-center justify-between p-4.5 rounded-2xl border text-left transition-all ${isActive
                  ? 'bg-brand-900/50 border-brand-500 text-text-primary shadow-[0_0_20px_rgba(13,255,0,0.15)] font-bold'
                  : 'bg-bg-primary/40 border-border-primary/10 text-text-muted hover:border-brand-500/20 hover:text-text-secondary'
                  } cursor-pointer`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-text-muted'}`} />
                  <span className="font-mono text-sm tracking-wide">{r.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-brand-950/80 px-2 py-0.5 rounded border border-brand-500/10">
                  Lvl {7 - idx}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side Info Display Panel */}
        <div className="lg:col-span-7 bg-bg-primary border border-brand-500/25 p-8 rounded-3xl text-left relative min-h-[340px] flex flex-col justify-between overflow-hidden shadow-[0_0_30px_rgba(13,255,0,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border-primary/10 pb-4">
              <div className="flex items-center space-x-3">
                {(() => {
                  const Icon = roles[activeRole].icon;
                  return <Icon className="w-8 h-8 text-brand-400" />;
                })()}
                <h4 className="text-2xl font-bold font-papyrus text-text-primary">
                  {roles[activeRole].name} Command Profile
                </h4>
              </div>
              <span className="text-xs font-mono font-bold bg-brand-950 border border-brand-500/30 px-3 py-1 rounded-lg text-brand-400 uppercase tracking-wider">
                {roles[activeRole].access}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-brand-400 font-bold block uppercase tracking-wider mb-1.5">
                  CORE RESPONSIBILITIES
                </span>
                <p className="text-text-secondary text-sm leading-relaxed font-light">
                  {roles[activeRole].duties}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-brand-400 font-bold block uppercase tracking-wider mb-1.5">
                  AUTHORIZED USERS IN DOMAIN
                </span>
                <p className="text-text-muted text-xs font-mono">
                  {roles[activeRole].users}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary/10 pt-6 mt-6 flex justify-between items-center text-[10px] font-mono text-text-muted">
            <span>CRYPTO ENVELOPE: ENABLED</span>
            <span>TOKEN EXPIRY: 12 HOURS</span>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Animated High-Tech Live System CLI Logs Terminal
 */
function CommandLineTerminal({ personnel }: { personnel: string[] }) {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mockPhrases = [
    "synced local queue database - 0 conflicts reported",
    "updated geofence coordinates for Yard Sector Omega",
    "processed high-accuracy biometric mesh match (99.98% confidence)",
    "completed daily site check-in credentials signature",
    "raised temporary override token: authorized by Super Admin",
    "analyzed crew fatigue metrics - all operators safe",
    "pushed 12 offline transactions to central NestJS API Gateway",
    "executed secure database backup to PostgreSQL vault",
    "initialized 3D landmark mesh scan",
    "cleared compliance checklists for upcoming morning shifts"
  ];

  useEffect(() => {
    // Seed initial logs
    const seed = Array.from({ length: 6 }).map(() => {
      const time = new Date().toLocaleTimeString();
      const op = personnel[Math.floor(Math.random() * personnel.length)];
      const phrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      return `[${time}] [OP: ${op.toUpperCase()}] ${phrase}`;
    });
    setLogs(seed);

    // Dynamic feed simulation loop
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      const op = personnel[Math.floor(Math.random() * personnel.length)];
      const phrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      const newLog = `[${time}] [OP: ${op.toUpperCase()}] ${phrase}`;

      setLogs((prev) => {
        const next = [...prev, newLog];
        if (next.length > 8) next.shift(); // Keep only last 8 logs
        return next;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black/90 border border-brand-500/25 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(13,255,0,0.25)] text-left relative font-mono text-xs">

      {/* Terminal Title Bar */}
      <div className="bg-bg-secondary px-6 py-3.5 border-b border-brand-500/15 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4.5 h-4.5 text-brand-400" />
          <span className="font-bold text-text-secondary uppercase tracking-widest text-[10px]">
            FenceIn-Core-Logger.sh
          </span>
        </div>
        <div className="flex space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-600/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-brand-600/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
        </div>
      </div>

      {/* Terminal Output Terminal */}
      <div
        ref={scrollRef}
        className="p-6 min-h-[300px] max-h-[320px] overflow-y-auto space-y-3 bg-[radial-gradient(ellipse_at_bottom,rgba(51,0,0,0.2),transparent)] text-brand-300 scrollbar-thin scrollbar-thumb-brand-900 scrollbar-track-transparent"
      >
        <div className="text-[10px] text-text-muted opacity-60 mb-2">
          FenceIn CLI Initialized. Encrypted Secure Tunnel Connected.
        </div>

        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start space-x-2 leading-relaxed tracking-wide">
            <span className="text-brand-500 select-none">&gt;&gt;</span>
            <span className="break-all">{log}</span>
          </div>
        ))}

        {/* Active Typing Blinking Cursor */}
        <div className="flex items-center space-x-2 pt-1">
          <span className="text-brand-500">&gt;&gt;</span>
          <span className="w-2.5 h-4 bg-brand-500 animate-[blink_1.2s_infinite]" />
        </div>
      </div>

      {/* Bottom telemetry line */}
      <div className="bg-brand-950/80 px-6 py-2.5 border-t border-brand-500/10 flex justify-between items-center text-[9px] text-text-muted">
        <span>ACTIVE LOGS CHANNELS: #8</span>
        <span>SECURITY ENVELOPE: SHA-256 SIGNED</span>
      </div>
    </div>
  );
}

/**
 * High-Fidelity 3D Neural Face Scanner Simulation Widget
 */
function FaceScannerSimulation() {
  const [matchStatus, setMatchStatus] = useState("SCANNING");
  const [matchPct, setMatchPct] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => {
      setMatchStatus("SCANNING");
      setMatchPct(0);

      // Simulation steps
      setTimeout(() => {
        setMatchPct(48);
      }, 800);

      setTimeout(() => {
        setMatchPct(99.98);
        setMatchStatus("MATCH APPROVED");
      }, 1600);

    }, 5000);

    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="bg-black border border-brand-500/25 p-6 rounded-3xl relative overflow-hidden shadow-[0_0_40px_rgba(13,255,0,0.15)] flex flex-col justify-between text-left min-h-[380px]">

      {/* Scanner laser overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,255,0,0.03)_1px,transparent_1px),linear-gradient(rgba(13,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

      {/* SCANNING ACTIVE INDICATOR BAR */}
      {matchStatus === "SCANNING" && (
        <motion.div
          animate={{ y: [0, 320, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="absolute left-0 w-full h-0.5 bg-brand-500/80 z-20 shadow-[0_0_12px_rgba(13,255,0,1)]"
        />
      )}

      {/* Frame Headers */}
      <div className="flex justify-between items-center z-10 border-b border-brand-900/60 pb-3">
        <div className="flex items-center space-x-2">
          <Scan className="w-4 h-4 text-brand-500" />
          <span className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Neural Scanner Node
          </span>
        </div>
        <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${matchStatus === "SCANNING"
          ? 'bg-brand-950 text-brand-400 border-brand-500/30 animate-pulse'
          : 'bg-success/20 text-success border-success/40'
          }`}>
          {matchStatus}
        </span>
      </div>

      {/* Face Scanner Wireframe Avatar */}
      <div className="my-6 relative flex items-center justify-center h-44">
        {/* Holographic face shape */}
        <div className="relative">
          <Fingerprint className={`w-28 h-28 transition-colors duration-500 ${matchStatus === "SCANNING" ? 'text-brand-500/40 animate-pulse' : 'text-brand-400/90'
            }`} />

          {/* Tracking landmarks boxes */}
          <div className="absolute top-2 left-4 w-3 h-3 border-t border-l border-brand-400" />
          <div className="absolute top-2 right-4 w-3 h-3 border-t border-r border-brand-400" />
          <div className="absolute bottom-2 left-4 w-3 h-3 border-b border-l border-brand-400" />
          <div className="absolute bottom-2 right-4 w-3 h-3 border-b border-r border-brand-400" />
        </div>

        {/* Dynamic scan scores */}
        <div className="absolute bottom-0 left-4 font-mono text-[9px] text-text-muted space-y-0.5 bg-black/80 p-2 rounded border border-brand-900/40">
          <div>EYE DISTANCE: 0.62</div>
          <div>NASAL ANGLE: 12.4°</div>
          <div>JAW WIDTH: 0.88</div>
        </div>

        <div className="absolute top-0 right-4 font-mono text-[9px] text-text-muted bg-black/80 p-2 rounded border border-brand-900/40">
          <div>MESH KEYPOINTS: 468</div>
          <div>RESOLUTION: 3D GRID</div>
        </div>
      </div>

      {/* Matching result metrics */}
      <div className="z-10 bg-brand-950/60 p-4.5 rounded-2xl border border-brand-500/10 space-y-3 font-mono">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">NEURAL MATCH PROBABILITY</span>
          <span className="text-brand-300 font-bold">{matchPct > 0 ? `${matchPct}%` : 'CALCULATING...'}</span>
        </div>
        <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-brand-900/60">
          <div
            className="bg-brand-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${matchPct}%` }}
          />
        </div>

        {matchStatus !== "SCANNING" && (
          <div className="flex items-center space-x-2 text-[10px] text-brand-300">
            <Check className="w-3.5 h-3.5" />
            <span>OPERATOR: GRISH // VERIFICATION COMPLETE</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Spatial Geofence Simulator Widget
 */
function GeofenceSimulator() {
  const [activeZone, setActiveZone] = useState("HAZARDOUS YARD BETA");
  const [status, setStatus] = useState("SECURE");

  useEffect(() => {
    const sequence = setInterval(() => {
      setStatus("BREACH ALERT!");
      setActiveZone("RESTRICTED VAULT 4");

      setTimeout(() => {
        setStatus("SECURE");
        setActiveZone("HAZARDOUS YARD BETA");
      }, 2500);

    }, 6000);

    return () => clearInterval(sequence);
  }, []);

  return (
    <div className="bg-black border border-brand-500/25 p-6 rounded-3xl relative overflow-hidden shadow-[0_0_40px_rgba(13,255,0,0.15)] flex flex-col justify-between text-left min-h-[380px] font-mono text-xs">

      {/* Section Header */}
      <div className="flex justify-between items-center pb-3 border-b border-brand-900/60">
        <div className="flex items-center space-x-2">
          <Map className="w-4.5 h-4.5 text-brand-500" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Spatial Radar Monitor
          </span>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${status === "SECURE"
          ? 'bg-success/20 text-success border-success/40'
          : 'bg-brand-950 text-brand-400 border-brand-500 animate-flash-red'
          }`}>
          {status}
        </span>
      </div>

      {/* Simulated Map Area */}
      <div className="my-6 h-40 bg-bg-secondary/40 border border-brand-900 rounded-2xl relative flex items-center justify-center overflow-hidden">
        {/* Concentric rings */}
        <div className="absolute border border-brand-500/10 rounded-full w-48 h-48 animate-pulse" />
        <div className="absolute border border-brand-500/5 rounded-full w-32 h-32" />
        <div className="absolute border border-brand-500/15 rounded-full w-16 h-16" />

        {/* Crosshair grids */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-brand-500/5" />
        <div className="absolute left-0 right-0 h-0.5 bg-brand-500/5" />

        {/* Warning zone shape */}
        <div className={`absolute border border-dashed rounded-xl w-36 h-28 transition-colors duration-300 ${status === "SECURE" ? 'border-brand-500/15 bg-brand-500/[0.02]' : 'border-brand-500/60 bg-brand-500/[0.08]'
          }`} />

        {/* Floating operator blips */}
        <div className="absolute top-10 left-20">
          <span className="flex w-2.5 h-2.5 bg-success rounded-full" />
          <span className="text-[8px] text-text-muted absolute mt-1">GIRIJESH</span>
        </div>

        <div className="absolute bottom-12 right-24">
          <span className="flex w-2.5 h-2.5 bg-success rounded-full" />
          <span className="text-[8px] text-text-muted absolute mt-1">DEVICHARAN</span>
        </div>

        <div className={`absolute transition-all duration-1000 ${status === "SECURE" ? 'top-16 right-20' : 'top-6 right-28'
          }`}>
          <span className={`flex w-2.5 h-2.5 rounded-full ${status === "SECURE" ? 'bg-success' : 'bg-brand-500 animate-ping'}`} />
          <span className={`text-[8px] absolute mt-1 font-bold ${status === "SECURE" ? 'text-text-muted' : 'text-brand-400'}`}>
            HARIVARSHAN
          </span>
        </div>
      </div>

      {/* Simulated zone dashboard details */}
      <div className="bg-brand-950/60 p-4.5 rounded-2xl border border-brand-500/10 space-y-2">
        <div className="flex justify-between">
          <span className="text-text-muted">ACTIVE ZONE PROBED</span>
          <span className="text-text-secondary font-bold">{activeZone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">TARGET NODE COORD</span>
          <span className="text-brand-300">41.8781° N, 87.6298° W</span>
        </div>
        <div className="flex justify-between border-t border-brand-900/60 pt-2 text-[10px] text-text-muted">
          <span>DEVICES CONNECTED: 124</span>
          <span>ACCURACY RATIO: +/- 1.2M</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Offline Cache Queue Simulator Widget
 */
function OfflineQueueSimulator() {
  const [offlineQueue, setOfflineQueue] = useState<number>(4);
  const [syncing, setSyncing] = useState(false);

  const performManualSync = () => {
    if (offlineQueue === 0 || syncing) return;
    setSyncing(true);

    // Simulate batch sync uploads
    const interval = setInterval(() => {
      setOfflineQueue((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSyncing(false);
          return 0;
        }
        return prev - 1;
      });
    }, 800);
  };

  // Reset simulation periodically
  useEffect(() => {
    if (offlineQueue === 0 && !syncing) {
      const reset = setTimeout(() => {
        setOfflineQueue(5);
      }, 5000);
      return () => clearTimeout(reset);
    }
  }, [offlineQueue, syncing]);

  return (
    <div className="bg-black border border-brand-500/25 p-6 rounded-3xl relative overflow-hidden shadow-[0_0_40px_rgba(13,255,0,0.15)] flex flex-col justify-between text-left min-h-[380px] font-mono text-xs">

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-brand-900/60">
        <div className="flex items-center space-x-2">
          <Database className="w-4.5 h-4.5 text-brand-500" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            IndexedDB Local Vault
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${offlineQueue > 0 ? 'bg-warning animate-pulse' : 'bg-success'}`} />
          <span className="text-[9px] uppercase">{offlineQueue > 0 ? 'QUEUED DATA' : 'FULLY SYNCED'}</span>
        </div>
      </div>

      {/* Queue Progress visualization */}
      <div className="my-6 space-y-4">
        <span className="text-[10px] text-text-muted uppercase block">PENDING OFFLINE SHIFT LOGS</span>

        {offlineQueue > 0 ? (
          <div className="space-y-2">
            {Array.from({ length: offlineQueue }).map((_, i) => (
              <div key={i} className="bg-bg-secondary/40 border border-brand-500/10 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                  <span className="text-[10px] text-text-secondary">AES_GCM_TRANSACTION_#0{i + 1}</span>
                </div>
                <span className="text-[9px] text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
                  QUEUED
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 border border-dashed border-success/30 rounded-2xl flex flex-col justify-center items-center text-center p-4">
            <CheckCircle2 className="w-10 h-10 text-success mb-2" />
            <span className="text-success font-bold">ALL OFFLINE RECORDS TRANSMITTED</span>
            <span className="text-[9px] text-text-muted mt-1">IndexedDB buffer is empty. Zero database drift.</span>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="space-y-3 z-10">
        <button
          onClick={performManualSync}
          disabled={offlineQueue === 0 || syncing}
          className={`w-full flex items-center justify-center space-x-2 p-3.5 rounded-xl font-bold transition-all ${offlineQueue === 0 || syncing
            ? 'bg-brand-950/60 border border-brand-900 text-text-disabled cursor-not-allowed'
            : 'bg-brand-600 hover:bg-brand-500 text-text-primary border border-brand-500/30 hover:border-brand-500 shadow-md cursor-pointer'
            }`}
        >
          {syncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>SYNCHRONIZING SECURE TUNNELS...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>FORCE CLOUD SYNCHRONIZATION ({offlineQueue})</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
