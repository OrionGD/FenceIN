import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const VendorDashboardPage = lazy(() => import('../pages/VendorDashboardPage'));
const MyWorkersPage = lazy(() => import('../pages/MyWorkersPage'));
const AttendanceReportsPage = lazy(() => import('../pages/AttendanceReportsPage'));
const BillingReportsPage = lazy(() => import('../pages/BillingReportsPage'));
const WorkerAssignmentPage = lazy(() => import('../pages/WorkerAssignmentPage'));
const ComplianceStatusPage = lazy(() => import('../pages/ComplianceStatusPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function VendorManagerRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<VendorDashboardPage />} />
        <Route path="workers" element={<MyWorkersPage />} />
        <Route path="attendance" element={<AttendanceReportsPage />} />
        <Route path="billing" element={<BillingReportsPage />} />
        <Route path="assignments" element={<WorkerAssignmentPage />} />
        <Route path="compliance" element={<ComplianceStatusPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
      </Routes>
    </Suspense>
  );
}
