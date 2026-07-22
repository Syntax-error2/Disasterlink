import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Overview from "./pages/dashboard/Overview";
import GisMap from "./pages/dashboard/GisMap";
import IncidentReports from "./pages/dashboard/IncidentReports";
import LiveWeather from "./pages/dashboard/LiveWeather";         
import EmergencyAlerts from "./pages/dashboard/EmergencyAlerts"; 
import Settings from "./pages/dashboard/Settings";
import ResponderMobile from "./pages/dashboard/ResponderMobile";
import BarangayDashboard from "./pages/dashboard/BarangayDashboard";
import CommunityPortal from "./pages/dashboard/CommunityPortal";
import 'leaflet/dist/leaflet.css';
import { AuthProvider, useAuth } from "./context/AuthContext";

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
          <Routes>
            {/* Auth Routes (No Sidebar) */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> 

            {/* Mobile-First Routes (No Sidebar) */}
            <Route path="/responder-dispatch" element={<ProtectedRoute allowedRoles={['responder']}><ResponderMobile /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute allowedRoles={['resident', 'citizen']}><CommunityPortal /></ProtectedRoute>} />

            {/* Admin & Barangay Dashboard Routes (With Sidebar) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff', 'barangay_captain']}><DashboardLayout /></ProtectedRoute>}>
              {/* Master Admin Pages */}
              <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><Overview /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><GisMap /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><IncidentReports /></ProtectedRoute>} />
              <Route path="/weather" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><LiveWeather /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><EmergencyAlerts /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'mdrrmo_staff']}><Settings /></ProtectedRoute>} /> 
              
              {/* Localized Barangay Command Center */}
              <Route path="/barangay-command" element={<ProtectedRoute allowedRoles={['barangay_captain']}><BarangayDashboard /></ProtectedRoute>} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}