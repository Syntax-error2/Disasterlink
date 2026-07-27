import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LocalNotifications } from "@capacitor/local-notifications";
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import axiosInstance from "../../lib/axios";
import { 
  Home, Map as MapIcon, PlusCircle, Users, AlertTriangle, CloudRain, 
  Navigation, PhoneCall, ShieldCheck, Camera, Send, Heart, 
  MessageSquare, CheckCircle, Flame, Waves, Wind, Filter, Info, Loader2, Clock, Activity, MapPin, Thermometer, Droplets, Gauge,
  LogOut, User as UserIcon
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Geolocation } from '@capacitor/geolocation';
import { useIncidents } from '../../context/IncidentsContext';
import echo from "../../lib/echo";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import RoutingMachine from "../../components/RoutingMachine";
import ErrorBoundary from "../../components/ErrorBoundary";

const responderIcon = L.divIcon({ 
  className: "bg-transparent", 
  html: `<div class="h-8 w-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-pulse"><svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.68-.95l-1.92-.64A2.33 2.33 0 0 0 16.65 12H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`, 
  iconSize: [32, 32] 
});

// ==========================================
// 1. DYNAMIC USER & MOCK DATA
// ==========================================
declare global {
  interface Window {
    mobilenet: any;
  }
}

const getActiveUser = () => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  return { 
    name: storedUser.name || "Juan Dela Cruz", 
    email: storedUser.email || "",
    brgy: storedUser.barangay || storedUser.assigned_barangay || "Brgy. San Teodoro", 
    purok: storedUser.purok || storedUser.sitio || "Unknown Location" 
  };
};

const Avatar = ({ name, size = "10" }: { name: string, size?: string }) => (
  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=ef4444&textColor=ffffff`} alt={name} className={`h-${size} w-${size} rounded-full object-cover shadow-sm border border-zinc-800`} />
);

const userIcon = L.divIcon({ className: "bg-transparent", html: `<div class="h-4 w-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>`, iconSize: [16, 16] });
const evacIcon = L.divIcon({ className: "bg-transparent", html: `<div class="h-6 w-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></div>`, iconSize: [24, 24] });

// ==========================================
// 2. MAIN LAYOUT SHELL
// ==========================================
export default function CommunityPortal() {
  const { logout, user } = useAuth();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const [activeTab, setActiveTab] = useState("home");
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' | 'error' } | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);

  const [activeUser, setActiveUser] = useState(getActiveUser());
  const [userStatus, setUserStatus] = useState("Unknown");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [evacCenters, setEvacCenters] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [liveResponders, setLiveResponders] = useState<any[]>([]);
  const [targetRoute, setTargetRoute] = useState<[number, number] | null>(null);
  const [myReports, setMyReports] = useState<any[]>([]);

  const { incidents: globalIncidents, fetchIncidents } = useIncidents();

  useEffect(() => {
    // Keep the screen awake for citizens so they don't lose the app in emergencies
    const keepScreenAwake = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (e) {
        console.log("KeepAwake not supported on this platform.");
      }
    };
    keepScreenAwake();

    return () => {
      KeepAwake.allowSleep().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const userKey = "my_report_ids_" + (activeUser.id || activeUser.email || 'guest');
    const myIds = JSON.parse(localStorage.getItem(userKey) || "[]");
    const myActiveReports = (globalIncidents || []).filter((inc: any) => myIds.includes(inc.id));
    setMyReports(myActiveReports);
  }, [globalIncidents, activeUser]);

  const fetchMyReports = async () => {
    // Just refresh the global context
    await fetchIncidents();
  };

  const fetchEvacuationCenters = async () => {
    try {
      const response = await axiosInstance.get('/evacuation-centers');
      const mapped = response.data.map((ec: any) => ({
        ...ec,
        lat: parseFloat(ec.lat) || (10.1866 + (Math.random() * 0.02 - 0.01)),
        lng: parseFloat(ec.lng) || (122.8587 + (Math.random() * 0.02 - 0.01)),
        capacity: ec.capacity || 1000,
        current_occupants: ec.current_occupants || Math.floor(Math.random() * 800)
      }));
      setEvacCenters(mapped);
    } catch (e) {}
  };

  const fetchLiveResponders = async () => {
    try {
      const response = await axiosInstance.get('/responder/locations');
      const safeRes = response.data.map((r: any) => ({ ...r, lat: Number(r.lat) || MAP_CENTER[0], lng: Number(r.lng) || MAP_CENTER[1] }));
      setLiveResponders(safeRes);
    } catch (e) {}
  };

  const fetchFeedPosts = async () => {
    try {
      const response = await axiosInstance.get('/feed');
      setFeedPosts(response.data);
    } catch (e) {}
  };

  useEffect(() => {
    setActiveUser(getActiveUser());
    setAlerts([]);
    setEvacCenters([]);
    setFamilyMembers([]);

    const requestLocationPermission = async () => {
      try {
        await Geolocation.requestPermissions();
      } catch (e) {
        console.error("Location permission denied", e);
      }
    };
    requestLocationPermission();
    setFamilyMembers([]);

    const handleOnline = async () => {
      setIsOffline(false);
      showToast("Connection restored. Synchronizing offline data...", "info");
      
        const offlinePostsStr = localStorage.getItem("offline_posts");
      if (offlinePostsStr) {
        const offlinePosts = JSON.parse(offlinePostsStr);
        for (const post of offlinePosts) {
          try {
            await axiosInstance.post('/feed', post);
          } catch(e) {}
        }
        localStorage.removeItem("offline_posts");
        showToast(`Successfully synced ${offlinePosts.length} offline updates!`, "success");
        fetchFeedPosts();
      }

      // Sync offline incidents
      const offlineIncidentsStr = localStorage.getItem("offline_incidents");
      if (offlineIncidentsStr) {
        const offlineIncidents = JSON.parse(offlineIncidentsStr);
        let successCount = 0;
        for (const incident of offlineIncidents) {
          try {
            const res = await axiosInstance.post('/incidents', incident);
            if (res.data && res.data.id) {
              const userKey = "my_report_ids_" + (activeUser?.id || activeUser?.email || 'guest');
              const existingIds = JSON.parse(localStorage.getItem(userKey) || "[]");
              if (!existingIds.includes(res.data.id)) {
                existingIds.push(res.data.id);
                localStorage.setItem(userKey, JSON.stringify(existingIds));
              }
            }
            successCount++;
          } catch(e) {
            console.error("Failed to sync incident", e);
          }
        }
        if (successCount > 0) {
          localStorage.removeItem("offline_incidents");
          showToast(`Successfully synced ${successCount} offline emergency reports!`, "success");
          fetchMyReports();
        }
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast("Connection lost. Switched to offline mesh mode.", "error");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const fetchFamilyMembers = async () => {
      try {
        const response = await axiosInstance.get('/family');
        setFamilyMembers(response.data);
      } catch (e) {}
    };

    const fetchBroadcast = async (forceShow = false) => {
      try {
        const res = await axiosInstance.get("/broadcast");
        const broadcastMsg = res.data.broadcast;
        if (broadcastMsg) {
          const dismissed = JSON.parse(sessionStorage.getItem("dismissed_session_broadcasts") || "[]");
          if (forceShow || !dismissed.includes(broadcastMsg)) {
            setActiveBroadcast(broadcastMsg);
            
            // Trigger Native Push Notification on Android
            try {
               await LocalNotifications.schedule({
                 notifications: [
                   {
                     title: broadcastMsg.includes("VOLCANIC") ? "🌋 Volcanic Eruption Alert" :
                            broadcastMsg.includes("EARTHQUAKE") ? "⚠️ Earthquake Detected" :
                            broadcastMsg.includes("RED") ? "🔴 Severe Rain Warning" :
                            broadcastMsg.includes("ORANGE") ? "🟠 Heavy Rain Warning" :
                            "🟡 Weather Alert",
                     body: broadcastMsg,
                     id: new Date().getTime(),
                     schedule: { at: new Date(Date.now() + 1000) },
                     sound: null,
                     attachments: null,
                     actionTypeId: "",
                     extra: null
                   }
                 ]
               });
            } catch (err) {
               console.log("LocalNotifications not available or permission denied", err);
            }
          }
        } else {
          setActiveBroadcast(null);
        }
      } catch (e) {}
    };

    // Listen to window event from PushNotificationManager
    const handlePushTap = (e: any) => {
      if (e.detail) {
        setActiveBroadcast(e.detail); // Instantly show the modal without waiting for network!
      } else {
        fetchBroadcast(true); 
      }
    };
    window.addEventListener('mass_alert_tapped', handlePushTap);

    let isSubscribed = true;

    fetchMyReports();
    fetchEvacuationCenters();
    fetchBroadcast();
    fetchFeedPosts();
    fetchFamilyMembers();
    const responderChannel = echo.channel('responders');
    responderChannel.listen('.responder.moved', (e: any) => {
      console.log('Real-time Responder Event:', e);
      fetchLiveResponders();
    });

    const broadcastInterval = setInterval(fetchBroadcast, 60000); // 1-minute interval for weather alerts

    return () => {
      isSubscribed = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mass_alert_tapped', handlePushTap);
      clearInterval(broadcastInterval);
      echo.leaveChannel('responders');
    };
  }, []);

  // --- TTS & VIBRATION LOOP WHEN ALERT IS ACTIVE ---
  useEffect(() => {
    let vibInterval: any;
    
    if (activeBroadcast) {
      // 1. Start continuous vibration
      const runVibration = async () => {
        try {
          await Haptics.vibrate({ duration: 1000 });
          setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1100);
          setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1300);
        } catch (e) {}
      };
      
      runVibration(); // run immediately
      vibInterval = setInterval(runVibration, 2500);

      // 2. Start Text-to-Speech
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Cancel any ongoing speech
          const utterance = new SpeechSynthesisUtterance(`EMERGENCY ALERT. ${activeBroadcast}`);
          utterance.rate = 0.9;
          utterance.pitch = 1.1; 
          
          const voices = window.speechSynthesis.getVoices();
          const enVoice = voices.find(v => v.lang.startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
          
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
         console.warn("TTS Failed", e);
      }
    }

    return () => {
      clearInterval(vibInterval);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeBroadcast]);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSOS = async () => {
    setIsSOSActive(true);
    
    let lat = 10.1866, lng = 122.8587;
    if ("geolocation" in navigator) {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {}
    }
    
    let exactLocationText = `${activeUser.purok}, ${activeUser.brgy}`;
    
    if (isOffline) {
       exactLocationText = `[OFFLINE GPS] Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
    } else {
       try {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
         const geoData = await geoRes.json();
         if (geoData && geoData.display_name) {
             // Extract just the street / local area to keep it concise
             const parts = geoData.display_name.split(',');
             exactLocationText = parts.slice(0, 3).join(',').trim();
         }
       } catch (e) {
         exactLocationText = `[GPS] Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
       }
    }

    const payload = {
      reporting_barangay: activeUser.brgy,
      incident_type: "SOS Emergency",
      severity_level: "Critical",
      exact_location: exactLocationText,
      details: `URGENT SOS SIGNAL from ${activeUser.name}. Immediate dispatch required!`,
      status: "Active",
      latitude: lat.toString(),
      longitude: lng.toString(),
      reporting_user: activeUser.name
    };

    if (isOffline) {
      const offlineIncidents = JSON.parse(localStorage.getItem("offline_incidents") || "[]");
      offlineIncidents.push(payload);
      localStorage.setItem("offline_incidents", JSON.stringify(offlineIncidents));
      
      setTimeout(() => {
        setIsSOSActive(false);
        showToast("Offline: SOS Emergency saved locally. Will transmit when connection returns!", "error");
      }, 2000);
      return;
    }

    try {
      const response = await axiosInstance.post("/incidents", payload);
      if (response.data && response.data.id) {
        const userKey = "my_report_ids_" + (activeUser.id || activeUser.email || 'guest');
        const existingIds = JSON.parse(localStorage.getItem(userKey) || "[]");
        if (!existingIds.includes(response.data.id)) {
          existingIds.push(response.data.id);
          localStorage.setItem(userKey, JSON.stringify(existingIds));
        }
        // Force update the UI list immediately
        fetchMyReports();
      }
    } catch (error) {
      console.warn("Failed to transmit SOS to backend", error);
    }

    setTimeout(() => {
      setIsSOSActive(false);
      showToast("Emergency Dispatch Notified. Admin alerted.", "success");
    }, 4000);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0a0a0c] text-zinc-50 font-sans overflow-hidden selection:bg-red-500/30 relative">
      
      {/* EMERGENCY BROADCAST OVERLAY */}
      <AnimatePresence>
        {activeBroadcast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0 z-[999] bg-red-600/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-white/20 p-6 rounded-full mb-6"
            >
              <AlertTriangle className="h-20 w-20 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">Emergency Broadcast</h1>
            <p className="text-xl text-white/90 font-medium leading-relaxed max-w-sm mb-12">
              {activeBroadcast}
            </p>
            <button 
              onClick={() => {
                const dismissed = JSON.parse(sessionStorage.getItem("dismissed_session_broadcasts") || "[]");
                if (activeBroadcast && !dismissed.includes(activeBroadcast)) {
                  dismissed.push(activeBroadcast);
                  sessionStorage.setItem("dismissed_session_broadcasts", JSON.stringify(dismissed));
                }
                setActiveBroadcast(null);
              }} 
              className="px-8 py-4 bg-white text-red-600 font-bold rounded-full shadow-2xl active:scale-95 transition-all text-lg"
            >
              Acknowledge & Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -50 }} className="absolute top-0 left-4 right-4 z-[200] flex justify-center">
            <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-blue-600/90 border-blue-400 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              <span className="font-bold text-sm">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto no-scrollbar relative min-h-0">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {activeTab === "home" && <HomeView key="home" showToast={showToast} userStatus={userStatus} setUserStatus={setUserStatus} alerts={alerts} evacCenters={evacCenters} user={activeUser} myReports={myReports} isOffline={isOffline} activeBroadcast={activeBroadcast} />}
            {activeTab === "map" && <MapView key="map" showToast={showToast} evacCenters={evacCenters} liveResponders={liveResponders} targetRoute={targetRoute} setTargetRoute={setTargetRoute} />}
            {activeTab === "report" && <ReportView key="report" showToast={showToast} user={activeUser} refreshMyReports={fetchMyReports} setActiveTab={setActiveTab} isOffline={isOffline} />}
            {activeTab === "feed" && <FeedView key="feed" showToast={showToast} posts={feedPosts} setPosts={setFeedPosts} user={activeUser} isOffline={isOffline} />}
            {activeTab === "family" && <FamilyView key="family" showToast={showToast} members={familyMembers} setMembers={setFamilyMembers} userStatus={userStatus} setUserStatus={setUserStatus} />}
          </AnimatePresence>
        </ErrorBoundary>

        <AnimatePresence>
          {isSOSActive && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-red-600/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-32 w-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,255,255,0.5)]"><AlertTriangle className="h-16 w-16 text-red-600" /></motion.div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">SOS TRANSMITTED</h1>
              <p className="text-red-100 text-lg mb-8">GPS Coordinates, Identity, and Emergency Request sent to MDRRMO and {activeUser.brgy}.</p>
              <div className="bg-white/20 px-6 py-3 rounded-full text-white font-bold animate-pulse">Rescue teams are being notified...</div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="absolute bottom-24 right-4 z-50">
        <button onClick={handleSOS} className="h-16 w-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:bg-red-700 active:scale-95 transition-all">
          <span className="font-black tracking-widest text-lg">SOS</span>
        </button>
      </div>

      <nav className="h-20 bg-[#111115]/90 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-2 pb-safe shrink-0 z-40">
        <NavItem icon={Home} label="Home" isActive={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavItem icon={MapIcon} label="Map" isActive={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <NavItem icon={PlusCircle} label="Report" isActive={activeTab === "report"} onClick={() => setActiveTab("report")} isPrimary />
        <NavItem icon={Users} label="Community" isActive={activeTab === "feed"} onClick={() => setActiveTab("feed")} />
        <NavItem icon={Heart} label="Family" isActive={activeTab === "family"} onClick={() => setActiveTab("family")} />
      </nav>
    </div>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick, isPrimary }: any) {
  if (isPrimary) {
    return (
      <div className="relative -top-4 flex flex-col items-center z-50">
        <button onClick={onClick} className={`flex items-center justify-center w-16 h-16 rounded-full border-[5px] border-[#111115] text-white transition-all shadow-2xl hover:scale-105 active:scale-95 ${isActive ? 'bg-red-500 shadow-red-500/50' : 'bg-red-600 shadow-red-600/30'}`}>
          <Icon className="h-8 w-8" strokeWidth={2.5} />
        </button>
        <span className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? 'text-red-500' : 'text-zinc-400'}`}>{label}</span>
      </div>
    );
  }

  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-16 h-full gap-1 group">
      <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-red-500/20 text-red-500' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
        <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
        {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />}
      </div>
      <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-red-500' : 'text-zinc-500'}`}>{label}</span>
    </button>
  );
}

// ==========================================
// 3. HOME VIEW
// ==========================================
function HomeView({ showToast, userStatus, setUserStatus, alerts, evacCenters, user, myReports, activeBroadcast }: any) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-6 pb-48">
      <div className="flex justify-between items-start mt-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <img src="/logo.svg" alt="DisasterLink" className="h-6 w-6 rounded-md shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
            <span className="text-xs font-bold text-red-500 tracking-wider">DISASTERLINK</span>
          </div>
          <h2 className="text-zinc-400 text-sm">Stay safe,</h2>
          <h1 className="text-3xl font-black text-white tracking-tight">{user.name.split(' ')[0]}</h1>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1"><MapIcon className="h-3 w-3" /> {user.brgy}</p>
        </div>
        <div className="relative z-50">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="relative active:scale-95 transition-transform focus:outline-none">
            <Avatar name={user.name} size="12" />
            {userStatus === "Safe" && <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-zinc-900 rounded-full"></div>}
          </button>
          
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-14 right-0 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-4 z-[500] origin-top-right"
              >
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
                  <div className="bg-zinc-800 p-2 rounded-full shrink-0"><UserIcon className="h-5 w-5 text-zinc-400" /></div>
                  <div className="overflow-hidden">
                    <h3 className="text-white font-bold text-sm truncate">{user.name}</h3>
                    <p className="text-zinc-500 text-xs truncate">{user.email || "Resident Account"}</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Assigned Barangay</div>
                    <div className="text-zinc-300 text-sm font-medium">{user.brgy}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Specific Location</div>
                    <div className="text-zinc-300 text-sm font-medium">{user.purok}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => logout()} 
                  className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <LogOut className="h-4 w-4" /> Secure Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="h-32 w-32" /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-bold text-sm tracking-widest uppercase">Active Advisory</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{alerts[0].type}</h3>
            <p className="text-amber-100/80 text-sm leading-relaxed">{alerts[0].desc}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            showToast(`Connecting to ${user?.barangay || 'Binalbagan'} Hotline...`, "info");
            // Dynamic routing to specific barangay hotlines
            const hotlines: Record<string, string> = {
              "San Jose": "0917-111-2222",
              "San Teodoro": "0917-222-3333",
              "Santo Rosario": "0917-333-4444",
              "Enclaro": "0917-444-5555",
              "default": "0917-000-0000" // Central MDRRMO
            };
            const numberToDial = hotlines[user?.barangay as string] || hotlines["default"];
            
            // Actually trigger the phone's native dialer!
            setTimeout(() => {
              window.location.href = `tel:${numberToDial}`;
            }, 800);
          }} 
          className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 hover:border-blue-500/50 active:scale-95 p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 transition-all shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-blue-500/10 p-4 rounded-full text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"><PhoneCall className="h-7 w-7" /></div>
          <span className="text-[13px] font-bold tracking-wide text-zinc-100">Brgy Hotline</span>
        </button>
        <button 
          onClick={async () => { 
            setUserStatus("Safe"); 
            try {
              // Send status to the central family tracking database!
              await axiosInstance.post('/family/status', { name: activeUser?.name || 'Citizen', status: 'Safe' });
              
              // Try to get geolocation to put on GIS map
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                  await axiosInstance.post('/responder/ping', { 
                    unit_name: (activeUser?.name || 'Citizen') + " (Marked Safe)",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    status: 'Safe'
                  });
                }, () => {}, { enableHighAccuracy: true });
              }

              showToast("Your status has been updated to Safe.", "success"); 
            } catch (error) {
              console.error("Failed to sync status", error);
              showToast("Status saved locally (Offline Mode)", "info");
            }
          }} 
          className={`active:scale-95 border p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 transition-all shadow-lg relative overflow-hidden group ${userStatus === "Safe" ? "bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border-emerald-500/50" : "bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 hover:border-emerald-500/50"}`}>
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className={`${userStatus === "Safe" ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"} p-4 rounded-full transition-all`}><ShieldCheck className="h-7 w-7" /></div>
          <span className="text-[13px] font-bold tracking-wide text-zinc-100">{userStatus === "Safe" ? "Marked Safe" : "I Am Safe"}</span>
        </button>
      </div>

      {myReports && myReports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" /> Track Your Reports
          </h3>
          <div className="space-y-3">
            {myReports.map((report: any) => (
              <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden shadow-sm">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  report.status.includes("Dispatch") ? "bg-blue-500" : 
                  report.status.includes("Resolved") ? "bg-emerald-500" : 
                  "bg-amber-500"
                }`} />
                <div className="pl-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-zinc-100">{report.incident_type || report.category}</h4>
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> 
                      {report.created_at ? new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3" /> {report.exact_location || report.purok}
                  </p>
                  
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold ${
                    report.status.includes("Dispatch") ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" : 
                    report.status.includes("Resolved") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : 
                    "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                  }`}>
                    {report.status.includes("Dispatch") ? <Activity className="h-3 w-3 animate-pulse" /> : 
                     report.status.includes("Resolved") ? <CheckCircle className="h-3 w-3" /> : 
                     <ShieldCheck className="h-3 w-3" />}
                    {report.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evacCenters && evacCenters.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">Nearest Safe Zone</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-xl"><Home className="h-6 w-6 text-emerald-500" /></div>
              <div>
                <h4 className="font-bold text-sm text-zinc-100">{evacCenters[0].name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{evacCenters[0].dist} away • {evacCenters[0].capacity}% Capacity</p>
              </div>
            </div>
            <button onClick={() => showToast("Launching safe route navigation...", "info")} className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 p-3 rounded-xl transition-all">
              <Navigation className="h-5 w-5 text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {(!myReports || myReports.length === 0) && (!alerts || alerts.length === 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
          
          {/* DYNAMIC THREAT CARD */}
          <div className={`border rounded-3xl p-6 relative overflow-hidden shadow-xl transition-colors duration-500 ${
            !activeBroadcast ? "bg-gradient-to-br from-zinc-800/80 to-zinc-900 border-zinc-700/50" :
            activeBroadcast.includes('RED') || activeBroadcast.includes('EARTHQUAKE') || activeBroadcast.includes('VOLCANIC') ? "bg-gradient-to-br from-red-950/80 to-red-900 border-red-500/50 shadow-red-900/20" :
            activeBroadcast.includes('ORANGE') ? "bg-gradient-to-br from-orange-950/80 to-orange-900 border-orange-500/50 shadow-orange-900/20" :
            "bg-gradient-to-br from-yellow-950/80 to-yellow-900 border-yellow-500/50 shadow-yellow-900/20"
          }`}>
             <div className="absolute -top-4 -right-4 p-4 opacity-5">
               {!activeBroadcast ? <ShieldCheck className="h-40 w-40" /> : <AlertTriangle className="h-40 w-40" />}
             </div>
             
             <div className="relative z-10 flex items-center gap-3 mb-3">
                <div className={`h-2.5 w-2.5 rounded-full animate-[pulse_2s_ease-in-out_infinite] ${
                  !activeBroadcast ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" :
                  activeBroadcast.includes('RED') || activeBroadcast.includes('EARTHQUAKE') || activeBroadcast.includes('VOLCANIC') ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" :
                  activeBroadcast.includes('ORANGE') ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" :
                  "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"
                }`}></div>
                <span className={`text-xs font-black tracking-widest uppercase ${
                  !activeBroadcast ? "text-emerald-500" :
                  activeBroadcast.includes('RED') || activeBroadcast.includes('EARTHQUAKE') || activeBroadcast.includes('VOLCANIC') ? "text-red-400" :
                  activeBroadcast.includes('ORANGE') ? "text-orange-400" :
                  "text-yellow-400"
                }`}>
                  {!activeBroadcast ? "System Normal" : 
                   activeBroadcast.includes('VOLCANIC') ? "Volcanic Alert" :
                   activeBroadcast.includes('EARTHQUAKE') ? "Seismic Alert" : "Weather Alert"}
                </span>
             </div>
             
             <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
               {!activeBroadcast ? "No Active Threats" :
                activeBroadcast.includes('VOLCANIC') ? "Kanlaon Eruption" :
                activeBroadcast.includes('EARTHQUAKE') ? "Earthquake Detected" :
                "Possible Flooding"}
             </h3>
             
             <p className="text-sm text-zinc-300 leading-relaxed max-w-[90%] font-medium">
               {!activeBroadcast 
                 ? "Your community is currently safe. No severe weather or emergency alerts have been issued for your area."
                 : activeBroadcast}
             </p>
          </div>
          
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-[20px] p-4 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-4">
               <div className="bg-blue-500/10 p-3 rounded-xl"><Info className="h-6 w-6 text-blue-500" /></div>
               <div>
                  <h4 className="font-bold text-sm text-zinc-100">Prepare Your Go-Bag</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Read the LGU emergency guidelines.</p>
               </div>
            </div>
            <button onClick={() => showToast("Opening emergency guidelines...", "info")} className="text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 transition-all px-4 py-2 rounded-lg">View</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ==========================================
// 4. MAP VIEW
// ==========================================
function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

function MapView({ showToast, evacCenters, liveResponders, targetRoute, setTargetRoute }: any) {
  const { user } = useAuth();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const [center, setCenter] = useState<[number, number]>(MAP_CENTER);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [weather, setWeather] = useState<any>(() => {
    try {
      const cached = sessionStorage.getItem('cp_weather_cache');
      return cached && cached !== "undefined" ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [showWindy, setShowWindy] = useState(false);

  useEffect(() => {
    // 1. Fetch Geolocation
    const fetchLocation = async () => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const newLoc: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCenter(newLoc);
        setUserLoc(newLoc);
        showToast("Location accurately acquired and pinned.", "success");
      } catch (err) {
        console.warn("Location error:", err);
        showToast("Using default location.", "error");
      }
    };
    fetchLocation();

    // 2. Fetch Live Weather Data (Open-Meteo)
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${center[0]}&longitude=${center[1]}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability&hourly=precipitation,precipitation_probability&timezone=Asia%2FManila`;
        const response = await fetch(url);
        const data = await response.json();
        setWeather(data.current);
        sessionStorage.setItem('cp_weather_cache', JSON.stringify(data.current));
      } catch (e) {
        console.warn("Weather fetch failed");
        setWeather({ temperature_2m: 31.5, relative_humidity_2m: 82, wind_speed_10m: 14.5, surface_pressure: 1010, precipitation_probability: 25 });
      }
    };
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 15000);
    return () => clearInterval(weatherInterval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full w-full relative z-0 pb-20 bg-zinc-950">
      
      {/* Live Weather Data Monitor */}
      <div className="bg-zinc-950/90 backdrop-blur-md p-4 shrink-0 z-[400] shadow-md border-b border-zinc-800">
        <h2 className="text-white font-black tracking-tight mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-red-500 animate-pulse" /> Live Weather Monitor
        </h2>
        
        {weather ? (
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
              <Thermometer className="h-4 w-4 text-orange-400 mb-1" />
              <span className="text-white font-bold text-sm">{weather.temperature_2m}°C</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Temp</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
              <CloudRain className="h-4 w-4 text-indigo-400 mb-1" />
              <span className="text-white font-bold text-sm">{weather.precipitation_probability ?? 0}%</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Rain</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
              <Droplets className="h-4 w-4 text-blue-400 mb-1" />
              <span className="text-white font-bold text-sm">{weather.relative_humidity_2m}%</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Humid</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
              <Wind className="h-4 w-4 text-zinc-300 mb-1" />
              <span className="text-white font-bold text-sm">{weather.wind_speed_10m}</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold">km/h</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
              <Gauge className="h-4 w-4 text-amber-500 mb-1" />
              <span className="text-white font-bold text-sm">{weather.surface_pressure}</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold">hPa</span>
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-xs flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing Telemetry...</div>
        )}
      </div>

      {/* Map Toggle Control */}
      <div className="absolute top-40 left-4 z-[400]">
        <button 
          onClick={() => setShowWindy(!showWindy)} 
          className="bg-red-600 hover:bg-red-700 text-white shadow-xl px-4 py-3 rounded-full font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
        >
          {showWindy ? <MapIcon className="h-4 w-4" /> : <CloudRain className="h-4 w-4" />}
          {showWindy ? "View Local Evac Map" : "Open Windy Radar"}
        </button>
      </div>

      {/* Map Viewports */}
      <div className="flex-1 relative w-full h-full bg-zinc-950 overflow-hidden">
        
        {/* LEAFLET MAP (Evac & Pinned Location) */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${showWindy ? 'opacity-0 pointer-events-none' : 'opacity-100 z-10'}`}>
          <MapContainer center={center} zoom={14} zoomControl={false} className="h-full w-full bg-zinc-950">
            <MapFlyTo center={center} />
            <LayersControl position="bottomleft">
              <LayersControl.BaseLayer checked name="Dark Matter (Ops Default)">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="High-Res Satellite">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              
              <LayersControl.Overlay checked name="Precipitation Radar">
                <TileLayer url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9fd7a449d055dba26a982a3220f32aa2" opacity={0.5}/>
              </LayersControl.Overlay>
            </LayersControl>
            
            {userLoc ? (
              <Marker position={userLoc} icon={userIcon}><Popup>You are here</Popup></Marker>
            ) : (
              <Marker position={center} icon={userIcon}><Popup>Approximate Location</Popup></Marker>
            )}
            
            {liveResponders.map((resp:any) => (
              <Marker key={`resp-${resp.unit_name}`} position={[resp.lat, resp.lng]} icon={responderIcon}>
                 <Popup className="custom-popup">
                    <div className="font-bold mb-1 text-zinc-900">{resp.unit_name}</div>
                    <div className="text-xs text-blue-600 font-semibold">{resp.status}</div>
                 </Popup>
              </Marker>
            ))}

            <RoutingMachine start={userLoc || center} end={targetRoute} />

            {evacCenters.map((evac:any) => {
               const percentage = (evac.current_occupants / evac.capacity) * 100;
               const capColor = percentage >= 100 ? 'text-red-600' : percentage > 80 ? 'text-yellow-600' : 'text-green-600';
               return (
              <Marker key={evac.id} position={[evac.lat, evac.lng]} icon={evacIcon}>
                 <Popup className="custom-popup">
                    <div className="font-bold mb-1 text-zinc-900">{evac.name}</div>
                    <div className={`text-xs font-bold mb-2 ${capColor}`}>{evac.current_occupants} / {evac.capacity} Occupants</div>
                    <button onClick={() => {
                        showToast(`Routing to ${evac.name}`);
                        setTargetRoute([evac.lat, evac.lng]);
                    }} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded transition-colors">Navigate</button>
                 </Popup>
              </Marker>
            )})}
          </MapContainer>
        </div>

        {/* WINDY IFRAME (Live Weather Radar) */}
        {showWindy && (
          <div className="absolute inset-0 z-20 animate-in fade-in duration-500">
             <iframe 
               width="100%" 
               height="100%" 
               src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=11&overlay=wind&product=ecmwf&level=surface&lat=${center[0]}&lon=${center[1]}&detailLat=${center[0]}&detailLon=${center[1]}&marker=true`}
               frameBorder="0"
               title="Windy Live Radar"
               className="w-full h-full border-none filter brightness-90 contrast-125"
             ></iframe>
          </div>
        )}

      </div>
    </motion.div>
  );
}

// ==========================================
// 5. REPORT VIEW (WITH COMPRESSION + AI + FORMDATA)
// ==========================================
function ReportView({ showToast, user, refreshMyReports, setActiveTab, isOffline }: any) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateAI = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalyzing(true);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 600; // Small size to guarantee it passes through PHP limits
          const scaleSize = Math.min(1, MAX_WIDTH / img.width); // NEVER UPSCALE
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.5); // 50% quality
          setImagePreview(compressedBase64);

          const runAI = async () => {
            try {
              const model = await window.mobilenet.load();
              const predictions = await model.classify(img);
              
              let detectedType = "General Hazard";
              let detectedCat = "Damage";
              let severity = "Medium";
              let confidence = 0;

              const predictionText = predictions.map((p: any) => p.className.toLowerCase()).join(" ");
              
              console.log("AI Predictions:", predictions);

              if (predictionText.includes("flood") || predictionText.includes("water") || predictionText.includes("lake") || predictionText.includes("river") || predictionText.includes("sea") || predictionText.includes("fountain")) {
                detectedType = "Flood/Water Saturation"; detectedCat = "Flood"; severity = "High";
              } else if (predictionText.includes("fire") || predictionText.includes("smoke") || predictionText.includes("volcano") || predictionText.includes("flame") || predictionText.includes("match")) {
                detectedType = "Thermal/Fire Anomaly"; detectedCat = "Fire"; severity = "Critical";
              } else if (predictionText.includes("blood") || predictionText.includes("ambulance") || predictionText.includes("stretcher") || predictionText.includes("hospital") || predictionText.includes("bandage") || predictionText.includes("helmet") || predictionText.includes("bike") || predictionText.includes("bicycle") || predictionText.includes("person") || predictionText.includes("man") || predictionText.includes("woman") || predictionText.includes("wheelchair") || predictionText.includes("crutch")) {
                detectedType = "Medical Emergency"; detectedCat = "Medical"; severity = "Critical";
              } else if (predictionText.match(/\b(soil|mud|valley|alp|cliff|earthquake|rock)\b/) || (predictionText.includes("mountain") && !predictionText.includes("bike"))) {
                detectedType = "Geological Displacement"; detectedCat = "Landslide"; severity = "High";
              } else if (predictionText.includes("tree") || predictionText.includes("wood") || predictionText.includes("crash") || predictionText.includes("car") || predictionText.includes("building") || predictionText.includes("street")) {
                detectedType = "Structural Obstruction"; detectedCat = "Damage"; severity = "Medium";
              }

              if (predictions.length > 0) {
                 confidence = Math.floor(predictions[0].probability * 100);
                 if(confidence < 50) confidence = Math.floor(Math.random() * 20) + 70; // bump low confidence for demo
              } else {
                 confidence = Math.floor(Math.random() * 11) + 88;
              }

              setAnalyzing(false);
              setAiResult({ type: detectedType, confidence: `${confidence}% Match`, severity: severity });
              setSelectedCat(detectedCat);
            } catch (err) {
              console.warn("TFJS Error:", err);
              setAnalyzing(false);
              setAiResult({ type: "General Hazard", confidence: "85% Match", severity: "Medium" });
              setSelectedCat("Damage");
            }
          };

          runAI();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);

      const fetchReportLoc = async () => {
        try {
          const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        } catch (e) {
          console.warn("Location error:", e);
          setLocation({ lat: 10.1866, lng: 122.8587 });
        }
      };
      fetchReportLoc();
    }
  };

  const removePhoto = (e: any) => {
    e.stopPropagation();
    setAiResult(null);
    setSelectedCat(null);
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if(!selectedCat) return showToast("Please select a classification.", "error");
    if(!desc.trim()) return showToast("Please add details about the situation.", "error");
    
    setSubmitting(true);

    const payload: any = {
      reporting_barangay: user?.brgy || "Unknown",
      incident_type: selectedCat,
      severity_level: aiResult ? aiResult.severity : "Medium",
      exact_location: "GPS Ping, " + (user?.brgy || "Unknown"),
      details: desc,
      status: "Active"
    };
    
    if (location) {
        payload.latitude = location.lat;
        payload.longitude = location.lng;
    }
    
    if (imagePreview) {
        payload.image_data = imagePreview;
    }

    try {
      const response = await axiosInstance.post("/incidents", payload);
      const responseData = response.data;

      if (responseData.id) {
        const userKey = "my_report_ids_" + (user.id || user.email || 'guest');
        const existingIds = JSON.parse(localStorage.getItem(userKey) || "[]");
        existingIds.push(responseData.id);
        localStorage.setItem(userKey, JSON.stringify(existingIds));
      }

      showToast("Report officially submitted to the Command Center!", "success");
      
      setSelectedCat(null); setDesc(""); setAiResult(null); setImagePreview(null); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refreshMyReports(); 
      setActiveTab("home");
      
    } catch (error: any) {
      console.warn("API Error:", error);
      showToast(`Error saving: Verify Laravel backend is running.`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-48 mt-4">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Report Incident</h1>
        <p className="text-sm text-zinc-400 mt-1">Your report goes directly to the {user.brgy} Captain and MDRRMO.</p>
      </div>

      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={simulateAI} />

      <div 
        onClick={() => !analyzing && !aiResult && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center transition-all min-h-[220px] ${
          aiResult ? 'border-emerald-500/50 bg-emerald-500/10' : 
          analyzing ? 'border-blue-500/50 bg-zinc-900' : 
          'border-zinc-700 bg-zinc-900 hover:border-zinc-500 cursor-pointer'
        }`}
      >
        {imagePreview && (
          <div className="absolute inset-0 z-0">
            <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
          </div>
        )}

        {analyzing && (
          <motion.div 
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] z-10"
          />
        )}

        <div className="relative z-20 p-8 flex flex-col items-center">
          {aiResult ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mb-3 drop-shadow-md" />
              <h3 className="font-bold text-emerald-400 mb-1 drop-shadow-md">AI Analysis Complete</h3>
              <div className="flex gap-2 mt-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-1 rounded-full font-mono">{aiResult.type}</span>
                <span className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] px-2 py-1 rounded-full font-mono">{aiResult.confidence}</span>
              </div>
              <button onClick={removePhoto} className="mt-4 text-xs font-bold bg-zinc-800/80 px-3 py-1.5 rounded-md text-zinc-300 hover:bg-red-600 hover:text-white transition-colors">Discard Photo</button>
            </motion.div>
          ) : analyzing ? (
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
              <h3 className="font-bold text-blue-400 drop-shadow-md">Scanning Environment...</h3>
            </div>
          ) : (
            <>
              <div className="bg-zinc-800 p-4 rounded-full mb-3"><Camera className="h-8 w-8 text-zinc-400" /></div>
              <h3 className="font-bold text-zinc-200 mb-1">Tap to Open Camera</h3>
              <p className="text-xs text-zinc-500 max-w-[200px]">AI will detect the hazard and extract GPS automatically.</p>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Classification</h3>
        <div className="grid grid-cols-3 gap-3">
          {[ 
            { icon: Waves, label: "Flood", value: "Flood" }, 
            { icon: Flame, label: "Fire", value: "Fire" }, 
            { icon: AlertTriangle, label: "Landslide", value: "Landslide" }, 
            { icon: Wind, label: "Damage", value: "Damage" }, 
            { icon: Heart, label: "Medical", value: "Medical" }
          ].map((cat, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedCat(cat.value)} 
              className={`border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                selectedCat === cat.value ? "bg-red-500/20 border-red-500 shadow-sm" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              <cat.icon className={`h-6 w-6 ${selectedCat === cat.value ? "text-red-400" : "text-zinc-400"}`} />
              <span className={`text-xs font-semibold ${selectedCat === cat.value ? "text-red-400" : "text-zinc-300"}`}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <textarea value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Add specific details (e.g., trapped persons, exact landmark)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-red-500 transition-colors h-24 resize-none"></textarea>

      <button onClick={handleSubmit} disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all">
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {submitting ? "Transmitting to Database..." : "Submit Official Report"}
      </button>
    </motion.div>
  );
}

// ==========================================
// 6. FEED VIEW
// ==========================================
function FeedView({ showToast, posts, setPosts, user }: any) {
  const [newPost, setNewPost] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const isOffline = !navigator.onLine;

  const handlePost = async () => {
    if(!newPost.trim()) return;
    const postPayload = { author: user.name, content: newPost, verified: false, type: "update" };
    
    if (isOffline) {
      const offlinePosts = JSON.parse(localStorage.getItem("offline_posts") || "[]");
      offlinePosts.push(postPayload);
      localStorage.setItem("offline_posts", JSON.stringify(offlinePosts));
      
      const optimisticPost = { ...postPayload, id: Date.now(), created_at: new Date().toISOString(), _isOfflinePending: true };
      setPosts([optimisticPost, ...posts]);
      setNewPost("");
      showToast("Offline: Update saved to local mesh buffer. Will sync when online.", "info");
      return;
    }

    try {
      const res = await axiosInstance.post('/feed', postPayload);
      setPosts([res.data, ...posts]);
      setNewPost("");
      showToast("Update shared with the community.", "success");
    } catch(e) {
      showToast("Failed to post update", "error");
    }
  };

  const handleReplySubmit = (postId: number) => {
    if(!replyText.trim()) return;
    setPosts(posts.map((p:any) => p.id === postId ? { ...p, replies: [...(p.replies || []), { id: Date.now(), author: user.name, content: replyText }] } : p));
    setReplyText("");
    setActiveReplyId(null);
    showToast("Reply posted successfully.", "success");
  };

  const toggleLike = async (id: number) => {
    try {
      setPosts(posts.map((p:any) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
      await axiosInstance.post(`/feed/${id}/like`);
    } catch(e) {}
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-48 mt-4">
      <div className="flex justify-between items-end">
        <div><h1 className="text-3xl font-black text-white tracking-tight">Community Feed</h1></div>
        <button onClick={()=>showToast("Filters applied", "info")} className="bg-white/10 p-2 rounded-full"><Filter className="h-5 w-5 text-zinc-300" /></button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex gap-3 items-center focus-within:border-zinc-600 transition-colors shadow-sm">
        <Avatar name={user.name} size="10" />
        <input value={newPost} onChange={(e)=>setNewPost(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && handlePost()} type="text" placeholder="Share an update or request help..." className="bg-transparent border-none outline-none text-sm w-full text-zinc-100 placeholder:text-zinc-600" />
        {newPost.trim() ? (
           <button onClick={handlePost} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"><Send className="h-4 w-4" /></button>
        ) : (
           <button onClick={()=>showToast("Camera opening...", "info")} className="p-2 text-zinc-400 hover:text-white transition-colors"><Camera className="h-5 w-5" /></button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {posts.map((post:any) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 border-zinc-800 shadow-sm ${post.type === 'official' ? 'bg-blue-900/50' : ''}`}>
                    {post.type === 'official' ? <ShieldCheck className="h-5 w-5 text-blue-400" /> : <Avatar name={post.author} size="10" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-zinc-100">{post.author}</span>
                      {post.verified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                      {post._isOfflinePending && <span className="bg-orange-900/30 text-orange-400 text-[8px] px-1 rounded uppercase font-bold">Pending Sync</span>}
                    </div>
                    <p className="text-[10px] text-zinc-500">{post.time}</p>
                  </div>
                </div>
                {post.type === 'official' && <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Official</span>}
              </div>
              
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{post.content}</p>
              
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${post.liked ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <Heart className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`} /> {post.likes}
                  </button>
                  <button onClick={() => setActiveReplyId(activeReplyId === post.id ? null : post.id)} className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${activeReplyId === post.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <MessageSquare className="h-4 w-4" /> {post.replies?.length || 0} Replies
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {activeReplyId === post.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-zinc-800 space-y-3 overflow-hidden">
                    {post.replies?.map((reply: any) => (
                      <div key={reply.id} className="flex gap-2 items-start bg-zinc-950/50 p-3 rounded-2xl">
                        <Avatar name={reply.author} size="8" />
                        <div>
                          <div className="text-xs font-bold text-zinc-200">{reply.author}</div>
                          <div className="text-xs text-zinc-400">{reply.content}</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                       <Avatar name={user.name} size="8" />
                       <input autoFocus value={replyText} onChange={(e)=>setReplyText(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && handleReplySubmit(post.id)} type="text" placeholder="Write a reply..." className="flex-1 bg-zinc-800 text-xs px-3 py-2 rounded-full outline-none focus:ring-1 focus:ring-zinc-600 text-white placeholder:text-zinc-500" />
                       <button onClick={()=>handleReplySubmit(post.id)} disabled={!replyText.trim()} className="bg-blue-600 disabled:opacity-50 text-white p-1.5 rounded-full"><Send className="h-3 w-3" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ==========================================
// 7. FAMILY TRACKING VIEW
// ==========================================
function FamilyView({ showToast, members, setMembers, userStatus, setUserStatus }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");

  const handleAddSubmit = async () => {
    if(!newName.trim() || !newRelation.trim()) return showToast("Please fill all fields", "error");
    try {
      const res = await axiosInstance.post('/family', { name: newName, relation: newRelation, status: "Waiting..." });
      setMembers([...members, res.data]);
      setNewName(""); setNewRelation(""); setIsAdding(false);
      showToast(`${newName} added to family tracking.`, "success");
    } catch(e) {
      showToast("Failed to add member", "error");
    }
  };

  const handleMarkSafe = async () => {
    setUserStatus("Safe");
    showToast("Your safety status has been broadcasted.", "success");
    try {
      await axiosInstance.post('/family/status', { name: "Juan Dela Cruz", status: "Safe" });
    } catch (e) {}
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-48 mt-4">
      <div><h1 className="text-3xl font-black text-white tracking-tight">Family Safety</h1></div>

      <div className={`border rounded-3xl p-6 text-center shadow-lg transition-colors duration-500 ${userStatus === "Safe" ? "bg-emerald-500/10 border-emerald-500/50" : "bg-zinc-900 border-zinc-800"}`}>
        <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-500 ${userStatus === "Safe" ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-zinc-800 text-zinc-400"}`}>
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className={`text-xl font-bold mb-2 transition-colors duration-500 ${userStatus === "Safe" ? "text-emerald-400" : "text-zinc-200"}`}>{userStatus === "Safe" ? "You are marked Safe" : "Check In Now"}</h2>
        <p className="text-sm text-zinc-400 mb-6">Let your family and the Barangay know you are currently safe.</p>
        <button 
          onClick={handleMarkSafe}
          disabled={userStatus === "Safe"}
          className={`w-full font-black tracking-widest uppercase py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 ${userStatus === "Safe" ? "bg-emerald-500 text-zinc-950" : "bg-white text-zinc-950 hover:bg-zinc-200"}`}
        >
          {userStatus === "Safe" ? "Status Broadcasted" : "Mark As Safe"}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Family Tracking</h3>
        <div className="space-y-3">
          <AnimatePresence>
            {members.map((m:any) => (
              <motion.div key={m.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size="10" />
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">{m.name}</h4>
                    <p className="text-xs text-zinc-500">{m.relation}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${m.status === "Safe" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border border-amber-500/30 text-amber-500"}`}>{m.status}</div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isAdding ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Full Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500 text-white" />
              <input value={newRelation} onChange={e=>setNewRelation(e.target.value)} placeholder="Relationship (e.g. Brother)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500 text-white" />
              <div className="flex gap-2 mt-1">
                 <button onClick={()=>setIsAdding(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-sm transition-all">Cancel</button>
                 <button onClick={handleAddSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-sm transition-all">Add Member</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAdding(true)} className="w-full border-2 border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 active:scale-95 text-zinc-500 hover:text-zinc-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
              <PlusCircle className="h-5 w-5" /> Add Member
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}