import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Shield, Users, Building, Activity, FileCheck, ScanFace, Lock, 
  Briefcase, MapPin, AlertTriangle, Database, Cloud, FileText, 
  Settings, Bell, Zap, BarChart, Server, UserCog, Key, Network,
  HardHat, ClipboardList, Eye, Clock, Wallet, FileDigit, HeartPulse,
  Terminal, X, CheckCircle2, RefreshCw, AlertCircle, Check,
  ThumbsUp, ThumbsDown, Cpu
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/components/ThemeContext';
import { useTranslation } from 'react-i18next';
import { terminalLogs, subscribeToTerminalLogs, logFrontendAction } from '@/utils/terminalLogger';
import type { TerminalLogEntry } from '@/utils/terminalLogger';

export default function RoleBasedDashboard() {
  const { user, token } = useAuthStore();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';

  const [logs, setLogs] = useState<TerminalLogEntry[]>(terminalLogs);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  // SaaS Super Admin Custom States
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<string>('');
  const [chatInputs, setChatInputs] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [adminChats, setAdminChats] = useState<Record<string, Array<{ sender: 'super' | 'org'; text: string; time: string }>>>({});
  const [assetTab, setAssetTab] = useState<'geofences' | 'vendors'>('geofences');

  const [orgAdmins, setOrgAdmins] = useState<Array<{ name: string; email: string; organization: string; plan: string; status: string; geofencesCount: number; vendorsCount: number }>>([]);
  const [geofencesData, setGeofencesData] = useState<Record<string, Array<{ id: string; name: string; radius: string; status: string }>>>({});
  const [vendorsData, setVendorsData] = useState<Record<string, Array<{ id: string; name: string; category: string; status: string }>>>({});

  // Real database-driven states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [totalVendorsCount, setTotalVendorsCount] = useState<number>(0);

  // Platform Head Dashboard Custom States
  const [platformRequests, setPlatformRequests] = useState<any[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<any>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Review modal state
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Provision modal state
  const [provisioningRequest, setProvisioningRequest] = useState<any | null>(null);
  const [provisioningLoading, setProvisioningLoading] = useState(false);
  const [provisionSuccessData, setProvisionSuccessData] = useState<any | null>(null);
  const [provisionPlan, setProvisionPlan] = useState<'STANDARD' | 'ENTERPRISE'>('STANDARD');

  // Dynamic database-driven SaaS telemetry fetching
  useEffect(() => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    const fetchSaaSData = async () => {
      const authHeaders = { 'Authorization': `Bearer ${token}` };
      try {
        const [wRes, sRes, vRes, dRes, snRes] = await Promise.all([
          fetch('http://localhost:3456/api/v1/workers', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/sites', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/vendors', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/analytics/dashboard', { headers: authHeaders }),
          fetch('http://localhost:3456/api/v1/analytics/snapshots', { headers: authHeaders })
        ]);
        
        let loadedWorkers: any = [];
        let loadedSites: any = [];
        let loadedVendors: any = [];

        if (wRes.ok) loadedWorkers = await wRes.json();
        if (sRes.ok) loadedSites = await sRes.json();
        if (vRes.ok) loadedVendors = await vRes.json();
        if (dRes.ok) {
          const dData = await dRes.json();
          setDashboardStats(dData);
        }
        if (snRes.ok) {
          const snData = await snRes.json();
          setSnapshots(Array.isArray(snData) ? snData : []);
        }

        // Standardize list structures
        const workers = Array.isArray(loadedWorkers) ? loadedWorkers : (loadedWorkers.data || []);
        const sites = Array.isArray(loadedSites) ? loadedSites : (loadedSites.data || []);
        const vendors = Array.isArray(loadedVendors) ? loadedVendors : (loadedVendors.data || []);

        setTotalVendorsCount(vendors.length);

        // Filter and build orgAdmins dynamically from database
        const admins = workers
          .filter((w: any) => w.role === 'ORG_ADMIN')
          .map((w: any) => {
            const matchedVendor = vendors.find((v: any) => v.managerId === w.id || v.id === w.vendorId);
            return {
              name: `${w.firstName} ${w.lastName}`,
              email: w.email,
              organization: matchedVendor ? matchedVendor.companyName : 'Apex Infrastructures',
              plan: 'Enterprise Unlimited',
              status: w.isActive ? 'Active' : 'Suspended',
              geofencesCount: sites.length,
              vendorsCount: vendors.length
            };
          });

        setOrgAdmins(admins);
        if (admins.length > 0) {
          setSelectedAdminEmail(prev => prev || admins[0].email);
        }

        // Map sites & vendors dynamically by selected email
        const geoMap: Record<string, any[]> = {};
        const vendMap: Record<string, any[]> = {};

        admins.forEach((adm: any) => {
          geoMap[adm.email] = sites.map((s: any) => ({
            id: s.id.substring(0, 8).toUpperCase(),
            name: s.name,
            radius: `${s.radius}m`,
            status: 'Active'
          }));
          vendMap[adm.email] = vendors.map((v: any) => ({
            id: v.id.substring(0, 8).toUpperCase(),
            name: v.companyName,
            category: 'Industrial Contracting',
            status: 'Active'
          }));
        });

        setGeofencesData(geoMap);
        setVendorsData(vendMap);
      } catch (err) {
        console.error('Failed to load database driven Super Admin SaaS telemetry:', err);
      }
    };

    fetchSaaSData();
  }, [token, user]);

  const fetchPlatformData = async () => {
    if (!token || user?.role !== 'PLATFORM_HEAD') return;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    setLoadingRequests(true);
    try {
      const [reqRes, analyticsRes] = await Promise.all([
        fetch('http://localhost:3456/api/v1/platform/organizations', { headers: authHeaders }),
        fetch('http://localhost:3456/api/v1/platform/analytics', { headers: authHeaders })
      ]);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setPlatformRequests(Array.isArray(reqData.data) ? reqData.data : (reqData || []));
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setPlatformAnalytics(analyticsData.data || analyticsData);
      }
    } catch (err) {
      console.error('Failed to load Platform Head SaaS metrics:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch('http://localhost:3456/api/v1/platform/review-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: activeRequest.id,
          status: reviewStatus,
          notes: reviewNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');
      
      setActiveRequest(null);
      setReviewNotes('');
      fetchPlatformData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisioningRequest) return;
    setProvisioningLoading(true);
    setReviewError(null);
    try {
      const res = await fetch('http://localhost:3456/api/v1/platform/provision-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: provisioningRequest.id,
          plan: provisionPlan
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to provision tenant');
      
      setProvisionSuccessData(data.data || data);
      setProvisioningRequest(null);
      fetchPlatformData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to provision tenant');
    } finally {
      setProvisioningLoading(false);
    }
  };

  const handleSendAdminMessage = async () => {
    if (!chatInputs.trim()) return;
    const adminEmail = selectedAdminEmail;
    const superText = chatInputs;
    
    // Add Super Admin message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender: 'super' as const, text: superText, time: timestamp };
    
    setAdminChats(prev => ({
      ...prev,
      [adminEmail]: [...(prev[adminEmail] || []), newMsg]
    }));
    setChatInputs('');
    setIsTyping(true);

    try {
      const targetAdmin = orgAdmins.find(a => a.email === adminEmail);
      const adminName = targetAdmin?.name || 'Administrator';
      const companyName = targetAdmin?.organization || 'Apex Infrastructures';
      const queryPrompt = `You are ${adminName}, the Org Admin of the organization "${companyName}". The Super Admin just sent you a direct message: "${superText}". Write an analytical, brief, realistic reply in character addressing their query. Ground your answer in FenceIN platform context (e.g. active worker monitoring, geofences, liveness check parameters). Keep it within 2 sentences. Do not mention that you are an AI or Llama model.`;

      const response = await fetch('http://localhost:3456/api/v1/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryPrompt })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.answer || `Acknowledged, Super Admin. Tracking all coordinates in real-time under ${companyName}.`;
        
        setAdminChats(prev => ({
          ...prev,
          [adminEmail]: [
            ...(prev[adminEmail] || []),
            { sender: 'org' as const, text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]
        }));
      } else {
        throw new Error('AI request failed');
      }
    } catch {
      const targetAdmin = orgAdmins.find(a => a.email === adminEmail);
      const adminName = targetAdmin?.name || 'Administrator';
      const companyName = targetAdmin?.organization || 'Apex Infrastructures';
      const replyText = `Acknowledged, Super Admin. This is ${adminName} from ${companyName}. We are tracking all geofence nodes and security telemetry in real-time under our current SLA.`;
      
      setAdminChats(prev => ({
        ...prev,
        [adminEmail]: [
          ...(prev[adminEmail] || []),
          { sender: 'org' as const, text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    logFrontendAction('Dashboard core console session established & authenticated.', user?.email, user?.role);

    const unsubscribe = subscribeToTerminalLogs(() => {
      setLogs([...terminalLogs]);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!user) return null;

  const roleConfigs: Record<string, { title: string; subtitle: string; basePath: string; modules: Array<{ name: string; icon: any; path: string; color: string }> }> = {
    PLATFORM_HEAD: {
      title: 'Platform Head Operations Portal',
      subtitle: 'Global multi-tenant governance, provisioning, and analytics console',
      basePath: '/dashboard',
      modules: []
    },
    SUPER_ADMIN: {
      title: 'Global Control Center',
      subtitle: 'Platform owner infrastructure controller',
      basePath: '/super-admin',
      modules: [
        { name: 'Organizations', icon: Building, path: '/super-admin/orgs', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Global Analytics', icon: BarChart, path: '/super-admin/global-analytics', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'System Monitoring', icon: Server, path: '/super-admin/monitoring', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'User Management', icon: UserCog, path: '/super-admin/users', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'Role Management', icon: Users, path: '/super-admin/roles', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { name: 'Permissions', icon: Key, path: '/super-admin/permissions', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Audit Logs', icon: ClipboardList, path: '/super-admin/audit', color: 'bg-slate-500/10 text-brand-200/70 border-slate-500/20' },
        { name: 'AI Analytics', icon: Zap, path: '/super-admin/ai', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Platform Settings', icon: Settings, path: '/super-admin/settings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
        { name: 'Security Center', icon: Shield, path: '/super-admin/security', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
        { name: 'API Management', icon: Network, path: '/super-admin/api', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Storage Management', icon: Database, path: '/super-admin/storage', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Database Monitoring', icon: Server, path: '/super-admin/db', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Kiosk Management', icon: ScanFace, path: '/super-admin/kiosks', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
        { name: 'Notification Center', icon: Bell, path: '/super-admin/notifications', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Incident Center', icon: AlertTriangle, path: '/super-admin/incidents', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
        { name: 'Subscription/Billing', icon: Wallet, path: '/super-admin/billing', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Backup & Recovery', icon: Cloud, path: '/super-admin/backups', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' }
      ]
    },
    ORG_ADMIN: {
      title: 'Organization Dashboard',
      subtitle: 'Company-level workforce operations manager',
      basePath: '/org-admin',
      modules: [
        { name: 'Sites Management', icon: MapPin, path: '/org-admin/sites', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Vendor Management', icon: Building, path: '/org-admin/vendors', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { name: 'Workers Management', icon: Users, path: '/org-admin/workers', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Attendance Dashboard', icon: Activity, path: '/org-admin/attendance', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Geofence Management', icon: MapPin, path: '/org-admin/geofence', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Shift Management', icon: Clock, path: '/org-admin/shifts', color: 'bg-amber-500/10 text-yellow-500 border-amber-500/20' },
        { name: 'Reports', icon: FileCheck, path: '/org-admin/reports', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Analytics', icon: BarChart, path: '/org-admin/analytics', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Security Incidents', icon: AlertTriangle, path: '/org-admin/incidents', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
        { name: 'Notifications', icon: Bell, path: '/org-admin/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Kiosk Monitoring', icon: ScanFace, path: '/org-admin/kiosks', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/org-admin/ai', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { name: 'Settings', icon: Settings, path: '/org-admin/settings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
      ]
    },
    HR_ADMIN: {
      title: 'HR Dashboard',
      subtitle: 'Payroll & compliance manager',
      basePath: '/hr',
      modules: [
        { name: 'Workers Directory', icon: Users, path: '/hr/workers', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Attendance Logs', icon: Activity, path: '/hr/attendance', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Payroll', icon: Wallet, path: '/hr/payroll', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Overtime Reports', icon: Clock, path: '/hr/overtime', color: 'bg-amber-500/10 text-yellow-500 border-amber-500/20' },
        { name: 'Shift Reports', icon: ClipboardList, path: '/hr/shifts', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Leave Management', icon: FileDigit, path: '/hr/leave', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Compliance Reports', icon: FileCheck, path: '/hr/compliance', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Export Center', icon: Cloud, path: '/hr/export', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Worker Documents', icon: FileText, path: '/hr/documents', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { name: 'Notifications', icon: Bell, path: '/hr/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/hr/ai', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
      ]
    },
    SUPERVISOR: {
      title: 'Supervisor Dashboard',
      subtitle: 'Site-level workforce controller',
      basePath: '/supervisor',
      modules: [
        { name: 'Assigned Sites', icon: MapPin, path: '/supervisor/sites', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Live Workforce', icon: Users, path: '/supervisor/workforce', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Attendance Stream', icon: Activity, path: '/supervisor/attendance', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Manual Attendance', icon: ClipboardList, path: '/supervisor/manual-attendance', color: 'bg-amber-500/10 text-yellow-500 border-amber-500/20' },
        { name: 'Incident Reports', icon: AlertTriangle, path: '/supervisor/incidents', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
        { name: 'Task Assignment', icon: HardHat, path: '/supervisor/tasks', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Worker Monitoring', icon: Eye, path: '/supervisor/monitoring', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Site Notifications', icon: Bell, path: '/supervisor/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/supervisor/ai', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
      ]
    },
    SECURITY_OFFICER: {
      title: 'Security Dashboard',
      subtitle: 'Biometric & physical access controller',
      basePath: '/security',
      modules: [
        { name: 'Kiosk Control', icon: ScanFace, path: '/security/kiosk', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'Live Biometric Feed', icon: Activity, path: '/security/biometrics', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Spoof Detection', icon: Shield, path: '/security/spoofing', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
        { name: 'Geofence Violations', icon: MapPin, path: '/security/violations', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Security Incidents', icon: AlertTriangle, path: '/security/incidents', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Blocked Workers', icon: Lock, path: '/security/blocked', color: 'bg-slate-500/10 text-brand-200/70 border-slate-500/20' },
        { name: 'Realtime Alerts', icon: Bell, path: '/security/alerts', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Surveillance Logs', icon: Eye, path: '/security/surveillance', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/security/ai', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
      ]
    },
    VENDOR_MANAGER: {
      title: 'Vendor Dashboard',
      subtitle: 'Third-party contractor supplier manager',
      basePath: '/vendor',
      modules: [
        { name: 'My Workers', icon: Users, path: '/vendor/workers', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Attendance Reports', icon: Activity, path: '/vendor/attendance', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Billing Reports', icon: Wallet, path: '/vendor/billing', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Worker Assignment', icon: Briefcase, path: '/vendor/assignments', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Compliance Status', icon: FileCheck, path: '/vendor/compliance', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Notifications', icon: Bell, path: '/vendor/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/vendor/ai', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
      ]
    },
    WORKER: {
      title: 'Worker Dashboard',
      subtitle: 'Field workforce contractor portal',
      basePath: '/worker',
      modules: [
        { name: 'Attendance History', icon: Activity, path: '/worker/attendance', color: 'bg-emerald-500/10 text-green-500 border-emerald-500/20' },
        { name: 'Check-In/Check-Out', icon: MapPin, path: '/worker/checkin', color: 'bg-brand-500/10 text-brand-400 border-blue-500/20' },
        { name: 'Profile', icon: UserCog, path: '/worker/profile', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Shift Schedule', icon: Clock, path: '/worker/schedule', color: 'bg-amber-500/10 text-yellow-500 border-amber-500/20' },
        { name: 'Notifications', icon: Bell, path: '/worker/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Documents', icon: FileText, path: '/worker/documents', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { name: 'Support', icon: HeartPulse, path: '/worker/support', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
      ]
    }
  };

  const config = roleConfigs[user.role] || {
    title: 'Welcome to FenceIn',
    subtitle: 'Access restricted or role undefined.',
    basePath: '/',
    modules: []
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 text-text-primary">
      {/* SaaS Enterprise Banner */}
      <div className={`border rounded-2xl p-8 relative overflow-hidden transition-all duration-300 shadow-[0_0_40px_rgba(13,255,0,0.15)] ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-[#022400]/95 to-[#033300]/95 border-brand-500/30' 
          : 'bg-gradient-to-br from-[#eaf0eb]/80 to-[#ffffff] border-emerald-500/25 shadow-md'
      }`}>
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Shield className={`w-64 h-64 ${theme === 'dark' ? 'text-brand-500' : 'text-emerald-600'}`} />
        </div>
        <div className="relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border font-mono ${
            theme === 'dark' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(13,255,0,0.8)] ${theme === 'dark' ? 'bg-brand-400' : 'bg-emerald-500'}`}></span>
            <span>{user.role.replace(/_/g, ' ')} SaaS Platform Command</span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 font-papyrus uppercase tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-text-primary'
          }`}>
            {user.role === 'SUPER_ADMIN' ? 'SaaS Enterprise Control Hub' : config.title}
          </h1>
          <p className={`max-w-xl text-sm font-medium ${
            theme === 'dark' ? 'text-brand-200/70' : 'text-text-secondary'
          }`}>
            {user.role === 'SUPER_ADMIN' ? 'Industrial Geofencing & Biometrics Global System Control' : config.subtitle}
          </p>
        </div>
      </div>

      {user.role === 'PLATFORM_HEAD' ? (
        <>
          {/* Platform Analytics KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`border p-5 rounded-2xl relative overflow-hidden group transition-all shadow-xl hover:border-brand-500/40 ${
              theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'}`}>{t('Total Organizations')}</p>
              <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                {platformAnalytics?.totalOrganizations ?? 0} <span className={`text-xs font-bold ${theme === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}>{t('Tenants')}</span>
              </h3>
              <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-brand-400' : 'text-text-muted'}`}>{t('Isolated Workspace Boundaries')}</span>
            </div>
            
            <div className={`border p-5 rounded-2xl relative overflow-hidden group transition-all shadow-xl hover:border-indigo-500/40 ${
              theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border-indigo-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('Total Platform Users')}</p>
              <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                {platformAnalytics?.totalEmployees ?? 0} <span className={`text-xs font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('Accounts')}</span>
              </h3>
              <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-indigo-400' : 'text-text-muted'}`}>{t('Active personnel & operators')}</span>
            </div>

            <div className={`border p-5 rounded-2xl relative overflow-hidden group transition-all shadow-xl hover:border-emerald-500/40 ${
              theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border-emerald-500/20' : 'bg-bg-secondary border-emerald-500/20 hover:shadow-2xl'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('Biometric Matches')}</p>
              <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                {platformAnalytics?.biometricVerifications ?? 0} <span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('Syncs')}</span>
              </h3>
              <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-text-muted'}`}>{t('Neural matches & verify checks')}</span>
            </div>

            <div className={`border p-5 rounded-2xl relative overflow-hidden group transition-all shadow-xl hover:border-rose-500/40 ${
              theme === 'dark' ? 'bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border-rose-500/20' : 'bg-bg-secondary border-rose-500/20 hover:shadow-2xl'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('Active Session Load')}</p>
              <h3 className={`text-3xl font-black font-mono mt-2 ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>
                {platformAnalytics?.totalActiveSessions ?? 0} <span className={`text-xs font-bold ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{t('Sessions')}</span>
              </h3>
              <span className={`text-[9px] font-bold font-mono ${theme === 'dark' ? 'text-rose-400' : 'text-text-muted'}`}>{t('Concurrent live tokens')}</span>
            </div>
          </div>

          {currentTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Diagnostics and System Metrics */}
              <div className="lg:col-span-1 space-y-6">
                <div className={`border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all ${
                  theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
                }`}>
                  <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold flex items-center space-x-2 ${
                    theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'
                  }`}>
                    <Activity className="w-5 h-5 text-brand-400" />
                    <span>System Diagnostics</span>
                  </h3>
                  <p className="text-[9px] font-mono mt-0.5 mb-4 text-text-muted">REAL-TIME PLATFORM INFRASTRUCTURE TELEMETRY</p>
                  
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-brand-500/10 pb-2">
                      <span className="text-text-muted">SYSTEM HEALTH</span>
                      <span className="text-brand-400 font-bold flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                        <span>{platformAnalytics?.systemHealth ?? 'OPERATIONAL'}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-brand-500/10 pb-2">
                      <span className="text-text-muted">SERVER CPU LOAD</span>
                      <span className="text-text-primary font-bold">{platformAnalytics?.serverMonitoring?.cpuUsage ?? '14%'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-brand-500/10 pb-2">
                      <span className="text-text-muted">MEMORY ALLOCATION</span>
                      <span className="text-text-primary font-bold">{platformAnalytics?.serverMonitoring?.memoryUsage ?? '42%'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-brand-500/10 pb-2">
                      <span className="text-text-muted">SYSTEM RUN TIME</span>
                      <span className="text-text-primary font-bold">{platformAnalytics?.serverMonitoring?.uptime ?? '99.98%'}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2">
                      <span className="text-text-muted">SECURITY INCIDENTS</span>
                      <span className="text-rose-400 font-bold">{platformAnalytics?.securityIncidents ?? 0} Incidents</span>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all ${
                  theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-indigo-500/20 hover:shadow-2xl'
                }`}>
                  <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold flex items-center space-x-2 ${
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  }`}>
                    <Shield className="w-5 h-5" />
                    <span>Governance Notice</span>
                  </h3>
                  <p className={`text-[10px] leading-relaxed mt-3 ${
                    theme === 'dark' ? 'text-brand-200/60' : 'text-text-muted'
                  }`}>
                    As a Platform Head, you possess absolute boundary provisioning authorities. You have authority to approve or deny organizational boundary creation requests and provision tenant isolated schemas in accordance with FenceIN multi-tenant isolation protocols.
                  </p>
                </div>
              </div>

              {/* Right Column: Mini Access Requests Table */}
              <div className={`lg:col-span-2 border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all ${
                theme === 'dark' ? 'bg-bg-secondary/40 border-brand-500/20' : 'bg-bg-secondary border-border-primary/20 hover:shadow-2xl'
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className={`font-papyrus text-base uppercase tracking-wider font-bold flex items-center space-x-2 ${
                      theme === 'dark' ? 'text-brand-300' : 'text-text-secondary'
                    }`}>
                      <Building className="w-5 h-5 text-brand-400" />
                      <span>Pending Access Petitions</span>
                    </h3>
                    <button
                      onClick={() => navigate('/dashboard?tab=requests')}
                      className={`text-xs font-mono font-bold hover:text-brand-300 uppercase tracking-widest cursor-pointer ${
                        theme === 'dark' ? 'text-brand-400' : 'text-brand-600'
                      }`}
                    >
                      View All
                    </button>
                  </div>
                  <p className="text-[9px] font-mono mt-0.5 mb-6 text-text-muted">SUBMITTED BY EXTERNAL ENTERPRISES PENDING VETTING</p>
                  
                  {loadingRequests ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                      <p className="text-xs font-mono text-text-muted">RETRIEVING PETITIONS...</p>
                    </div>
                  ) : platformRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <CheckCircle2 className="w-12 h-12 text-brand-500/40" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-text-primary">NO PENDING ACCESS PETITIONS</p>
                        <p className="text-[10px] text-text-muted">All active onboarding request queues are currently cleared.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-brand-500/10 text-brand-400 font-bold uppercase tracking-widest">
                            <th className="pb-3 pr-4">Enterprise</th>
                            <th className="pb-3 px-4">Representative</th>
                            <th className="pb-3 px-4">Type</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-500/10">
                          {platformRequests.filter(r => r.status === 'PENDING').slice(0, 5).map((req) => (
                            <tr key={req.id} className="hover:bg-brand-500/5 transition-colors">
                              <td className="py-3 pr-4 font-bold text-text-primary">
                                {req.organizationName}
                                <span className="text-[9px] text-brand-400 block font-normal mt-0.5">{req.industry} / {req.country}</span>
                              </td>
                              <td className="py-3 px-4 text-text-secondary">
                                {req.contactName}
                                <span className="text-[9px] text-text-muted block mt-0.5">{req.officialEmail}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                                  theme === 'dark' ? 'bg-black/60 border-brand-500/20 text-brand-300' : 'bg-emerald-50 border-emerald-500/20 text-emerald-700'
                                }`}>
                                  {req.deploymentType}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setActiveRequest(req);
                                    setReviewStatus('APPROVED');
                                    setReviewNotes('');
                                    setReviewError(null);
                                  }}
                                  className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-text-primary text-[10px] font-bold rounded cursor-pointer uppercase transition-colors font-mono"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Access Requests Table View */
            <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-papyrus text-base uppercase tracking-wider font-bold text-brand-300 flex items-center space-x-2">
                    <Building className="w-5 h-5 text-brand-400" />
                    <span>Access Request Governance Console</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={fetchPlatformData}
                      disabled={loadingRequests}
                      className="p-2 border border-brand-500/20 hover:border-brand-500 rounded-xl transition-all cursor-pointer bg-black/40 text-brand-400"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-brand-400/80 font-mono mt-0.5 mb-6">MANAGE AND PROVISION ISOLATED ORGANIZATIONAL BOUNDARIES</p>

                {loadingRequests ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <RefreshCw className="w-12 h-12 text-brand-500 animate-spin" />
                    <p className="text-xs font-mono text-text-muted">RETRIEVING SECURITY PETITIONS...</p>
                  </div>
                ) : platformRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-brand-500/30" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text-primary">NO PETITIONS FOUND</p>
                      <p className="text-xs text-text-muted">No external access petitions exist in the boundary registers.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-brand-500/10 text-brand-400 font-bold uppercase tracking-widest">
                          <th className="pb-3 pr-4">Enterprise / Location</th>
                          <th className="pb-3 px-4">Representative</th>
                          <th className="pb-3 px-4">Specs (Users/Branches)</th>
                          <th className="pb-3 px-4">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-500/10">
                        {platformRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-brand-500/5 transition-colors">
                            <td className="py-4 pr-4 font-bold text-text-primary">
                              {req.organizationName}
                              <span className="text-[9px] text-brand-400 block font-normal mt-0.5">{req.organizationType} // {req.industry} // {req.country}</span>
                            </td>
                            <td className="py-4 px-4 text-text-secondary">
                              {req.contactName}
                              <span className="text-[9px] text-text-muted block mt-0.5">{req.contactDesignation} // {req.officialEmail}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-text-primary font-bold">{req.expectedUsers} users</span>
                              <span className="text-[9px] text-brand-300 block mt-0.5">{req.branchCount} branches // {req.deploymentType}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                req.status === 'PENDING' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400 animate-pulse' :
                                req.status === 'APPROVED' ? 'bg-green-500/10 border-green-500/40 text-green-400' :
                                req.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                                req.status === 'ONBOARDED' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' :
                                'bg-purple-500/10 border-purple-500/40 text-purple-400'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-4 text-right space-x-2 text-white">
                              {req.status === 'PENDING' && (
                                <button
                                  onClick={() => {
                                    setActiveRequest(req);
                                    setReviewStatus('APPROVED');
                                    setReviewNotes('');
                                    setReviewError(null);
                                  }}
                                  className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-text-primary text-[10px] font-bold rounded cursor-pointer uppercase transition-colors"
                                >
                                  Review
                                </button>
                              )}
                              {req.status === 'APPROVED' && (
                                <button
                                  onClick={() => {
                                    setProvisioningRequest(req);
                                    setProvisionPlan('STANDARD');
                                    setReviewError(null);
                                  }}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded cursor-pointer uppercase transition-colors"
                                >
                                  Provision
                                </button>
                              )}
                              {req.status === 'ONBOARDED' && (
                                <span className="text-[10px] text-text-muted font-bold block pr-2 uppercase">WORKSPACE ALIGNED</span>
                              )}
                              {req.status === 'REJECTED' && (
                                <span className="text-[10px] text-red-500 font-bold block pr-2 uppercase font-mono">DENIED</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : user.role === 'SUPER_ADMIN' ? (
        <>
          {/* SaaS Core Real-Time KPI Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-bg-secondary/40 to-brand-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
              <p className="text-brand-300 text-[10px] font-black uppercase tracking-widest font-mono">MONTHLY RECURRING REVENUE</p>
              <h3 className="text-3xl font-black font-mono mt-2 text-white">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalVendorsCount * 3500)} <span className="text-xs text-green-400 font-bold">/mo</span>
              </h3>
              <span className="text-[9px] text-green-400 font-bold font-mono">↑ Based on {totalVendorsCount} active vendors</span>
            </div>
            <div className="bg-gradient-to-br from-bg-secondary/40 to-indigo-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE ENTERPRISE TENANTS</p>
              <h3 className="text-3xl font-black font-mono mt-2 text-white">{totalVendorsCount} Orgs</h3>
              <span className="text-[9px] text-indigo-400 font-bold font-mono">● {orgAdmins.filter(a => a.status === 'Active').length} Active SLA Subscriptions</span>
            </div>
            <div className="bg-gradient-to-br from-bg-secondary/40 to-emerald-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">PLATFORM API VOLUME</p>
              <h3 className="text-3xl font-black font-mono mt-2 text-white">
                {((dashboardStats?.analytics?.faceAuthAttempts || 0) + (dashboardStats?.analytics?.fingerprintAuthAttempts || 0)) || 0} API Calls
              </h3>
              <span className="text-[9px] text-emerald-400 font-bold font-mono">✓ {dashboardStats?.live?.checkInsToday || 0} Success check-ins today</span>
            </div>
            <div className="bg-gradient-to-br from-bg-secondary/40 to-rose-950/20 border border-brand-500/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-xl">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest font-mono">ACTIVE OPERATIONAL ROLES</p>
              <h3 className="text-3xl font-black font-mono mt-2 text-white">{dashboardStats?.live?.totalUsers || 0} Accounts</h3>
              <span className="text-[9px] text-green-400 font-bold font-mono">✓ {dashboardStats?.live?.activeUsers || 0} Enabled & Verified Profiles</span>
            </div>
          </div>

          {/* Monthly Analysis Chart Row */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-papyrus text-base uppercase tracking-wider font-bold text-indigo-400 flex items-center space-x-2">
                    <BarChart className="w-5 h-5 text-indigo-400" />
                    <span>SaaS Platform Monthly Onboarding & API Traffic</span>
                  </h3>
                  <p className="text-[10px] text-brand-400/80 font-mono mt-0.5">MONTHLY AGGREGATE PLATFORM METRICS AND REVENUE ANALYSIS</p>
                </div>
                <div className="bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black font-mono">
                  LIVE TIMELINE SNAPSHOT
                </div>
              </div>
              <div className="relative h-44 w-full flex items-end justify-between px-2 pt-6">
                {([...(snapshots.length > 0 ? snapshots : [
                  { bucket: 'Jan', totalCheckIns: 10, faceAuthAttempts: 15 },
                  { bucket: 'Feb', totalCheckIns: 18, faceAuthAttempts: 25 },
                  { bucket: 'Mar', totalCheckIns: 22, faceAuthAttempts: 32 },
                  { bucket: 'Apr', totalCheckIns: 35, faceAuthAttempts: 48 },
                  { bucket: 'May', totalCheckIns: 40, faceAuthAttempts: 55 }
                ])].reverse()).slice(-8).map((item, idx) => {
                  const label = item.bucket.length > 5 ? item.bucket.slice(-5) : item.bucket;
                  const revenueVal = (item.totalCheckIns || 0) * 1.5;
                  const apiVal = item.faceAuthAttempts || 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group mx-2">
                      <div className="w-full flex justify-center space-x-2 h-32 items-end mb-2 border-b border-brand-500/10 pb-1">
                        <div className="w-4 bg-indigo-500/80 rounded-t group-hover:bg-indigo-400 transition-colors" style={{ height: `${Math.min(100, Math.max(8, (revenueVal / 100) * 100))}%` }}></div>
                        <div className="w-4 bg-brand-500/80 rounded-t group-hover:bg-brand-400 transition-colors" style={{ height: `${Math.min(100, Math.max(8, (apiVal / 100) * 100))}%` }}></div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-brand-400">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center space-x-4 mt-2 text-[10px] font-mono font-bold border-t border-brand-500/10 pt-3">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span>
                  <span>SLA Check-ins Weight</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-brand-500 rounded-sm"></span>
                  <span>Authentication Attempts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Org Admins Vault & Direct Chat Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Org Admins Directory */}
            <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="font-papyrus text-base uppercase tracking-wider font-bold mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-brand-400" />
                  <span>Organization Admins Directory</span>
                </h3>
                <p className="text-[10px] text-brand-400/80 font-mono mb-4 uppercase">Direct SaaS client contact & messaging portal</p>
                
                <div className="space-y-3">
                  {orgAdmins.length === 0 ? (
                    <div className="p-4 rounded-xl border border-brand-500/10 bg-bg-primary/20 text-center py-12 text-brand-400/60 font-mono text-xs">
                      No active organization administrators registered in database. Use developer quick-access below or sign up to provision one.
                    </div>
                  ) : (
                    orgAdmins.map((admin) => (
                      <div 
                        key={admin.email}
                        onClick={() => setSelectedAdminEmail(admin.email)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedAdminEmail === admin.email
                            ? 'bg-brand-950/60 border-brand-500/80 shadow-[0_0_15px_rgba(13,255,0,0.15)] scale-[1.01]'
                            : 'bg-bg-primary/20 border-brand-500/10 hover:bg-brand-900/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black text-white">{admin.name}</p>
                            <p className="text-[10px] text-brand-400/70 font-mono mt-0.5">{admin.organization}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold border ${
                            admin.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-950/20 text-brand-400 border-brand-500/20'
                          }`}>
                            {admin.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[9px] font-mono font-bold text-brand-400/60 border-t border-brand-500/10 pt-2.5">
                          <span>PLAN: {admin.plan}</span>
                          <span>{admin.geofencesCount} Geofences | {admin.vendorsCount} Vendors</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Direct Messaging Hub & Chat */}
            <div className="lg:col-span-2 bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-[450px]">
              <div className="flex items-center justify-between border-b border-brand-500/10 pb-3.5 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-brand-900 border border-brand-500/30 flex items-center justify-center font-mono font-black text-xs text-brand-400">
                    {orgAdmins.find(a => a.email === selectedAdminEmail)?.name[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      Direct Secure Chat with {orgAdmins.find(a => a.email === selectedAdminEmail)?.name}
                    </h3>
                    <p className="text-[9px] text-brand-400/70 font-mono">COMPANY: {orgAdmins.find(a => a.email === selectedAdminEmail)?.organization} | {selectedAdminEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-[9px] font-mono font-black text-green-400">SECURE SHELL</span>
                </div>
              </div>

              {/* Chat Messages Panel */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-none text-xs font-semibold">
                {(adminChats[selectedAdminEmail] || []).map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'super' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] flex flex-col">
                      <div className={`rounded-xl px-4 py-2.5 border ${
                        msg.sender === 'super' 
                          ? 'bg-brand-900/40 border-brand-500/40 text-brand-100' 
                          : 'bg-brand-950/80 border-brand-500/10 text-brand-200/80'
                      }`}>
                        {msg.text}
                      </div>
                      <span className={`text-[8px] font-mono text-brand-400/60 mt-1 ${msg.sender === 'super' ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-brand-950/80 border border-brand-500/10 rounded-xl px-4 py-2.5 text-brand-400/80 text-[10px] font-mono animate-pulse">
                      typing secure response...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="flex space-x-2 pt-2 border-t border-brand-500/10">
                <input 
                  type="text" 
                  placeholder={`Send direct secure message to ${orgAdmins.find(a => a.email === selectedAdminEmail)?.name}...`}
                  value={chatInputs}
                  onChange={e => setChatInputs(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendAdminMessage()}
                  className="flex-1 bg-bg-primary border border-brand-500/20 rounded-lg px-4 py-2 text-xs text-brand-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent font-semibold font-sans"
                />
                <button onClick={handleSendAdminMessage} className="px-4 bg-brand-600 hover:bg-blue-500 rounded-lg transition-all text-white shadow-md font-bold uppercase text-[10px] tracking-wider font-mono">
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Org Assets Explorer Dashboard View */}
          <div className="bg-bg-secondary/40 border border-brand-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-brand-500/10 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="font-papyrus text-base uppercase tracking-wider font-bold">
                    SaaS Assets Explorer: {orgAdmins.find(a => a.email === selectedAdminEmail)?.organization}
                  </h3>
                  <p className="text-[10px] text-brand-400/80 font-mono mt-0.5 uppercase">
                    Audit of geofences & vendors created by organization admin
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2 text-xs font-mono font-bold">
                <button 
                  onClick={() => setAssetTab('geofences')}
                  className={`px-4 py-1.5 rounded-lg border transition-all ${
                    assetTab === 'geofences' 
                      ? 'bg-brand-950 border-brand-500/80 text-white shadow' 
                      : 'bg-transparent border-brand-500/10 text-brand-400 hover:border-brand-500/30'
                  }`}
                >
                  View Geofences ({geofencesData[selectedAdminEmail]?.length || 0})
                </button>
                <button 
                  onClick={() => setAssetTab('vendors')}
                  className={`px-4 py-1.5 rounded-lg border transition-all ${
                    assetTab === 'vendors' 
                      ? 'bg-brand-950 border-brand-500/80 text-white shadow' 
                      : 'bg-transparent border-brand-500/10 text-brand-400 hover:border-brand-500/30'
                  }`}
                >
                  View Vendors ({vendorsData[selectedAdminEmail]?.length || 0})
                </button>
              </div>
            </div>

            {/* Assets Table display */}
            <div className="overflow-x-auto">
              {assetTab === 'geofences' ? (
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-brand-500/20 text-brand-200/70 uppercase tracking-wider font-mono">
                      <th className="pb-3.5 font-bold">Geofence ID</th>
                      <th className="pb-3.5 font-bold">Bounds Name</th>
                      <th className="pb-3.5 font-bold">Spatial Radius</th>
                      <th className="pb-3.5 font-bold text-right">Operational State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(geofencesData[selectedAdminEmail] || []).map((geo) => (
                      <tr key={geo.id} className="border-b border-brand-500/10 hover:bg-brand-950/20 transition-colors">
                        <td className="py-4 font-mono font-bold text-brand-400">{geo.id}</td>
                        <td className="py-4 font-bold">{geo.name}</td>
                        <td className="py-4 font-mono font-bold text-slate-300">{geo.radius}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${
                            geo.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-950/20 text-brand-400 border-brand-500/20'
                          }`}>
                            {geo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-brand-500/20 text-brand-200/70 uppercase tracking-wider font-mono">
                      <th className="pb-3.5 font-bold">Vendor ID</th>
                      <th className="pb-3.5 font-bold">Third-Party Company</th>
                      <th className="pb-3.5 font-bold">Category Sector</th>
                      <th className="pb-3.5 font-bold text-right">SLA Clearance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(vendorsData[selectedAdminEmail] || []).map((vnd) => (
                      <tr key={vnd.id} className="border-b border-brand-500/10 hover:bg-brand-950/20 transition-colors">
                        <td className="py-4 font-mono font-bold text-brand-400">{vnd.id}</td>
                        <td className="py-4 font-bold">{vnd.name}</td>
                        <td className="py-4 font-bold text-slate-300">{vnd.category}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${
                            vnd.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-950/20 text-brand-400 border-brand-500/20'
                          }`}>
                            {vnd.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Module Navigation Cards */}
          <div>
            <h3 className="font-papyrus text-base uppercase tracking-wider font-bold mb-4 flex items-center space-x-2">
              <Network className="w-5 h-5 text-brand-400" />
              <span>Platform Administration Navigation Shortcut Modules</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {config.modules.map((mod, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(mod.path)}
                  className="flex flex-col text-left p-5 rounded-2xl border bg-bg-secondary/40 hover:bg-brand-900/40 border-brand-500/20 hover:border-brand-500/50 hover:shadow-[0_0_20px_rgba(13,255,0,0.15)] transition-all duration-300 group"
                >
                  <div className={`p-3 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300 ${mod.color.replace(/blue|indigo|emerald|cyan|purple|rose|slate|yellow|gray|red|teal|pink|orange|green|amber/g, 'brand')}`}>
                    <mod.icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-black text-white uppercase tracking-wide">{mod.name}</h3>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 🔐 PLATFORM USER CREATION HIERARCHY SCOPING VAULT */}
          <div className="bg-gradient-to-br from-bg-secondary/40 to-[#022400]/20 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden shadow-[0_4px_35px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <UserCog className="w-32 h-32 text-brand-500" />
            </div>
            <div className="relative z-10 flex flex-col space-y-6">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-brand-400" />
                <div>
                  <h2 className="text-sm font-black font-papyrus tracking-wider uppercase text-white">Platform User Creation Hierarchy Scope</h2>
                  <p className="text-[9px] text-brand-300/70 font-mono">CRYPTOGRAPHIC WORKFORCE PROVISIONING AUTHORIZATION GATEWAY</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 items-stretch text-center font-mono">
                {[
                  { id: 'SUPER_ADMIN', name: 'SUPERADMIN', target: 'ORGADMIN', desc: 'Can create only ORGADMIN', active: user.role === 'SUPER_ADMIN' },
                  { id: 'ORG_ADMIN', name: 'ORGADMIN', target: 'HRADMIN', desc: 'Can create only HRADMIN', active: user.role === 'ORG_ADMIN' },
                  { id: 'HR_ADMIN', name: 'HRADMIN', target: 'SUPERVISOR', desc: 'Can create only SUPERVISOR', active: user.role === 'HR_ADMIN' },
                  { id: 'SUPERVISOR', name: 'SUPERVISOR', target: 'SECURITY', desc: 'Can create only SECURITY', active: user.role === 'SUPERVISOR' },
                  { id: 'SECURITY_OFFICER', name: 'SECURITY', target: 'VENDOR & WORKER', desc: 'Can create VENDOR and WORKER', active: user.role === 'SECURITY_OFFICER' },
                  { id: 'VENDOR_MANAGER', name: 'VENDOR', target: 'NONE', desc: 'Cannot create users', active: user.role === 'VENDOR_MANAGER' },
                  { id: 'WORKER', name: 'WORKER', target: 'NONE', desc: 'Cannot create users', active: user.role === 'WORKER' }
                ].map((roleObj, i, arr) => (
                  <div key={roleObj.id} className="flex flex-col xl:flex-row items-center justify-between w-full h-full relative">
                    <div 
                      className={`p-4 rounded-xl border w-full h-full flex flex-col items-center justify-center transition-all duration-500 relative ${
                        roleObj.active 
                          ? 'bg-brand-950/60 border-brand-500/80 shadow-[0_0_20px_rgba(13,255,0,0.35)] scale-[1.03] z-10' 
                          : 'bg-bg-secondary/40 border-brand-500/10 opacity-50 hover:opacity-80'
                      }`}
                    >
                      {roleObj.active && (
                        <span className="absolute -top-2.5 bg-brand-500 text-bg-primary text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase border border-brand-400/50 shadow-[0_0_8px_rgba(13,255,0,0.6)] animate-pulse">
                          YOUR SCOPE
                        </span>
                      )}
                      <span className={`text-[11px] font-black tracking-wider ${roleObj.active ? 'text-brand-400' : 'text-white'}`}>
                        {roleObj.name}
                      </span>
                      <span className="text-[9px] text-brand-200/65 mt-2 block leading-tight font-sans font-semibold">
                        {roleObj.desc}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="hidden xl:flex items-center justify-center w-full text-brand-500/40 text-lg font-bold select-none py-2 px-1">
                        ➔
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📟 LIVE CORE DIAGNOSTIC LOG STREAM */}
          <div className="bg-slate-950/70 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4 border-b border-brand-500/10 pb-3">
              <div className="flex items-center space-x-3">
                <Terminal className="w-5 h-5 text-brand-400" />
                <div>
                  <h2 className="text-sm font-black font-papyrus tracking-wider uppercase text-white">Live Core Diagnostic Feed</h2>
                  <p className="text-[9px] text-brand-300/70 font-mono">REAL-TIME PORTAL ACTIVITY & COMPLIANCE LOGGER</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Streaming live</span>
              </div>
            </div>

            <div className="bg-black/80 rounded-xl border border-brand-500/10 p-4 h-[220px] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-brand-900 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <div className="text-brand-400/50 text-center py-16 animate-pulse">Initializing quantum security logs stream...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:space-x-2 border-b border-white/5 pb-1.5 last:border-b-0">
                    <span className="text-sky-400 font-bold select-none shrink-0">[{log.timestamp}]</span>
                    <span className="text-pink-400 font-black shrink-0">[{log.user}]</span>
                    <span className="text-emerald-400 font-semibold break-all md:break-normal">{log.action}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef}></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {config.modules.map((mod, idx) => (
              <button
                key={idx}
                onClick={() => navigate(mod.path)}
                className="flex flex-col text-left p-5 rounded-2xl border bg-bg-secondary/40 hover:bg-brand-900/40 border-brand-500/20 hover:border-brand-500/50 hover:shadow-[0_0_20px_rgba(13,255,0,0.15)] transition-all duration-300 group"
              >
                <div className={`p-3 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300 ${mod.color.replace(/blue|indigo|emerald|cyan|purple|rose|slate|yellow|gray|red|teal|pink|orange|green|amber/g, 'brand')}`}>
                  <mod.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-sm font-black text-white uppercase tracking-wide">{mod.name}</h3>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 1. Review Access Request Modal Overlay */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="relative w-full max-w-2xl bg-bg-secondary border border-brand-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(13,255,0,0.3)] animate-in zoom-in-95 duration-200 text-white">
            <button
              onClick={() => setActiveRequest(null)}
              className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-black font-papyrus text-brand-300 uppercase mb-2">Manual Access Petition Review</h3>
            <p className="text-[10px] text-brand-400 font-bold uppercase mb-6 tracking-widest">CLEARANCE GATEWAY // PETITION ID: {activeRequest.id.substring(0, 8).toUpperCase()}</p>

            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div className="bg-black/40 border border-brand-500/10 rounded-2xl p-4 space-y-3 text-xs leading-relaxed max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-brand-400 block font-bold">ENTERPRISE NAME</span>
                    <span className="text-text-primary font-bold">{activeRequest.organizationName}</span>
                  </div>
                  <div>
                    <span className="text-brand-400 block font-bold">INDUSTRY / SECTOR</span>
                    <span className="text-text-primary font-bold">{activeRequest.industry}</span>
                  </div>
                  <div>
                    <span className="text-brand-400 block font-bold">OFFICIAL EMAIL</span>
                    <span className="text-text-primary font-bold">{activeRequest.officialEmail}</span>
                  </div>
                  <div>
                    <span className="text-brand-400 block font-bold">PHONE NUMBER</span>
                    <span className="text-text-primary font-bold">{activeRequest.phone}</span>
                  </div>
                  <div>
                    <span className="text-brand-400 block font-bold">REPRESENTATIVE</span>
                    <span className="text-text-primary font-bold">{activeRequest.contactName} ({activeRequest.contactDesignation})</span>
                  </div>
                  <div>
                    <span className="text-brand-400 block font-bold">EXPECTED USERS</span>
                    <span className="text-text-primary font-bold">{activeRequest.expectedUsers} users ({activeRequest.branchCount} branches)</span>
                  </div>
                </div>
                {activeRequest.additionalNotes && (
                  <div className="pt-2 border-t border-brand-500/10">
                    <span className="text-brand-400 block font-bold">CASE STUDY NARRATIVE & SPECIAL NOTES</span>
                    <p className="text-text-muted mt-1 italic font-sans">{activeRequest.additionalNotes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-400 uppercase">Review Decision clearance status</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold cursor-pointer transition-all ${
                      reviewStatus === 'APPROVED'
                        ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_15px_rgba(13,255,0,0.15)]'
                        : 'bg-black/40 border-brand-500/10 text-text-muted hover:border-brand-500/30'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>APPROVE PETITION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold cursor-pointer transition-all ${
                      reviewStatus === 'REJECTED'
                        ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : 'bg-black/40 border-brand-500/10 text-text-muted hover:border-brand-500/30'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>DENY PETITION</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-400 uppercase">Audit Review Notes & Justification</label>
                <textarea
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide detailed security clearance or rejection rationale for auditing..."
                  rows={3}
                  className="w-full bg-black/60 border border-brand-500/20 focus:border-brand-500 rounded-xl px-4 py-3 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none transition-all"
                />
              </div>

              {reviewError && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-400 text-[11px] font-mono rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{reviewError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-950/60 disabled:text-text-disabled text-text-primary font-bold rounded-2xl border border-brand-500/30 hover:border-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.25)] transition-all cursor-pointer font-mono"
              >
                {reviewSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>COMMITTING EXECUTIVE DECISION...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>COMMIT ADMINISTRATIVE REVIEW DECISION</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Provision Tenant Workspace Modal Overlay */}
      {provisioningRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="relative w-full max-w-xl bg-bg-secondary border border-brand-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(13,255,0,0.3)] animate-in zoom-in-95 duration-200 text-white">
            <button
              onClick={() => setProvisioningRequest(null)}
              className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-black font-papyrus text-brand-300 uppercase mb-2">Provision Tenant Boundary</h3>
            <p className="text-[10px] text-brand-400 font-bold uppercase mb-6 tracking-widest">WORKSPACE COMPLIANCE SYNC // TARGET: {provisioningRequest.organizationName.toUpperCase()}</p>

            <form onSubmit={handleProvisionSubmit} className="space-y-6">
              <div className="bg-black/40 border border-brand-500/10 rounded-2xl p-4 space-y-3 text-xs leading-relaxed">
                <p className="text-text-muted">
                  You are preparing to provision an isolated tenant environment and generate a cryptographically secure workspace for <strong className="text-text-primary font-bold">{provisioningRequest.organizationName}</strong>.
                </p>
                <p className="text-text-muted">
                  Upon commitment, a default Super Admin account will be initialized and a one-time master password will be returned.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-400 uppercase">Select Billing / SLA Tier Plan</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setProvisionPlan('STANDARD')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold cursor-pointer transition-all ${
                      provisionPlan === 'STANDARD'
                        ? 'bg-brand-950/60 border-brand-500 text-brand-300 shadow-[0_0_15px_rgba(13,255,0,0.15)]'
                        : 'bg-black/40 border-brand-500/10 text-text-muted hover:border-brand-500/30'
                    }`}
                  >
                    <span className="text-xs">STANDARD SLA</span>
                    <span className="text-[9px] font-normal text-text-muted mt-1">Up to 200 Workers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvisionPlan('ENTERPRISE')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold cursor-pointer transition-all ${
                      provisionPlan === 'ENTERPRISE'
                        ? 'bg-brand-950/60 border-brand-500 text-brand-300 shadow-[0_0_15px_rgba(13,255,0,0.15)]'
                        : 'bg-black/40 border-brand-500/10 text-text-muted hover:border-brand-500/30'
                    }`}
                  >
                    <span className="text-xs">ENTERPRISE SLA</span>
                    <span className="text-[9px] font-normal text-text-muted mt-1">Unlimited Scale & Nodes</span>
                  </button>
                </div>
              </div>

              {reviewError && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-400 text-[11px] font-mono rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{reviewError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={provisioningLoading}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-950/60 disabled:text-text-disabled text-text-primary font-bold rounded-2xl border border-brand-500/30 hover:border-brand-500 shadow-[0_0_20px_rgba(13,255,0,0.25)] transition-all cursor-pointer font-mono text-xs uppercase"
              >
                {provisioningLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>PROVISIONING SECURE SCHEMA...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5" />
                    <span>LAUNCH TENANT WORKSPACE BOUNDARY</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Provision Tenant Success Overlay */}
      {provisionSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono">
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-bg-secondary to-brand-950/40 border-2 border-brand-500 rounded-3xl p-10 text-center relative overflow-hidden shadow-[0_0_80px_rgba(13,255,0,0.4)] animate-in zoom-in-95 duration-300 text-white">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            
            <CheckCircle2 className="w-16 h-16 text-brand-500 mx-auto mb-6 animate-pulse" />
            
            <h3 className="text-3xl font-black font-papyrus text-text-primary uppercase mb-2">TENANT BOUNDARY ALIGNED</h3>
            <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mb-8">SECURE PROVISIONING HANDSHAKE COMPLETE</p>

            <div className="bg-black/60 border border-brand-500/20 rounded-2xl p-6 text-left space-y-4 text-xs mb-8">
              <div>
                <span className="text-brand-400 block font-bold uppercase tracking-widest text-[9px] mb-1">Tenant Workspace Name</span>
                <span className="text-text-primary font-bold text-sm">{provisionSuccessData.tenantName || provisionSuccessData.tenant?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-brand-400 block font-bold uppercase tracking-widest text-[9px] mb-1">Workspace ID</span>
                  <span className="text-text-secondary font-mono text-[11px]">{provisionSuccessData.tenantId || provisionSuccessData.tenant?.id}</span>
                </div>
                <div>
                  <span className="text-brand-400 block font-bold uppercase tracking-widest text-[9px] mb-1">Super Admin Account</span>
                  <span className="text-text-secondary font-mono text-[11px]">{provisionSuccessData.adminEmail || provisionSuccessData.user?.email}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-brand-500/10">
                <span className="text-brand-400 block font-bold uppercase tracking-widest text-[9px] mb-2 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                  <span>ONE-TIME TEMPORARY MASTER CREDENTIAL</span>
                </span>
                
                <div className="relative bg-brand-950/80 border border-brand-500/60 rounded-xl p-4 text-center font-mono text-lg font-black text-brand-300 shadow-[0_0_20px_rgba(13,255,0,0.15)] flex items-center justify-between overflow-hidden">
                  <span className="mx-auto select-all text-brand-400 tracking-wider">
                    {provisionSuccessData.temporaryPassword}
                  </span>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(provisionSuccessData.temporaryPassword);
                    }}
                    className="absolute right-3 px-3 py-1 bg-brand-600 hover:bg-brand-500 text-text-primary text-[9px] font-bold rounded cursor-pointer uppercase transition-all"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-text-muted/80 mt-3 text-center">
                  WARNING: This key is cryptographically generated and is ONLY displayed once. The corporate administrator must reset this temporary credential upon initial login.
                </p>
              </div>
            </div>

            <button
              onClick={() => setProvisionSuccessData(null)}
              className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-text-primary font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(13,255,0,0.3)] hover:shadow-[0_0_30px_rgba(13,255,0,0.5)] cursor-pointer uppercase font-mono text-xs tracking-wider"
            >
              CLOSE & PURGE CREDENTIAL MEMORY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

