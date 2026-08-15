import React, { useState, useEffect, useRef, Suspense } from "react";
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
  Sun,
  Moon,
  AlertTriangle,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  X,
  FileCheck2,
  Ambulance,
  Home,
  FileKey,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import axiosInstance from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Inner Loader for Dashboard Pane Transitions
const DashboardLoader = () => (
  <div className="h-full w-full flex flex-col items-center justify-center min-h-[60vh]">
    <div className="relative">
      <div className="absolute inset-0 border-4 border-red-500/20 rounded-full animate-ping"></div>
      <Loader2 className="h-10 w-10 animate-spin text-red-500 relative z-10" />
    </div>
    <span className="text-zinc-500 font-medium animate-pulse text-sm mt-4 tracking-widest uppercase">Initializing Command Center...</span>
  </div>
);

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  
  // 1. Manage User State
  const [user, setUser] = useState({ name: "Loading...", role: "guest", department: "Loading...", assigned_barangay: "all", lguName: "DisasterLink", location: "Philippines" });
  
  // States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("--:--");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [readIds, setReadIds] = useState<Set<string | number>>(() => {
    const saved = localStorage.getItem('readNotificationIds');
    if (saved) {
      try { return new Set(JSON.parse(saved)); } catch (e) {}
    }
    return new Set();
  });

  const [adminSOS, setAdminSOS] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  // 2. Fetch User & Filter Notifications on Load
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser && storedUser.name) {
      setUser({
        name: storedUser.name,
        role: storedUser.role,
        department: storedUser.department || storedUser.role.replace('_', ' '),
        assigned_barangay: storedUser.assigned_barangay || 'all',
        lguName: storedUser.lgu?.name || "LGU Command Center",
        location: storedUser.lgu?.province ? `${storedUser.lgu.name}, ${storedUser.lgu.province}` : "Command Center"
      });
    }

    const fetchLiveNotifications = async () => {
      try {
        const response = await axiosInstance.get('/incidents');
        const data = response.data.data ? response.data.data : response.data;
        const liveNotifs = data.map((inc: any) => ({
          id: `live-${inc.id}`,
          type: (inc.severity_level === 'Critical' || inc.exact_location === 'SOS EMERGENCY PING') ? 'critical' : 'warning',
          title: inc.exact_location === 'SOS EMERGENCY PING' ? 'SOS Emergency Ping' : `${inc.severity_level} ${inc.incident_type}`,
          message: `${inc.exact_location || 'Unknown Location'}${inc.details ? ` - ${inc.details}` : ''}`,
          time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          targetRole: 'all',
          targetBrgy: inc.reporting_barangay
        })).filter((n: any) => n.type === 'critical' || n.type === 'warning').slice(0, 10);

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
          const applyRead = (arr: any[]) => arr.map(n => ({...n, read: readIds.has(n.id)}));
          return [...applyRead(broadcastNotifs), ...applyRead(liveNotifs)];
        });
        
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {}
    };

    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 10000);
    
    const handleNewSOS = (e: any) => {
      const incident = e.detail;
      const isSOS = incident.incident_type === 'SOS EMERGENCY PING' || incident.severity_level === 'Critical' || incident.status === 'Direct to LDRRMO';
      
      if (isSOS) {
        setAdminSOS(incident);
        try {
          const audio = new Audio('/siren.mp3');
          audio.play().catch(() => {});
          const text = `URGENT. SOS from Barangay ${incident.reporting_barangay}, Purok ${incident.purok || 'Unknown'}. ${incident.incident_type}`;
          TextToSpeech.speak({ text, lang: 'en-US', rate: 0.9 }).catch(() => {
            if ('speechSynthesis' in window) {
              const msg = new SpeechSynthesisUtterance(text);
              window.speechSynthesis.speak(msg);
            }
          });
        } catch(err) {}
      }
    };
    
    window.addEventListener('new_sos_alert', handleNewSOS);

    return () => {
      clearInterval(interval);
      window.removeEventListener('new_sos_alert', handleNewSOS);
    };
  }, [readIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const isAdmin = user.role === 'admin' || user.role === 'mdrrmo_staff';
  const isCaptain = user.role === 'barangay_captain';

  const commandNav = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Live Map", path: "/map", icon: MapPinned },
    { name: "Incidents", path: "/reports", icon: AlertTriangle },
    { name: "Emergency Dispatch", path: "/dispatch", icon: Ambulance }, // Might map to existing reports
    { name: "Alerts", path: "/alerts", icon: BellRing },
  ];

  const monitoringNav = [
    { name: "Weather Intelligence", path: "/weather", icon: CloudRain },
    { name: "Citizen Reports", path: "/reports?filter=citizen", icon: FileText },
    { name: "Evacuation Centers", path: "/evacuation", icon: Home },
    { name: "Response Teams", path: "/admin/teams", icon: Users },
  ];

  const managementNav = [
    { name: "Personnel", path: "/admin/users", icon: ShieldCheck },
    { name: "Citizens", path: "/citizens", icon: UserCircle },
    { name: "System Settings", path: "/settings", icon: Settings },
    { name: "Audit Logs", path: "/audit", icon: FileKey },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    try { await axiosInstance.post('/logout'); } catch(e) {}
    logout(); 
    navigate("/login");
  };

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all relative ${
          isActive
            ? "bg-red-500/10 text-white"
            : "text-zinc-400 hover:bg-zinc-800/40 hover:text-white"
        }`}
      >
        {isActive && (
          <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500 rounded-r-full" />
        )}
        <Icon className={`h-4 w-4 ${isActive ? 'text-red-500' : 'text-zinc-500'}`} />
        <span className="flex-1">{item.name}</span>
        {isActive && <ChevronRight className="h-3 w-3 text-red-500/50" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0D10] text-[#F5F7FA] overflow-hidden font-sans selection:bg-red-500/30">
      
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* COMMAND CENTER SIDEBAR */}
      <aside className={`fixed md:relative z-50 w-[260px] h-full flex flex-col bg-[#111115] border-r border-[#292D34] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* LOGO AREA */}
        <div className="h-[72px] flex items-center px-6 border-b border-[#292D34] shrink-0 bg-[#0B0D10]/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-red-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(239,27,36,0.4)]">
               <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">DisasterLink</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 flex flex-col gap-6 px-3 py-6 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 px-4">Command</div>
            {isAdmin && commandNav.map((item) => <NavItem key={item.name} item={item} />)}
            {isCaptain && (
              <NavItem item={{ name: "Local Command", path: "/barangay-command", icon: LayoutDashboard }} />
            )}
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 px-4">Monitoring</div>
              {monitoringNav.map((item) => <NavItem key={item.name} item={item} />)}
            </div>
          )}

          {isAdmin && (
            <div className="space-y-1">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 px-4">Management</div>
              {managementNav.map((item) => <NavItem key={item.name} item={item} />)}
            </div>
          )}
        </nav>

        {/* BOTTOM IDENTITY */}
        <div className="p-4 border-t border-[#292D34] bg-[#0B0D10]/30 shrink-0">
          <div className="bg-[#15181D] border border-[#292D34] rounded-xl p-3 flex items-start gap-3 relative group">
            <div className="bg-zinc-800 p-2 rounded-lg shrink-0">
              <ShieldCheck className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.lguName} Command</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.location}</p>
            </div>
            <button onClick={handleLogout} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* TOP COMMAND BAR */}
        <header className="h-[72px] border-b border-[#292D34] bg-[#111115]/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30">
          
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-white p-2 bg-[#15181D] rounded-lg border border-[#292D34]">
              <Menu className="h-5 w-5" />
            </button>
            
            {/* GLOBAL SEARCH */}
            <div className="hidden md:flex items-center gap-3 bg-[#15181D] border border-[#292D34] px-4 py-2 rounded-lg w-full max-w-md focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500/50 transition-all shadow-inner">
              <Search className="h-4 w-4 text-zinc-500" />
              <input type="text" placeholder="Search reports, locations, citizens..." className="bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 w-full" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            
            {/* SYSTEM STATUS */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-medium border-r border-[#292D34] pr-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="tracking-widest uppercase text-[10px] font-black">System Live</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-zinc-500 text-[10px] uppercase">Last updated: {lastUpdated}</span>
                <span className="text-zinc-400 text-[10px] flex items-center gap-1 justify-end">
                  Auto-refresh <div className="h-3 w-6 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center p-0.5"><div className="h-1.5 w-1.5 bg-emerald-500 rounded-full ml-auto"></div></div>
                </span>
              </div>
            </div>
            
            {/* ALERT CENTER TOGGLE */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-lg border transition-all ${showNotifications ? 'bg-[#15181D] border-zinc-700 text-white shadow-inner' : 'bg-transparent border-transparent text-zinc-400 hover:bg-[#15181D] hover:border-[#292D34] hover:text-white'}`}
              >
                <BellRing className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </button>

              {/* ALERT CENTER DRAWER (Slide over from right) */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed top-[72px] bottom-0 right-0 w-[380px] bg-[#111115] border-l border-[#292D34] shadow-2xl overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-5 border-b border-[#292D34] bg-[#0B0D10]/50 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm tracking-widest text-white uppercase">Alert Center</h3>
                        <p className="text-xs text-zinc-500 mt-1">{unreadCount} active alerts requiring attention</p>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={() => setReadIds(new Set([...readIds, ...notifications.map(n => n.id)]))} className="p-2 bg-zinc-800/50 text-zinc-400 hover:text-white rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors border border-zinc-700/50 hover:border-zinc-600">
                          Clear All
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                      {notifications.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center text-zinc-600 h-full">
                          <ShieldCheck className="h-10 w-10 mb-3 opacity-20" />
                          <p className="text-sm font-medium">No active alerts.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => { setReadIds(new Set([...readIds, notif.id])); setShowNotifications(false); navigate('/reports'); }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${!notif.read ? 'bg-[#15181D] border-[#292D34] shadow-md' : 'bg-transparent border-transparent opacity-60 hover:bg-[#15181D]/50'}`}
                          >
                            <div className="flex gap-3">
                              <div className="shrink-0 mt-1">
                                {notif.type === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                                 notif.type === 'warning' ? <ShieldAlert className="h-5 w-5 text-orange-500" /> :
                                 notif.type === 'system' ? <Settings className="h-5 w-5 text-zinc-400" /> :
                                 <Info className="h-5 w-5 text-blue-500" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`text-xs font-bold uppercase tracking-wider ${notif.type === 'critical' ? 'text-red-400' : 'text-zinc-300'}`}>
                                    {notif.title}
                                  </h4>
                                  <span className="text-[10px] font-mono text-zinc-600">{notif.time}</span>
                                </div>
                                <p className="text-sm text-zinc-400 line-clamp-2 leading-snug">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* USER PROFILE */}
            <div className="flex items-center gap-3 pl-6 border-l border-[#292D34]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{user.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#15181D] border border-[#292D34] flex items-center justify-center overflow-hidden shrink-0">
                <UserCircle className="h-6 w-6 text-zinc-400" />
              </div>
            </div>

          </div>
        </header>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0">
          <Suspense fallback={<DashboardLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* ADMIN SOS ALERT POPUP */}
      <AnimatePresence>
        {adminSOS && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-red-950/90 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0B0D10] w-full max-w-lg rounded-2xl shadow-[0_0_100px_rgba(239,27,36,0.3)] overflow-hidden relative z-10 border border-red-500/30"
            >
              <div className="bg-red-500/10 p-8 text-center border-b border-red-500/20">
                <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-10 w-10 text-red-500 animate-ping absolute" />
                  <AlertTriangle className="h-10 w-10 text-red-500 relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-red-500 uppercase tracking-[0.2em]">CRITICAL SOS ALERT</h2>
                <p className="text-zinc-400 mt-2 text-sm">Immediate response required.</p>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="bg-[#15181D] p-5 rounded-xl border border-[#292D34] flex items-center gap-4">
                   <div className="p-3 bg-red-500/10 rounded-lg"><Activity className="h-6 w-6 text-red-500" /></div>
                   <div>
                     <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Incident Type</p>
                     <p className="text-white text-lg font-bold">{adminSOS.incident_type}</p>
                   </div>
                </div>
                
                <div className="bg-[#15181D] p-5 rounded-xl border border-[#292D34] flex items-center gap-4">
                   <div className="p-3 bg-zinc-800 rounded-lg"><MapPinned className="h-6 w-6 text-zinc-400" /></div>
                   <div>
                     <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Origin Location</p>
                     <p className="text-white text-lg font-bold">Barangay {adminSOS.reporting_barangay}, Purok {adminSOS.purok || 'Unknown'}</p>
                   </div>
                </div>
                
                <button 
                  onClick={() => { setAdminSOS(null); navigate('/reports'); }}
                  className="w-full mt-6 bg-red-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-xl hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-600/20"
                >
                  Acknowledge & View Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}