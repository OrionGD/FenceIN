import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, type Role } from '../store/useAuthStore';

interface RoleRouteProps {
  allowedRoles: Role[];
  fallbackPath?: string;
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, token, isAuthenticated, authMethod, biometricStatus } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !token || !user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ─── STRICT BIOMETRIC COMPLIANCE GATE REDIRECTION ──────────────────────
  const isSetupRoute = location.pathname === '/biometric-setup';

  if (authMethod === 'PASSWORD' && !biometricStatus?.face && !user.biometricSkipped && !isSetupRoute) {
    return <Navigate to="/biometric-setup" replace />;
  }

  // Super Admin override access
  if (user.role === 'SUPER_ADMIN') {
    return <Outlet />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If authenticated but unauthorized for this route
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-50 text-center p-4">
        <h1 className="text-6xl font-extrabold text-brand-500 mb-4 filter drop-shadow-[0_0_15px_rgba(13,255,0,0.4)]">403</h1>
        <h2 className="text-3xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Your current role ({user.role.replace('_', ' ')}) does not have permission to access this enterprise module.
        </p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20 cursor-pointer"
        >
          Return to Previous Page
        </button>
      </div>
    );
  }

  return <Outlet />;
}
