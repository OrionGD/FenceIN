import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const SupervisorDashboardPage = lazy(() => import('../pages/SupervisorDashboardPage'));
const AssignedSitesPage = lazy(() => import('../pages/AssignedSitesPage'));
const LiveWorkforcePage = lazy(() => import('../pages/LiveWorkforcePage'));
const AttendanceStreamPage = lazy(() => import('../pages/AttendanceStreamPage'));
const ManualAttendancePage = lazy(() => import('../pages/ManualAttendancePage'));
const IncidentReportsPage = lazy(() => import('../pages/IncidentReportsPage'));
const TaskAssignmentPage = lazy(() => import('../pages/TaskAssignmentPage'));
const WorkerMonitoringPage = lazy(() => import('../pages/WorkerMonitoringPage'));
const SiteNotificationsPage = lazy(() => import('../pages/SiteNotificationsPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function SupervisorRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<SupervisorDashboardPage />} />
        <Route path="sites" element={<AssignedSitesPage />} />
        <Route path="workforce" element={<LiveWorkforcePage />} />
        <Route path="attendance" element={<AttendanceStreamPage />} />
        <Route path="manual-attendance" element={<ManualAttendancePage />} />
        <Route path="incidents" element={<IncidentReportsPage />} />
        <Route path="tasks" element={<TaskAssignmentPage />} />
        <Route path="monitoring" element={<WorkerMonitoringPage />} />
        <Route path="notifications" element={<SiteNotificationsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
      </Routes>
    </Suspense>
  );
}
