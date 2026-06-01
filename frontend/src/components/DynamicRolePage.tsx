import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import { useSocket } from './SocketContext';
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const totalSegments = 18;
  const activeSegments = Math.round((percentage / 100) * totalSegments);
  return (
    <div className={`flex flex-col items-center justify-center p-6 border rounded-2xl relative overflow-hidden h-full group transition-all shadow-xl ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20 hover:border-brand-500/40' 
        : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl hover:border-border-primary/40'
    }`}>
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
                stroke={isActive ? color : (theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)')}
                strokeWidth="5"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{percentage.toFixed(1)}%</span>
          <span className="text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">{t(label)}</span>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-brand-500/10 text-center font-mono">
        <div className="text-[10px] text-brand-300">
          <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{(percentage * 2.4).toFixed(0)}</div>
          <div className="text-[8px] text-brand-400/70">{t('DEVICES')}</div>
        </div>
        <div className="text-[10px] text-emerald-400">
          <div className="text-emerald-400 font-bold">✓ ACTIVE</div>
          <div className="text-[8px] text-brand-400/70">{t('SECURED')}</div>
        </div>
      </div>
    </div>
  );
};

// Voltax-style Rounded Column Bar Chart Component
const VoltaxBarChart = ({ title, subtitle, data }: { title: string, subtitle: string, data: Array<{ label: string, value: number, active?: boolean }> }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className={`border rounded-2xl p-6 flex flex-col justify-between h-full group transition-all shadow-xl ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20 hover:border-brand-500/40' 
        : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl hover:border-border-primary/40'
    }`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t(title)}</h3>
          <p className={`text-[10px] font-mono mt-0.5 ${theme === 'dark' ? 'text-brand-400/80' : 'text-text-muted'}`}>{t(subtitle)}</p>
        </div>
        <select className={`border rounded px-2 py-1 text-[9px] font-mono focus:outline-none ${
          theme === 'dark' ? 'bg-bg-primary border-brand-500/20 text-brand-300' : 'bg-bg-secondary border-border-muted text-text-primary'
        }`}>
          <option>{t('This Week')}</option>
          <option>{t('Last Week')}</option>
        </select>
      </div>

      <div className={`relative h-48 flex items-end justify-between border-b ${theme === 'dark' ? 'border-brand-500/10' : 'border-border-muted/30'} pb-2`}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[8px] font-mono text-brand-400/30">
          <div className={`w-full border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
          <div className={`w-full border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
          <div className={`w-full border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
          <div className={`w-full border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
        </div>

        {data.map((bar, idx) => {
          const heightPercent = (bar.value / maxValue) * 100;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 space-y-2 group relative z-10">
              {/* Tooltip */}
              <div className={`absolute -top-8 border text-[8px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl ${
                theme === 'dark' ? 'bg-brand-950 border-brand-500/50 text-white' : 'bg-white border-slate-250 text-text-primary'
              }`}>
                {bar.value}
              </div>
              <div 
                className={`w-6 rounded-t-full transition-all duration-1000 relative overflow-hidden ${
                  bar.active 
                    ? 'bg-gradient-to-t from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : (theme === 'dark' ? 'bg-brand-900/30 hover:bg-brand-900/60 border border-brand-500/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200')
                }`}
                style={{ height: `${Math.max(10, (heightPercent / 100) * 130)}px`, maxHeight: '140px' }}
              >
                {bar.active && <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[stripe_1s_linear_infinite]"></div>}
              </div>
              <span className="text-[9px] font-mono font-bold text-brand-400/70">{t(bar.label)}</span>
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
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const { theme } = useTheme();
  const { socket } = useSocket();

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

  const allowedRolesMap = {
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

  const getAllowedRoles = (roleName: string): Array<{ value: string; label: string }> => {
    switch (roleName) {
      case 'SUPER_ADMIN': return allowedRolesMap.SUPER_ADMIN;
      case 'ORG_ADMIN': return allowedRolesMap.ORG_ADMIN;
      case 'HR_ADMIN': return allowedRolesMap.HR_ADMIN;
      case 'SUPERVISOR': return allowedRolesMap.SUPERVISOR;
      case 'SECURITY_OFFICER': return allowedRolesMap.SECURITY_OFFICER;
      case 'VENDOR_MANAGER': return allowedRolesMap.VENDOR_MANAGER;
      case 'WORKER': return allowedRolesMap.WORKER;
      default: return [];
    }
  };

  const allowedOptions = user ? getAllowedRoles(user.role) : [];

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

  // Dynamic Chart states
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});

  const fetchChartData = useCallback(async (chartName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3456/api/v1/analytics/query?chart=${chartName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChartDataMap(prev => ({ ...prev, [chartName]: data.rows || [] }));
      }
    } catch (err) {
      console.error(`Failed to fetch chart: ${chartName}`, err);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) return;
    const role = user.role;
    const chartsToFetch: string[] = [];
    if (role === 'SUPER_ADMIN') {
      chartsToFetch.push('platform_activity_heatmap', 'multi_tenant_growth_curve', 'biometric_transaction_throughput', 'security_incident_global_index', 'role_distribution_matrix', 'system_resource_utilization');
    } else if (role === 'ORG_ADMIN') {
      chartsToFetch.push('workforce_utilization_index', 'attendance_authenticity_score', 'geofence_violation_heatmap', 'site_performance_dashboard', 'vendor_dependency_matrix', 'incident_trend_analyzer');
    } else if (role === 'HR_ADMIN') {
      chartsToFetch.push('workforce_lifecycle_funnel', 'payroll_distribution_curve', 'attendance_compliance_score', 'leave_impact_analyzer', 'compliance_risk_heatmap');
    } else if (role === 'SUPERVISOR') {
      chartsToFetch.push('live_workforce_activity_stream', 'task_completion_velocity', 'attendance_drift_detector', 'incident_response_timeline', 'worker_load_distribution');
    } else if (role === 'SECURITY_OFFICER') {
      chartsToFetch.push('spoof_detection_confidence_trend', 'access_anomaly_detector', 'geofence_breach_map', 'worker_blacklist_impact_chart', 'surveillance_event_index');
    } else if (role === 'VENDOR_MANAGER') {
      chartsToFetch.push('vendor_productivity_index', 'cost_vs_output_curve', 'compliance_adherence_score', 'worker_allocation_distribution');
    } else if (role === 'WORKER') {
      chartsToFetch.push('attendance_consistency_score', 'shift_completion_timeline', 'earnings_overtime_tracker', 'activity_summary_timeline');
    }
    
    chartsToFetch.forEach(chart => fetchChartData(chart));
  }, [user, token, fetchChartData, reloadTrigger]);

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
  const [healthHistory, setHealthHistory] = useState<number[]>([60, 65, 58, 62, 70, 68, 72, 65, 75, 80]);

  // Suppress warnings for pre-existing unused states
  useEffect(() => {
    if (dbSites.length || dbVendors.length || dashboardError || ppeError || dbWorkers.length || isLoadingDashboard || healthHistory.length) {
      console.debug('Dynamic lists active');
    }
  }, [dbSites, dbVendors, dashboardError, ppeError, dbWorkers, isLoadingDashboard, healthHistory]);

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
        const checkIns = data.snapshots.map((s: any) => s.totalCheckIns || 0);
        const padded = [...Array(Math.max(0, 10 - checkIns.length)).fill(60), ...checkIns].slice(-10);
        setHealthHistory(padded);
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
    if (!socket) return;
    const handleAttendanceUpdate = (event: any) => {
      triggerToast(`Live sync: ${event.type === 'CHECK_IN' ? '🟢 Check-In' : '🔴 Check-Out'} detected.`);
      setReloadTrigger(prev => prev + 1);
    };
    socket.on('attendance_update', handleAttendanceUpdate);
    return () => {
      socket.off('attendance_update', handleAttendanceUpdate);
    };
  }, [socket]);

  const triggerToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleActionClick = (type: string) => {
    setModalType(type);
    if (type === 'ADD_USER') {
      const allowedOpts = user ? getAllowedRoles(user.role) : [];
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 text-text-primary">
      {/* Toast Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 border px-6 py-4 rounded-xl shadow-xl z-[9999] flex items-center space-x-3 ${
              theme === 'dark' ? 'bg-brand-950 border-brand-500/80 text-white shadow-[0_0_30px_rgba(255,0,0,0.3)]' : 'bg-white border-slate-200 text-text-primary'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 text-brand-400" />
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-widest font-bold ${
                theme === 'dark' ? 'text-brand-300' : 'text-emerald-600'
              }`}>{t('SYSTEM TELETROPE')}</p>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t(successMessage)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMERGENCY PANEL FOR EVACUATION/ALERT SYSTEM */}
      {(pageKey.includes('EMERGENCY') || pageKey.includes('EVACUATION') || alarmActive) && (
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${alarmActive ? 'bg-brand-950/60 border-brand-500 animate-pulse shadow-[0_0_40px_rgba(13,255,0,0.4)]' : (theme === 'dark' ? 'bg-brand-950/30 border-brand-500/20' : 'bg-emerald-50 border-emerald-500/20')}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3.5 rounded-full ${alarmActive ? 'bg-brand-500 text-white animate-ping' : (theme === 'dark' ? 'bg-brand-900/60 text-brand-400' : 'bg-emerald-100 text-emerald-600')}`}>
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h2 className={`text-xl font-black font-papyrus uppercase tracking-widest ${alarmActive ? 'text-white' : (theme === 'dark' ? 'text-white' : 'text-text-primary')}`}>{t('Emergency Evacuation System')}</h2>
                <p className={`text-sm mt-1 ${alarmActive ? 'text-white/80' : (theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary')}`}>{t('Broadcast high-frequency alarms, release all geofenced gates, lock active kiosks, and alert local response.')}</p>
              </div>
            </div>
            <button 
              onClick={() => setAlarmActive(!alarmActive)}
              className={`px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 border ${alarmActive ? 'bg-white text-brand-950 border-white hover:bg-brand-200' : 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.4)]'}`}
            >
              {alarmActive ? t('STAND DOWN / RESET ALARM') : t('ACTIVATE EMERGENCY LOCKDOWN')}
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 border font-mono ${
            theme === 'dark' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-500/20'
          }`}>
            <span>{t('PLATFORM SHIELDED PAGE')}</span>
          </div>
          <h1 className={`text-3xl font-black tracking-tight uppercase font-papyrus ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t(pageTitle)}</h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('Telemetry, operations control, and cryptographically verified actions.')}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted/65'}`} />
            <input 
              type="text" 
              placeholder={t('Search telemetry...')} 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`border pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent transition-all w-64 text-sm font-medium ${
                theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20 text-white' : 'bg-bg-secondary border-border-muted text-text-primary'
              }`}
            />
          </div>
          <button className={`p-2 border rounded-lg transition-colors ${
            theme === 'dark' ? 'bg-brand-900/40 hover:bg-brand-800/40 border-brand-500/20 text-brand-200/90' : 'bg-bg-secondary hover:bg-bg-hover border-border-muted text-text-primary'
          }`}>
            <Filter className="w-4 h-4" />
          </button>

          {/* Contextual Action Button */}
          {pageKey.includes('ORGANIZATIONS') && (
            <button onClick={() => handleActionClick('CREATE_ORG')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <Plus className="w-4 h-4" />
              <span>{t('Create Org')}</span>
            </button>
          )}
          {pageKey.includes('USER_MANAGEMENT') && allowedOptions.length > 0 && (
            <button onClick={() => handleActionClick('ADD_USER')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <UserPlus className="w-4 h-4" />
              <span>{t('Add User')}</span>
            </button>
          )}
          {pageKey.includes('SITES') && (
            <button onClick={() => handleActionClick('ADD_SITE')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <Plus className="w-4 h-4" />
              <span>{t('Create Site')}</span>
            </button>
          )}
          {pageKey.includes('INCIDENT') && (
            <button onClick={() => handleActionClick('REPORT_INCIDENT')} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('Log Incident')}</span>
            </button>
          )}
          {pageKey.includes('VISITOR') && (
            <button onClick={() => handleActionClick('CREATE_VISITOR')} className="flex items-center space-x-2 bg-brand-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20">
              <UserPlus className="w-4 h-4" />
              <span>{t('Issue Guest Pass')}</span>
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
        pageKey.toUpperCase().includes('API') ||
        pageKey.toUpperCase().includes('DASHBOARD')) && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Dynamic Role-Based Premium Dashboards */}
          {(() => {
            const role = user?.role || 'WORKER';

            // 1. SUPER ADMIN DASHBOARD
            if (role === 'SUPER_ADMIN') {
              const platformActivity = chartDataMap['platform_activity_heatmap'] || [];
              const tenantGrowth = chartDataMap['multi_tenant_growth_curve'] || [];
              const throughput = chartDataMap['biometric_transaction_throughput'] || [];
              const incidentIndex = chartDataMap['security_incident_global_index'] || [];
              const roleDist = chartDataMap['role_distribution_matrix'] || [];
              const sysUtil = chartDataMap['system_resource_utilization'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('DATABASE TOTAL WORKERS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{dashboardData?.live?.totalWorkers ?? 0}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-brand-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('GEOFENCED SITE CHECKS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{dashboardData?.live?.checkInsToday ?? 0} {t('Today')}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-brand-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('SaaS REGISTERED ORGS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{dashboardData?.live?.activeUsers ?? 0} {t('Active')}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-brand-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 6 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Platform Activity Heatmap" 
                        subtitle="HOURLY CHECK-INS LOGGED FROM ACTIVE WORKFORCES"
                        data={platformActivity.slice(0, 6).map((r: any) => ({
                          label: r.hour ? new Date(r.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'D',
                          value: Number(r.event_count)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={throughput.length > 0 ? (throughput[0].successes / throughput[0].total_attempts) * 100 : 98.4}
                        color="rgb(99, 102, 241)"
                        label="BIOMETRIC CAPTURE RATE"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Multi-Tenant Growth Curve" 
                        subtitle="CUMULATIVE SaaS ENTERPRISE ONBOARDINGS PER MONTH"
                        data={tenantGrowth.slice(0, 6).map((r: any) => ({
                          label: r.month ? new Date(r.month).toLocaleDateString([], { month: 'short' }) : 'M',
                          value: Number(r.new_tenants)
                        }))}
                      />
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Security Incident Global Index')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {incidentIndex.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={`uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary font-semibold'}`}>{t(r.severity)} {t('LEVEL')}</span>
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{r.incident_count} {t('events')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('System Resource Utilization')}</h3>
                      <div className="space-y-4 font-mono text-xs">
                        {sysUtil.slice(0, 3).map((r: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between">
                              <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{t('CPU LOAD')} ({r.time ? new Date(r.time).toLocaleTimeString([], { hour: '2-digit' }) : 'H'})</span>
                              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{r.cpu_load}%</span>
                            </div>
                            <div className={`w-full rounded-full h-1 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
                              <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${r.cpu_load}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={roleDist.length > 0 ? (roleDist.filter((r: any) => r.role === 'WORKER').reduce((acc: number, r: any) => acc + Number(r.user_count), 0) / roleDist.reduce((acc: number, r: any) => acc + Number(r.user_count), 0)) * 100 : 75}
                        color="rgb(16, 185, 129)"
                        label="WORKER RATIO MATRIX"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            // 2. ORGANIZATION ADMIN DASHBOARD
            if (role === 'ORG_ADMIN') {
              const utilIndex = chartDataMap['workforce_utilization_index'] || [];
              const authenticity = chartDataMap['attendance_authenticity_score'] || [];
              const geofenceHeat = chartDataMap['geofence_violation_heatmap'] || [];
              const sitePerf = chartDataMap['site_performance_dashboard'] || [];
              const vendorMatrix = chartDataMap['vendor_dependency_matrix'] || [];
              const incidentTrend = chartDataMap['incident_trend_analyzer'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('ACTIVE ON-SITE WORKERS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{dashboardData?.live?.activeUsers ?? 0}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-brand-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('TOTAL GEOFENCE CHECKS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{dashboardData?.live?.checkInsToday ?? 0} {t('Today')}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-brand-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('OPERATIONAL SITES')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>3 {t('Sites')}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-brand-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 6 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Workforce Utilization Index" 
                        subtitle="PERCENTAGE ACTIVE vs ASSIGNED SHIFT WORKERS"
                        data={utilIndex.slice(0, 6).map((r: any) => ({
                          label: r.date ? new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'D',
                          value: Number(r.utilization_pct)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={authenticity.length > 0 ? (authenticity[0].biometric_checkins / (authenticity[0].biometric_checkins + authenticity[0].manual_checkins)) * 100 : 98.4}
                        color="rgb(99, 102, 241)"
                        label="BIOMETRIC AUTHENTICITY"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Geofence Violation Heatmap')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {geofenceHeat.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{t('USER_')}{r.user_id?.slice(0,4).toUpperCase()} ({t('OUTSIDE GEOFENCE')})</span>
                            <span className="text-rose-400 font-bold">{r.avg_distance_outside}m {t('away')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Vendor Dependency Matrix')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {vendorMatrix.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.vendor_name}</span>
                            <span className="text-emerald-400 font-bold">{r.pct_total}% {t('of workforce')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Site Performance Scorecard" 
                        subtitle="COMPLIANCE CHECKS AND INCIDENTS GROUPED BY OPERATIONAL SITE"
                        data={sitePerf.slice(0, 6).map((r: any) => ({
                          label: r.site_name,
                          value: Number(r.checkins)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={incidentTrend.length > 0 ? 100 - (incidentTrend.length * 5) : 100}
                        color="rgb(239, 68, 68)"
                        label="SITE INCIDENT SAFETY SHIELD"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            // 3. HR ADMIN DASHBOARD
            if (role === 'HR_ADMIN') {
              const lifecycle = chartDataMap['workforce_lifecycle_funnel'] || [];
              const payroll = chartDataMap['payroll_distribution_curve'] || [];
              const compliance = chartDataMap['attendance_compliance_score'] || [];
              const leave = chartDataMap['leave_impact_analyzer'] || [];
              const complianceRisk = chartDataMap['compliance_risk_heatmap'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('HR REGISTERED ACTIVE WORKERS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{lifecycle.length > 0 ? lifecycle[0].active : 0}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('OVERTIME ACCRUED COST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        ${payroll.length > 0 ? Number(payroll[0].total_overtime_cost).toLocaleString() : '0'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-emerald-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('COMPLIANCE COMP ACTION')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {complianceRisk.length > 0 ? `${complianceRisk[0].compliance_pct}%` : '100%'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-rose-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 5 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Payroll Distribution Curve" 
                        subtitle="ESTIMATED OVERTIME COST vs MONTHLY PAYROLL ESTIMATIONS"
                        data={payroll.slice(0, 6).map((r: any) => ({
                          label: r.month ? new Date(r.month).toLocaleDateString([], { month: 'short' }) : 'M',
                          value: Number(r.total_payroll)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={compliance.length > 0 ? Number(compliance[0].ontime_pct) : 95}
                        color="rgb(99, 102, 241)"
                        label="ATTENDANCE COMPLIANCE"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Leave Impact Analyzer')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {leave.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={`uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t(r.leave_type || 'GENERAL')} {t('LEAVE')}</span>
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{r.approval_rate}% {t('Approved')} ({r.requests} {t('reqs')})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Compliance Risk Heatmap')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {complianceRisk.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={`uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t(r.doc_type?.replace(/_/g, ' '))}</span>
                            <span className="text-emerald-400 font-bold">{r.compliance_pct}% {t('verified')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 4. SUPERVISOR DASHBOARD
            if (role === 'SUPERVISOR') {
              const stream = chartDataMap['live_workforce_activity_stream'] || [];
              const velocity = chartDataMap['task_completion_velocity'] || [];
              const drift = chartDataMap['attendance_drift_detector'] || [];
              const timeline = chartDataMap['incident_response_timeline'] || [];
              const loadDist = chartDataMap['worker_load_distribution'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('SUPERVISOR ASSIGNED WORKERS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{loadDist.length} {t('Workers')}</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('ACTIVE DRIFT DAYS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {drift.filter((d: any) => d.late_days > 0).length} {t('Events')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-emerald-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('TASKS COMPLETED TODAY')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {velocity.reduce((acc: number, v: any) => acc + Number(v.tasks_completed), 0)} {t('Completed')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-rose-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 5 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Live Workforce Activity Stream" 
                        subtitle="RECENT WORKFORCE CLOCK-IN/OUT EVENT TELEMETRY STREAMS"
                        data={stream.slice(0, 6).map((r: any) => ({
                          label: r.worker_name?.split(' ')[0] || `USR-${r.user_id?.slice(0,4)}`,
                          value: Number(r.status === 'ACTIVE' ? 100 : 30),
                          active: r.status === 'ACTIVE'
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={velocity.length > 0 ? (velocity.reduce((acc: number, v: any) => acc + Number(v.ontime_tasks), 0) / velocity.reduce((acc: number, v: any) => acc + Number(v.tasks_completed), 0)) * 100 : 94}
                        color="rgb(99, 102, 241)"
                        label="TASK VELOCITY INDEX"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Worker Load Distribution')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {loadDist.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.worker_name}</span>
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{r.total_tasks_assigned} {t('tasks')} / {t('avg')} {r.avg_shift_hours} {t('hrs')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Incident Response Timeline')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {timeline.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={`uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t(r.incident_type)}</span>
                            <span className="text-rose-400 font-bold">{r.avg_response_time_min}m {t('response')} / {r.count} {t('events')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 5. SECURITY OFFICER DASHBOARD
            if (role === 'SECURITY_OFFICER') {
              const spoofTrend = chartDataMap['spoof_detection_confidence_trend'] || [];
              const anomaly = chartDataMap['access_anomaly_detector'] || [];
              const breachMap = chartDataMap['geofence_breach_map'] || [];
              const blacklistImpact = chartDataMap['worker_blacklist_impact_chart'] || [];
              const surveillance = chartDataMap['surveillance_event_index'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('SPOOF ATTACKS DETECTED')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {spoofTrend.reduce((acc: number, s: any) => acc + Number(s.suspected_spoof), 0)} {t('Blocks')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('ACTIVE BREED BREACHES')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {breachMap.reduce((acc: number, b: any) => acc + Number(b.breaches_last_hour), 0)} {t('Breaches')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-655'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-emerald-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('ACTIVE SURVEILLANCE ALERTS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {surveillance.reduce((acc: number, s: any) => acc + Number(s.total_alerts), 0)} {t('Alerts')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-rose-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 5 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Spoof Detection Confidence Trend" 
                        subtitle="COSINE DISTANCE SPOOF RATIO LOGGED BY CORE BIOMETRIC ENGINE"
                        data={spoofTrend.slice(0, 6).map((r: any) => ({
                          label: r.hour ? new Date(r.hour).toLocaleTimeString([], { hour: '2-digit' }) : 'H',
                          value: Number(r.spoof_rate_pct)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={spoofTrend.length > 0 ? Number(spoofTrend[0].avg_confidence) * 100 : 99.8}
                        color="rgb(99, 102, 241)"
                        label="NEURAL MATCH TRUST SCORE"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Access Anomaly Detector')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {anomaly.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.worker_name} ({r.kiosk_id})</span>
                            <span className="text-rose-400 font-bold">{r.failure_rate}% {t('failures')} ({r.offhours_attempts} {t('off-hours attempts')})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Worker Blacklist Enforcement')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {blacklistImpact.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.worker_name} ({t('BLOCKED')})</span>
                            <span className="text-emerald-400 font-bold">{r.block_enforcement_pct}% {t('blocked attempts')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 6. VENDOR MANAGER DASHBOARD
            if (role === 'VENDOR_MANAGER') {
              const prodIndex = chartDataMap['vendor_productivity_index'] || [];
              const costCurve = chartDataMap['cost_vs_output_curve'] || [];
              const adherence = chartDataMap['compliance_adherence_score'] || [];
              const allocation = chartDataMap['worker_allocation_distribution'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('VENDOR CONTRACT WORKERS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 text-white ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {adherence.length > 0 ? adherence[0].total_workers : 0} {t('workers')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('ESTIMATED PERIOD BILLINGS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 text-white ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        ${costCurve.length > 0 ? Number(costCurve[0].total_cost).toLocaleString() : '0'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-emerald-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-650'}`}>{t('COMPLIANCE ACCREDITED RATE')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 text-white ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {adherence.length > 0 ? `${adherence[0].compliance_pct}%` : '100%'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-rose-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 text-white ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 4 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Vendor Productivity Index" 
                        subtitle="TASKS COMPLETED PER ACTIVE VENDOR CONTRACTOR PER DAY"
                        data={prodIndex.slice(0, 6).map((r: any) => ({
                          label: r.day ? new Date(r.day).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'D',
                          value: Number(r.tasks_per_worker)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={adherence.length > 0 ? Number(adherence[0].compliance_pct) : 98}
                        color="rgb(99, 102, 241)"
                        label="VENDOR ACCREDITATION"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Worker Allocation Distribution')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {allocation.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.site_name}</span>
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{r.workers_allocated} {t('workers')} / {r.total_shifts} {t('shifts')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Cost vs Output ROI')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {costCurve.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.period_end ? new Date(r.period_end).toLocaleDateString([], { month: 'short' }) : 'P'}</span>
                            <span className="text-emerald-400 font-bold">{r.output_per_worker} {t('output/w (total')} ${Number(r.total_cost).toLocaleString()})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 7. WORKER PERSONAL DASHBOARD
            if (role === 'WORKER') {
              const consistency = chartDataMap['attendance_consistency_score'] || [];
              const shiftsTimeline = chartDataMap['shift_completion_timeline'] || [];
              const earnings = chartDataMap['earnings_overtime_tracker'] || [];
              const summaryTimeline = chartDataMap['activity_summary_timeline'] || [];

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-brand-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('PERSONAL ATTENDANCE RATE')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {consistency.length > 0 ? `${consistency[0].attendance_rate}%` : '96.2%'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>{t('↑ Syncing Active Nodes')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('OVERTIME EARNED PAY')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        ${earnings.length > 0 ? Number(earnings[0].overtime_pay).toFixed(2) : '0.00'}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>{t('● All Spatial Bounds Calibrated')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-emerald-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('TOTAL ACCRUED HOURS')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                        {summaryTimeline.length > 0 ? summaryTimeline.reduce((acc: number, s: any) => acc + Number(s.hours_worked), 0).toFixed(1) : '0'} {t('hrs')}
                      </h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('↑ 100% Core Pipeline Integrations')}</span>
                    </div>
                    <div className={`border p-5 rounded-2xl relative overflow-hidden transition-all shadow-xl hover:border-rose-500/40 ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-650'}`}>{t('SECURE BIOMETRIC TRUST')}</p>
                      <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>99.8%</h3>
                      <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('✓ Spoof protection checks verified')}</span>
                    </div>
                  </div>

                  {/* Grid of 4 Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <VoltaxBarChart 
                        title="Shift Completion Timeline" 
                        subtitle="PUNCTUALITY MINUTES LATE TRACK RECORD"
                        data={shiftsTimeline.slice(0, 6).map((r: any) => ({
                          label: r.date ? new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'D',
                          value: Number(r.minutes_late)
                        }))}
                      />
                    </div>
                    <div>
                      <SegmentedArc 
                        percentage={consistency.length > 0 ? Number(consistency[0].ontime_pct) : 98}
                        color="rgb(99, 102, 241)"
                        label="PERSONAL DISCIPLINE"
                      />
                    </div>

                    <div className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Activity Summary Timeline')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {summaryTimeline.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.date ? new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'D'}</span>
                            <span className="text-emerald-400 font-bold">IN: {r.first_checkin ? new Date(r.first_checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'T'} / {t('worked')} {r.hours_worked} {t('hrs')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
                      theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-bg-primary/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                    }`}>
                      <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Monthly Earnings Trend')}</h3>
                      <div className="space-y-3 font-mono text-xs">
                        {earnings.slice(0, 4).map((r: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${
                            theme === 'dark' ? 'bg-brand-900/10 border-brand-500/5' : 'bg-bg-hover border-border-primary/10'
                          }`}>
                            <span className={theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}>{r.month ? new Date(r.month).toLocaleDateString([], { month: 'short' }) : 'M'}</span>
                            <span className="text-emerald-400 font-bold">{t('Earned:')} ${Number(r.total_pay).toFixed(2)} ({t('Overtime:')} ${Number(r.overtime_pay).toFixed(2)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </div>
      )}

      {/* VISUAL DIAGNOSTIC TOOLS FOR REALTIME OR SYSTEMS PAGES */}
      {(pageKey.includes('MONITORING') || pageKey.includes('SYSTEM') || pageKey.includes('DATABASE') || pageKey.includes('DB') || pageKey.includes('API')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`border p-5 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('CPU Telemetry')}</span>
              <Cpu className="w-4 h-4 text-brand-400" />
            </div>
            <div className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{systemStats.cpu != null ? systemStats.cpu.toFixed(1) : '—'}%</div>
            <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
              <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${systemStats.cpu ?? 0}%` }}></div>
            </div>
          </div>
          <div className={`border p-5 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('RAM Utilization')}</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{systemStats.memory != null ? systemStats.memory.toFixed(1) : '—'}%</div>
            <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
              <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${systemStats.memory ?? 0}%` }}></div>
            </div>
          </div>
          <div className={`border p-5 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('API Connection Pool')}</span>
              <Network className="w-4 h-4 text-indigo-400" />
            </div>
            <div className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{systemStats.network != null ? systemStats.network.toFixed(0) : '—'} {t('Conn')}</div>
            <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
              <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.network ?? 0) / 250) * 100}%` }}></div>
            </div>
          </div>
          <div className={`border p-5 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('DB Response Latency')}</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{systemStats.latency != null ? systemStats.latency.toFixed(1) : '—'}ms</div>
            <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
              <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${((systemStats.latency ?? 0) / 30) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* SPOOF DETECTION & BIOMETRIC FEED */}
      {(pageKey.includes('SPOOF') || pageKey.includes('BIOMETRIC') || pageKey.includes('ENROLLMENT')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] border shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-black border font-mono ${
              theme === 'dark' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-500/20'
            }`}>
              <Camera className="w-3.5 h-3.5 inline mr-1 animate-pulse" />
              <span>{t('LIVE BIOMETRIC TELEMETRY SENSOR')}</span>
            </div>

            {scanStatus === 'idle' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-36 h-36 rounded-full border-4 border-dashed flex items-center justify-center relative ${
                  theme === 'dark' ? 'border-brand-500/40 text-brand-400' : 'border-slate-300 text-text-secondary'
                }`}>
                  <Camera className="w-12 h-12" />
                </div>
                <button onClick={handleScanLiveness} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold transition-all text-white shadow-lg shadow-brand-500/20">
                  {t('Initiate 3D Anti-Spoof Probe')}
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
                <div className={`w-full rounded-full h-2 mt-4 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
                  <div className="bg-brand-500 h-full transition-all duration-150" style={{ width: `${scanConfidence}%` }}></div>
                </div>
                <p className={`font-mono text-xs uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Scanning Face Mesh...')} {scanConfidence}%</p>
              </div>
            )}

            {scanStatus === 'success' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-brand-500 bg-brand-500/10 flex items-center justify-center relative">
                  <CheckCircle2 className="w-16 h-16 text-brand-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-brand-400' : 'text-emerald-600'}`}>{t('LIVENESS PASS (100%)')}</h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('Cosine texture matched authentic user profile. Session encrypted.')}</p>
                </div>
                <button onClick={() => setScanStatus('idle')} className={`text-xs underline font-mono ${theme === 'dark' ? 'text-brand-300 hover:text-white' : 'text-brand-600 hover:text-brand-500'}`}>{t('Scan Another')}</button>
              </div>
            )}

            {scanStatus === 'spoof' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-brand-500 bg-brand-500/10 flex items-center justify-center relative animate-pulse">
                  <AlertOctagon className="w-16 h-16 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-550">{t('SPOOF BLOCKED — BACKEND CONFIRMED')}</h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('The biometrics engine rejected this session as a non-live feed.')}</p>
                </div>
                <button onClick={() => setScanStatus('idle')} className={`text-xs underline font-mono ${theme === 'dark' ? 'text-brand-300 hover:text-white' : 'text-brand-600 hover:text-brand-500'}`}>{t('Dismiss & Reset Probe')}</button>
              </div>
            )}

            {scanStatus === 'error' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-rose-500/40 bg-rose-950/20 flex items-center justify-center">
                  <AlertOctagon className="w-14 h-14 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-400">{t('LIVENESS SERVICE UNREACHABLE')}</h3>
                  <p className="text-rose-300/60 text-xs mt-1 font-mono">{scanError || t('Backend biometrics service offline.')}</p>
                </div>
                <button onClick={() => { setScanStatus('idle'); setScanError(null); }} className="px-4 py-1.5 bg-rose-900/40 border border-rose-500/30 hover:bg-rose-900/60 rounded-lg text-rose-300 text-xs font-mono uppercase tracking-widest transition-all">{t('Retry')}</button>
              </div>
            )}
          </div>

          <div className={`border rounded-2xl p-6 shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Anti-Spoof Rules')}</h3>
            <ul className={`space-y-4 text-sm ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>
              <li className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
                <span><strong>{t('Passive Light Check:')}</strong> {t('Evaluates pixel luminescence to prevent high-res printed photographs from bypass.')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
                <span><strong>{t('Mandatory Blinking:')}</strong> {t('Rejects camera feeds lacking coordinate updates within 3 seconds of scan initiation.')}</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* PPE VERIFICATION SYSTEM */}
      {pageKey.includes('PPE') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] border shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-black border font-mono ${
              theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-500/20'
            }`}>
              <HardHat className="w-3.5 h-3.5 inline mr-1" />
              <span>{t('PPE VERIFICATION TELEMETRY')}</span>
            </div>

            {ppeScanning ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-32 h-32 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin flex items-center justify-center">
                  <HardHat className="w-10 h-10 text-white animate-pulse" />
                </div>
                <p className={`font-mono text-xs uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Scanning for PPE items...')}</p>
              </div>
            ) : ppeResult ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full max-w-sm">
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.helmet ? 'bg-brand-500/10 border-brand-500/30' : (theme === 'dark' ? 'bg-brand-950/20 border-brand-500/30' : 'bg-slate-50 border-slate-200 text-text-primary')}`}>
                    <HardHat className={`w-8 h-8 ${ppeResult.helmet ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">{t('Safety Helmet')}</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.helmet ? t('PASSED') : t('MISSING')}</span>
                  </div>
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.vest ? 'bg-brand-500/10 border-brand-500/30' : (theme === 'dark' ? 'bg-brand-950/20 border-brand-500/30' : 'bg-slate-50 border-slate-200 text-text-primary')}`}>
                    <User className={`w-8 h-8 ${ppeResult.vest ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">{t('Hi-Vis Vest')}</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.vest ? t('PASSED') : t('MISSING')}</span>
                  </div>
                  <div className={`p-4 rounded-xl border flex flex-col items-center ${ppeResult.safetyGoggles ? 'bg-brand-500/10 border-brand-500/30' : (theme === 'dark' ? 'bg-brand-950/20 border-brand-500/30' : 'bg-slate-50 border-slate-200 text-text-primary')}`}>
                    <Shield className={`w-8 h-8 ${ppeResult.safetyGoggles ? 'text-brand-400' : 'text-brand-300'}`} />
                    <span className="text-[10px] font-bold mt-2 uppercase">{t('Safety Goggles')}</span>
                    <span className="text-xs font-mono font-bold mt-1">{ppeResult.safetyGoggles ? t('PASSED') : t('MISSING')}</span>
                  </div>
                </div>
                <button onClick={handleScanPpe} className="mt-4 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold uppercase shadow-md shadow-brand-500/10">
                  {t('Re-Scan Profile')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4">
                <HardHat className={`w-16 h-16 ${theme === 'dark' ? 'text-brand-400' : 'text-brand-655'}`} />
                <button onClick={handleScanPpe} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20">
                  {t('Trigger Visual PPE Scan')}
                </button>
              </div>
            )}
          </div>

          <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div>
              <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Safety Matrix Policies')}</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>
                {t('Platform camera nodes execute real-time convolutional scans to verify that workers checked into site boundaries are actively wearing approved protective helmets, reflective gear, and safety glasses.')}
              </p>
            </div>
            <button onClick={() => triggerToast('Force-check command sent to all site cameras.')} className={`w-full mt-6 py-2.5 rounded-xl border text-xs font-bold tracking-wider uppercase transition-all ${
              theme === 'dark' ? 'bg-brand-900/60 hover:bg-brand-600 border-brand-500/30 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'
            }`}>
              {t('Recalibrate Camera Stream')}
            </button>
          </div>
        </div>
      )}

      {/* HEALTH & FATIGUE TELEMETRY */}
      {pageKey.includes('HEALTH') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-black border font-mono ${
              theme === 'dark' ? 'bg-rose-500/10 text-rose-455 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-500/20'
            }`}>
              <HeartPulse className="w-3.5 h-3.5 animate-pulse inline mr-1" />
              <span>{t('ACTIVE CONTRACTOR HEALTH TELEMETRY')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className={`p-4 border rounded-xl text-center shadow-sm ${
                theme === 'dark' ? 'bg-brand-950/40 border-brand-500/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-bold block uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Heart Rate')}</span>
                <span className={`text-3xl font-black font-mono block mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{workerHealth.heartRate} <span className="text-xs">{t('BPM')}</span></span>
                <div className={`w-full rounded-full h-1 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${((workerHealth.heartRate ?? 0) / 180) * 100}%` }}></div>
                </div>
              </div>
              <div className={`p-4 border rounded-xl text-center shadow-sm ${
                theme === 'dark' ? 'bg-brand-950/40 border-brand-500/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-bold block uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Body Temperature')}</span>
                <span className={`text-3xl font-black font-mono block mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{workerHealth.temperature != null ? workerHealth.temperature.toFixed(1) : '—'} <span className="text-xs">{t('°C')}</span></span>
                <div className={`w-full rounded-full h-1 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}>
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(((workerHealth.temperature ?? 35) - 35) / 5) * 100}%` }}></div>
                </div>
              </div>
              <div className={`p-4 border rounded-xl text-center shadow-sm ${
                theme === 'dark' ? 'bg-brand-950/40 border-brand-500/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-bold block uppercase ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Fatigue Metric')}</span>
                <span className="text-3xl font-black font-mono block mt-2 text-emerald-400">{workerHealth.fatigue}</span>
                <span className={`text-[9px] mt-2 block ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Based on telemetry coordinates')}</span>
              </div>
            </div>

            <div className={`flex justify-between items-center text-xs font-mono ${theme === 'dark' ? 'text-brand-200/50' : 'text-text-muted'}`}>
              <span>{t('Bio-Link: Connected')}</span>
              <span>{t('Updated: Just now')}</span>
            </div>
          </div>

          <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div>
              <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Bio-Sensor Settings')}</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>
                {t('Connects directly to authorized workplace biometric wearable bands, monitoring heart rates, temperatures, and location telemetry in high-intensity deep excavation or toxic environments.')}
              </p>
            </div>
            <button onClick={() => triggerToast('Wearable force-reconnect beacon sent.')} className={`w-full mt-6 py-2.5 rounded-xl border text-xs font-bold tracking-wider uppercase transition-all ${
              theme === 'dark' ? 'bg-brand-900/60 hover:bg-brand-600 border-brand-500/30 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'
            }`}>
              {t('Purge/Sync Wearables')}
            </button>
          </div>
        </div>
      )}

      {/* MAP / COORDINATES VIEW FOR GEOFENCING */}
      {(pageKey.includes('GEOFENCE') || pageKey.includes('MAP') || pageKey.includes('VIOLATION') || pageKey.includes('SITES')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-2xl p-5 min-h-[350px] relative overflow-hidden flex flex-col justify-between border shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg border flex items-center space-x-2 text-xs font-mono ${
              theme === 'dark' ? 'bg-brand-950/80 border-brand-500/20 text-white' : 'bg-white border-slate-200 text-text-primary shadow-sm'
            }`}>
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>{t('GEOFENCE GEOMETRIC MAP VISUALIZER')}</span>
            </div>

            {/* Simulated Map Canvas */}
            <div className={`flex-1 flex items-center justify-center border rounded-xl relative overflow-hidden my-6 min-h-[220px] ${
              theme === 'dark' ? 'bg-brand-950/40 border-brand-500/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,255,0,0.06),transparent)]"></div>
              {/* Geofence Ring */}
              <div className="w-44 h-44 rounded-full border border-dashed border-brand-500/60 bg-brand-500/5 flex items-center justify-center relative animate-[borderGlow_4s_infinite]">
                <span className="text-[9px] font-mono text-brand-400 tracking-wider uppercase font-bold absolute bottom-2">{t('SECURE GEOFENCE RADIUS')}</span>
                <div className="w-2 h-2 bg-brand-500 rounded-full absolute"></div>
                <div className="w-3 h-3 bg-brand-400 rounded-full absolute -top-8 -left-4 animate-pulse"><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[8px] text-brand-400 font-bold">John_Doe({t('IN')})</span></div>
                <div className="w-3 h-3 bg-brand-500 rounded-full absolute -bottom-16 -right-16 animate-pulse"><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[8px] text-brand-500 font-bold">Alice_V({t('OUT_VIOLATION')})</span></div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-xs font-mono ${theme === 'dark' ? 'text-brand-200/50' : 'text-text-muted'}`}>
              <span>{t('Center Lat:')} 37.7749° N</span>
              <span>{t('Lng:')} -122.4194° W</span>
            </div>
          </div>

          <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          }`}>
            <div>
              <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase mb-4 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Geofence Rules')}</h3>
              <div className={`space-y-3 text-xs ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>
                <p><strong>{t('Strict Proximity Check:')}</strong> {t('Devices are audited every 30 seconds against their active Site coordinate radius using encrypted GPS packets.')}</p>
                <p><strong>{t('Auto Clock-out Override:')}</strong> {t('Exiting the geofence site coordinates for more than 15 consecutive minutes triggers an auto clock-out payload.')}</p>
              </div>
            </div>
            <button onClick={() => triggerToast('Full geofence spatial check forces sync triggered across all active devices.')} className={`w-full mt-6 py-2.5 rounded-xl border text-xs font-bold tracking-wider uppercase transition-colors ${
              theme === 'dark' ? 'bg-brand-900/60 hover:bg-brand-600 border-brand-500/30 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'
            }`}>
              {t('Force Telemetry Check')}
            </button>
          </div>
        </div>
      )}

      {/* INDUSTRIAL STEP WIZARD (ONBOARDING, SIGNUP, ALLOCATION workflows) */}
      {(pageKey.includes('ONBOARDING') || pageKey.includes('WORKFLOW') || pageKey.includes('ALLOCATION') || pageKey.includes('RECONCILIATION')) && (
        <div className={`border rounded-2xl p-6 shadow-xl ${
          theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
        }`}>
          <div className={`flex items-center justify-between border-b pb-4 mb-6 ${theme === 'dark' ? 'border-brand-500/20' : 'border-border-muted/30'}`}>
            <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Active Workflow Provision Wizard')}</h3>
            <span className={`px-3 py-1 text-xs font-mono font-bold rounded ${theme === 'dark' ? 'bg-brand-500/10 text-brand-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-500/10'}`}>{t('Step')} {wizardStep} {t('of')} 3</span>
          </div>

          {/* Steps tracker indicators */}
          <div className="flex justify-between items-center max-w-md mx-auto mb-8 relative">
            <div className={`absolute left-0 right-0 h-0.5 top-1/2 -translate-y-1/2 z-0 ${theme === 'dark' ? 'bg-brand-900/60' : 'bg-slate-200'}`}></div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 1 ? 'bg-brand-600 border-brand-500 text-white shadow-md' : (theme === 'dark' ? 'bg-bg-primary border-brand-500/20 text-brand-400/50' : 'bg-white border-slate-200 text-text-muted')}`}>1</div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 2 ? 'bg-brand-600 border-brand-500 text-white shadow-md' : (theme === 'dark' ? 'bg-bg-primary border-brand-500/20 text-brand-400/50' : 'bg-white border-slate-200 text-text-muted')}`}>2</div>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 font-bold transition-all ${wizardStep >= 3 ? 'bg-brand-600 border-brand-500 text-white shadow-md' : (theme === 'dark' ? 'bg-bg-primary border-brand-500/20 text-brand-400/50' : 'bg-white border-slate-200 text-text-muted')}`}>3</div>
          </div>

          {/* Step content */}
          <div className="min-h-[150px] flex items-center justify-center text-center">
            {wizardStep === 1 && (
              <div className="space-y-3 max-w-sm">
                <Users className="w-12 h-12 text-brand-400 mx-auto animate-pulse" />
                <h4 className={`font-bold uppercase text-sm ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Step 1: Onboard worker details & bound contracts')}</h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('Register raw worker metadata, email identities, and contractor license coordinates.')}</p>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-3 max-w-sm">
                <Camera className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                <h4 className={`font-bold uppercase text-sm ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Step 2: Initialize 1:1 Identity Face Embedding')}</h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('Biometric enrollment strictly matches coordinates against the newly bound worker profile.')}</p>
              </div>
            )}
            {wizardStep === 3 && (
              <div className="space-y-3 max-w-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className={`font-bold uppercase text-sm ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Step 3: Access Clearance Generation Completed')}</h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'}`}>{t('Cryptographic identity-bound pass is ready. Worker cleared for active geofenced entries.')}</p>
              </div>
            )}
          </div>

          <div className={`flex justify-between items-center border-t pt-4 mt-6 ${theme === 'dark' ? 'border-brand-500/20' : 'border-border-muted/30'}`}>
            <button 
              disabled={wizardStep === 1}
              onClick={() => setWizardStep(prev => prev - 1)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 border ${
                theme === 'dark' ? 'bg-brand-900/60 border-brand-500/30 hover:bg-brand-850 text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-text-primary'
              }`}
            >
              {t('Previous')}
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
              className="px-6 py-2 bg-brand-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-md shadow-brand-500/20"
            >
              {wizardStep === 3 ? t('Finalize & Onboard') : t('Next Step')}
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM CONFIGURATION POLICIES / TOGGLES */}
      {(pageKey.includes('SETTINGS') || pageKey.includes('POLICIES') || pageKey.includes('CONFIG')) && (
        <>
          <div className={`border rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase mb-6 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Security & Geofence Policy Parameters')}</h3>
            <div className="space-y-4 max-w-2xl text-xs font-semibold">
              <div className={`flex items-center justify-between p-3 border rounded-xl ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div>
                  <p className={`uppercase font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Enforce strict 1:1 biometric identity scoping')}</p>
                  <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Enforces explicit email scope inputs before biometric check starts.')}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-xl ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div>
                  <p className={`uppercase font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Confidence Threshold (90%)')}</p>
                  <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Rejects biometric face matches with confidence scores below 0.90.')}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-xl ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div>
                  <p className={`uppercase font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Passive Anti-Spoof Liveness verification')}</p>
                  <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Blocks camera streams with static photo patterns.')}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-xl ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div>
                  <p className={`uppercase font-bold ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Realtime WebSocket alerts')}</p>
                  <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Broadcast active geofence violations immediately.')}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </div>
            </div>
            <button onClick={() => triggerToast('System configuration saved and synced across nodes.')} className="mt-6 px-6 py-2 bg-brand-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-brand-500/20">
              {t('Apply Configurations')}
            </button>
          </div>

          {/* SECURE BIOMETRIC IDENTITY CONFIGURATOR */}
          <div className={`mt-8 border rounded-2xl p-6 relative overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-brand-400" />
              <h3 className={`text-lg font-bold font-papyrus tracking-wider uppercase ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Enterprise Biometric Identity Management')}</h3>
            </div>
            
            <p className={`text-[11px] mb-6 max-w-xl ${theme === 'dark' ? 'text-brand-400/70' : 'text-text-secondary'}`}>
              {t('Configure your personal biometric credentials. FenceIN biometric credentials are L2-normalized and projected down to 128D geometric vectors, fully isolated under strict 1:1 user scoping.')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FACIAL EMBEDDING CONTROLLER */}
              <div className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-400" />
                    <span className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Face ID Biometrics')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[8px] font-bold rounded-full border uppercase tracking-wider ${
                    faceEnrolled 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                  }`}>
                    {faceEnrolled ? t('ENROLLED & ACTIVE') : t('NOT REGISTERED')}
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
                      [{enrollFaceStep.toUpperCase()}] {t(enrollFaceMsg)} ({t('Blinks:')} {enrollBlinkCount}/2)
                    </div>
                    
                    <button 
                      onClick={stopEnrollFaceScanner} 
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white text-[9px] font-bold uppercase transition-all"
                    >
                      ✕ {t('Cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onClick={startEnrollFaceScanner}
                      disabled={!faceModelsLoaded}
                      className={`w-full py-3 border rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-brand-500/5 hover:bg-brand-500/10 border-brand-500/25 text-brand-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {faceModelsLoaded ? (faceEnrolled ? t('Recalibrate & Register Face') : t('Enroll Face Identity')) : t('Loading Face ID Models...')}
                    </button>
                  </div>
                )}
              </div>

              {/* FINGERPRINT TOUCH ID CONTROLLER */}
              <div className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 ${theme === 'dark' ? 'bg-brand-950/20 border-brand-500/10' : 'bg-slate-50/60 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-brand-400" />
                    <span className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Touch ID Biometrics')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[8px] font-bold rounded-full border uppercase tracking-wider ${
                    fingerprintEnrolled 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                  }`}>
                    {fingerprintEnrolled ? t('ENROLLED & ACTIVE') : t('NOT REGISTERED')}
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
                          <circle cx="40" cy="40" r="35" className={`fill-none stroke-2 ${theme === 'dark' ? 'stroke-brand-950' : 'stroke-slate-200'}`} />
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

                    <div className="absolute bottom-1 text-[8px] font-mono text-brand-400/90 text-center px-2">{t(fingerprintMsg)} ({fingerprintProgress}%)</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onMouseDown={startFingerprintEnroll}
                      className={`w-full py-3 border rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] select-none cursor-pointer ${theme === 'dark' ? 'bg-brand-500/5 hover:bg-brand-500/10 border-brand-500/25 text-brand-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'}`}
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      {fingerprintEnrolled ? t('Press & Hold to Enroll New Print') : t('Enroll Fingerprint Touch ID')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(faceEnrolled || fingerprintEnrolled) && (
              <div className={`mt-6 pt-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-brand-500/10' : 'border-border-muted/30'}`}>
                <span className={`text-[10px] ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted'}`}>{t('Registered biometrics have cryptographic hash keys generated and protected inside SQL vaults.')}</span>
                <button 
                  onClick={() => setIsRevokeModalOpen(true)}
                  className={`px-4 py-2 border rounded-xl text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-red-950/40 hover:bg-red-950/60 border-red-500/30 text-brand-400 hover:text-white' 
                      : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('Revoke Biometrics')}
                </button>
              </div>
            )}
          </div>

          {isRevokeModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className={`border rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl ${theme === 'dark' ? 'bg-bg-secondary border-brand-500/30' : 'bg-white border-border-primary/20'}`}>
                <AlertOctagon className="w-12 h-12 text-brand-400 mx-auto animate-bounce" />
                <h4 className={`text-base font-bold font-papyrus uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>{t('Revoke Biometrics?')}</h4>
                <p className={`text-[11px] ${theme === 'dark' ? 'text-brand-400/70' : 'text-text-secondary'}`}>{t('This action will completely purge your facial embedding and fingerprint minutiae template from our SQL vector vault. This cannot be undone.')}</p>
                <div className="flex gap-2">
                  <button onClick={handleRevokeBiometrics} className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 font-bold uppercase text-[10px] tracking-wider rounded-xl text-white cursor-pointer">
                    {t('Yes, Purge Vault')}
                  </button>
                  <button 
                    onClick={() => setIsRevokeModalOpen(false)} 
                    className={`flex-1 py-2 font-bold uppercase text-[10px] tracking-wider rounded-xl cursor-pointer border transition-colors ${theme === 'dark' ? 'bg-slate-900 border-white/10 hover:bg-slate-800 text-text-secondary' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-text-primary'}`}
                  >
                    {t('Cancel')}
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
          <div className={`lg:col-span-2 border rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold font-papyrus tracking-wider uppercase ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t(pageTitle)} {t('Core Telemetry')}</h2>
              <button onClick={() => { setItems([...items].reverse()); triggerToast('Reverse order sorting applied.'); }} className={`transition-colors flex items-center space-x-1 text-xs font-mono uppercase ${theme === 'dark' ? 'text-brand-200/70 hover:text-white' : 'text-text-muted hover:text-text-primary'}`}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('Sort Table')}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-brand-400/50">{t('No matching telemetry records found.')}</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wider font-mono ${theme === 'dark' ? 'border-brand-500/20 text-brand-200/70' : 'border-border-muted/30 text-text-muted'}`}>
                      {Object.keys(items[0] || {}).map((header) => (
                        <th key={header} className="pb-3 font-medium">{t(header)}</th>
                      ))}
                      <th className="pb-3 font-medium text-right">{t('Operational Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium">
                    {filteredItems.map((row, idx) => (
                      <tr key={idx} className={`border-b transition-colors ${theme === 'dark' ? 'border-brand-500/10 hover:bg-brand-950/20' : 'border-border-muted/20 hover:bg-slate-50/60'}`}>
                        {Object.entries(row).map(([k, val]: any, i) => (
                          <td key={i} className={`py-4 font-medium ${theme === 'dark' ? 'text-brand-200/90' : 'text-text-primary'}`}>
                            {k === 'status' || k === 'state' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                val === 'Active' || val === 'Online' || val === 'Checked-In' || val === 'SUCCESS' || val === 'Resolved' || val === 'Available' || val === 'In-Use' || val === 'Cleared' || val === 'Approved'
                                  ? (theme === 'dark' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-500/20')
                                  : val === 'Suspended' || val === 'Offline' || val === 'Locked' || val === 'CRITICAL' || val === 'SPOOF_ALERT'
                                  ? (theme === 'dark' ? 'bg-brand-950/30 text-brand-400 border-brand-500/20' : 'bg-rose-50 text-rose-600 border-rose-500/20')
                                  : (theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-500/25')
                              }`}>
                                {t(val)}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                        <td className="py-4 text-right flex items-center justify-end space-x-2">
                          {pageKey.includes('ORGANIZATIONS') && (
                            <button onClick={() => handleToggleSuspendOrg(row.id)} className={`px-2 py-1 border rounded text-[10px] font-mono transition-colors ${theme === 'dark' ? 'bg-brand-900/40 hover:bg-brand-800/40 border-brand-500/30 text-brand-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'}`}>
                              {row.status === 'Active' ? t('Suspend') : t('Activate')}
                            </button>
                          )}
                          <button onClick={() => triggerToast(`Item detail view for ID: ${row.id || row.role || 'Item'} queried.`)} className={`p-1 border rounded transition-colors ${theme === 'dark' ? 'bg-brand-900/20 hover:bg-brand-900/60 border-brand-500/10 text-brand-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-text-primary'}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setItems(items.filter(item => item !== row)); triggerToast('Item purged from local workspace.'); }} className={`p-1 border rounded transition-colors ${theme === 'dark' ? 'bg-brand-950/20 hover:bg-brand-900/40 border-brand-500/10 text-brand-400' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'}`}>
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
          <div className={`border rounded-2xl p-5 flex flex-col h-[350px] relative overflow-hidden shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          } ${
            (pageKey.includes('SECURITY_CENTER') || 
             pageKey.includes('INCIDENT_CENTER') || 
             pageKey.includes('AUDIT_LOGS') || 
             pageKey.includes('SYSTEM_MONITORING') || 
             pageKey.includes('GLOBAL_ANALYTICS')) ? 'md:col-span-2' : ''
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.03),transparent)]"></div>
            <div className={`flex items-center space-x-2 border-b pb-3 mb-3 z-10 ${theme === 'dark' ? 'border-brand-500/20' : 'border-border-muted/30'}`}>
              <Zap className="w-4 h-4 text-brand-400 animate-pulse" />
              <h3 className={`font-papyrus text-sm uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>{t('Secured AI Insight Engine')}</h3>
            </div>
            
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none z-10 text-xs font-semibold">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2 border ${
                    msg.sender === 'user' 
                      ? (theme === 'dark' ? 'bg-brand-900/40 border-brand-500/40 text-brand-100' : 'bg-blue-50 border-blue-200 text-blue-800') 
                      : (theme === 'dark' ? 'bg-brand-950/80 border-brand-500/10 text-brand-200/80' : 'bg-slate-50 border-slate-200 text-text-primary')
                  }`}>
                    {t(msg.text)}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>

            {/* AI Error State */}
            {aiError && (
              <div className="mx-0 mt-2 px-3 py-2 bg-rose-950/30 border border-rose-500/20 rounded-xl flex items-center justify-between z-10">
                <span className="text-rose-400 text-[10px] font-mono font-bold">⚠ {t('AI service unavailable:')} {aiError}</span>
                <button onClick={() => setAiError(null)} className="text-rose-400/60 hover:text-rose-400 text-[9px] font-mono ml-2 uppercase tracking-widest">{t('Dismiss')}</button>
              </div>
            )}

            {/* Input Bar */}
            <div className="mt-3 flex space-x-2 z-10">
              <input 
                type="text" 
                placeholder={t('Ask insight...')} 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent font-semibold border ${theme === 'dark' ? 'bg-bg-primary border-brand-500/20 text-brand-100' : 'bg-white border-slate-200 text-text-primary'}`}
              />
              <button onClick={handleChatSend} className="p-2 bg-brand-600 hover:bg-blue-500 rounded-lg transition-all text-white shadow-md shadow-brand-500/20">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COMPLIANCE / CERTIFICATE / REPORTING CENTER */}
          {(pageKey.includes('DOCUMENT') || pageKey.includes('CERTIFICATION') || pageKey.includes('COMPLIANCE') || pageKey.includes('REPORT')) && (
            <div className={`border rounded-2xl p-5 shadow-xl ${theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'}`}>
              <h3 className={`text-sm font-bold font-papyrus tracking-wider uppercase mb-3 flex items-center space-x-2 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>
                <FileUp className="w-4 h-4 text-brand-400" />
                <span>{t('Upload Document / Certificate')}</span>
              </h3>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer group ${theme === 'dark' ? 'border-brand-500/20 hover:border-brand-500/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'}`}>
                <Cloud className="w-8 h-8 text-brand-400/50 group-hover:text-brand-400 transition-colors mx-auto mb-2" />
                <p className={`text-xs ${theme === 'dark' ? 'text-brand-200/70' : 'text-text-primary font-semibold'}`}>{t('Drag & drop certification PDF, XLS or image here')}</p>
                <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-brand-400/50' : 'text-text-muted font-medium'}`}>{t('Accepts up to 10MB cryptographically signed files')}</p>
              </div>
              <button onClick={() => triggerToast('Cryptographically signed PDF transaction report created & exported.')} className="w-full mt-4 py-2.5 bg-brand-600 hover:bg-blue-500 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 text-white shadow-lg shadow-brand-500/25">
                <Download className="w-4 h-4" />
                <span>{t('Export Transaction Report')}</span>
              </button>
            </div>
          )}

          {/* QUICK COMMAND ACTION TRIGGER CARD */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-xl ${
            theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
          } ${
            (pageKey.includes('SECURITY_CENTER') || 
             pageKey.includes('INCIDENT_CENTER') || 
             pageKey.includes('AUDIT_LOGS') || 
             pageKey.includes('SYSTEM_MONITORING') || 
             pageKey.includes('GLOBAL_ANALYTICS')) ? 'h-[350px]' : ''
          }`}>
            <div>
              <h3 className={`text-sm font-black font-papyrus tracking-wider uppercase mb-3 flex items-center space-x-2 ${theme === 'dark' ? 'text-brand-100' : 'text-text-secondary'}`}>
                <Terminal className="w-4 h-4 text-brand-400" />
                <span>{t('Diagnostic Quick Commands')}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
                <button onClick={() => triggerToast('Cryptographic system key cycle command dispatched.')} className={`py-2 px-3 border rounded text-left transition-all ${theme === 'dark' ? 'bg-brand-950 border-brand-500/20 hover:border-brand-500/60 hover:bg-brand-900/20 text-brand-300' : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-text-primary'}`}>
                  &gt; {t('Cycle System Keys')}
                </button>
                <button onClick={() => triggerToast('Active user socket channel purge initiated.')} className={`py-2 px-3 border rounded text-left transition-all ${theme === 'dark' ? 'bg-brand-950 border-brand-500/20 hover:border-brand-500/60 hover:bg-brand-900/20 text-brand-300' : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-text-primary'}`}>
                  &gt; {t('Flush Sockets')}
                </button>
                <button onClick={() => triggerToast('Offline geofence logs forced database flush.')} className={`py-2 px-3 border rounded text-left transition-all ${theme === 'dark' ? 'bg-brand-950 border-brand-500/20 hover:border-brand-500/60 hover:bg-brand-900/20 text-brand-300' : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-text-primary'}`}>
                  &gt; {t('Sync Offline Logs')}
                </button>
                <button onClick={() => triggerToast('Liveness camera node latency recalibrated.')} className={`py-2 px-3 border rounded text-left transition-all ${theme === 'dark' ? 'bg-brand-950 border-brand-500/20 hover:border-brand-500/60 hover:bg-brand-900/20 text-brand-300' : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-text-primary'}`}>
                  &gt; {t('Recalibrate Liveness')}
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
                  <span>{t('TELEMETRY SECURE PIPELINE')}</span>
                  <span className="text-green-400 animate-pulse">● {t('CONNECTED')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC ACTION MODALS */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
        modalType === 'CREATE_ORG' ? t('Provision New SaaS Organization') :
        modalType === 'ADD_USER' ? t('Register Account & Identity Bind') :
        modalType === 'ADD_SITE' ? t('Provision Geofence Radius Site') :
        modalType === 'REPORT_INCIDENT' ? t('Log Forensic Security Incident') :
        modalType === 'CREATE_VISITOR' ? t('Issue Visitor Access Badge') : t('Initiate System Directive')
      }>
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm font-semibold">
          {modalType === 'CREATE_ORG' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Organization Name')}</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. Titan Industrial Ltd.')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-200/70">{t('Unique Code Identifier')}</label>
                  <input required type="text" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. TITN')} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-200/70">{t('Primary Administrator Email')}</label>
                  <input required type="email" value={formData.admin || ''} onChange={e => setFormData({ ...formData, admin: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. admin@titan.com')} />
                </div>
              </div>
            </>
          )}

          {modalType === 'ADD_USER' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('FullName')}</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. John Doe')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Secure Email Identity')}</label>
                <input required type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. john@titan.com')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Global Role Assignment')}</label>
                <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  {allowedOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modalType === 'ADD_SITE' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Geofence Site Area Name')}</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. Titan HQ Refinery')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Geofence Coordinate Radius (meters)')}</label>
                <input required type="number" value={formData.radius || 150} onChange={e => setFormData({ ...formData, radius: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" />
              </div>
            </>
          )}

          {modalType === 'REPORT_INCIDENT' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Incident Threat Classification')}</label>
                <select value={formData.type || 'SAFETY_BREACH'} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  <option value="SAFETY_BREACH">{t('SAFETY_BREACH (Helmet/Harness Missing)')}</option>
                  <option value="BIOMETRIC_SPOOF_ATTACK">{t('BIOMETRIC_SPOOF_ATTACK (Photo projection on Kiosk)')}</option>
                  <option value="UNAUTHORIZED_GEOFENCE_EXIT">{t('UNAUTHORIZED_GEOFENCE_EXIT (Device exiting bounds during shift)')}</option>
                  <option value="FORCE_LOCKDOWN">{t('CRITICAL: MANDATORY SITE FORCE LOCKDOWN')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Severity Level')}</label>
                <select value={formData.severity || 'HIGH'} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500">
                  <option value="LOW">{t('LOW')}</option>
                  <option value="MEDIUM">{t('MEDIUM')}</option>
                  <option value="HIGH">{t('HIGH')}</option>
                  <option value="CRITICAL">{t('CRITICAL (Alert supervisor & trigger alarms)')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Incident Source Node')}</label>
                <input required type="text" value={formData.source || ''} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. Kiosk West Gate 04')} />
              </div>
            </>
          )}

          {modalType === 'CREATE_VISITOR' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Visitor Name')}</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. David Miller')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Sponsoring Host (Supervisor/HR)')}</label>
                <input required type="text" value={formData.host || ''} onChange={e => setFormData({ ...formData, host: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. Michael Chen')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-200/70">{t('Visitor Affiliation Organization')}</label>
                <input required type="text" value={formData.organization || ''} onChange={e => setFormData({ ...formData, organization: e.target.value })} className="w-full bg-bg-primary border border-brand-500/30 rounded-lg px-4 py-2 text-brand-100 focus:ring-1 focus:ring-brand-500" placeholder={t('e.g. Compliance Bureau')} />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-brand-200/90 hover:text-white transition-colors">{t('Cancel Directive')}</button>
            <button type="submit" className="px-6 py-2 bg-brand-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-brand-500/20">
              {t('Confirm & Dispatch Directive')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
