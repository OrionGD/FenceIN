import { useAuthStore } from '@/store/useAuthStore';
import { 
  Shield, Users, Building, Activity, FileCheck, ScanFace, Lock, 
  Briefcase, MapPin, AlertTriangle, Database, Cloud, FileText, 
  Settings, Bell, Zap, BarChart, Server, UserCog, Key, Network,
  HardHat, ClipboardList, Eye, Clock, Wallet, FileDigit, HeartPulse
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RoleBasedDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const roleConfigs: Record<string, { title: string; subtitle: string; basePath: string; modules: Array<{ name: string; icon: any; path: string; color: string }> }> = {
    SUPER_ADMIN: {
      title: 'Global Control Center',
      subtitle: 'Platform owner infrastructure controller',
      basePath: '/super-admin',
      modules: [
        { name: 'Organizations', icon: Building, path: '/super-admin/orgs', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Global Analytics', icon: BarChart, path: '/super-admin/global-analytics', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'System Monitoring', icon: Server, path: '/super-admin/monitoring', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'User Management', icon: UserCog, path: '/super-admin/users', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'Role Management', icon: Users, path: '/super-admin/roles', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { name: 'Permissions', icon: Key, path: '/super-admin/permissions', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Audit Logs', icon: ClipboardList, path: '/super-admin/audit', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        { name: 'AI Analytics', icon: Zap, path: '/super-admin/ai', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Platform Settings', icon: Settings, path: '/super-admin/settings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
        { name: 'Security Center', icon: Shield, path: '/super-admin/security', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'API Management', icon: Network, path: '/super-admin/api', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Storage Management', icon: Database, path: '/super-admin/storage', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Database Monitoring', icon: Server, path: '/super-admin/db', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Kiosk Management', icon: ScanFace, path: '/super-admin/kiosks', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
        { name: 'Notification Center', icon: Bell, path: '/super-admin/notifications', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Incident Center', icon: AlertTriangle, path: '/super-admin/incidents', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'Subscription/Billing', icon: Wallet, path: '/super-admin/billing', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Backup & Recovery', icon: Cloud, path: '/super-admin/backups', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
      ]
    },
    ORG_ADMIN: {
      title: 'Organization Dashboard',
      subtitle: 'Company-level workforce operations manager',
      basePath: '/org-admin',
      modules: [
        { name: 'Sites Management', icon: MapPin, path: '/org-admin/sites', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Vendor Management', icon: Building, path: '/org-admin/vendors', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { name: 'Workers Management', icon: Users, path: '/org-admin/workers', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Attendance Dashboard', icon: Activity, path: '/org-admin/attendance', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Geofence Management', icon: MapPin, path: '/org-admin/geofence', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Shift Management', icon: Clock, path: '/org-admin/shifts', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { name: 'Reports', icon: FileCheck, path: '/org-admin/reports', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Analytics', icon: BarChart, path: '/org-admin/analytics', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Security Incidents', icon: AlertTriangle, path: '/org-admin/incidents', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'Notifications', icon: Bell, path: '/org-admin/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Kiosk Monitoring', icon: ScanFace, path: '/org-admin/kiosks', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/org-admin/ai', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { name: 'Settings', icon: Settings, path: '/org-admin/settings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
      ]
    },
    HR_ADMIN: {
      title: 'HR Dashboard',
      subtitle: 'Payroll & compliance manager',
      basePath: '/hr',
      modules: [
        { name: 'Workers Directory', icon: Users, path: '/hr/workers', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Attendance Logs', icon: Activity, path: '/hr/attendance', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Payroll', icon: Wallet, path: '/hr/payroll', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Overtime Reports', icon: Clock, path: '/hr/overtime', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { name: 'Shift Reports', icon: ClipboardList, path: '/hr/shifts', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Leave Management', icon: FileDigit, path: '/hr/leave', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
        { name: 'Compliance Reports', icon: FileCheck, path: '/hr/compliance', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Export Center', icon: Cloud, path: '/hr/export', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Worker Documents', icon: FileText, path: '/hr/documents', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { name: 'Notifications', icon: Bell, path: '/hr/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/hr/ai', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
      ]
    },
    SUPERVISOR: {
      title: 'Supervisor Dashboard',
      subtitle: 'Site-level workforce controller',
      basePath: '/supervisor',
      modules: [
        { name: 'Assigned Sites', icon: MapPin, path: '/supervisor/sites', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Live Workforce', icon: Users, path: '/supervisor/workforce', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Attendance Stream', icon: Activity, path: '/supervisor/attendance', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Manual Attendance', icon: ClipboardList, path: '/supervisor/manual-attendance', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { name: 'Incident Reports', icon: AlertTriangle, path: '/supervisor/incidents', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'Task Assignment', icon: HardHat, path: '/supervisor/tasks', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Worker Monitoring', icon: Eye, path: '/supervisor/monitoring', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Site Notifications', icon: Bell, path: '/supervisor/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/supervisor/ai', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
      ]
    },
    SECURITY_OFFICER: {
      title: 'Security Dashboard',
      subtitle: 'Biometric & physical access controller',
      basePath: '/security',
      modules: [
        { name: 'Kiosk Control', icon: ScanFace, path: '/security/kiosk', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { name: 'Live Biometric Feed', icon: Activity, path: '/security/biometrics', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Spoof Detection', icon: Shield, path: '/security/spoofing', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { name: 'Geofence Violations', icon: MapPin, path: '/security/violations', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { name: 'Security Incidents', icon: AlertTriangle, path: '/security/incidents', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Blocked Workers', icon: Lock, path: '/security/blocked', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        { name: 'Realtime Alerts', icon: Bell, path: '/security/alerts', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Surveillance Logs', icon: Eye, path: '/security/surveillance', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/security/ai', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
      ]
    },
    VENDOR_MANAGER: {
      title: 'Vendor Dashboard',
      subtitle: 'Third-party contractor supplier manager',
      basePath: '/vendor',
      modules: [
        { name: 'My Workers', icon: Users, path: '/vendor/workers', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Attendance Reports', icon: Activity, path: '/vendor/attendance', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Billing Reports', icon: Wallet, path: '/vendor/billing', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { name: 'Worker Assignment', icon: Briefcase, path: '/vendor/assignments', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Compliance Status', icon: FileCheck, path: '/vendor/compliance', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
        { name: 'Notifications', icon: Bell, path: '/vendor/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'AI Assistant', icon: Zap, path: '/vendor/ai', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
      ]
    },
    WORKER: {
      title: 'Worker Dashboard',
      subtitle: 'Field workforce contractor portal',
      basePath: '/worker',
      modules: [
        { name: 'Attendance History', icon: Activity, path: '/worker/attendance', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Check-In/Check-Out', icon: MapPin, path: '/worker/checkin', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { name: 'Profile', icon: UserCog, path: '/worker/profile', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Shift Schedule', icon: Clock, path: '/worker/schedule', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { name: 'Notifications', icon: Bell, path: '/worker/notifications', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { name: 'Documents', icon: FileText, path: '/worker/documents', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Shield className="w-64 h-64 text-blue-500" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>{user.role.replace(/_/g, ' ')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{config.title}</h1>
          <p className="text-slate-400 max-w-xl text-lg">{config.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {config.modules.map((mod, idx) => (
          <button
            key={idx}
            onClick={() => navigate(mod.path)}
            className={`flex flex-col text-left p-5 rounded-2xl border bg-slate-900/50 hover:bg-slate-800 transition-all duration-300 group ${mod.color}`}
          >
            <div className="p-3 bg-slate-950 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
              <mod.icon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-100">{mod.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
}

