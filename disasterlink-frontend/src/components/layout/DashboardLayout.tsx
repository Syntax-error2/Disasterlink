import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  MapPinned, 
  FileText, 
  CloudRain, 
  BellRing, 
  Settings, 
  LogOut, 
  Search, 
  Menu, 
  UserCircle,
  ShieldAlert,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import axiosInstance from "../../lib/axios";

// No mock notifications, dynamic only
export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  // 1. Manage User State (Now includes assigned_barangay for filtering)
  const [user, setUser] = useState({ name: "Loading...", role: "guest", department: "Loading...", assigned_barangay: "all" });
  
  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [readIds, setReadIds] = useState<Set<string | number>>(() => {
    const saved = localStorage.getItem('readNotificationIds');
    if (saved) {
      try { return new Set(JSON.parse(saved)); } catch (e) {}
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  // 2. Fetch User & Filter Notifications on Load
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (storedUser && storedUser.name) {
      setUser({
        name: storedUser.name,
        role: storedUser.role,
        department: storedUser.department || storedUser.role.replace('_', ' '),
        assigned_barangay: storedUser.assigned_barangay || 'all'
      });
    }

    const fetchLiveNotifications = async () => {
      try {
        const response = await axiosInstance.get('/incidents');
        const data = response.data;
        const liveNotifs = data.map((inc: any) => ({
          id: `live-${inc.id}`,
          type: (inc.severity_level === 'Critical' || inc.exact_location === 'SOS EMERGENCY PING') ? 'critical' : 'warning',
          title: inc.exact_location === 'SOS EMERGENCY PING' ? 'SOS Emergency Ping' : `${inc.severity_level} ${inc.incident_type}`,
          message: `${inc.exact_location} - ${inc.details}`,
          time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          targetRole: 'all',
          targetBrgy: inc.reporting_barangay
        })).filter((n: any) => n.type === 'critical').slice(0, 5);

        // Fetch dynamic broadcast history
        const savedBroadcasts = JSON.parse(localStorage.getItem("broadcast_history") || "[]");
        const broadcastNotifs = savedBroadcasts.map((b: any) => ({
          id: `broadcast-${b.id}`,
          type: 'info',
          title: `BROADCAST: ${b.title}`,
          message: b.message,
          time: new Date(b.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          targetRole: 'all',
          targetBrgy: b.targetArea
        }));

        setNotifications(prev => {
          // Re-apply read state to prevent resetting
          const applyRead = (arr: any[]) => arr.map(n => ({...n, read: readIds.has(n.id)}));
          
          return [...applyRead(broadcastNotifs), ...applyRead(liveNotifs)];
        });
      } catch (e) {}
    };

    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 10000);
    return () => clearInterval(interval);
  }, [readIds]);

  // Handle clicking outside the notification dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  // 3. Define Role Checkers
  const isAdmin = user.role === 'admin' || user.role === 'mdrrmo_staff';
  const isCaptain = user.role === 'barangay_captain';

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "GIS Map", path: "/map", icon: MapPinned },
    { name: "Incident Reports", path: "/reports", icon: FileText },
    { name: "Live Weather", path: "/weather", icon: CloudRain },
    { name: "Emergency Alerts", path: "/alerts", icon: BellRing },
  ];

  // 4. Notification Actions
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string | number) => {
    setReadIds(prev => new Set([...prev, id]));
  };

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    setShowNotifications(false);
    navigate('/reports');
  };

  const markAllAsRead = () => {
    setReadIds(prev => new Set([...prev, ...notifications.map(n => n.id)]));
  };

  // 5. Fully Functional Secure Logout
  const handleLogout = async () => {
    try {
      await axiosInstance.post('/logout');
    } catch(e) {}
    sessionStorage.removeItem('auth_token'); 
    sessionStorage.removeItem('user'); 
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-[#16171d] overflow-hidden font-sans">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115] hidden md:flex flex-col h-full shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">DisasterLink</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4 py-6 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Main Menu</div>
          
          {/* ADMIN ONLY LINKS */}
          {isAdmin && navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}

          {/* BARANGAY CAPTAIN ONLY LINK */}
          {isCaptain && (
            <Link
              to="/barangay-command"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/barangay-command"
                  ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Local Command Center
            </Link>
          )}

          {/* SYSTEM SETTINGS (ADMIN ONLY) */}
          {isAdmin && (
            <>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-8 px-2">System</div>
              <Link to="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname === "/settings" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50"}`}>
                <Settings className="h-4 w-4" />
                System Settings
              </Link>
            </>
          )}
        </nav>

        {/* Dynamic User Profile Footer & Logout */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer group border-none text-left"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <UserCircle className="h-9 w-9 text-zinc-400 group-hover:text-red-500 transition-colors shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                  {user.name}
                </span>
                <span className="text-xs text-zinc-500 group-hover:text-red-500/70 truncate uppercase">
                  {user.department}
                </span>
              </div>
            </div>
            <LogOut className="h-4 w-4 text-zinc-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors shrink-0" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#111115]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 px-3 py-1.5 rounded-md focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20 transition-all">
              <Search className="h-4 w-4" />
              <input type="text" placeholder="Search report IDs..." className="bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-500 w-64" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            {/* FUNCTIONAL NOTIFICATION SYSTEM */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-2 rounded-full ${showNotifications ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                <BellRing className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border-2 border-white dark:border-[#111115]"></span>
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Notifications</h3>
                        <p className="text-xs text-zinc-500">You have {unreadCount} unread alerts</p>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">No new notifications.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex gap-3 ${!notif.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {notif.type === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                               notif.type === 'warning' ? <ShieldAlert className="h-5 w-5 text-amber-500" /> :
                               notif.type === 'system' ? <Settings className="h-5 w-5 text-zinc-400" /> :
                               <Info className="h-5 w-5 text-blue-500" />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`text-sm font-semibold ${!notif.read ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                  {notif.title}
                                </h4>
                                {!notif.read && <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pt-1">{notif.time}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <button className="w-full text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 py-2 transition-colors">
                        View Complete Log
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}