import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Users, Building2, LayoutDashboard, LogOut, Camera, BrainCircuit, Map, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const allNavItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'] },
    { name: 'Intelligence', path: '/dashboard/ai', icon: BrainCircuit, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    { name: 'Attendance', path: '/dashboard/attendance', icon: Camera, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER'] },
    { name: 'Workforce', path: '/dashboard/workers', icon: Users, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'VENDOR_MANAGER'] },
    { name: 'Vendors', path: '/dashboard/vendors', icon: Building2, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    { name: 'Geofences', path: '/dashboard/sites', icon: Map, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'] },
    { name: 'Kiosk Mode', path: '/kiosk', icon: Camera, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'SECURITY_OFFICER'] },
  ];

  const navItems = allNavItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      <div className="p-6 relative">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          FenceIn
        </h2>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Enterprise OS</p>
        
        {onClose && (
          <button onClick={onClose} className="md:hidden absolute top-6 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-md border border-slate-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
          </div>
        </div>
        <Link
          to="/dashboard/change-password"
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 mb-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">Change Password</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
