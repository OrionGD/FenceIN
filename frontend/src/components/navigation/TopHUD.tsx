import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { ShieldCheck, Search, Wifi, Activity } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useSocket } from '../SocketContext';

interface TopHUDProps {
  onSearchClick: () => void;
}

export default function TopHUD({ onSearchClick }: TopHUDProps) {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const { connectionStatus } = useSocket();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const roleName = user?.role ? user.role.replace(/_/g, ' ') : 'VISITOR';

  // Visual classes mapped directly to WebSocket connection health
  let statusText = 'SYS_STATUS: ACTIVE';
  let pingGlowClass = theme === 'dark' ? 'bg-brand-400' : 'bg-emerald-400';
  let baseGlowClass = theme === 'dark' ? 'bg-brand-500' : 'bg-emerald-500';
  let wifiColorClass = 'text-emerald-500 animate-pulse';

  if (connectionStatus === 'connecting') {
    statusText = 'SYS_STATUS: SYNCING...';
    pingGlowClass = 'bg-amber-400';
    baseGlowClass = 'bg-amber-500';
    wifiColorClass = 'text-amber-500 animate-pulse';
  } else if (connectionStatus === 'disconnected') {
    statusText = 'SYS_STATUS: OFFLINE';
    pingGlowClass = 'bg-slate-600/55';
    baseGlowClass = 'bg-slate-600';
    wifiColorClass = 'text-rose-500/50';
  } else if (connectionStatus === 'error') {
    statusText = 'SYS_STATUS: CONN_ERROR';
    pingGlowClass = 'bg-rose-500 animate-ping';
    baseGlowClass = 'bg-rose-600';
    wifiColorClass = 'text-rose-500 animate-bounce';
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl px-4 py-2 rounded-2xl glass-hud shadow-lg flex items-center justify-between pointer-events-auto transition-all duration-300">
      {/* Brand & Connection Telemetry */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center">
          <span className="flex h-3 w-3 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingGlowClass}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${baseGlowClass}`}></span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest font-black text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary">
            FenceIn OS
          </span>
          <span className="text-[8px] font-mono opacity-60 tracking-wider flex items-center space-x-1">
            <ShieldCheck className={`w-2.5 h-2.5 inline ${
              connectionStatus === 'connected' ? 'text-emerald-500' :
              connectionStatus === 'connecting' ? 'text-amber-500' : 'text-rose-500'
            }`} />
            <span>{statusText}</span>
          </span>
        </div>
      </div>

      {/* Center Console Search / Command Pill */}
      <button 
        onClick={onSearchClick}
        className="flex items-center space-x-2 px-6 py-1.5 rounded-full bg-black/10 hover:bg-black/20 border border-[var(--color-border-primary)]/10 hover:border-[var(--color-border-primary)]/30 text-xs text-text-muted transition-all duration-300 w-1/3 max-w-[280px] justify-between group shadow-inner cursor-pointer"
        title="Open Holographic Command Center"
      >
        <span className="font-mono tracking-wide group-hover:text-text-primary transition-colors">SEARCH CORE CONSOLE</span>
        <div className="flex items-center space-x-1">
          <span className="text-[9px] bg-[var(--color-bg-tertiary)]/20 px-1.5 py-0.5 rounded border border-[var(--color-border-primary)]/20 font-bold font-mono">⌘K</span>
          <Search className="w-3.5 h-3.5 text-brand-400 group-hover:scale-110 transition-transform" />
        </div>
      </button>

      {/* Live System Time & Operator ID */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col text-right font-mono">
          <span className="text-[9px] opacity-50 uppercase tracking-widest">OPERATOR SCOPE</span>
          <span className={`text-[10px] font-black uppercase tracking-wider ${
            theme === 'dark' ? 'text-brand-400' : 'text-emerald-600'
          }`}>
            {roleName}
          </span>
        </div>
        <div className="h-6 w-px bg-[var(--color-border-primary)]/10 hidden sm:block" />
        <div className="flex items-center space-x-2">
          <Wifi className={`w-3.5 h-3.5 ${wifiColorClass}`} />
          <Activity className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-wider opacity-85">
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}
