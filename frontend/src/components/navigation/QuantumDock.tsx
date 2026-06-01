import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '../ThemeContext';
import { logFrontendAction } from '../../utils/terminalLogger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, LayoutDashboard, Camera, Map, ShieldAlert, 
  BrainCircuit, Lock, LogOut, Sun, Moon
} from 'lucide-react';

interface QuantumDockProps {
  onPortalOpen: () => void;
}

export default function QuantumDock({ onPortalOpen }: QuantumDockProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    if (user) {
      logFrontendAction('USER SIGNED OUT. Sessions terminated.', user.email, user.role);
    }
    logout();
  };

  // Main high-utility shortcuts in Dock based on permissions
  const dockItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, roleRequired: [] },
    { 
      name: 'Attendance', 
      path: user?.role === 'SUPER_ADMIN' ? '/super-admin/audit' : user?.role === 'ORG_ADMIN' ? '/org-admin/attendance' : '/dashboard',
      icon: Camera, 
      roleRequired: [] 
    },
    { 
      name: 'Workforce', 
      path: user?.role === 'SUPER_ADMIN' ? '/super-admin/users' : user?.role === 'ORG_ADMIN' ? '/org-admin/workers' : '/dashboard',
      icon: Users, 
      roleRequired: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'VENDOR_MANAGER'] 
    },
    { 
      name: 'Geofences', 
      path: user?.role === 'SUPER_ADMIN' ? '/super-admin/monitoring' : user?.role === 'ORG_ADMIN' ? '/org-admin/sites' : '/dashboard',
      icon: Map, 
      roleRequired: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'] 
    },
  ];

  const allowedItems = dockItems.filter(item => 
    item.roleRequired.length === 0 || (user && item.roleRequired.includes(user.role))
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center px-6 py-2.5 rounded-full glass-hud shadow-2xl space-x-5 pointer-events-auto transition-all duration-300">
      
      {/* ─── LEFT: USER IDENTITY AVATAR MODULE ────────────────────────── */}
      <div className="relative" ref={profileRef}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowProfile(!showProfile)}
          className={`w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-950 flex items-center justify-center text-white font-black border cursor-pointer ${
            showProfile ? 'border-brand-400' : 'border-brand-500/20'
          }`}
          title="Operator Interface"
        >
          {user?.email?.[0].toUpperCase() || 'U'}
        </motion.button>

        {/* Upward Sliding Glass Profile Panel */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
              className={`absolute bottom-14 left-[-16px] w-64 glass-hud rounded-2xl p-4 flex flex-col space-y-3 z-50 shadow-2xl border ${
                theme === 'dark' ? 'text-white border-[var(--color-border-primary)]/30 bg-black/90' : 'text-text-primary border-slate-250 bg-white/95'
              }`}
            >
              <div className="flex items-center space-x-3 pb-3 border-b border-[var(--color-border-primary)]/10">
                <div className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-brand-900' : 'bg-brand-100'} border border-brand-500/30 flex items-center justify-center font-bold`}>
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-text-primary'} truncate`}>{user?.email}</p>
                  <p className="text-[8px] text-brand-400 font-mono uppercase tracking-widest mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Theme Selector inside Panel */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent hover:border-border-muted/20 transition-all text-[10px] uppercase font-mono tracking-widest cursor-pointer"
              >
                <span>OPERATING THEME</span>
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '10s' }} />
                )}
              </button>

              <Link
                to="/dashboard/change-password"
                onClick={() => setShowProfile(false)}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all text-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-brand-400" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Change Password</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all text-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Terminate Session</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-6 w-px bg-[var(--color-border-primary)]/15" />

      {/* ─── CENTER: SHORTCUT LINKS & OSCILLATING CORE HUB ───────────────── */}
      <div className="flex items-center space-x-4">
        {allowedItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              whileHover={{ scale: 1.15, y: -6 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center group"
            >
              <Link
                to={item.path}
                className={`p-2.5 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? 'bg-brand-500/15 border-brand-400/50 text-white shadow-[0_0_15px_rgba(13,255,0,0.12)]' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-text-primary'
                }`}
                title={item.name}
              >
                <Icon className="w-4.5 h-4.5" />
              </Link>
              
              {/* macOS Active Halo Indicator */}
              {isActive && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(13,255,0,0.9)]" />
              )}

              {/* Dynamic tooltip */}
              <span className={`absolute top-[-36px] left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest rounded-md pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50 border ${
                theme === 'dark' ? 'text-white bg-black/90 border-brand-500/20' : 'text-text-primary bg-white border-slate-250'
              }`}>
                {item.name}
              </span>
            </motion.div>
          );
        })}

        {/* ─── DOCK ANCHOR: THE BIOCIRCULAR CORE PORTAL TRIGGER ────────────── */}
        <motion.button
          whileHover={{ scale: 1.25, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPortalOpen}
          className={`p-3 rounded-full border cursor-pointer transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-brand-500/20 hover:bg-brand-500/40 border-brand-400 text-brand-400 shadow-[0_0_20px_rgba(13,255,0,0.25)] glow-cyber' 
              : 'bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-400 text-emerald-600 shadow-[0_0_20px_rgba(29,185,84,0.25)] glow-medical'
          }`}
          title="Activate Immersive Command Portal"
        >
          <BrainCircuit className="w-5 h-5 animate-pulse" />
        </motion.button>
      </div>

      <div className="h-6 w-px bg-[var(--color-border-primary)]/15" />

      {/* ─── RIGHT: QUICK THEME TOGGLE & EMERGENCY DISTRESS PIPELINE ───────── */}
      <div className="flex items-center space-x-3">
        {/* Dynamic theme quick-flip */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white border border-transparent hover:border-[var(--color-border-primary)]/20 hover:bg-white/5 transition-all cursor-pointer"
          title="Instant Theme Reconfiguration"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </motion.button>

        {/* HIGH-VOLTAGE EMERGENCY DISTRESS BUTTON */}
        <motion.div
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <Link
            to={user?.role === 'SUPER_ADMIN' ? '/super-admin/incidents' : user?.role === 'ORG_ADMIN' ? '/org-admin/incidents' : '/dashboard'}
            className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.45)] cursor-pointer relative overflow-hidden group"
            title="SYSTEM DISTRESS RED ALERT"
          >
            {/* Shimmer pulse */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
          </Link>
        </motion.div>
      </div>

    </div>
  );
}
