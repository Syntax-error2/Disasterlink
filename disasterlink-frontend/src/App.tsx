import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import DashboardLayout from "./components/layout/DashboardLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Loader2 } from "lucide-react";
import 'leaflet/dist/leaflet.css';

// Helper to simulate network delay so the beautiful loader is actually visible on localhost!
const lazyWithDelay = (importFunc: () => Promise<any>, delay = 600) => {
  return React.lazy(() => 
    Promise.all([
      importFunc(),
      new Promise(resolve => setTimeout(resolve, delay))
    ]).then(([moduleExports]) => moduleExports)
  );
};

// Lazy loaded pages for performance and loading states
const Login = lazyWithDelay(() => import("./pages/auth/Login"), 800);
const Signup = lazyWithDelay(() => import("./pages/auth/Signup"), 800);
const Overview = lazyWithDelay(() => import("./pages/dashboard/Overview"));
const GisMap = lazyWithDelay(() => import("./pages/dashboard/GisMap"));
const IncidentReports = lazyWithDelay(() => import("./pages/dashboard/IncidentReports"));
const LiveWeather = lazyWithDelay(() => import("./pages/dashboard/LiveWeather"));
const EmergencyAlerts = lazyWithDelay(() => import("./pages/dashboard/EmergencyAlerts"));
const Settings = lazyWithDelay(() => import("./pages/dashboard/Settings"));
const ResponderMobile = lazyWithDelay(() => import("./pages/dashboard/ResponderMobile"));
const BarangayDashboard = lazyWithDelay(() => import("./pages/dashboard/BarangayDashboard"));
const CommunityPortal = lazyWithDelay(() => import("./pages/dashboard/CommunityPortal"));
const SuperAdmin = lazyWithDelay(() => import("./pages/dashboard/SuperAdmin"));

// Global Page Loader
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#16171d]">
    <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-4" />
    <span className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">Loading modules...</span>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // If the route requires roles, but user data is missing/corrupted, force logout
  if (allowedRoles && !user) {
    logout();
    return <Navigate to="/login" replace />;
  }
  
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Prevent privilege escalation and redirect to appropriate dashboards
      if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
      if (user.role === 'resident' || user.role === 'citizen') return <Navigate to="/portal" replace />;
      if (user.role === 'responder') return <Navigate to="/responder-dispatch" replace />;
      if (user.role === 'barangay_captain') return <Navigate to="/barangay-command" replace />;
      return <Navigate to="/login" replace />;
    }

  return children;
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="disasterlink-theme">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth Routes (No Sidebar) */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> 

            {/* Mobile-First Routes (No Sidebar) */}
            <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdmin /></ProtectedRoute>} />
            <Route path="/responder-dispatch" element={<ProtectedRoute allowedRoles={['responder']}><ResponderMobile /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute allowedRoles={['resident', 'citizen']}><CommunityPortal /></ProtectedRoute>} />

            {/* Admin & Barangay Dashboard Routes (With Sidebar) */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff', 'barangay_captain']}><DashboardLayout /></ProtectedRoute>}>
              {/* Master Admin Pages */}
              <Route path="/" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><Overview /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><GisMap /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><IncidentReports /></ProtectedRoute>} />
              <Route path="/weather" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><LiveWeather /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><EmergencyAlerts /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'mdrrmo_staff']}><Settings /></ProtectedRoute>} /> 
              
              {/* Localized Barangay Command Center */}
              <Route path="/barangay-command" element={<ProtectedRoute allowedRoles={['barangay_captain']}><BarangayDashboard /></ProtectedRoute>} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}