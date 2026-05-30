import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { logFrontendAction } from '../utils/terminalLogger';
import { 
  Users, Building2, LayoutDashboard, LogOut, Camera, BrainCircuit, 
  Map, X, Lock, ShieldAlert, HeartPulse, HardHat, Sun, Moon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeContext';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = () => {
    if (user) {
      logFrontendAction('USER SIGNED OUT. Sessions terminated.', user.email, user.role);
    }
    logout();
  };

  const allNavItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['PLATFORM_HEAD', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'] },
    { name: 'Access Requests', path: '/dashboard?tab=requests', icon: Building2, roles: ['PLATFORM_HEAD'] },
    { name: 'Intelligence', path: '/dashboard/ai', icon: BrainCircuit, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    { name: 'Attendance', path: '/dashboard/attendance', icon: Camera, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'] },
    { name: 'Workforce', path: '/dashboard/workers', icon: Users, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'VENDOR_MANAGER'] },
    { name: 'Vendors', path: '/dashboard/vendors', icon: Building2, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    { name: 'Geofences', path: '/dashboard/sites', icon: Map, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'] },
    { name: 'PPE Scanner', path: '/dashboard/safety', icon: HardHat, roles: ['ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'] },
    { name: 'Health Telemetry', path: '/dashboard/health', icon: HeartPulse, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'WORKER'] },
    { name: 'Emergency panic', path: '/dashboard/emergency', icon: ShieldAlert, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'] },
    { name: 'Kiosk Mode', path: '/kiosk', icon: Camera, roles: ['SUPER_ADMIN', 'SECURITY_OFFICER'] },
  ];

  const getDynamicPath = (itemName: string, role: string) => {
    if (itemName === 'Overview') return '/dashboard';
    if (itemName === 'Kiosk Mode') return '/kiosk';

    switch (role) {
      case 'PLATFORM_HEAD':
        if (itemName === 'Access Requests') return '/dashboard?tab=requests';
        return '/dashboard';
      case 'SUPER_ADMIN':
        if (itemName === 'Intelligence') return '/super-admin/ai';
        if (itemName === 'Attendance') return '/super-admin/audit';
        if (itemName === 'Workforce') return '/super-admin/users';
        if (itemName === 'Vendors') return '/super-admin/orgs';
        if (itemName === 'Geofences') return '/super-admin/monitoring';
        if (itemName === 'Health Telemetry') return '/super-admin/security';
        if (itemName === 'Emergency panic') return '/super-admin/incidents';
        return '/dashboard';

      case 'ORG_ADMIN':
        if (itemName === 'Intelligence') return '/org-admin/ai';
        if (itemName === 'Attendance') return '/org-admin/attendance';
        if (itemName === 'Workforce') return '/org-admin/workers';
        if (itemName === 'Vendors') return '/org-admin/vendors';
        if (itemName === 'Geofences') return '/org-admin/sites';
        if (itemName === 'PPE Scanner') return '/org-admin/incidents';
        if (itemName === 'Health Telemetry') return '/org-admin/incidents';
        if (itemName === 'Emergency panic') return '/org-admin/incidents';
        return '/dashboard';

      case 'HR_ADMIN':
        if (itemName === 'Attendance') return '/hr/attendance';
        if (itemName === 'Workforce') return '/hr/workers';
        if (itemName === 'Geofences') return '/hr/compliance';
        return '/dashboard';

      case 'SUPERVISOR':
        if (itemName === 'Attendance') return '/supervisor/attendance';
        if (itemName === 'Workforce') return '/supervisor/workforce';
        if (itemName === 'Geofences') return '/supervisor/sites';
        if (itemName === 'PPE Scanner') return '/supervisor/incidents';
        if (itemName === 'Health Telemetry') return '/supervisor/monitoring';
        if (itemName === 'Emergency panic') return '/supervisor/incidents';
        return '/dashboard';

      case 'SECURITY_OFFICER':
        if (itemName === 'Attendance') return '/security/biometrics';
        if (itemName === 'Geofences') return '/security/violations';
        if (itemName === 'PPE Scanner') return '/security/spoofing';
        if (itemName === 'Health Telemetry') return '/security/alerts';
        if (itemName === 'Emergency panic') return '/security/incidents';
        return '/dashboard';

      case 'VENDOR_MANAGER':
        if (itemName === 'Attendance') return '/vendor/attendance';
        if (itemName === 'Workforce') return '/vendor/workers';
        return '/dashboard';

      case 'WORKER':
        if (itemName === 'Attendance') return '/worker/attendance';
        if (itemName === 'Health Telemetry') return '/worker/support';
        return '/dashboard';

      default:
        return '/dashboard';
    }
  };

  const navItems = allNavItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <div className="w-64 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border-primary)]/20 h-screen flex flex-col font-sans">
      <div className="p-6 relative">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600 tracking-widest font-papyrus uppercase">
          FenceIn
        </h2>
        <p className="text-[10px] text-brand-400/50 mt-1 uppercase tracking-widest font-bold font-mono">Enterprise OS</p>
        
        {onClose && (
          <button onClick={onClose} className="md:hidden absolute top-6 right-4 p-2 text-brand-400 hover:text-white bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-primary)]/20">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const resolvedPath = getDynamicPath(item.name, user?.role || '');
          const isActive = location.pathname === resolvedPath;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={resolvedPath}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all relative ${
                isActive 
                  ? 'bg-[var(--color-sidebar-item-active)]/20 text-[var(--color-sidebar-text)] border border-[var(--color-border-primary)]/30 font-black shadow-[0_0_15px_rgba(13,255,0,0.05)]' 
                  : 'text-[var(--color-sidebar-item)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-sidebar-text)] border border-transparent'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-xs uppercase tracking-wider font-bold">{item.name}</span>
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-[var(--color-border-primary)]/10 bg-[var(--color-sidebar-bg)]/80">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2 mb-4 rounded-xl text-[var(--color-sidebar-item)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-sidebar-text)] border border-[var(--color-border-primary)]/10 hover:border-[var(--color-border-primary)]/30 transition-all duration-300 cursor-pointer shadow-sm"
          title={`Switch to ${theme === 'dark' ? 'Clean Medical' : 'Cyber Biolab'} Mode`}
        >
          <div className="flex items-center space-x-2.5">
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {theme === 'dark' ? 'Cyber Biolab' : 'Clean Medical'}
            </span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[var(--color-bg-tertiary)] p-0.5 transition-colors relative border border-[var(--color-border-primary)]/20">
            <motion.div
              layout
              className="w-3.5 h-3.5 rounded-full bg-brand-500 shadow-sm"
              animate={{ x: theme === 'dark' ? 12 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </button>

        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-brand-950 flex items-center justify-center text-white font-black border border-[var(--color-border-primary)]/30">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.email}</p>
            <p className="text-[9px] text-brand-400 font-bold uppercase tracking-wider mt-0.5">{user?.role.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <Link
          to="/dashboard/change-password"
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 mb-2 rounded-lg text-[var(--color-sidebar-item)] hover:bg-[var(--color-sidebar-item-hover)] hover:text-[var(--color-sidebar-text)] border border-transparent hover:border-[var(--color-border-primary)]/20 transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Change Password</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[var(--color-sidebar-item)] hover:bg-brand-500/10 hover:text-brand-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
