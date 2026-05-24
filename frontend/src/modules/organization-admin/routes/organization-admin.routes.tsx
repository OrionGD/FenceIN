import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const OrganizationDashboardPage = lazy(() => import('../pages/OrganizationDashboardPage'));
const SitesManagementPage = lazy(() => import('../pages/SitesManagementPage'));
const VendorManagementPage = lazy(() => import('../pages/VendorManagementPage'));
const WorkersManagementPage = lazy(() => import('../pages/WorkersManagementPage'));
const AttendanceDashboardPage = lazy(() => import('../pages/AttendanceDashboardPage'));
const GeofenceManagementPage = lazy(() => import('../pages/GeofenceManagementPage'));
const ShiftManagementPage = lazy(() => import('../pages/ShiftManagementPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SecurityIncidentsPage = lazy(() => import('../pages/SecurityIncidentsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const KioskMonitoringPage = lazy(() => import('../pages/KioskMonitoringPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function OrgAdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<OrganizationDashboardPage />} />
        <Route path="sites" element={<SitesManagementPage />} />
        <Route path="vendors" element={<VendorManagementPage />} />
        <Route path="workers" element={<WorkersManagementPage />} />
        <Route path="attendance" element={<AttendanceDashboardPage />} />
        <Route path="geofence" element={<GeofenceManagementPage />} />
        <Route path="shifts" element={<ShiftManagementPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="incidents" element={<SecurityIncidentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="kiosks" element={<KioskMonitoringPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}
