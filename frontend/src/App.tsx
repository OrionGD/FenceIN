import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Core & Auth pages (not lazy — they are critical path)
import LandingPage from './modules/core/pages/LandingPage';
import LoginPage from './modules/auth/pages/LoginPage';
import SignupPage from './modules/auth/pages/SignupPage';
import DashboardLayout from './modules/core/components/DashboardLayout';
import RoleBasedDashboard from './modules/core/pages/RoleBasedDashboard';
import ChangePasswordPage from './modules/core/pages/ChangePasswordPage';
import RoleRoute from './components/RoleRoute';

// Kiosk — standalone fullscreen, not inside DashboardLayout
const KioskControlPage = lazy(() => import('./modules/security-officer/pages/KioskControlPage'));

// Lazy-loaded module route bundles (code-split per role)
const SuperAdminRoutes = lazy(() => import('./modules/super-admin/routes/super-admin.routes'));
const OrgAdminRoutes = lazy(() => import('./modules/organization-admin/routes/organization-admin.routes'));
const HrAdminRoutes = lazy(() => import('./modules/hr-admin/routes/hr-admin.routes'));
const SupervisorRoutes = lazy(() => import('./modules/workforce-supervisor/routes/workforce-supervisor.routes'));
const SecurityOfficerRoutes = lazy(() => import('./modules/security-officer/routes/security-officer.routes'));
const VendorManagerRoutes = lazy(() => import('./modules/vendor-manager/routes/vendor-manager.routes'));
const WorkerRoutes = lazy(() => import('./modules/worker/routes/worker.routes'));

const GlobalLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-950">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading FenceIn Module...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Standalone Kiosk — no dashboard shell */}
        <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SECURITY_OFFICER']} />}>
          <Route
            path="/kiosk/*"
            element={
              <Suspense fallback={<GlobalLoader />}>
                <KioskControlPage />
              </Suspense>
            }
          />
        </Route>

        {/* All dashboard routes — wrapped in DashboardLayout */}
        <Route
          element={
            <RoleRoute
              allowedRoles={[
                'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN',
                'SUPERVISOR', 'SECURITY_OFFICER', 'VENDOR_MANAGER', 'WORKER',
              ]}
            />
          }
        >
          <Route element={<DashboardLayout />}>
            {/* Universal dashboard landing (role-aware) */}
            <Route path="/dashboard" element={<RoleBasedDashboard />} />
            <Route path="/dashboard/change-password" element={<ChangePasswordPage />} />

            {/* ─── SUPER ADMIN MODULE ─────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route
                path="/super-admin/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <SuperAdminRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── ORGANIZATION ADMIN MODULE ──────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']} />}>
              <Route
                path="/org-admin/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <OrgAdminRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── HR ADMIN MODULE ────────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN']} />}>
              <Route
                path="/hr/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <HrAdminRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── WORKFORCE SUPERVISOR MODULE ────────────────────────── */}
            <Route
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SUPERVISOR']} />
              }
            >
              <Route
                path="/supervisor/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <SupervisorRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── SECURITY OFFICER MODULE ────────────────────────────── */}
            <Route
              element={
                <RoleRoute
                  allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SECURITY_OFFICER']}
                />
              }
            >
              <Route
                path="/security/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <SecurityOfficerRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── VENDOR MANAGER MODULE ──────────────────────────────── */}
            <Route
              element={
                <RoleRoute
                  allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'VENDOR_MANAGER']}
                />
              }
            >
              <Route
                path="/vendor/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <VendorManagerRoutes />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── WORKER MODULE ──────────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={['WORKER']} />}>
              <Route
                path="/worker/*"
                element={
                  <Suspense fallback={<GlobalLoader />}>
                    <WorkerRoutes />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route
          path="*"
          element={
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
              <h1 className="text-8xl font-extrabold text-slate-700">404</h1>
              <h2 className="text-2xl font-bold mt-4">Page Not Found</h2>
              <p className="text-slate-400 mt-2">The route you requested doesn't exist.</p>
              <a
                href="/dashboard"
                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
