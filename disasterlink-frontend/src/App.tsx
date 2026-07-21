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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
            <Route path="/responder-dispatch" element={<ProtectedRoute><ResponderMobile /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute><CommunityPortal /></ProtectedRoute>} /> {/* <-- Added Portal Route */}

            {/* Admin & Barangay Dashboard Routes (With Sidebar) */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              {/* Master Admin Pages */}
              <Route path="/" element={<Overview />} />
              <Route path="/map" element={<GisMap />} />
              <Route path="/reports" element={<IncidentReports />} />
              <Route path="/weather" element={<LiveWeather />} />
              <Route path="/alerts" element={<EmergencyAlerts />} />
              <Route path="/settings" element={<Settings />} /> 
              
              {/* Localized Barangay Command Center */}
              <Route path="/barangay-command" element={<BarangayDashboard />} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}