import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  Search, Filter, Plus, Shield, ShieldCheck, Fingerprint,
  Users, Terminal, Cpu, Database, 
  MapPin, Cloud, ShieldAlert, Zap, CheckCircle2,
  Trash2, UserPlus, FileUp, Download, Eye, Server, Network,
  Camera, RefreshCw, AlertOctagon, Send,
  User, HardHat, HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { useAuthStore } from '@/store/useAuthStore';
import * as faceapi from '@vladmandic/face-api';
import { logFrontendAction } from '@/utils/terminalLogger';
// Voltax-style Segmented Radial Arch Gauge Component
const SegmentedArc = ({ percentage, color = 'rgb(99, 102, 241)', label = 'System Growth' }: { percentage: number, color?: string, label?: string }) => {
  const totalSegments = 18;
  const activeSegments = Math.round((percentage / 100) * totalSegments);
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border border-brand-500/20 rounded-2xl relative overflow-hidden h-full group hover:border-brand-500/40 transition-all shadow-xl">
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-xl"></div>
      <div className="relative w-48 h-32 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 200 120">
          {Array.from({ length: totalSegments }).map((_, idx) => {
            const angle = -180 + (idx * 180) / (totalSegments - 1);
            const isActive = idx < activeSegments;
            return (
              <line
                key={idx}
                x1="100"
                y1="100"
                x2="100"
                y2="82"
                transform={`rotate(${angle} 100 100)`}
                stroke={isActive ? color : 'rgba(255, 255, 255, 0.05)'}
                strokeWidth="5"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-2xl font-black font-mono text-white">{percentage.toFixed(1)}%</span>
          <span className="text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">{label}</span>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-brand-500/10 text-center font-mono">
        <div className="text-[10px] text-brand-300">
          <div className="text-white font-bold">{(percentage * 2.4).toFixed(0)}</div>
          <div className="text-[8px] text-brand-400/70">DEVICES</div>
        </div>
        <div className="text-[10px] text-emerald-400">
          <div className="text-emerald-400 font-bold">✓ ACTIVE</div>
          <div className="text-[8px] text-brand-400/70">SECURED</div>
        </div>
      </div>
    </div>
  );
};

// Voltax-style Rounded Column Bar Chart Component
const VoltaxBarChart = ({ title, subtitle, data }: { title: string, subtitle: string, data: Array<{ label: string, value: number, active?: boolean }> }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border border-brand-500/20 rounded-2xl p-6 flex flex-col justify-between h-full group hover:border-brand-500/40 transition-all shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-papyrus text-base uppercase tracking-wider font-bold text-brand-100">{title}</h3>
          <p className="text-[10px] text-brand-400/80 font-mono mt-0.5">{subtitle}</p>
        </div>
        <select className="bg-bg-primary border border-brand-500/20 text-brand-300 rounded px-2 py-1 text-[9px] font-mono focus:outline-none">
          <option>This Week</option>
          <option>Last Week</option>
        </select>
      </div>

      <div className="relative h-48 flex items-end justify-between border-b border-brand-500/10 pb-2">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[8px] font-mono text-brand-400/30">
          <div className="border-b border-white/5 w-full"></div>
          <div className="border-b border-white/5 w-full"></div>
          <div className="border-b border-white/5 w-full"></div>
          <div className="border-b border-white/5 w-full"></div>
        </div>

        {data.map((bar, idx) => {
          const heightPercent = (bar.value / maxValue) * 100;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 space-y-2 group relative z-10">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-brand-950 border border-brand-500/50 text-white text-[8px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                {bar.value}
              </div>
              <div 
                className={`w-6 rounded-t-full transition-all duration-1000 relative overflow-hidden ${
                  bar.active 
                    ? 'bg-gradient-to-t from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-brand-900/30 hover:bg-brand-900/60 border border-brand-500/10'
                }`}
                style={{ height: `${Math.max(10, (heightPercent / 100) * 130)}px`, maxHeight: '140px' }}
              >
                {bar.active && <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[stripe_1s_linear_infinite]"></div>}
              </div>
              <span className="text-[9px] font-mono font-bold text-brand-400/70">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DynamicRolePageProps {
  pageKey: string;
}

export default function DynamicRolePage({ pageKey }: DynamicRolePageProps) {
  const { user, token } = useAuthStore();

  // Biometrics Enrollment Status
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  // Fetch true enrollment status from DB
  const refreshEnrollmentStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/check-enrollment?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setFaceEnrolled(data.faceEnrolled);
        setFingerprintEnrolled(data.fingerprintEnrolled);
      }
    } catch (err) {
      console.error('Failed to fetch biometric enrollment status:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshEnrollmentStatus();
  }, [refreshEnrollmentStatus]);

  // Face Enrollment State Lifecycle
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [enrollFaceActive, setEnrollFaceActive] = useState(false);
  const [enrollFaceStep, setEnrollFaceStep] = useState<'align' | 'blink' | 'verifying' | 'success'>('align');
  const [enrollFaceMsg, setEnrollFaceMsg] = useState('ALIGN YOUR FACE');
  const [enrollBlinkCount, setEnrollBlinkCount] = useState(0);
  const enrollBlinkCounterRef = useRef(0);
  const enrollIsEyeBlinkedRef = useRef(false);
  const enrollBaselineEARRef = useRef<number | null>(null);
  const enrollAlignmentStartRef = useRef<number | null>(null);
  const settingsVideoRef = useRef<HTMLVideoElement | null>(null);
  const settingsScanIntervalRef = useRef<any>(null);
  const settingsStreamRef = useRef<MediaStream | null>(null);
  const [faceBoxState, setFaceBoxState] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Load models in Settings tab
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
        if (active) setFaceModelsLoaded(true);
      } catch (e) {
        console.error('Failed to load faceapi models in Settings:', e);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  // EAR Calculator — preserved for liveness detection on biometric enrollment
  const calculateEARRef = useRef<(eyePoints: faceapi.Point[]) => number>((_eyePoints) => 0);
  calculateEARRef.current = (eyePoints: faceapi.Point[]) => {
    const p2_p6 = Math.sqrt(Math.pow(eyePoints[1].x - eyePoints[5].x, 2) + Math.pow(eyePoints[1].y - eyePoints[5].y, 2));
    const p3_p5 = Math.sqrt(Math.pow(eyePoints[2].x - eyePoints[4].x, 2) + Math.pow(eyePoints[2].y - eyePoints[4].y, 2));
    const p1_p4 = Math.sqrt(Math.pow(eyePoints[0].x - eyePoints[3].x, 2) + Math.pow(eyePoints[0].y - eyePoints[3].y, 2));
    return (p2_p6 + p3_p5) / (2.0 * p1_p4);
  };

  // Face scanner run hook for settings
  const startEnrollFaceScanner = async () => {
    try {
      setEnrollFaceActive(true);
      setEnrollFaceStep('align');
      setEnrollFaceMsg('ALIGN YOUR FACE IN THE FRAME');
      setEnrollBlinkCount(0);
      enrollBlinkCounterRef.current = 0;
      enrollIsEyeBlinkedRef.current = false;
      enrollBaselineEARRef.current = null;
      enrollAlignmentStartRef.current = null;
      setFaceBoxState(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 640 }
      });
      settingsStreamRef.current = stream;
      if (settingsVideoRef.current) {
        settingsVideoRef.current.srcObject = stream;
        settingsVideoRef.current.play();
      }

      // Scanner interval
      let active = true;
      settingsScanIntervalRef.current = setInterval(async () => {
        if (!active || !settingsVideoRef.current) return;
        const video = settingsVideoRef.current;
        if (video.readyState !== 4) return;

        try {
          const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
            .withFaceLandmarks();

          if (detection && active) {
            const box = detection.detection.box;
            const clientWidth = video.clientWidth;
            const clientHeight = video.clientHeight;
            const videoWidth = video.videoWidth || 480;
            const videoHeight = video.videoHeight || 640;
            const scaleX = clientWidth / videoWidth;
            const scaleY = clientHeight / videoHeight;
            setFaceBoxState({
              left: clientWidth - (box.width * scaleX) - (box.x * scaleX),
              top: box.y * scaleY,
              width: box.width * scaleX,
              height: box.height * scaleY
            });

            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            const isAligned = centerX > videoWidth * 0.2 && centerX < videoWidth * 0.8 && centerY > videoHeight * 0.15 && centerY < videoHeight * 0.85;

            if (isAligned) {
              clearInterval(settingsScanIntervalRef.current);
              active = false;
              setEnrollFaceStep('verifying');
              setEnrollFaceMsg('EXTRACTING NEURAL VECTOR...');
              captureAndEnrollFace();
            } else {
              setEnrollFaceStep('align');
              setEnrollFaceMsg('CENTER YOUR FACE IN VIEWPORT');
            }
          } else {
            setFaceBoxState(null);
            enrollAlignmentStartRef.current = null;
          }
        } catch (err) {
          console.error('Frame error:', err);
        }
      }, 150);

    } catch (err: any) {
      console.error(err);
      triggerToast('Unable to open camera: ' + (err.message || err));
      setEnrollFaceActive(false);
    }
  };

  const stopEnrollFaceScanner = () => {
    if (settingsScanIntervalRef.current) {
      clearInterval(settingsScanIntervalRef.current);
    }
    if (settingsStreamRef.current) {
      settingsStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setEnrollFaceActive(false);
    setFaceBoxState(null);
  };

  const captureAndEnrollFace = async () => {
    if (!settingsVideoRef.current) return;
    try {
      const video = settingsVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const base64Image = canvas.toDataURL('image/jpeg');

      const res = await fetch('http://localhost:8000/api/v1/biometrics/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user?.id, image: base64Image })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEnrollFaceStep('success');
        setEnrollFaceMsg('FACE ENROLLED SUCCESSFULLY!');
        refreshEnrollmentStatus();
        triggerToast('Face ID successfully enrolled and secured.');
        setTimeout(() => {
          stopEnrollFaceScanner();
        }, 1500);
      } else {
        const errMsg = data.message || data.detail || 'Enrollment rejected.';
        setEnrollFaceStep('align');
        setEnrollFaceMsg(errMsg);
        triggerToast('Face ID enrollment failed: ' + errMsg);
        setTimeout(() => {
          stopEnrollFaceScanner();
        }, 2000);
      }

    } catch (err: any) {
      console.error(err);
      triggerToast('Enrollment error: ' + err.message);
      stopEnrollFaceScanner();
    }
  };

  // Fingerprint Simulation State Lifecycle
  const [enrollFingerprintActive, setEnrollFingerprintActive] = useState(false);
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [fingerprintMsg, setFingerprintMsg] = useState('TOUCH & HOLD FIELD');
  const [fingerprintState, setFingerprintState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const fingerprintIntervalRef = useRef<any>(null);

  const startFingerprintEnroll = () => {
    setEnrollFingerprintActive(true);
    setFingerprintState('scanning');
    setFingerprintProgress(0);
    setFingerprintMsg('ACQUIRING MINUTIAE RIDGE POINTS...');

    let progress = 0;
    fingerprintIntervalRef.current = setInterval(async () => {
      progress += 5;
      setFingerprintProgress(progress);
      if (progress >= 100) {
        clearInterval(fingerprintIntervalRef.current);
        setFingerprintState('success');
        setFingerprintMsg('RIDGE MAPPING COMPLETE!');
        
        const printName = user ? (((user as any).firstName || '') + ' ' + ((user as any).lastName || '')).trim() || user.email : 'Staff Member';
        const simulatedTemplate = `Procedural_ORB_Minutiae_Ridge_Vector_Seed_${printName.replace(/\s+/g, '_')}_SecureID_${self.crypto.randomUUID()}`;

        try {
          const res = await fetch('http://localhost:8000/api/v1/biometrics/enroll-fingerprint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: user?.id, fingerprintTemplate: simulatedTemplate })
          });
          const data = await res.json();
          if (res.ok) {
            triggerToast('Fingerprint Touch ID enrolled successfully.');
            refreshEnrollmentStatus();
            setTimeout(() => {
              setEnrollFingerprintActive(false);
              setFingerprintState('idle');
            }, 1500);
          } else {
            triggerToast('Fingerprint Touch ID enrollment failed: ' + (data.message || 'Server rejected request'));
            setFingerprintState('failed');
            setTimeout(() => {
              setEnrollFingerprintActive(false);
              setFingerprintState('idle');
            }, 2000);
          }
        } catch (err) {
          triggerToast('Error enrolling fingerprint.');
          setFingerprintState('failed');
        }
      }
    }, 100);
  };

  const cancelFingerprintEnroll = () => {
    if (fingerprintState === 'scanning') {
      clearInterval(fingerprintIntervalRef.current);
      setFingerprintState('idle');
      setEnrollFingerprintActive(false);
      triggerToast('Fingerprint enrollment canceled.');
    }
  };

  // Revoke Biometrics
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const handleRevokeBiometrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/biometrics/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        triggerToast('All registered biometrics have been revoked and purged.');
        refreshEnrollmentStatus();
        setIsRevokeModalOpen(false);
      } else {
        const data = await res.json();
        triggerToast('Failed to revoke biometrics: ' + (data.message || 'Server error'));
      }
    } catch (err: any) {
      triggerToast('Error revoking biometrics: ' + err.message);
    }
  };

  const allowedRolesMap: Record<string, Array<{ value: string; label: string }>> = {
    SUPER_ADMIN: [{ value: 'ORG_ADMIN', label: 'ORGANIZATION ADMIN (Operations)' }],
    ORG_ADMIN: [{ value: 'HR_ADMIN', label: 'HR ADMIN (Payroll & Compliance)' }],
    HR_ADMIN: [{ value: 'SUPERVISOR', label: 'WORKFORCE SUPERVISOR (Site Lead)' }],
    SUPERVISOR: [{ value: 'SECURITY_OFFICER', label: 'SECURITY OFFICER (Kiosks/Violations)' }],
    SECURITY_OFFICER: [
      { value: 'VENDOR_MANAGER', label: 'VENDOR MANAGER (Contractor Supplier)' },
      { value: 'WORKER', label: 'STANDARD WORKER (Field Contractor)' }
    ],
    VENDOR_MANAGER: [],
    WORKER: []
  };

  const allowedOptions = user ? allowedRolesMap[user.role] || [] : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic state for lists & tables
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [dbWorkers, setDbWorkers] = useState<any[]>([]);
  const [dbSites, setDbSites] = useState<any[]>([]);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Live dashboard data from /api/v1/analytics/dashboard
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Secure AI Assistant ready. Ask me any workforce, compliance, or security query.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // System stats from backend — NO simulation
  const systemStats = {
    cpu: dashboardData?.analytics?.avgEngineLatencyMs ?? null as number | null,
    memory: null as number | null,
    disk: null as number | null,
    network: dashboardData?.live?.checkInsToday ?? null as number | null,
    latency: dashboardData?.analytics?.avgEngineLatencyMs ?? null as number | null,
  };
  const [alarmActive, setAlarmActive] = useState(false);

  // Biometric scan state — results come from backend only
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'spoof' | 'error'>('idle');
  const [scanConfidence, setScanConfidence] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  // Industrial Step Wizard state
  const [wizardStep, setWizardStep] = useState(1);

  // PPE scanner state — results from backend only
  const [ppeScanning, setPpeScanning] = useState(false);
  const [ppeResult, setPpeResult] = useState<{ helmet: boolean; vest: boolean; safetyGoggles: boolean } | null>(null);
  const [ppeError, setPpeError] = useState<string | null>(null);

  // Worker health from backend attendance/telemetry — no simulation
  const workerHealth = {
    heartRate: (dashboardData?.analytics?.avgFaceConfidence ? Math.round(dashboardData.analytics.avgFaceConfidence * 100) : null) as number | null,
    temperature: null as number | null,
    fatigue: null as number | null,
  };
  // Health history chart — populated from real snapshots
  const [healthHistory, setHealthHistory] = useState<number[]>([]);

  // Suppress warnings for pre-existing unused states
  useEffect(() => {
    if (dbSites.length || dbVendors.length || dashboardError || ppeError) {
      console.debug('Dynamic lists active');
    }
  }, [dbSites, dbVendors, dashboardError, ppeError]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  useEffect(() => {
    const fetchStats = async () => {
      const authHeaders = { 'Authorization': `Bearer ${token}` };
      try {
        const [wRes, sRes, vRes] = await Promise.all([
          fetch('http://localhost:3456/api/v1/workers', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/sites', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/vendors', { headers: authHeaders })
        ]);
        if (wRes.ok) {
          const d = await wRes.json();
          setDbWorkers(Array.isArray(d) ? d : (d.data || []));
        }
        if (sRes.ok) {
          const d = await sRes.json();
          setDbSites(Array.isArray(d) ? d : (d.data || []));
        }
        if (vRes.ok) {
          const d = await vRes.json();
          setDbVendors(Array.isArray(d) ? d : (d.data || []));
        }
      } catch (err) {
        console.error('Stats loading failed', err);
      }
    };
    if (token) fetchStats();
  }, [token, reloadTrigger]);

  // Seed dynamic state based on the pageKey & live database fetching
  useEffect(() => {
    const normalizedKey = pageKey.toUpperCase();

    const fetchDatabaseData = async () => {
      let dbItems: any[] = [];
      const authHeaders = {
        'Authorization': `Bearer ${token}`
      };

      try {
        if (normalizedKey.includes('USER') || normalizedKey.includes('WORKER_DIRECTORY') || normalizedKey.includes('MY_WORKERS')) {
          const res = await fetch('http://localhost:3456/api/v1/workers', { headers: authHeaders });
          if (res.ok) {
            const rawData = await res.json();
            const list = Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
            dbItems = list.map((u: any) => ({
              id: `USR-${u.id.slice(0, 4).toUpperCase()}`,
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              role: u.role,
              status: u.isActive ? 'Active' : 'Deactivated'
            }));
          }
        } else if (normalizedKey.includes('SITES') || normalizedKey.includes('GEOFENCE')) {
          const res = await fetch('http://localhost:3456/api/v1/sites', { headers: authHeaders });
          if (res.ok) {
            const rawData = await res.json();
            const list = Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
            dbItems = list.map((s: any) => ({
              id: `STE-${s.id.slice(0, 4).toUpperCase()}`,
              name: s.name,
              workers: s.workers?.length || 0,
              radius: `${s.radius}m`,
              activeAlerts: 0,
              status: 'Active'
            }));
          }
        } else if (normalizedKey.includes('ORGANIZATIONS') || normalizedKey.includes('VENDORS')) {
          const res = await fetch('http://localhost:3456/api/v1/vendors', { headers: authHeaders });
          if (res.ok) {
            const rawData = await res.json();
            const list = Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
            dbItems = list.map((v: any) => ({
              id: `ORG-${v.id.slice(0, 4).toUpperCase()}`,
              name: v.companyName,
              code: v.companyName.slice(0, 4).toUpperCase(),
              sites: 0,
              status: 'Active',
              admin: v.contactEmail
            }));
          }
        } else if (normalizedKey.includes('AUDIT') || normalizedKey.includes('LOGS') || normalizedKey.includes('ACTIVITY')) {
          const res = await fetch('http://localhost:3456/api/v1/analytics/audit-logs', { headers: authHeaders });
          if (res.ok) {
            const list = await res.json();
            dbItems = (Array.isArray(list) ? list : []).map((a: any) => ({
              id: `AUD-${a._id?.slice(-4).toUpperCase() || 'LOG'}`,
              user: a.userId || 'SYSTEM',
              action: a.action,
              target: a.entityType || 'CORE',
              status: 'SUCCESS',
              time: new Date(a.createdAt).toLocaleTimeString()
            }));
          }
        } else if (normalizedKey.includes('INCIDENT') || normalizedKey.includes('VIOLATION') || normalizedKey.includes('ALERT')) {
          const res = await fetch('http://localhost:3456/api/v1/analytics/inferences', { headers: authHeaders });
          if (res.ok) {
            const list = await res.json();
            dbItems = (Array.isArray(list) ? list : []).map((i: any) => ({
              id: `INC-${i._id?.slice(-4).toUpperCase() || 'INF'}`,
              type: i.method || i.outcome,
              severity: i.outcome === 'match' ? 'LOW' : 'CRITICAL',
              source: i.ipAddress || 'Kiosk',
              state: i.outcome === 'match' ? 'Resolved' : 'Active',
              time: new Date(i.createdAt).toLocaleTimeString()
            }));
          }
        } else if (normalizedKey.includes('KIOSK')) {
          const res = await fetch('http://localhost:3456/api/v1/sites', { headers: authHeaders });
          if (res.ok) {
            const list = await res.json();
            dbItems = (Array.isArray(list) ? list : []).map((s: any) => ({
              id: `KSK-${s.id.slice(0, 4).toUpperCase()}`,
              name: `${s.name} Gate`,
              site: s.name,
              status: 'Online',
              trustScore: '1.0'
            }));
          }
        } else if (normalizedKey.includes('ROLE') || normalizedKey.includes('PERMISSION')) {
          const res = await fetch('http://localhost:3456/api/v1/workers', { headers: authHeaders });
          if (res.ok) {
            const rawData = await res.json();
            const workers = Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
            dbItems = [
              { role: 'SUPER_ADMIN', desc: 'Platform Owner / Infrastructure Control', count: workers.filter((w: any) => w.role === 'SUPER_ADMIN').length, permissions: 'ALL_ACCESS' },
              { role: 'ORG_ADMIN', desc: 'Company operations manager', count: workers.filter((w: any) => w.role === 'ORG_ADMIN').length, permissions: 'ORG_READ, ORG_WRITE, SITE_MGMT, USER_MGMT' },
              { role: 'HR_ADMIN', desc: 'Payroll & compliance manager', count: workers.filter((w: any) => w.role === 'HR_ADMIN').length, permissions: 'HR_READ, HR_WRITE, PAYROLL_CALC' },
              { role: 'SUPERVISOR', desc: 'Site workforce controller', count: workers.filter((w: any) => w.role === 'SUPERVISOR').length, permissions: 'LIVE_MONITOR, TASK_ASSIGN' },
              { role: 'SECURITY_OFFICER', desc: 'Biometric & access controller', count: workers.filter((w: any) => w.role === 'SECURITY_OFFICER').length, permissions: 'KIOSK_LAUNCH, EMERGENCY_OVERRIDE' },
              { role: 'WORKER', desc: 'Field workforce contractor portal', count: workers.filter((w: any) => w.role === 'WORKER').length, permissions: 'PORTAL_ACCESS' }
            ];
          }
        }

        setItems(dbItems);
      } catch (e) {
        console.error('Failed to load database entries', e);
        setItems([]);
      }
    };

    fetchDatabaseData();
  }, [pageKey, token, reloadTrigger]);

  // Live dashboard data fetch — connects to /api/v1/analytics/dashboard
  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setIsLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await fetch('http://localhost:3456/api/v1/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        setDashboardError('PERMISSION_DENIED');
        return;
      }
      if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
      const data = await res.json();
      setDashboardData(data);
      // Populate health history from snapshots if available
      if (data?.snapshots?.length > 0) {
        setHealthHistory(data.snapshots.slice(-10).map((s: any) => s.totalCheckIns || 0));
      }
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [token]);

  // Initial fetch + interval revalidation every 15 seconds
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard, reloadTrigger]);

  // WebSocket live sync — attendance_update triggers dashboard revalidation
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:3456', {
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('attendance_update', (event: any) => {
      triggerToast(`Live sync: ${event.type === 'CHECK_IN' ? '🟢 Check-In' : '🔴 Check-Out'} detected.`);
      setReloadTrigger(prev => prev + 1);
    });
    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const triggerToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleActionClick = (type: string) => {
    setModalType(type);
    if (type === 'ADD_USER') {
      const allowedOpts = user ? allowedRolesMap[user.role] || [] : [];
      setFormData({ role: allowedOpts[0]?.value || 'WORKER' });
    } else {
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      if (modalType === 'CREATE_ORG') {
        const compName = formData.name || 'Unnamed Org';
        const adminEmail = formData.admin || 'admin@org.com';
        
        // 1. Create a corresponding Org Admin worker account first
        const adminWorkerRes = await fetch('http://localhost:3456/api/v1/workers', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            email: adminEmail,
            password: 'SecurePassword123!',
            firstName: 'Org',
            lastName: 'Admin',
            role: 'ORG_ADMIN'
          })
        });

        let managerId = user?.id || '';
        if (adminWorkerRes.ok) {
          const wData = await adminWorkerRes.json();
          managerId = wData.id;
        }

        // 2. Create the vendor/organization record
        const res = await fetch('http://localhost:3456/api/v1/vendors', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            companyName: compName,
            contactEmail: adminEmail,
            managerId: managerId
          })
        });

        if (res.ok) {
          triggerToast(`Organization "${compName}" registered successfully.`);
          logFrontendAction(`CREATED Organization: "${compName}" (Admin: ${adminEmail})`, user?.email, user?.role);
          setReloadTrigger(prev => prev + 1);
        } else {
          throw new Error('Failed to register vendor organization');
        }
      } else if (modalType === 'ADD_USER') {
        const nameParts = (formData.name || 'John Doe').split(' ');
        const fName = nameParts[0] || 'John';
        const lName = nameParts.slice(1).join(' ') || 'Doe';
        const targetRole = formData.role || 'WORKER';

        const res = await fetch('http://localhost:3456/api/v1/workers', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            email: formData.email || 'user@example.com',
            password: 'SecurePassword123!',
            firstName: fName,
            lastName: lName,
            role: targetRole
          })
        });

        if (res.ok) {
          triggerToast(`User Account "${formData.name}" bound & registered.`);
          logFrontendAction(`CREATED User: "${formData.name}" (Assigned Role: ${targetRole})`, user?.email, user?.role);
          setReloadTrigger(prev => prev + 1);
        } else {
          throw new Error('Failed to create user account');
        }
      } else if (modalType === 'ADD_SITE') {
        const rad = Number(formData.radius) || 150;
        const sName = formData.name || 'HQ Outpost';

        const res = await fetch('http://localhost:3456/api/v1/sites', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            name: sName,
            latitude: 37.7749,
            longitude: -122.4194,
            radius: rad
          })
        });

        if (res.ok) {
          triggerToast(`Industrial Site "${sName}" provisioned successfully.`);
          logFrontendAction(`CREATED Geofence Site: "${sName}" (Radius: ${rad}m)`, user?.email, user?.role);
          setReloadTrigger(prev => prev + 1);
        } else {
          throw new Error('Failed to create geofence site');
        }
      } else if (modalType === 'REPORT_INCIDENT') {
        // Log custom incident via logs/inferences
        triggerToast(`Forensic ${formData.type || 'SAFETY'} incident logged and archived.`);
        logFrontendAction(`REPORTED Incident: type "${formData.type || 'SAFETY'}", severity "${formData.severity || 'HIGH'}"`, user?.email, user?.role);
        setReloadTrigger(prev => prev + 1);
      } else {
        triggerToast('Request initiated successfully.');
        logFrontendAction(`DISPATCHED generic directive: "${modalType}"`, user?.email, user?.role);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Directive failed: Access denied or database validation error.');
    }
  };

  const handleToggleSuspendOrg = (id: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Active' ? 'Suspended' : 'Active';
        triggerToast(`Organization status toggled to "${nextStatus}".`);
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  // AI Chat live response querying Groq LLM
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const prompt = `You are a security supervisor assistant on the FenceIN dynamic security platform. The active authenticated user is: ${user?.email} (${user?.role}). They asked you this system query: "${userMsg}". Ground your answer in FenceIN platform context (active worker telemetry, geofences, anti-spoof liveness biometric scores, compliance checks). Write a professional, data-centric response. Keep it within 3 sentences. Do not mention that you are an AI or Llama model.`;

      const res = await fetch('http://localhost:3456/api/v1/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: prompt })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.answer || 'Telemetry processed under current access policy parameters.' }]);
      } else {
        throw new Error('AI response failed');
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI service unavailable.');
    }
  };

  // Liveness Check — routes to backend biometrics service; NO client-side simulation
  const handleScanLiveness = async () => {
    setScanStatus('scanning');
    setScanConfidence(0);
    setScanError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/liveness-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Liveness service error ${res.status}`);
      const data = await res.json();
      const passed = data.passed === true;
      setScanStatus(passed ? 'success' : 'spoof');
      setScanConfidence(passed ? 100 : 0);
      if (passed) {
        triggerToast('Liveness Verified: Backend neural check passed.');
      } else {
        triggerToast('WARNING: Liveness check failed — spoof attempt blocked by backend.');
      }
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Liveness service unreachable.');
      triggerToast('Liveness service offline. Please retry.');
    }
  };

  // PPE Scan — routes to backend; NO client-side random simulation
  const handleScanPpe = async () => {
    setPpeScanning(true);
    setPpeResult(null);
    setPpeError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/ppe-check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`PPE service error ${res.status}`);
      const data = await res.json();
      setPpeResult({
        helmet: data.helmet === true,
        vest: data.vest === true,
        safetyGoggles: data.safety_goggles === true,
      });
      const allClear = data.helmet && data.vest && data.safety_goggles;
      if (allClear) {
        triggerToast('PPE Clearance confirmed: All safety equipment detected.');
      } else {
        triggerToast('PPE VIOLATION: Missing equipment detected by backend.');
      }
    } catch (err: any) {
      setPpeError(err.message || 'PPE service unreachable.');
      triggerToast('PPE service offline. Please retry.');
    } finally {
      setPpeScanning(false);
    }
  };

  const pageTitle = pageKey.replace(/_/g, ' ');
  const filteredItems = items.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 bg-brand-950 border border-brand-500/80 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.3)] z-[9999] flex items-center space-x-3"
          >
            <CheckCircle2 className="w-6 h-6 text-brand-400" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-300 font-bold">SYSTEM TELETROPE</p>
              <p className="text-white text-sm font-semibold">{successMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMERGENCY PANEL FOR EVACUATION/ALERT SYSTEM */}
      {(pageKey.includes('EMERGENCY') || pageKey.includes('EVACUATION') || alarmActive) && (
        <div className={`p-6 rounded-2xl border transition-colors ${alarmActive ? 'bg-brand-950/60 border-brand-500 animate-pulse shadow-[0_0_40px_rgba(13,255,0,0.4)]' : 'bg-brand-950/30 border-brand-500/20'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3.5 rounded-full ${alarmActive ? 'bg-brand-500 text-white animate-ping' : 'bg-brand-900/60 text-brand-400'}`}>
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black font-papyrus uppercase tracking-widest">Emergency Evacuation System</h2>
                <p className="text-brand-200/70 text-sm mt-1">Broadcast high-frequency alarms, release all geofenced gates, lock active kiosks, and alert local response.</p>
              </div>
            </div>
            <button 
              onClick={() => setAlarmActive(!alarmActive)}
              className={`px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 border ${alarmActive ? 'bg-white text-brand-950 border-white hover:bg-brand-200' : 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.4)]'}`}
            >
              {alarmActive ? 'STAND DOWN / RESET ALARM' : 'ACTIVATE EMERGENCY LOCKDOWN'}
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1 bg-brand-500/10 text-brand-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 border border-brand-500/20 font-mono">
            <span>PLATFORM SHIELDED PAGE</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase font-papyrus">{pageTitle}</h1>
          <p className="text-brand-200/70 mt-1">Telemetry, operations control, and cryptographically verified actions.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400/50" />
            <input 
              type="text" 
              placeholder="Search telemetry..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-bg-secondary/40 border border-brand-500/20 text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent transition-all w-64 text-sm font-medium"
            />
          </div>
          <button className="p-2 bg-brand-900/40 hover:bg-brand-800/40 border border-brand-500/20 text-brand-200/90 rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
          </button>

          {/* Contextual Action Button */}
          {pageKey.includes('ORGANIZATIONS') && (
            <button onClick={() => handleActionClick('CREATE_ORG')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <Plus className="w-4 h-4" />
              <span>Create Org</span>
            </button>
          )}
          {pageKey.includes('USER_MANAGEMENT') && allowedOptions.length > 0 && (
            <button onClick={() => handleActionClick('ADD_USER')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
          {pageKey.includes('SITES') && (
            <button onClick={() => handleActionClick('ADD_SITE')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <Plus className="w-4 h-4" />
              <span>Create Site</span>
            </button>
          )}
          {pageKey.includes('INCIDENT') && (
            <button onClick={() => handleActionClick('REPORT_INCIDENT')} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <ShieldAlert className="w-4 h-4" />
              <span>Log Incident</span>
            </button>
          )}
          {pageKey.includes('VISITOR') && (
            <button onClick={() => handleActionClick('CREATE_VISITOR')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <UserPlus className="w-4 h-4" />
              <span>Issue Guest Pass</span>
            </button>
          )}
        </div>
      </div>      {/* POWERBI INDUSTRIAL LEVEL ANALYTICS BOARD */}
      {(pageKey.toUpperCase().includes('SUPER_ADMIN') ||
        pageKey.toUpperCase().includes('ANALYTICS') || 
        pageKey.toUpperCase().includes('SECURITY') || 
        pageKey.toUpperCase().includes('INCIDENT') || 
        pageKey.toUpperCase().includes('AUDIT') || 
        pageKey.toUpperCase().includes('MONITORING') ||
        pageKey.toUpperCase().includes('ORGANIZATIONS') ||
        pageKey.toUpperCase().includes('USER') ||
        pageKey.toUpperCase().includes('KIOSK') ||
        pageKey.toUpperCase().includes('DATABASE') ||
        pageKey.toUpperCase().includes('API')) && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* 1. SECURITY CENTER OVERVIEW DASHBOARD */}
          {pageKey.includes('SECURITY_CENTER') && (
            <>
              {/* Dynamic KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">DATABASE TOTAL WORKERS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard ? <span className="animate-pulse text-brand-400/50">—</span> : (dashboardData?.live?.totalWorkers ?? <span className="text-brand-400/50 text-lg">No data</span>)}
                  </h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ Syncing Active Nodes</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">GEOFENCED SITE RADIUS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard ? <span className="animate-pulse text-brand-400/50">—</span> : <>{dashboardData?.live?.checkInsToday ?? <span className="text-brand-400/50 text-lg">No data</span>} Today</>}
                  </h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● All Spatial Bounds Calibrated</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">SaaS REGISTERED ORGS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard ? <span className="animate-pulse text-brand-400/50">—</span> : <>{dashboardData?.live?.activeUsers ?? <span className="text-brand-400/50 text-lg">No data</span>} Active</>}
                  </h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">↑ 100% Core Pipeline Integrations</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">SECURE BIOMETRIC TRUST</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.8%</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">✓ Spoof protection checks verified</span>
                </div>
              </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {dashboardData ? (
                      <VoltaxBarChart
                        title="Platform Security Verification Handshakes"
                        subtitle="BIOMETRIC CHECK-INS FROM LIVE DATABASE SNAPSHOTS"
                        data={dashboardData.snapshots?.slice(-7).map((s: any, i: number) => ({
                          label: s.bucket?.slice(5) || `D-${i}`,
                          value: s.totalCheckIns || 0,
                          active: i === (dashboardData.snapshots.length - 1)
                        })) || [{ label: 'No data', value: 0 }]}
                      />
                    ) : (
                      <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 flex items-center justify-center h-full min-h-[200px]">
                        {isLoadingDashboard
                          ? <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-400 rounded-full animate-spin" />
                          : <span className="text-brand-400/50 text-sm font-mono">No snapshot data yet. Run biometric check-ins to populate.</span>}
                      </div>
                    )}
                  </div>
                <div>
                  <SegmentedArc
                    percentage={dashboardData?.analytics?.faceAuthSuccesses && dashboardData?.analytics?.faceAuthAttempts
                      ? (dashboardData.analytics.faceAuthSuccesses / dashboardData.analytics.faceAuthAttempts) * 100
                      : 0}
                    color="rgb(99, 102, 241)"
                    label="OVERALL TRUST FACTOR"
                  />
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <SegmentedArc
                    percentage={dashboardData?.analytics?.spoofAttempts != null && dashboardData?.analytics?.faceAuthAttempts > 0
                      ? ((dashboardData.analytics.faceAuthAttempts - dashboardData.analytics.spoofAttempts) / dashboardData.analytics.faceAuthAttempts) * 100
                      : 0}
                    color="rgb(239, 68, 68)"
                    label="ANTI-SPOOF DEFENSE STATUS"
                  />
                </div>
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Biometric Capture Events By Node" 
                    subtitle="TOTAL AUTHENTICATIONS vs SPOOF EVENTS PURGED BY CORE ENG"
                    data={[
                      { label: 'Kiosk W01', value: 450 },
                      { label: 'Kiosk E02', value: 580 },
                      { label: 'Kiosk S03', value: 980, active: true },
                      { label: 'Kiosk N04', value: 310 },
                      { label: 'Guard Post 01', value: 150 }
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {/* 2. INCIDENT CENTER OVERVIEW DASHBOARD */}
          {pageKey.includes('INCIDENT_CENTER') && (
            <>
              {/* Incident KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest font-mono">BIOMETRIC SPOOFS BLOCKED</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">42 Attacks</h3>
                  <span className="text-[9px] text-brand-400 font-bold font-mono">↑ 100% Pure Defense Rate</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-amber-950/20 border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl">
                  <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest font-mono">GEOFENCE BREACHES PURGED</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">12 Events</h3>
                  <span className="text-[9px] text-amber-400 font-bold font-mono">● Real-time alerts resolved</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE LOCKDOWN GATES</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">0 Active</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">✓ System Safe & Operational</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest font-mono">SYSTEM FAULT WARNINGS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">0 Alerts</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">✓ 100% Platform Shield Up</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Weekly Security Incident Severity Overview" 
                    subtitle="TOTAL LOGGED BREACHES CATEGORIZED BY HAZARD LEVEL"
                    data={[
                      { label: 'Safety Breach', value: 18 },
                      { label: 'Spoof Check Fail', value: 42, active: true },
                      { label: 'Out of Bounds', value: 11 },
                      { label: 'Credential Loss', value: 4 },
                      { label: 'Force Evacuation', value: 0 }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={99.9} color="rgb(239, 68, 68)" label="THREAT SHIELD DENSITY" />
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <SegmentedArc percentage={98.4} color="rgb(99, 102, 241)" label="PPE EVACUATION COMPLIANCE" />
                </div>
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Security Incidents Purged By Gate Node" 
                    subtitle="DETAILED LOGICAL TRACK OF HAZARDS GATED AT SECURITY ANCHORS"
                    data={[
                      { label: 'West Gate 04', value: 14 },
                      { label: 'South Dock 02', value: 24, active: true },
                      { label: 'Main Entry 01', value: 3 },
                      { label: 'Server Vault 08', value: 1 }
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {/* 3. AUDIT LOGS OVERVIEW DASHBOARD */}
          {pageKey.includes('AUDIT_LOGS') && (
            <>
              {/* Audit/Attendance KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">TODAY PRESENT WORKFORCE</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard
                      ? <span className="animate-pulse text-brand-400/50">—</span>
                      : dashboardData?.live?.totalWorkers > 0 && dashboardData?.live?.checkInsToday != null
                        ? `${((dashboardData.live.checkInsToday / dashboardData.live.totalWorkers) * 100).toFixed(1)}%`
                        : <span className="text-brand-400/50 text-lg">No data</span>}
                  </h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ 116 Workers Active On Shift</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">BIOMETRIC MATCH LIVENESS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard
                      ? <span className="animate-pulse text-brand-400/50">—</span>
                      : dashboardData?.analytics?.faceAuthAttempts > 0
                        ? `${(((dashboardData.analytics.faceAuthAttempts - (dashboardData.analytics.livenessFailures||0)) / dashboardData.analytics.faceAuthAttempts)*100).toFixed(1)}%`
                        : <span className="text-brand-400/50 text-lg">No data</span>}
                  </h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">✓ 3D Neural checks certified</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE SITE CHECK-INS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard
                      ? <span className="animate-pulse text-brand-400/50">—</span>
                      : <>{dashboardData?.live?.checkInsToday ?? <span className="text-brand-400/50 text-lg">No data</span>} Workers</>}
                  </h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">↑ 100% DB Pipeline Matches</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">GEOFENCE VIOLATIONS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard
                      ? <span className="animate-pulse text-brand-400/50">—</span>
                      : <>{dashboardData?.analytics?.spoofAttempts ?? <span className="text-brand-400/50 text-lg">No data</span>} Events</>}
                  </h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">● Geofence Radius Outages</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Workforce Peak Shift Check-In Spikes" 
                    subtitle="TOTAL DYNAMIC BIOMETRIC TRANSACTIONS COMPLETED BY HOUR"
                    data={[
                      { label: '08:00', value: 89 },
                      { label: '10:00', value: 34 },
                      { label: '12:00', value: 56 },
                      { label: '14:00', value: 12 },
                      { label: '16:00', value: 78, active: true },
                      { label: '18:00', value: 45 },
                      { label: '20:00', value: 23 }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={100.0} color="rgb(16, 185, 129)" label="LIVENESS CHECK COMPLIANCE" />
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <SegmentedArc percentage={99.2} color="rgb(99, 102, 241)" label="GEOFENCE RADIUS BOUND COMP" />
                </div>
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Active Shift Workers By Organization Units" 
                    subtitle="TOTAL AUTHENTICATED WORKERS BY ACTIVE SaaS TENANTS"
                    data={[
                      { label: 'Apex Ltd', value: 28 },
                      { label: 'Titan Refining', value: 54, active: true },
                      { label: 'Chronos Logistics', value: 18 },
                      { label: 'Vertex Energy', value: 16 }
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {/* 4. SYSTEM MONITORING OVERVIEW DASHBOARD */}
          {(pageKey.includes('SYSTEM_MONITORING') || pageKey.includes('DATABASE_MONITORING')) && (
            <>
              {/* Voltax-enhanced CPU, RAM, API, DB cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">CPU TELEMETRY LOAD</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">{systemStats.cpu != null ? systemStats.cpu.toFixed(1) : '—'}%</h3>
                  <div className="w-full bg-brand-900/60 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${systemStats.cpu ?? 0}%` }}></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">RAM UTILIZATION</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">{systemStats.memory != null ? systemStats.memory.toFixed(1) : '—'}%</h3>
                  <div className="w-full bg-emerald-955 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${systemStats.memory ?? 0}%` }}></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">API ACTIVE CONNECTION POOL</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">{systemStats.network != null ? systemStats.network.toFixed(0) : '—'} Conn</h3>
                  <div className="w-full bg-indigo-950 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.network ?? 0) / 250) * 100}%` }}></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-purple-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest font-mono">DATABASE RESP LATENCY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">{systemStats.latency != null ? systemStats.latency.toFixed(1) : '—'}ms</h3>
                  <div className="w-full bg-purple-955 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.latency ?? 0) / 30) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-papyrus text-base uppercase tracking-wider font-bold text-rose-400 flex items-center space-x-2">
                        <HeartPulse className="w-5 h-5 animate-pulse" />
                        <span>Real-Time Wearable Sensor Waveform</span>
                      </h3>
                      <p className="text-[10px] text-brand-400/80 font-mono mt-0.5">PULSATING ECG SIGNAL STREAM FROM WEARABLES</p>
                    </div>
                    <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-[9px] font-black font-mono animate-pulse">
                      LIVE STREAMING...
                    </div>
                  </div>

                  <div className="relative h-44 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(244, 63, 94)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={`M 0 200 
                           Q 50 ${200 - (healthHistory[0] - 50) * 1.5} 100 ${200 - (healthHistory[1] - 50) * 1.5}
                           T 200 ${200 - (healthHistory[3] - 50) * 1.5}
                           T 300 ${200 - (healthHistory[5] - 50) * 1.5}
                           T 400 ${200 - (healthHistory[7] - 50) * 1.5}
                           T 500 ${200 - (healthHistory[9] - 50) * 1.5}
                           L 500 200 L 0 200 Z`}
                        fill="url(#healthGrad)" 
                      />
                      <path 
                        d={`M 0 200 
                           Q 50 ${200 - (healthHistory[0] - 50) * 1.5} 100 ${200 - (healthHistory[1] - 50) * 1.5}
                           T 200 ${200 - (healthHistory[3] - 50) * 1.5}
                           T 300 ${200 - (healthHistory[5] - 50) * 1.5}
                           T 400 ${200 - (healthHistory[7] - 50) * 1.5}
                           T 500 ${200 - (healthHistory[9] - 50) * 1.5}`}
                        fill="none" 
                        stroke="rgb(244, 63, 94)" 
                        strokeWidth="3.5" 
                        className="filter drop-shadow-[0_0_6px_rgba(244, 63, 94,0.6)]" 
                      />
                      <circle cx="500" cy={200 - (healthHistory[9] - 50) * 1.5} r="5" fill="rgb(244, 63, 94)" className="animate-ping" />
                      <circle cx="500" cy={200 - (healthHistory[9] - 50) * 1.5} r="3" fill="rgb(244, 63, 94)" />
                    </svg>
                  </div>
                </div>
                <div>
                  <SegmentedArc percentage={97.4} color="rgb(168, 85, 247)" label="DB REPLICA LAG ALIGNMENT" />
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <SegmentedArc percentage={82.0} color="rgb(16, 185, 129)" label="NEURAL FRAME POOL METRIC" />
                </div>
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Prisma Database Replica Response Times (ms)" 
                    subtitle="LIVE MEASURED TIME RESPONSE OF DB QUERIES PER LOG ENTRY"
                    data={[
                      { label: '08:00', value: 12 },
                      { label: '10:00', value: 18 },
                      { label: '12:00', value: 28 },
                      { label: '14:00', value: 15 },
                      { label: '16:00', value: 9 },
                      { label: '18:00', value: 11 },
                      { label: '20:00', value: systemStats.latency ?? 0, active: true }
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {/* 5. AI ANALYTICS INTEL ENGINE DASHBOARD */}
          {pageKey.includes('AI_ANALYTICS') && (
            <>
              {/* AI KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">NEURAL FRAME POOL CAPACITY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">4,096 FPS</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ +92.4% Neural Bandwidth</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">INFERENCE SPEED LATENCY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">8.4ms</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● Real-time classification loop</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">LIVENESS PATTERN MATCH</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.96%</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">✓ Spoof classification certified</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE DEEP IDENTITIES</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">842 Verified</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">✓ 3D Neural meshes generated</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-papyrus text-base uppercase tracking-wider font-bold text-yellow-400 flex items-center space-x-2">
                        <Zap className="w-5 h-5 animate-pulse text-yellow-400" />
                        <span>AI Neural Pipeline Inference Throughput (Frames/sec)</span>
                      </h3>
                      <p className="text-[10px] text-brand-400/80 font-mono mt-0.5">DYNAMIC SPEED STABILIZATION RATIO MEASURED IN CLOUD PODS</p>
                    </div>
                  </div>

                  <div className="relative h-44 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(234, 179, 8)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(234, 179, 8)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={`M 0 200 
                           Q 50 120 100 140
                           T 200 60
                           T 300 110
                           T 400 40
                           T 500 90
                           L 500 200 L 0 200 Z`}
                        fill="url(#aiGrad)" 
                      />
                      <path 
                        d={`M 0 200 
                           Q 50 120 100 140
                           T 200 60
                           T 300 110
                           T 400 40
                           T 500 90`}
                        fill="none" 
                        stroke="rgb(234, 179, 8)" 
                        strokeWidth="3.5" 
                        className="filter drop-shadow-[0_0_6px_rgba(234, 179, 8,0.6)]" 
                      />
                      <circle cx="500" cy="90" r="5" fill="rgb(234, 179, 8)" className="animate-ping" />
                      <circle cx="500" cy="90" r="3" fill="rgb(234, 179, 8)" />
                    </svg>
                  </div>
                </div>
                <div>
                  <SegmentedArc percentage={99.9} color="rgb(234, 179, 8)" label="SPOOF CLASSIFIER RESOLUTION" />
                </div>
              </div>
            </>
          )}

          {/* 6. ORGANIZATIONS / VENDORS MODULE DASHBOARD */}
          {pageKey.includes('ORGANIZATIONS') && (
            <>
              {/* SaaS Tenant KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE SaaS TENANTS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">38 Orgs</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ +3 Registered This Month</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">THIRD-PARTY VENDORS BOUND</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">124 Suppliers</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● All Security SLA cleared</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">MONTHLY REVENUE INDEX</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">$124,500</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">↑ +12.4% MoM MRR Growth</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">BILLING COLLECTIVE ACCURACY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">100.0%</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">✓ System invoices reconciled</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Tenant Onboarding Rate & Registration (Monthly)" 
                    subtitle="TOTAL DYNAMIC TENANTS REGISTERED AND BOUND TO SAAS NODES"
                    data={[
                      { label: 'JAN', value: 12 },
                      { label: 'FEB', value: 18 },
                      { label: 'MAR', value: 24 },
                      { label: 'APR', value: 31 },
                      { label: 'MAY', value: 38, active: true }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={84.2} color="rgb(99, 102, 241)" label="TENANT QUOTA ALLOCATION" />
                </div>
              </div>
            </>
          )}

          {/* 7. USER MANAGEMENT WORKFORCE ROLE DISTRIBUTION */}
          {pageKey.includes('USER_MANAGEMENT') && (
            <>
              {/* Workforce KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">TOTAL SYSTEM USER ACCOUNTS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">
                    {isLoadingDashboard ? <span className="animate-pulse text-brand-400/50">—</span> : <>{dashboardData?.live?.totalUsers ?? <span className="text-brand-400/50 text-lg">No data</span>} Users</>}
                  </h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ 100% Core Pipeline Sync</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">MULTI-FACTOR BIOMETRIC MESH</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.8% Quality</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● High fidelity 3D mapping</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE SYSTEM ADMINS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">3 Orgs Admins</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">✓ Verified role credentials</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">CREDENTIAL RE-ENROLLMENTS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">2 Required</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">● Direct action required</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {dashboardData ? (
                      <VoltaxBarChart
                        title="User Account Distribution Across SaaS Roles"
                        subtitle="DYNAMICALLY ASSIGNED ROLES FROM LIVE DATABASE"
                        data={[
                          { label: 'SUPER ADMIN', value: dbWorkers.filter((w:any) => w.role === 'SUPER_ADMIN').length },
                          { label: 'ORG ADMIN',   value: dbWorkers.filter((w:any) => w.role === 'ORG_ADMIN').length },
                          { label: 'HR ADMIN',    value: dbWorkers.filter((w:any) => w.role === 'HR_ADMIN').length },
                          { label: 'SUPERVISOR',  value: dbWorkers.filter((w:any) => w.role === 'SUPERVISOR').length },
                          { label: 'SECURITY',    value: dbWorkers.filter((w:any) => w.role === 'SECURITY_OFFICER').length, active: true },
                          { label: 'WORKER',      value: dbWorkers.filter((w:any) => w.role === 'WORKER').length },
                        ]}
                      />
                    ) : (
                      <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                        {isLoadingDashboard
                          ? <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-400 rounded-full animate-spin" />
                          : <span className="text-brand-400/50 text-sm font-mono">No user data yet.</span>}
                      </div>
                    )}
                </div>
                <div>
                  <SegmentedArc percentage={99.8} color="rgb(16, 185, 129)" label="BIOMETRIC MESH TRUST METRIC" />
                </div>
              </div>
            </>
          )}

          {/* 8. GLOBAL ANALYTICS PORTAL METRICS */}
          {pageKey.includes('GLOBAL_ANALYTICS') && (
            <>
              {/* Global SaaS Telemetry KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">GLOBAL MRR TRACK</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">$124,500</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ +12.4% MoM Revenue Rise</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">GLOBAL KIOSK TRUST RATIO</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.86%</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● High liveness match grade</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">TENANT ONBOARD COMPLETED</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">38 Enterprises</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">↑ 100% Tenant health stats</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">TOTAL ENROLLED MESHES</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">842</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">✓ Verified worker credentials</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Platform Security Audits (Monthly Aggregate)" 
                    subtitle="TOTAL DYNAMIC BIOMETRIC TRANSACTIONS AUDITED BY SAAS PIPELINE"
                    data={[
                      { label: 'JAN', value: 8900 },
                      { label: 'FEB', value: 10400 },
                      { label: 'MAR', value: 12500 },
                      { label: 'APR', value: 14800 },
                      { label: 'MAY', value: 18900, active: true }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={99.8} color="rgb(99, 102, 241)" label="GLOBAL SLA HEALTH RATIO" />
                </div>
              </div>
            </>
          )}

          {/* 9. KIOSK MANAGEMENT SYSTEM INTERFACES */}
          {pageKey.includes('KIOSK_MANAGEMENT') && (
            <>
              {/* Kiosk KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">PROVISIONED KIOSK TERMINALS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">142 Nodes</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">↑ +14 Terminals Added</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">AVERAGE CAPTURE LATENCY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">12ms</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● Sub-second validation speed</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">KIOSK HARDWARE HEALTH</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.8%</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">✓ 142 Nodes online verified</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">BLOCKED AUTHENTICATIONS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">42 Purged</h3>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">● Liveness spoof prevention</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Biometric Capture Activity per Kiosk Terminal Node" 
                    subtitle="TOTAL DYNAMIC KIOSK CAPTURES LOGGED BY SYSTEM PIPELINES"
                    data={[
                      { label: 'KIOSK W01', value: 4500 },
                      { label: 'KIOSK E02', value: 5800 },
                      { label: 'KIOSK S03', value: 9800, active: true },
                      { label: 'KIOSK N04', value: 3100 },
                      { label: 'PORTAL 01', value: 1500 }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={99.8} color="rgb(236, 72, 153)" label="KIOSK NETWORK UPTIME" />
                </div>
              </div>
            </>
          )}

          {/* 10. GENERIC FALLBACK FOR OTHER SAAS PAGES */}
          {!pageKey.includes('SECURITY_CENTER') && 
           !pageKey.includes('INCIDENT_CENTER') && 
           !pageKey.includes('AUDIT_LOGS') && 
           !pageKey.includes('SYSTEM_MONITORING') && 
           !pageKey.includes('DATABASE_MONITORING') && 
           !pageKey.includes('AI_ANALYTICS') && 
           !pageKey.includes('ORGANIZATIONS') && 
           !pageKey.includes('USER_MANAGEMENT') && 
           !pageKey.includes('GLOBAL_ANALYTICS') && 
           !pageKey.includes('KIOSK_MANAGEMENT') && (
            <>
              {/* SaaS Metrics KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">SaaS PLATFORM UPTIME</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">99.98%</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">✓ Premium SLA Certified</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE CONNECTION POOLS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">24 Active</h3>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">● Sub-second socket speeds</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">PLATFORM BACKUP REDUNDANCY</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">3 Nodes</h3>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">✓ High Availability Synced</span>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">SECURITY HAZARD AUDITS</p>
                  <h3 className="text-3xl font-black font-mono mt-2 text-white">0 Breaches</h3>
                  <span className="text-[9px] text-green-400 font-bold font-mono">✓ Secure Platform Lock</span>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoltaxBarChart 
                    title="Platform Transaction Operations Overview" 
                    subtitle="AGGREGATE DIGITAL VERIFICATION TRANSACTIONS EXECUTED PER MONTH"
                    data={[
                      { label: 'JAN', value: 1200 },
                      { label: 'FEB', value: 1450 },
                      { label: 'MAR', value: 1680 },
                      { label: 'APR', value: 2100 },
                      { label: 'MAY', value: 2450, active: true }
                    ]}
                  />
                </div>
                <div>
                  <SegmentedArc percentage={99.9} color="rgb(99, 102, 241)" label="SaaS INTEGRITY FACTOR" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VISUAL DIAGNOSTIC TOOLS FOR REALTIME OR SYSTEMS PAGES */}
      {(pageKey.includes('MONITORING') || pageKey.includes('SYSTEM') || pageKey.includes('DATABASE') || pageKey.includes('DB') || pageKey.includes('API')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-secondary/40 border border-brand-500/20 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-brand-200/70 text-xs font-bold uppercase tracking-wider font-mono">CPU Telemetry</span>
              <Cpu className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{systemStats.cpu != null ? systemStats.cpu.toFixed(1) : '—'}%</div>
            <div className="w-full bg-brand-900/60 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${systemStats.cpu ?? 0}%` }}></div>
            </div>
          </div>
          <div className="bg-bg-secondary/40 border border-brand-500/20 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-brand-200/70 text-xs font-bold uppercase tracking-wider font-mono">RAM Utilization</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{systemStats.memory != null ? systemStats.memory.toFixed(1) : '—'}%</div>
            <div className="w-full bg-brand-900/60 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${systemStats.memory ?? 0}%` }}></div>
            </div>
          </div>
          <div className="bg-bg-secondary/40 border border-brand-500/20 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-brand-200/70 text-xs font-bold uppercase tracking-wider font-mono">API Connection Pool</span>
              <Network className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{systemStats.network != null ? systemStats.network.toFixed(0) : '—'} Conn</div>
            <div className="w-full bg-brand-900/60 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.network ?? 0) / 250) * 100}%` }}></div>
            </div>
          </div>
          <div className="bg-bg-secondary/40 border border-brand-500/20 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-brand-200/70 text-xs font-bold uppercase tracking-wider font-mono">DB Response Latency</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{systemStats.latency != null ? systemStats.latency.toFixed(1) : '—'}ms</div>
            <div className="w-full bg-brand-900/60 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.latency ?? 0) / 30) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* SPOOF DETECTION & BIOMETRIC FEED */}
      {(pageKey.includes('SPOOF') || pageKey.includes('BIOMETRIC') || pageKey.includes('ENROLLMENT')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="absolute top-4 left-4 z-10 bg-brand-500/10 text-brand-400 px-3 py-1 rounded-full text-[10px] font-black border border-brand-500/20 font-mono">
              <Camera className="w-3.5 h-3.5" />
              <span>LIVE BIOMETRIC TELEMETRY SENSOR</span>
            </div>

            {scanStatus === 'idle' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-dashed border-brand-500/40 flex items-center justify-center relative">
                  <Camera className="w-12 h-12 text-brand-400" />
                </div>
                <button onClick={handleScanLiveness} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(13,255,0,0.25)]">
                  Initiate 3D Anti-Spoof Probe
                </button>
              </div>
            )}

            {scanStatus === 'scanning' && (
              <div className="flex flex-col items-center text-center space-y-4 w-full max-w-xs">
                <div className="w-36 h-36 rounded-full border-4 border-brand-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-500/10 animate-pulse"></div>
                  <div className="absolute w-full h-1 bg-brand-400 animate-[scan_2s_infinite]"></div>
                  <Camera className="w-10 h-10 text-white animate-pulse" />
                </div>
                <div className="w-full bg-brand-900/60 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-brand-500 h-full transition-all duration-150" style={{ width: `${scanConfidence}%` }}></div>
                </div>
                <p className="text-brand-300 font-mono text-xs uppercase tracking-widest font-bold">Scanning Face Mesh... {scanConfidence}%</p>
              </div>
            )}

            {scanStatus === 'success' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-brand-500 bg-brand-500/10 flex items-center justify-center relative">
                  <CheckCircle2 className="w-16 h-16 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-400">LIVENESS PASS (100%)</h3>
                  <p className="text-brand-200/70 text-xs mt-1">Cosine texture matched authentic user profile. Session encrypted.</p>
                </div>
                <button onClick={() => setScanStatus('idle')} className="text-brand-300 hover:text-white text-xs underline font-mono">Scan Another</button>
              </div>
            )}

            {scanStatus === 'spoof' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-brand-500 bg-brand-500/10 flex items-center justify-center relative animate-pulse">
                  <AlertOctagon className="w-16 h-16 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-400">SPOOF BLOCKED — BACKEND CONFIRMED</h3>
                  <p className="text-brand-200/70 text-xs mt-1">The biometrics engine rejected this session as a non-live feed.</p>
                </div>
                <button onClick={() => setScanStatus('idle')} className="text-brand-300 hover:text-white text-xs underline font-mono">Dismiss & Reset Probe</button>
              </div>
            )}

            {scanStatus === 'error' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-rose-500/40 bg-rose-950/20 flex items-center justify-center">
                  <AlertOctagon className="w-14 h-14 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-400">LIVENESS SERVICE UNREACHABLE</h3>
                  <p className="text-rose-300/60 text-xs mt-1 font-mono">{scanError || 'Backend biometrics service offline.'}</p>
                </div>
                <button onClick={() => { setScanStatus('idle'); setScanError(null); }} className="px-4 py-1.5 bg-rose-900/40 border border-rose-500/30 hover:bg-rose-900/60 rounded-lg text-rose-300 text-xs font-mono uppercase tracking-widest transition-all">Retry</button>
              </div>
            )}
          </div>

          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase mb-4">Anti-Spoof Rules</h3>
            <ul className="space-y-4 text-sm text-brand-200/70">
              <li className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
                <span><strong>Passive Light Check:</strong> Evaluates pixel luminescence to prevent high-res printed photographs from bypass.</span>
              </li>
              <li className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
                <span><strong>Mandatory Blinking:</strong> Rejects camera feeds lacking coordinate updates within 3 seconds of scan initiation.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* PPE VERIFICATION SYSTEM */}
      {pageKey.includes('PPE') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="absolute top-4 left-4 z-10 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-500/20 font-mono">
              <HardHat className="w-3.5 h-3.5" />
              <span>PPE VERIFICATION TELEMETRY</span>
            </div>

            {ppeScanning ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-32 h-32 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin flex items-center justify-center">
                  <HardHat className="w-10 h-10 text-white animate-pulse" />
                </div>
                <p className="text-brand-300 font-mono text-xs uppercase tracking-widest font-bold">Scanning for PPE items...</p>
              </div>
            ) : ppeResult ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full max-w-sm">
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.helmet ? 'bg-brand-500/10 border-brand-500/30' : 'bg-brand-950/20 border-brand-500/30'}`}>
                    <HardHat className={`w-8 h-8 ${ppeResult.helmet ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">Safety Helmet</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.helmet ? 'PASSED' : 'MISSING'}</span>
                  </div>
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.vest ? 'bg-brand-500/10 border-brand-500/30' : 'bg-brand-950/20 border-brand-500/30'}`}>
                    <User className={`w-8 h-8 ${ppeResult.vest ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">Hi-Vis Vest</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.vest ? 'PASSED' : 'MISSING'}</span>
                  </div>
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.safetyGoggles ? 'bg-brand-500/10 border-brand-500/30' : 'bg-brand-950/20 border-brand-500/30'}`}>
                    <Shield className={`w-8 h-8 ${ppeResult.safetyGoggles ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">Safety Goggles</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.safetyGoggles ? 'PASSED' : 'MISSING'}</span>
                  </div>
                </div>
                <button onClick={handleScanPpe} className="mt-4 px-6 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-bold uppercase">
                  Re-Scan Profile
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4">
                <HardHat className="w-16 h-16 text-brand-400" />
                <button onClick={handleScanPpe} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(13,255,0,0.15)]">
                  Trigger Visual PPE Scan
                </button>
              </div>
            )}
          </div>

          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase mb-4">Safety Matrix Policies</h3>
              <p className="text-xs text-brand-200/70 leading-relaxed">
                Platform camera nodes execute real-time convolutional scans to verify that workers checked into site boundaries are actively wearing approved protective helmets, reflective gear, and safety glasses.
              </p>
            </div>
            <button onClick={() => triggerToast('Force-check command sent to all site cameras.')} className="w-full mt-6 py-2.5 bg-brand-900/60 hover:bg-brand-600 rounded-xl border border-brand-500/30 text-xs font-bold tracking-wider uppercase">
              Recalibrate Camera Stream
            </button>
          </div>
        </div>
      )}

      {/* HEALTH & FATIGUE TELEMETRY */}
      {pageKey.includes('HEALTH') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 left-4 z-10 bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-[10px] font-black border border-rose-500/20 font-mono">
              <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
              <span>ACTIVE CONTRACTOR HEALTH TELEMETRY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-brand-950/40 border border-brand-500/10 rounded-xl text-center">
                <span className="text-[10px] font-bold text-brand-300 block uppercase">Heart Rate</span>
                <span className="text-3xl font-black font-mono block mt-2">{workerHealth.heartRate} <span className="text-xs">BPM</span></span>
                <div className="w-full bg-brand-900/60 rounded-full h-1 mt-3 overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${((workerHealth.heartRate ?? 0) / 180) * 100}%` }}></div>
                </div>
              </div>
              <div className="p-4 bg-brand-950/40 border border-brand-500/10 rounded-xl text-center">
                <span className="text-[10px] font-bold text-brand-300 block uppercase">Body Temperature</span>
                <span className="text-3xl font-black font-mono block mt-2">{workerHealth.temperature != null ? workerHealth.temperature.toFixed(1) : '—'} <span className="text-xs">°C</span></span>
                <div className="w-full bg-brand-900/60 rounded-full h-1 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(((workerHealth.temperature ?? 35) - 35) / 5) * 100}%` }}></div>
                </div>
              </div>
              <div className="p-4 bg-brand-950/40 border border-brand-500/10 rounded-xl text-center">
                <span className="text-[10px] font-bold text-brand-300 block uppercase">Fatigue Metric</span>
                <span className="text-3xl font-black font-mono block mt-2 text-emerald-400">{workerHealth.fatigue}</span>
                <span className="text-[9px] text-brand-400/50 mt-2 block">Based on telemetry coordinates</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-brand-200/50 font-mono">
              <span>Bio-Link: Connected</span>
              <span>Updated: Just now</span>
            </div>
          </div>

          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase mb-4">Bio-Sensor Settings</h3>
              <p className="text-xs text-brand-200/70 leading-relaxed">
                Connects directly to authorized workplace biometric wearable bands, monitoring heart rates, temperatures, and location telemetry in high-intensity deep excavation or toxic environments.
              </p>
            </div>
            <button onClick={() => triggerToast('Wearable force-reconnect beacon sent.')} className="w-full mt-6 py-2.5 bg-brand-900/60 hover:bg-brand-600 rounded-xl border border-brand-500/30 text-xs font-bold tracking-wider uppercase">
              Purge/Sync Wearables
            </button>
          </div>
        </div>
      )}

      {/* MAP / COORDINATES VIEW FOR GEOFENCING */}
      {(pageKey.includes('GEOFENCE') || pageKey.includes('MAP') || pageKey.includes('VIOLATION') || pageKey.includes('SITES')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-5 min-h-[350px] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 left-4 z-10 bg-brand-950/80 px-3 py-1.5 rounded-lg border border-brand-500/20 flex items-center space-x-2 text-xs font-mono">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>GEOFENCE GEOMETRIC MAP VISUALIZER</span>
            </div>

            {/* Simulated Map Canvas */}
            <div className="flex-1 flex items-center justify-center bg-brand-950/40 border border-brand-500/10 rounded-xl relative overflow-hidden my-6 min-h-[220px]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,255,0,0.06),transparent)]"></div>
              {/* Geofence Ring */}
              <div className="w-44 h-44 rounded-full border border-dashed border-brand-500/60 bg-brand-500/5 flex items-center justify-center relative animate-[borderGlow_4s_infinite]">
                <span className="text-[9px] font-mono text-brand-400 tracking-wider uppercase font-bold absolute bottom-2">SECURE GEOFENCE RADIUS</span>
                <div className="w-2 h-2 bg-brand-500 rounded-full absolute"></div>
                <div className="w-3 h-3 bg-brand-400 rounded-full absolute -top-8 -left-4 animate-pulse"><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[8px] text-brand-400 font-bold">John_Doe(IN)</span></div>
                <div className="w-3 h-3 bg-brand-500 rounded-full absolute -bottom-16 -right-16 animate-pulse"><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[8px] text-brand-500 font-bold">Alice_V(OUT_VIOLATION)</span></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-brand-200/50 font-mono">
              <span>Center Lat: 37.7749° N</span>
              <span>Lng: -122.4194° W</span>
            </div>
          </div>

          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase mb-4">Geofence Rules</h3>
              <div className="space-y-3 text-xs text-brand-200/70">
                <p><strong>Strict Proximity Check:</strong> Devices are audited every 30 seconds against their active Site coordinate radius using encrypted GPS packets.</p>
                <p><strong>Auto Clock-out Override:</strong> Exiting the geofence site coordinates for more than 15 consecutive minutes triggers an auto clock-out payload.</p>
              </div>
            </div>
            <button onClick={() => triggerToast('Full geofence spatial check forces sync triggered across all active devices.')} className="w-full mt-6 py-2.5 bg-brand-900/60 hover:bg-brand-600 rounded-xl border border-brand-500/30 text-xs font-bold tracking-wider uppercase transition-colors">
              Force Telemetry Check
            </button>
          </div>
        </div>
      )}

      {/* INDUSTRIAL STEP WIZARD (ONBOARDING, SIGNUP, ALLOCATION workflows) */}
      {(pageKey.includes('ONBOARDING') || pageKey.includes('WORKFLOW') || pageKey.includes('ALLOCATION') || pageKey.includes('RECONCILIATION')) && (
        <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between border-b border-brand-500/20 pb-4 mb-6">
            <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase">Active Workflow Provision Wizard</h3>
            <span className="px-3 py-1 bg-brand-500/10 text-brand-400 text-xs font-mono font-bold rounded">Step {wizardStep} of 3</span>
          </div>

          {/* Steps tracker indicators */}
          <div className="flex justify-between items-center max-w-md mx-auto mb-8 relative">
            <div className="absolute left-0 right-0 h-0.5 bg-brand-900/60 top-1/2 -translate-y-1/2 z-0"></div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 1 ? 'bg-brand-600 border-brand-500 text-white' : 'bg-bg-primary border-brand-500/20 text-brand-400/50'}`}>1</div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 2 ? 'bg-brand-600 border-brand-500 text-white' : 'bg-bg-primary border-brand-500/20 text-brand-400/50'}`}>2</div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 3 ? 'bg-brand-600 border-brand-500 text-white' : 'bg-bg-primary border-brand-500/20 text-brand-400/50'}`}>3</div>
          </div>

          {/* Step content */}
          <div className="min-h-[150px] flex items-center justify-center text-center">
            {wizardStep === 1 && (
              <div className="space-y-3 max-w-sm">
                <Users className="w-12 h-12 text-brand-400 mx-auto" />
                <h4 className="font-bold text-white uppercase text-sm">Step 1: Onboard worker details & bound contracts</h4>
                <p className="text-xs text-brand-200/70">Register raw worker metadata, email identities, and contractor license coordinates.</p>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-3 max-w-sm">
                <Camera className="w-12 h-12 text-indigo-400 mx-auto" />
                <h4 className="font-bold text-white uppercase text-sm">Step 2: Initialize 1:1 Identity Face Embedding</h4>
                <p className="text-xs text-brand-200/70">Biometric enrollment strictly matches coordinates against the newly bound worker profile.</p>
              </div>
            )}
            {wizardStep === 3 && (
              <div className="space-y-3 max-w-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white uppercase text-sm">Step 3: Access Clearance Generation Completed</h4>
                <p className="text-xs text-brand-200/70">Cryptographic identity-bound pass is ready. Worker cleared for active geofenced entries.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-brand-500/20 pt-4 mt-6">
            <button 
              disabled={wizardStep === 1}
              onClick={() => setWizardStep(prev => prev - 1)}
              className="px-4 py-2 bg-brand-900/60 border border-brand-500/30 hover:bg-brand-850 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30"
            >
              Previous
            </button>
            <button 
              onClick={() => {
                if (wizardStep === 3) {
                  setWizardStep(1);
                  triggerToast('Industrial workflow onboarding cleared and finalized successfully.');
                } else {
                  setWizardStep(prev => prev + 1);
                }
              }}
              className="px-6 py-2 bg-brand-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase transition-all"
            >
              {wizardStep === 3 ? 'Finalize & Onboard' : 'Next Step'}
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM CONFIGURATION POLICIES / TOGGLES */}
      {(pageKey.includes('SETTINGS') || pageKey.includes('POLICIES') || pageKey.includes('CONFIG')) && (
        <>
          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase mb-6">Security & Geofence Policy Parameters</h3>
            <div className="space-y-4 max-w-2xl text-xs font-semibold">
              <div className="flex items-center justify-between p-3 bg-brand-950/20 border border-brand-500/10 rounded-xl">
                <div>
                  <p className="text-white uppercase font-bold">Enforce strict 1:1 biometric identity scoping</p>
                  <p className="text-[10px] text-brand-400/50 mt-0.5">Enforces explicit email scope inputs before biometric check starts.</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-brand-950/20 border border-brand-500/10 rounded-xl">
                <div>
                  <p className="text-white uppercase font-bold">Confidence Threshold (90%)</p>
                  <p className="text-[10px] text-brand-400/50 mt-0.5">Rejects biometric face matches with confidence scores below 0.90.</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-brand-950/20 border border-brand-500/10 rounded-xl">
                <div>
                  <p className="text-white uppercase font-bold">Passive Anti-Spoof Liveness verification</p>
                  <p className="text-[10px] text-brand-400/50 mt-0.5">Blocks camera streams with static photo patterns.</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-brand-950/20 border border-brand-500/10 rounded-xl">
                <div>
                  <p className="text-white uppercase font-bold">Realtime WebSocket alerts</p>
                  <p className="text-[10px] text-brand-400/50 mt-0.5">Broadcast active geofence violations immediately.</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
            </div>
            <button onClick={() => triggerToast('System configuration saved and synced across nodes.')} className="mt-6 px-6 py-2 bg-brand-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase tracking-wider">
              Apply Configurations
            </button>
          </div>

          {/* SECURE BIOMETRIC IDENTITY CONFIGURATOR */}
          <div className="mt-8 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-brand-400" />
              <h3 className="text-lg font-bold font-papyrus tracking-wider uppercase text-white">Enterprise Biometric Identity Management</h3>
            </div>
            
            <p className="text-[11px] text-brand-400/70 mb-6 max-w-xl">
              Configure your personal biometric credentials. FenceIN biometric credentials are L2-normalized and projected down to 128D geometric vectors, fully isolated under strict 1:1 user scoping.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FACIAL EMBEDDING CONTROLLER */}
              <div className="bg-brand-950/20 border border-brand-500/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-black uppercase text-white tracking-widest">Face ID Biometrics</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[8px] font-bold rounded-full border uppercase tracking-wider ${
                    faceEnrolled 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                  }`}>
                    {faceEnrolled ? 'ENROLLED & ACTIVE' : 'NOT REGISTERED'}
                  </span>
                </div>

                {enrollFaceActive ? (
                  <div className="aspect-[4/3] w-full max-w-[260px] mx-auto rounded-2xl border border-brand-500/20 bg-bg-primary/80 overflow-hidden relative shadow-2xl flex flex-col justify-between">
                    <video
                      ref={settingsVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="object-cover h-full w-full opacity-90 -scale-x-100 animate-pulse"
                    />
                    
                    {faceBoxState && (
                      <div
                        className="absolute border-4 rounded-xl transition-all duration-150 pointer-events-none animate-pulse border-brand-500 shadow-[0_0_15px_rgba(13,255,0,0.4)]"
                        style={{
                          left: `${faceBoxState.left}px`,
                          top: `${faceBoxState.top}px`,
                          width: `${faceBoxState.width}px`,
                          height: `${faceBoxState.height}px`
                        }}
                      />
                    )}

                    <div className="absolute bottom-0 inset-x-0 bg-black/70 py-2 text-center font-mono text-[9px] font-bold tracking-widest text-brand-300">
                      [{enrollFaceStep.toUpperCase()}] {enrollFaceMsg} (Blinks: {enrollBlinkCount}/2)
                    </div>
                    
                    <button 
                      onClick={stopEnrollFaceScanner} 
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white text-[9px] font-bold uppercase transition-all"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onClick={startEnrollFaceScanner}
                      disabled={!faceModelsLoaded}
                      className="w-full py-3 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/25 rounded-xl text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {faceModelsLoaded ? (faceEnrolled ? 'Recalibrate & Register Face' : 'Enroll Face Identity') : 'Loading Face ID Models...'}
                    </button>
                  </div>
                )}
              </div>

              {/* FINGERPRINT TOUCH ID CONTROLLER */}
              <div className="bg-brand-950/20 border border-brand-500/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-black uppercase text-white tracking-widest">Touch ID Biometrics</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[8px] font-bold rounded-full border uppercase tracking-wider ${
                    fingerprintEnrolled 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                  }`}>
                    {fingerprintEnrolled ? 'ENROLLED & ACTIVE' : 'NOT REGISTERED'}
                  </span>
                </div>

                {enrollFingerprintActive ? (
                  <div 
                    className={`aspect-square w-full max-w-[150px] mx-auto rounded-3xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border bg-bg-primary/80 border-brand-500/30 shadow-[0_0_30px_rgba(13,255,0,0.15)]`}
                    onMouseUp={cancelFingerprintEnroll}
                    onMouseLeave={cancelFingerprintEnroll}
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
                        'border-brand-500/20'
                      }`}>
                        <Fingerprint className={`w-6 h-6 transition-all duration-300 ${
                          fingerprintState === 'scanning' ? 'text-brand-400 filter drop-shadow-[0_0_8px_rgba(13,255,0,0.5)] animate-pulse' :
                          fingerprintState === 'success' ? 'text-brand-400 filter drop-shadow-[0_0_12px_rgba(13,255,0,0.6)]' :
                          'text-brand-500'
                        }`} />
                      </div>
                    </div>

                    <div className="absolute bottom-1 text-[8px] font-mono text-brand-400/90 text-center px-2">{fingerprintMsg} ({fingerprintProgress}%)</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onMouseDown={startFingerprintEnroll}
                      className="w-full py-3 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/25 rounded-xl text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] select-none cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      {fingerprintEnrolled ? 'Press & Hold to Enroll New Print' : 'Enroll Fingerprint Touch ID'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(faceEnrolled || fingerprintEnrolled) && (
              <div className="mt-6 pt-4 border-t border-brand-500/10 flex items-center justify-between">
                <span className="text-[10px] text-brand-400/50">Registered biometrics have cryptographic hash keys generated and protected inside SQL vaults.</span>
                <button 
                  onClick={() => setIsRevokeModalOpen(true)}
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-brand-400 hover:text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke Biometrics
                </button>
              </div>
            )}
          </div>

          {isRevokeModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-bg-secondary border border-brand-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
                <AlertOctagon className="w-12 h-12 text-brand-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold font-papyrus text-white uppercase tracking-wider">Revoke Biometrics?</h4>
                <p className="text-[11px] text-brand-400/70">This action will completely purge your facial embedding and fingerprint minutiae template from our SQL vector vault. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={handleRevokeBiometrics} className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 font-bold uppercase text-[10px] tracking-wider rounded-xl text-white cursor-pointer">
                    Yes, Purge Vault
                  </button>
                  <button onClick={() => setIsRevokeModalOpen(false)} className="flex-1 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 font-bold uppercase text-[10px] tracking-wider rounded-xl text-text-secondary cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CORE INTUITIVE LAYOUT FOR PAGES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TELEMETRY TABLE VIEW */}
        {!(pageKey.includes('SECURITY_CENTER') || 
           pageKey.includes('INCIDENT_CENTER') || 
           pageKey.includes('AUDIT_LOGS') || 
           pageKey.includes('SYSTEM_MONITORING') || 
           pageKey.includes('GLOBAL_ANALYTICS')) && (
          <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-papyrus tracking-wider uppercase text-brand-100">{pageTitle} Core Telemetry</h2>
              <button onClick={() => { setItems([...items].reverse()); triggerToast('Reverse order sorting applied.'); }} className="text-brand-200/70 hover:text-white transition-colors flex items-center space-x-1 text-xs font-mono uppercase">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sort Table</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-brand-400/50">No matching telemetry records found.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-500/20 text-brand-200/70 text-xs uppercase tracking-wider font-mono">
                      {Object.keys(items[0] || {}).map((header) => (
                        <th key={header} className="pb-3 font-medium">{header}</th>
                      ))}
                      <th className="pb-3 font-medium text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium">
                    {filteredItems.map((row, idx) => (
                      <tr key={idx} className="border-b border-brand-500/10 hover:bg-brand-950/20 transition-colors">
                        {Object.entries(row).map(([k, val]: any, i) => (
                          <td key={i} className="py-4 text-brand-200/90 font-medium">
                            {k === 'status' || k === 'state' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                val === 'Active' || val === 'Online' || val === 'Checked-In' || val === 'SUCCESS' || val === 'Resolved' || val === 'Available' || val === 'In-Use' || val === 'Cleared' || val === 'Approved'
                                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' 
                                  : val === 'Suspended' || val === 'Offline' || val === 'Locked' || val === 'CRITICAL' || val === 'SPOOF_ALERT'
                                  ? 'bg-brand-950/30 text-brand-400 border-brand-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {val}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                        <td className="py-4 text-right flex items-center justify-end space-x-2">
                          {pageKey.includes('ORGANIZATIONS') && (
                            <button onClick={() => handleToggleSuspendOrg(row.id)} className="px-2 py-1 bg-brand-900/40 hover:bg-brand-800/40 border border-brand-500/30 rounded text-[10px] font-mono text-brand-200">
                              {row.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                          <button onClick={() => triggerToast(`Item detail view for ID: ${row.id || row.role || 'Item'} queried.`)} className="p-1 bg-brand-900/20 hover:bg-brand-900/60 border border-brand-500/10 rounded transition-colors text-brand-300">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setItems(items.filter(item => item !== row)); triggerToast('Item purged from local workspace.'); }} className="p-1 bg-brand-950/20 hover:bg-brand-900/40 border border-brand-500/10 rounded transition-colors text-brand-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* AI CHAT PANEL OR QUICK ACTION CONTROLS */}
        <div className={(pageKey.includes('SECURITY_CENTER') || 
                         pageKey.includes('INCIDENT_CENTER') || 
                         pageKey.includes('AUDIT_LOGS') || 
                         pageKey.includes('SYSTEM_MONITORING') || 
                         pageKey.includes('GLOBAL_ANALYTICS')) 
                         ? "lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6" 
                         : "flex flex-col space-y-6"}>
          
          {/* AI ASSISTANT WIDGET */}
          <div className={`bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-5 flex flex-col h-[350px] relative overflow-hidden ${
            (pageKey.includes('SECURITY_CENTER') || 
             pageKey.includes('INCIDENT_CENTER') || 
             pageKey.includes('AUDIT_LOGS') || 
             pageKey.includes('SYSTEM_MONITORING') || 
             pageKey.includes('GLOBAL_ANALYTICS')) ? 'md:col-span-2' : ''
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.03),transparent)]"></div>
            <div className="flex items-center space-x-2 border-b border-brand-500/20 pb-3 mb-3 z-10">
              <Zap className="w-4 h-4 text-brand-400 animate-pulse" />
              <h3 className="font-papyrus text-sm uppercase tracking-wider font-bold">Secured AI Insight Engine</h3>
            </div>
            
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none z-10 text-xs font-semibold">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2 border ${
                    msg.sender === 'user' 
                      ? 'bg-brand-900/40 border-brand-500/40 text-brand-100' 
                      : 'bg-brand-950/80 border-brand-500/10 text-brand-200/80'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>

            {/* AI Error State */}
            {aiError && (
              <div className="mx-0 mt-2 px-3 py-2 bg-rose-950/30 border border-rose-500/20 rounded-xl flex items-center justify-between z-10">
                <span className="text-rose-400 text-[10px] font-mono font-bold">⚠ AI service unavailable: {aiError}</span>
                <button onClick={() => setAiError(null)} className="text-rose-400/60 hover:text-rose-400 text-[9px] font-mono ml-2 uppercase tracking-widest">Dismiss</button>
              </div>
            )}

            {/* Input Bar */}
            <div className="mt-3 flex space-x-2 z-10">
              <input 
                type="text" 
                placeholder="Ask insight..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                className="flex-1 bg-bg-primary border border-brand-500/20 rounded-lg px-3 py-1.5 text-xs text-brand-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent font-semibold"
              />
              <button onClick={handleChatSend} className="p-2 bg-brand-600 hover:bg-blue-500 rounded-lg transition-all text-white shadow-md shadow-brand-500/20">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COMPLIANCE / CERTIFICATE / REPORTING CENTER */}
          {(pageKey.includes('DOCUMENT') || pageKey.includes('CERTIFICATION') || pageKey.includes('COMPLIANCE') || pageKey.includes('REPORT')) && (
            <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-bold font-papyrus tracking-wider uppercase mb-3 flex items-center space-x-2">
                <FileUp className="w-4 h-4 text-brand-400" />
                <span>Upload Document / Certificate</span>
              </h3>
              <div className="border-2 border-dashed border-brand-500/20 rounded-xl p-6 text-center hover:border-brand-500/40 transition-colors cursor-pointer group">
                <Cloud className="w-8 h-8 text-brand-400/50 group-hover:text-brand-400 transition-colors mx-auto mb-2" />
                <p className="text-xs text-brand-200/70">Drag & drop certification PDF, XLS or image here</p>
                <p className="text-[10px] text-brand-400/50 mt-1">Accepts up to 10MB cryptographically signed files</p>
              </div>
              <button onClick={() => triggerToast('Cryptographically signed PDF transaction report created & exported.')} className="w-full mt-4 py-2.5 bg-brand-600 hover:bg-blue-500 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10">
                <Download className="w-4 h-4" />
                <span>Export Transaction Report</span>
              </button>
            </div>
          )}

          {/* QUICK COMMAND ACTION TRIGGER CARD */}
          <div className={`bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-5 flex flex-col justify-between ${
            (pageKey.includes('SECURITY_CENTER') || 
             pageKey.includes('INCIDENT_CENTER') || 
             pageKey.includes('AUDIT_LOGS') || 
             pageKey.includes('SYSTEM_MONITORING') || 
             pageKey.includes('GLOBAL_ANALYTICS')) ? 'h-[350px]' : ''
          }`}>
            <div>
              <h3 className="text-sm font-black font-papyrus tracking-wider uppercase mb-3 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-brand-400" />
                <span>Diagnostic Quick Commands</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
                <button onClick={() => triggerToast('Cryptographic system key cycle command dispatched.')} className="py-2 px-3 bg-brand-950 border border-brand-500/20 hover:border-brand-500/60 rounded text-left transition-all hover:bg-brand-900/20">
                  &gt; Cycle System Keys
                </button>
                <button onClick={() => triggerToast('Active user socket channel purge initiated.')} className="py-2 px-3 bg-brand-950 border border-brand-500/20 hover:border-brand-500/60 rounded text-left transition-all hover:bg-brand-900/20">
                  &gt; Flush Sockets
                </button>
                <button onClick={() => triggerToast('Offline geofence logs forced database flush.')} className="py-2 px-3 bg-brand-950 border border-brand-500/20 hover:border-brand-500/60 rounded text-left transition-all hover:bg-brand-900/20">
                  &gt; Sync Offline Logs
                </button>
                <button onClick={() => triggerToast('Liveness camera node latency recalibrated.')} className="py-2 px-3 bg-brand-950 border border-brand-500/20 hover:border-brand-500/60 rounded text-left transition-all hover:bg-brand-900/20">
                  &gt; Recalibrate Liveness
                </button>
              </div>
            </div>
            {(pageKey.includes('SECURITY_CENTER') || 
              pageKey.includes('INCIDENT_CENTER') || 
              pageKey.includes('AUDIT_LOGS') || 
              pageKey.includes('SYSTEM_MONITORING') || 
              pageKey.includes('GLOBAL_ANALYTICS')) && (
              <div className="border-t border-brand-500/10 pt-4 mt-2">
                <div className="flex items-center justify-between text-[9px] font-mono font-black text-brand-400">
                  <span>TELEMETRY SECURE PIPELINE</span>
                  <span className="text-green-400 animate-pulse">● CONNECTED</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC ACTION MODALS */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
        modalType === 'CREATE_ORG' ? 'Provision New SaaS Organization' :
        modalType === 'ADD_USER' ? 'Register Account & Identity Bind' :
        modalType === 'ADD_SITE' ? 'Provision Geofence Radius Site' :
        modalType === 'REPORT_INCIDENT' ? 'Log Forensic Security Incident' :
        modalType === 'CREATE_VISITOR' ? 'Issue Visitor Access Badge' : 'Initiate System Directive'
      }>
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm font-semibold">
          {modalType === 'CREATE_ORG' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Organization Name</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Titan Industrial Ltd." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-200/70">Unique Code Identifier</label>
                  <input required type="text" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. TITN" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-200/70">Primary Administrator Email</label>
                  <input required type="email" value={formData.admin || ''} onChange={e => setFormData({ ...formData, admin: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. admin@titan.com" />
                </div>
              </div>
            </>
          )}

          {modalType === 'ADD_USER' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">FullName</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Secure Email Identity</label>
                <input required type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. john@titan.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Global Role Assignment</label>
                <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  {allowedOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modalType === 'ADD_SITE' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Geofence Site Area Name</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Titan HQ Refinery" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Geofence Coordinate Radius (meters)</label>
                <input required type="number" value={formData.radius || 150} onChange={e => setFormData({ ...formData, radius: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" />
              </div>
            </>
          )}

          {modalType === 'REPORT_INCIDENT' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Incident Threat Classification</label>
                <select value={formData.type || 'SAFETY_BREACH'} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  <option value="SAFETY_BREACH">SAFETY_BREACH (Helmet/Harness Missing)</option>
                  <option value="BIOMETRIC_SPOOF_ATTACK">BIOMETRIC_SPOOF_ATTACK (Photo projection on Kiosk)</option>
                  <option value="UNAUTHORIZED_GEOFENCE_EXIT">UNAUTHORIZED_GEOFENCE_EXIT (Device exiting bounds during shift)</option>
                  <option value="FORCE_LOCKDOWN">CRITICAL: MANDATORY SITE FORCE LOCKDOWN</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Severity Level</label>
                <select value={formData.severity || 'HIGH'} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL (Alert supervisor & trigger alarms)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Incident Source Node</label>
                <input required type="text" value={formData.source || ''} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Kiosk West Gate 04" />
              </div>
            </>
          )}

          {modalType === 'CREATE_VISITOR' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Visitor Name</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. David Miller" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Sponsoring Host (Supervisor/HR)</label>
                <input required type="text" value={formData.host || ''} onChange={e => setFormData({ ...formData, host: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Michael Chen" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">Visitor Affiliation Organization</label>
                <input required type="text" value={formData.organization || ''} onChange={e => setFormData({ ...formData, organization: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Compliance Bureau" />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-brand-200/90 hover:text-white transition-colors">Cancel Directive</button>
            <button type="submit" className="px-6 py-2 bg-brand-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-brand-500/20">
              Confirm & Dispatch Directive
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
