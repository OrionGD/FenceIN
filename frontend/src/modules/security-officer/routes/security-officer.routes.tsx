import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const SecurityDashboardPage = lazy(() => import('../pages/SecurityDashboardPage'));
const KioskControlPage = lazy(() => import('../pages/KioskControlPage'));
const LiveBiometricFeedPage = lazy(() => import('../pages/LiveBiometricFeedPage'));
const SpoofDetectionPage = lazy(() => import('../pages/SpoofDetectionPage'));
const GeofenceViolationsPage = lazy(() => import('../pages/GeofenceViolationsPage'));
const SecurityIncidentsPage = lazy(() => import('../pages/SecurityIncidentsPage'));
const BlockedWorkersPage = lazy(() => import('../pages/BlockedWorkersPage'));
const RealtimeAlertsPage = lazy(() => import('../pages/RealtimeAlertsPage'));
const SurveillanceLogsPage = lazy(() => import('../pages/SurveillanceLogsPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));
const WorkerRegistrationPage = lazy(() => import('../pages/WorkerRegistrationPage'));
const WorkerFaceEnrollmentPage = lazy(() => import('../pages/WorkerFaceEnrollmentPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function SecurityOfficerRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<SecurityDashboardPage />} />
        <Route path="kiosk" element={<KioskControlPage />} />
        <Route path="biometrics" element={<LiveBiometricFeedPage />} />
        <Route path="spoofing" element={<SpoofDetectionPage />} />
        <Route path="violations" element={<GeofenceViolationsPage />} />
        <Route path="incidents" element={<SecurityIncidentsPage />} />
        <Route path="blocked" element={<BlockedWorkersPage />} />
        <Route path="alerts" element={<RealtimeAlertsPage />} />
        <Route path="surveillance" element={<SurveillanceLogsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
        <Route path="register-worker" element={<WorkerRegistrationPage />} />
        <Route path="face-enrollment" element={<WorkerFaceEnrollmentPage />} />
      </Routes>
    </Suspense>
  );
}
