import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import ChangePassword from '@/components/ChangePassword';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  if (user?.mustChangePassword) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <ChangePassword forceMode={true} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-bg-secondary border-b border-border-primary/20">
          <h2 className="text-xl font-black text-brand-500 font-papyrus tracking-wider">FENCEIN OS</h2>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-brand-400 hover:text-brand-300 bg-brand-500/10 rounded-md border border-brand-500/20">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

