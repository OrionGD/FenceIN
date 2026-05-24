import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import WorkersView from './pages/WorkersView';
import VendorsView from './pages/VendorsView';
import SitesView from './pages/SitesView';
import AttendanceView from './pages/AttendanceView';
import KioskMode from './pages/KioskMode';
import AiAnalyticsView from './pages/AiAnalyticsView';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/kiosk" element={<KioskMode />} />
        <Route path="/" element={<LandingPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <h2 className="text-4xl font-extrabold text-white">Platform Overview</h2>
                <p className="text-slate-400 mt-4 max-w-md">Welcome to FenceIn. Navigate using the sidebar to manage your workforce and vendors.</p>
              </div>
            } />
            <Route path="/dashboard/ai" element={<AiAnalyticsView />} />
            <Route path="/dashboard/attendance" element={<AttendanceView />} />
            <Route path="/dashboard/workers" element={<WorkersView />} />
            <Route path="/dashboard/vendors" element={<VendorsView />} />
            <Route path="/dashboard/sites" element={<SitesView />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
