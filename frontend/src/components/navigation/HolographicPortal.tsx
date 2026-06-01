import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '../ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Building2, LayoutDashboard, Camera, BrainCircuit, 
  Map, X, ShieldAlert, HeartPulse, HardHat, Terminal, Search
} from 'lucide-react';

interface HolographicPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HolographicPortal({ isOpen, onClose }: HolographicPortalProps) {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle ESC key to close portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const allNavItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, description: 'Real-time operational dashboard & compliance alerts.' },
    { name: 'Access Requests', path: '/dashboard?tab=requests', icon: Building2, description: 'Review organization onboarding petitions & approvals.' },
    { name: 'Intelligence', path: '/dashboard/ai', icon: BrainCircuit, description: 'Predictive neural anomaly detection & biometric assistant.' },
    { name: 'Attendance', path: '/dashboard/attendance', icon: Camera, description: 'Biometric face & fingerprint check-in compliance logs.' },
    { name: 'Workforce', path: '/dashboard/workers', icon: Users, description: 'Personnel credentials, scheduling, & tenant rosters.' },
    { name: 'Vendors', path: '/dashboard/vendors', icon: Building2, description: 'Configure vendor administrative scope & multi-tenant access.' },
    { name: 'Geofences', path: '/dashboard/sites', icon: Map, description: 'Interactive site map & dynamic polygon perimeter boundaries.' },
    { name: 'PPE Scanner', path: '/dashboard/safety', icon: HardHat, description: 'Automated personal protective equipment camera audits.' },
    { name: 'Health Telemetry', path: '/dashboard/health', icon: HeartPulse, description: 'Wearable sensor metrics, cardiac load, & exhaustion charts.' },
    { name: 'Emergency Panic', path: '/dashboard/emergency', icon: ShieldAlert, description: 'Trigger site-wide alarm broadcasts & security dispatchers.' },
    { name: 'Kiosk Mode', path: '/kiosk', icon: Camera, description: 'Standard biometric check-in/out terminal portal.' },
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
        if (itemName === 'Emergency Panic') return '/super-admin/incidents';
        return '/dashboard';

      case 'ORG_ADMIN':
        if (itemName === 'Intelligence') return '/org-admin/ai';
        if (itemName === 'Attendance') return '/org-admin/attendance';
        if (itemName === 'Workforce') return '/org-admin/workers';
        if (itemName === 'Vendors') return '/org-admin/vendors';
        if (itemName === 'Geofences') return '/org-admin/sites';
        if (itemName === 'PPE Scanner') return '/org-admin/incidents';
        if (itemName === 'Health Telemetry') return '/org-admin/incidents';
        if (itemName === 'Emergency Panic') return '/org-admin/incidents';
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
        if (itemName === 'Emergency Panic') return '/supervisor/incidents';
        return '/dashboard';

      case 'SECURITY_OFFICER':
        if (itemName === 'Attendance') return '/security/biometrics';
        if (itemName === 'Geofences') return '/security/violations';
        if (itemName === 'PPE Scanner') return '/security/spoofing';
        if (itemName === 'Health Telemetry') return '/security/alerts';
        if (itemName === 'Emergency Panic') return '/security/incidents';
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

  const navItems = allNavItems.filter(item => {
    const roleMap: Record<string, string[]> = {
      'Overview': ['PLATFORM_HEAD', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'],
      'Access Requests': ['PLATFORM_HEAD'],
      'Intelligence': ['SUPER_ADMIN', 'ORG_ADMIN'],
      'Attendance': ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'],
      'Workforce': ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'VENDOR_MANAGER'],
      'Vendors': ['SUPER_ADMIN', 'ORG_ADMIN'],
      'Geofences': ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'],
      'PPE Scanner': ['ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'],
      'Health Telemetry': ['SUPER_ADMIN', 'ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'WORKER'],
      'Emergency Panic': ['SUPER_ADMIN', 'ORG_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'],
      'Kiosk Mode': ['SUPER_ADMIN', 'SECURITY_OFFICER'],
    };
    return !user || (roleMap[item.name]?.includes(user.role));
  });

  const filteredItems = navItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  // Hologram grid decoration values
  const systemMetrics = [
    { label: 'COGNITIVE RATIO', value: '0.985 SYS' },
    { label: 'BANDWIDTH', value: '4.8 GB/S' },
    { label: 'LATENCY', value: '1.2 MS' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className={`fixed inset-0 z-50 overflow-hidden ${
            theme === 'dark' ? 'bg-black/85' : 'bg-slate-50/90'
          } flex flex-col items-center justify-start p-6 md:p-12 backdrop-blur-2xl text-text-primary`}
        >
          {/* Scanline Overlay */}
          <div className={`absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] animate-scanline z-10 ${
            theme === 'dark' ? 'opacity-30' : 'opacity-10'
          }`} />

          {/* Bioluminescent Drift Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className={`absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full filter blur-[120px] animate-drift-1 ${
              theme === 'dark' ? 'bg-brand-500/10' : 'bg-emerald-400/15'
            }`} />
            <div className={`absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] rounded-full filter blur-[100px] animate-drift-2 ${
              theme === 'dark' ? 'bg-emerald-950/20' : 'bg-teal-300/10'
            }`} />
          </div>

          {/* Portal Header */}
          <div className="relative w-full max-w-6xl flex justify-between items-center z-20 mb-8 border-b border-[var(--color-border-primary)]/15 pb-4">
            <div className="flex items-center space-x-3">
              <Terminal className={`w-6 h-6 ${theme === 'dark' ? 'text-brand-400' : 'text-emerald-500'}`} />
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary">
                  HOLOGRAPHIC COMMAND CONSOLE
                </h1>
                <p className="text-[10px] font-mono text-brand-400 opacity-60">SESSION_ID: FENCEIN_PORTAL_SECURE_v1.0</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-3 text-brand-400 hover:text-text-primary bg-brand-500/10 hover:bg-brand-500/20 rounded-full border border-brand-500/20 hover:border-brand-500/40 transition-all duration-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Immersive Search Box */}
          <div className="relative w-full max-w-2xl z-20 mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400/60" />
            <input 
              type="text"
              placeholder="SEARCH SYSTEM COGNITIVE PATHS (e.g. overview, geofences)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-6 py-4 rounded-2xl glass-hud border border-[var(--color-border-primary)]/30 text-text-primary font-mono text-xs uppercase tracking-widest ${
                theme === 'dark' ? 'placeholder-brand-500/30' : 'placeholder-brand-800/40'
              } focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 shadow-[0_0_15px_rgba(13,255,0,0.05)] transition-all duration-300`}
              autoFocus
            />
          </div>

          {/* Grid Layout of Cards */}
          <div className="relative w-full max-w-6xl z-20 flex-1 overflow-y-auto pr-2 scrollbar-none pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, idx) => {
                const resolvedPath = getDynamicPath(item.name, user?.role || '');
                const Icon = item.icon;
                
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, type: "spring", stiffness: 100 }}
                    whileHover={{ scale: 1.025, y: -4 }}
                    onClick={() => handleNavigate(resolvedPath)}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl glass-hud border border-[var(--color-border-primary)]/20 hover:border-[var(--color-border-primary)]/50 p-6 flex flex-col justify-between h-48 transition-all duration-300 hover:shadow-[0_0_30px_rgba(13,255,0,0.08)] ${
                      theme === 'dark' ? 'bg-black/30' : 'bg-white/40'
                    }`}
                  >
                    {/* Glowing Accent Corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                      <div className="absolute top-[-10px] right-[-10px] w-6 h-6 rotate-45 border-r-2 border-t-2 border-[var(--color-border-primary)]/30 group-hover:border-[var(--color-border-primary)] transition-colors" />
                    </div>

                    <div>
                      {/* Icon with Glowing Radial Shadow */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-brand-500/10 rounded-xl group-hover:bg-brand-500/20 border border-brand-500/20 group-hover:border-brand-500/50 transition-all duration-300">
                          <Icon className="w-6 h-6 text-brand-400" />
                        </div>
                        <span className="text-[9px] font-mono opacity-40">CH_0{idx + 1}</span>
                      </div>

                      {/* Content */}
                      <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-1.5 group-hover:text-brand-400 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-text-muted opacity-80 leading-relaxed font-sans line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Futuristic Dynamic Pulse Footer */}
                    <div className="mt-4 pt-3 border-t border-[var(--color-border-primary)]/10 flex items-center justify-between">
                      <span className="text-[8px] font-mono text-brand-400/50 uppercase tracking-widest">
                        SECURE_ROUTE: DIRECT
                      </span>
                      
                      {/* Telemetry wave mimic */}
                      <div className="flex items-center space-x-0.5">
                        <div className="w-0.5 h-2 bg-brand-500/40 group-hover:h-3.5 group-hover:bg-brand-400 transition-all duration-300" />
                        <div className="w-0.5 h-3 bg-brand-500/40 group-hover:h-2 group-hover:bg-brand-400 transition-all duration-300" />
                        <div className="w-0.5 h-1.5 bg-brand-500/40 group-hover:h-4 group-hover:bg-brand-400 transition-all duration-300" />
                        <div className="w-0.5 h-2.5 bg-brand-500/40 group-hover:h-2.5 group-hover:bg-brand-400 transition-all duration-300" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20 font-mono text-xs tracking-widest text-brand-500/40">
                NO CORE SYSTEM PATHS FOUND MATCHING SPECIFIED VECTORS
              </div>
            )}
          </div>

          {/* Telemetry Footer */}
          <div className="relative w-full max-w-6xl z-20 border-t border-[var(--color-border-primary)]/15 pt-4 flex flex-col md:flex-row justify-between items-center text-[9px] font-mono opacity-50 space-y-2 md:space-y-0">
            <span>PLATFORM CONTEXT: ACTIVE_TENANT_SECURE</span>
            <div className="flex space-x-6">
              {systemMetrics.map(metric => (
                <div key={metric.label} className="flex space-x-1.5">
                  <span className="text-brand-400 font-bold">{metric.label}:</span>
                  <span>{metric.value}</span>
                </div>
              ))}
            </div>
            <span>© 2026 FENCEIN LABS INC.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
