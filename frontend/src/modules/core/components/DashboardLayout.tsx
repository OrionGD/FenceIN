import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import ChangePassword from '@/components/ChangePassword';
import TopHUD from '@/components/navigation/TopHUD';
import QuantumDock from '@/components/navigation/QuantumDock';
import HolographicPortal from '@/components/navigation/HolographicPortal';

export default function DashboardLayout() {
  const [portalOpen, setPortalOpen] = useState(false);
  const { user } = useAuthStore();

  // Listen for global keyboard shortcuts (Ctrl + Space or Ctrl + K) to toggle command portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPortalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (user?.mustChangePassword) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <ChangePassword forceMode={true} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary font-sans overflow-x-hidden overflow-y-auto scrollbar-none select-none">
      
      {/* Bioluminescent floating background elements in dashboard shell */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute top-[10%] right-[5%] w-[35vw] h-[35vw] rounded-full filter blur-[150px] bg-brand-500/5 animate-drift-1" />
        <div className="absolute bottom-[10%] left-[5%] w-[40vw] h-[40vw] rounded-full filter blur-[180px] bg-emerald-500/5 animate-drift-2" />
      </div>

      {/* ─── TOP STATUS TELEMETRY CAPSULE (HUD) ───────────────────────── */}
      <TopHUD onSearchClick={() => setPortalOpen(true)} />

      {/* ─── MAIN DYNAMIC CONTENT FIELD ─────────────────────────────── */}
      <main className="relative z-10 w-full min-h-screen pt-24 pb-32 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ─── GLASSMORPHIC DOCK CONTROL MATRIX ───────────────────────── */}
      <QuantumDock onPortalOpen={() => setPortalOpen(true)} />

      {/* ─── FULLSCREEN IMMERSIVE HOLOGRAPHIC NAVIGATION PORTAL ─────── */}
      <HolographicPortal isOpen={portalOpen} onClose={() => setPortalOpen(false)} />

    </div>
  );
}


