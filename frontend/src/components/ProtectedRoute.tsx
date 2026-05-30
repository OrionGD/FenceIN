import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, token, user, authMethod, biometricStatus } = useAuthStore();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (authMethod === 'PASSWORD' && !biometricStatus?.face && !user.biometricSkipped) {
    return <Navigate to="/biometric-setup" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to a generic unauthorized page or dashboard if they lack specific roles
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
