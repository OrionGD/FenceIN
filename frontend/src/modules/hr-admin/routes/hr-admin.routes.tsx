import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const HrDashboardPage = lazy(() => import('../pages/HrDashboardPage'));
const WorkersDirectoryPage = lazy(() => import('../pages/WorkersDirectoryPage'));
const AttendanceLogsPage = lazy(() => import('../pages/AttendanceLogsPage'));
const PayrollPage = lazy(() => import('../pages/PayrollPage'));
const OvertimeReportsPage = lazy(() => import('../pages/OvertimeReportsPage'));
const ShiftReportsPage = lazy(() => import('../pages/ShiftReportsPage'));
const LeaveManagementPage = lazy(() => import('../pages/LeaveManagementPage'));
const ComplianceReportsPage = lazy(() => import('../pages/ComplianceReportsPage'));
const ExportCenterPage = lazy(() => import('../pages/ExportCenterPage'));
const WorkerDocumentsPage = lazy(() => import('../pages/WorkerDocumentsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function HrAdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HrDashboardPage />} />
        <Route path="workers" element={<WorkersDirectoryPage />} />
        <Route path="attendance" element={<AttendanceLogsPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="overtime" element={<OvertimeReportsPage />} />
        <Route path="shifts" element={<ShiftReportsPage />} />
        <Route path="leave" element={<LeaveManagementPage />} />
        <Route path="compliance" element={<ComplianceReportsPage />} />
        <Route path="export" element={<ExportCenterPage />} />
        <Route path="documents" element={<WorkerDocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
      </Routes>
    </Suspense>
  );
}
