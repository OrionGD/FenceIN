import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const WorkerDashboardPage = lazy(() => import('../pages/WorkerDashboardPage'));
const AttendanceHistoryPage = lazy(() => import('../pages/AttendanceHistoryPage'));
const CheckInOutPage = lazy(() => import('../pages/CheckInOutPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const ShiftSchedulePage = lazy(() => import('../pages/ShiftSchedulePage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function WorkerRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<WorkerDashboardPage />} />
        <Route path="attendance" element={<AttendanceHistoryPage />} />
        <Route path="checkin" element={<CheckInOutPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="schedule" element={<ShiftSchedulePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Routes>
    </Suspense>
  );
}
