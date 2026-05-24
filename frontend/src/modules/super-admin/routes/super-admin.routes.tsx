import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

// Lazy load all super-admin pages for code splitting
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const OrganizationsPage = lazy(() => import('../pages/OrganizationsPage'));
const GlobalAnalyticsPage = lazy(() => import('../pages/GlobalAnalyticsPage'));
const SystemMonitoringPage = lazy(() => import('../pages/SystemMonitoringPage'));
const UserManagementPage = lazy(() => import('../pages/UserManagementPage'));
const RoleManagementPage = lazy(() => import('../pages/RoleManagementPage'));
const PermissionsPage = lazy(() => import('../pages/PermissionsPage'));
const AuditLogsPage = lazy(() => import('../pages/AuditLogsPage'));
const AiAnalyticsPage = lazy(() => import('../pages/AiAnalyticsPage'));
const PlatformSettingsPage = lazy(() => import('../pages/PlatformSettingsPage'));
const SecurityCenterPage = lazy(() => import('../pages/SecurityCenterPage'));
const ApiManagementPage = lazy(() => import('../pages/ApiManagementPage'));
const StorageManagementPage = lazy(() => import('../pages/StorageManagementPage'));
const DatabaseMonitoringPage = lazy(() => import('../pages/DatabaseMonitoringPage'));
const KioskManagementPage = lazy(() => import('../pages/KioskManagementPage'));
const NotificationCenterPage = lazy(() => import('../pages/NotificationCenterPage'));
const IncidentCenterPage = lazy(() => import('../pages/IncidentCenterPage'));
const SubscriptionBillingPage = lazy(() => import('../pages/SubscriptionBillingPage'));
const BackupRecoveryPage = lazy(() => import('../pages/BackupRecoveryPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function SuperAdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="orgs" element={<OrganizationsPage />} />
        <Route path="global-analytics" element={<GlobalAnalyticsPage />} />
        <Route path="monitoring" element={<SystemMonitoringPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="roles" element={<RoleManagementPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="ai" element={<AiAnalyticsPage />} />
        <Route path="settings" element={<PlatformSettingsPage />} />
        <Route path="security" element={<SecurityCenterPage />} />
        <Route path="api" element={<ApiManagementPage />} />
        <Route path="storage" element={<StorageManagementPage />} />
        <Route path="db" element={<DatabaseMonitoringPage />} />
        <Route path="kiosks" element={<KioskManagementPage />} />
        <Route path="notifications" element={<NotificationCenterPage />} />
        <Route path="incidents" element={<IncidentCenterPage />} />
        <Route path="billing" element={<SubscriptionBillingPage />} />
        <Route path="backups" element={<BackupRecoveryPage />} />
      </Routes>
    </Suspense>
  );
}
