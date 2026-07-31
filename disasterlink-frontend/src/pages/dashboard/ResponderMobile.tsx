import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, CheckCircle, AlertTriangle, Radio, Clock, Camera, ArrowLeft, Info, Send, Loader2, CameraOff, Activity, ShieldAlert, Phone, User as UserIcon, Lock, Key, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import axiosInstance from "../../lib/axios";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Map Icons
const responderIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex h-6 w-6 items-center justify-center"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span></div>`,
  iconSize: [24, 24],
});

const emergencyIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex h-8 w-8 items-center justify-center"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span class="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white shadow-xl flex items-center justify-center"></span></div>`,
  iconSize: [32, 32],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true });
  }, [center, map]);
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
}

export default function ResponderMobile() {
  const { logout, user } = useAuth();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"missions" | "map" | "comms" | "profile">("missions");
  
  // Real-time states
  const [isOnline, setIsOnline] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [incident, setIncident] = useState<any>(null);
  const [status, setStatus] = useState("Available"); // Available, Dispatched, En Route, On Scene
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fieldNotes, setFieldNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoAttached, setPhotoAttached] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' | 'warning' | 'alert' } | null>(null);

  // MEMORY BLACKLIST: Prevents resolved incidents from ever reappearing due to network delay
  const [resolvedIds, setResolvedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time responder location (defaults to a central point until GPS locks)
  const [responderLocation, setResponderLocation] = useState<[number, number]>(MAP_CENTER);

  // ==========================================
  const [showProfile, setShowProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // ==========================================
  // REAL-TIME GPS TRACKING & KEEP AWAKE
  // ==========================================
  useEffect(() => {
    // Keep the screen awake for responders so they don't lose the app while driving
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
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setResponderLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => console.warn("GPS tracking error:", error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ==========================================
  // PING TELEMETRY TO SERVER
  // ==========================================
  useEffect(() => {
    const pingInterval = setInterval(async () => {
      try {
        await axiosInstance.post("/responder/ping", {
          unit_name: incident?.status?.replace("Dispatched: ", "") || "Alpha-1 Unit",
          lat: responderLocation[0],
          lng: responderLocation[1],
          status: status
        });
      } catch (e) {}
    }, 10000);
    return () => clearInterval(pingInterval);
  }, [responderLocation, status, incident]);

  // ==========================================
  // LIVE POLLING: LISTENING FOR DISPATCHES
  // ==========================================
  const checkForDispatches = async () => {
    // If the responder is already busy handling an incident, stop pulling new ones
    if (status !== "Available") return; 

    try {
      const response = await axiosInstance.get("/incidents");
      const dbIncidents = response.data.data ? response.data.data : response.data;
        
        // Find incidents assigned to a responder unit AND ensure it hasn't already been resolved by this device
        const incomingDispatch = dbIncidents.find((inc: any) => 
          inc.status?.startsWith("Dispatched:") && !resolvedIds.includes(inc.id)
        );

        if (incomingDispatch) {
          setIncident(incomingDispatch);
          setStatus("Dispatched");
          setElapsedTime(0);
          showToast("URGENT: New Incident Dispatched to your unit!", "alert");
          
          // Trigger Haptics & Notification for Representatives
          try {
            Haptics.vibrate();
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1000);
            
            TextToSpeech.speak({
              text: `URGENT. New SOS Incident Dispatched. ${incomingDispatch.incident_type}`,
              lang: 'en-US',
              rate: 0.9,
            }).catch(() => {});
            
            LocalNotifications.schedule({
              notifications: [
                {
                  title: "🚨 URGENT DISPATCH",
                  body: `New SOS assigned to your unit: ${incomingDispatch.incident_type}`,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 500) }
                }
              ]
            }).catch(() => {});
          } catch(e) {}
        }
    } catch (error) {
      console.warn("Silent poll failed - server might be offline.");
    }
  };

  // Poll the database every 3 seconds
  useEffect(() => {
    checkForDispatches(); // Check immediately on load
    const pollInterval = setInterval(checkForDispatches, 10000);
    return () => clearInterval(pollInterval);
  }, [status, resolvedIds]); 

  // Live dispatch timer
  useEffect(() => {
    if (status === "Available" || status === "Resolved") return;
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 60000); // 1 minute
    return () => clearInterval(timer);
  }, [status]);

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' | 'alert' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'alert' ? 6000 : 3500);
  };

  // ==========================================
  // RESPONDER ACTION CONTROLS
  // ==========================================
  const handleAcknowledge = () => {
    setStatus("En Route");
    showToast("Status updated: En Route to Scene", "info");
  };

  const handleArrived = () => {
    setStatus("On Scene");
    showToast("Status updated: Arrived On Scene. Please provide SITREP or verify.", "warning");
  };

  const escalateIncident = async (target: 'kap' | 'mdrrmo') => {
    if (!incident) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/incidents/${incident.id}/verify`, { escalation_target: target });
      
      // Blacklist it locally so it doesn't reappear
      setResolvedIds(prev => [...prev, incident.id]);
      
      showToast(target === 'kap' ? "Escalated to Barangay Captain." : "Escalated to MDRRMO.", "success");
      setIncident(null);
      setStatus("Available");
      setElapsedTime(0);
    } catch (e) {
      showToast("Failed to escalate incident.", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoAttached(true);
      showToast("Situation photo attached successfully.", "success");
    }
  };

  const handleGetDirections = () => {
    if (incident?.latitude && incident?.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`, '_blank');
    } else {
      showToast("GPS coordinates not available for this incident.", "warning");
    }
  };

  const handleResolve = async () => {
    if (!fieldNotes.trim() && !photoAttached) {
      showToast("Field notes or a photo are required to close this incident.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      if (incident) {
        // 1. Instantly blacklist this ID on the device so it can never reappear
        setResolvedIds(prev => [...prev, incident.id]);

        // 2. Update the master database to mark it as Resolved
        await axiosInstance.put(`/incidents/${incident.id}`, { status: "Resolved" });
      }
      
      // 3. Clear the screen and return to Standby
      showToast("All Clear: Incident Resolved. Returning to Standby.", "success");
      setIncident(null);
      setStatus("Available");
      setFieldNotes("");
      setPhotoAttached(false);
      setElapsedTime(0);
      
    } catch (error) {
      showToast("Network Error: Failed to resolve incident.", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // RESPONDER PROFILE & LOGOUT
  // ==========================================

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      showToast("New passwords do not match", "alert");
      return;
    }
    setPasswordLoading(true);
    try {
      await axiosInstance.post('/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });
      showToast("Password updated securely.", "success");
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (e: any) {
      showToast(e.response?.data?.message || "Failed to update password", "alert");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-red-500/30 relative">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-4 right-4 z-[200] flex justify-center"
          >
            <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-white' :
              toast.type === 'alert' ? 'bg-red-600 border-red-400 text-white animate-pulse' :
              'bg-blue-600/90 border-blue-400 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : 
               toast.type === 'alert' ? <ShieldAlert className="h-5 w-5" /> : 
               <Info className="h-5 w-5" />}
              <span className="font-bold text-sm">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    {/* DYNAMIC HEADER */}
      <header className={`p-4 shadow-md sticky top-0 z-50 flex items-center justify-between transition-colors duration-500 ${
        status === "Available" ? "bg-zinc-900 border-b border-zinc-800" : 
        status === "On Scene" ? "bg-amber-600" : 
        "bg-red-600"
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {status !== "Available" && <Radio className="h-5 w-5 animate-pulse text-white" />}
            <span className="font-bold text-white tracking-wide uppercase">
              {status === "Available" ? "Unit Status" : `Active: ${status}`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
            status === "Available" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/20 text-white shadow-sm"
          }`}>
            {status === "Available" ? "Available" : (incident?.status?.replace("Dispatched: ", "") || "Active")}
          </span>

          <button 
            onClick={() => setShowProfile(!showProfile)} 
            className="h-8 w-8 rounded-full bg-zinc-800 border-2 border-white/20 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity focus:ring-2 focus:ring-white/50"
          >
            <div className="text-xs font-bold text-white uppercase">{user?.name ? user?.name.substring(0, 2) : 'R1'}</div>
          </button>

          {/* PROFILE DROPDOWN */}
          <AnimatePresence>
            {showProfile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-12 right-0 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100] transform origin-top-right"
              >
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
                  <div className="text-sm font-bold text-white">{user?.name || "Responder Unit"}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-1">{(user as any)?.department || "Disaster Response"}</div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM CONNECTED
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfile(false); setShowPasswordModal(true); }} className="w-full text-left px-3 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 text-sm font-medium flex items-center gap-3 transition-colors">
                    <Key className="h-4 w-4 text-zinc-400" /> Change Password
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-3 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        
        <AnimatePresence mode="wait">
          
          {/* ======================================================== */}
          {/* STATE 1: STANDBY DASHBOARD (No Incident) */}
          {/* ======================================================== */}
          {status === "Available" && (
            <motion.div 
              key="standby"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-4"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-lg mt-4 mb-6">
                <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
                  <Activity className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">System Online</h2>
                <p className="text-sm text-zinc-400">Unit Alpha-1 is currently on standby. Continuously monitoring command center for incoming dispatches.</p>
              </div>

              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative min-h-[300px]">
                <div className="absolute top-4 left-4 right-4 z-[400] bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" /> Current Station
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">AWAITING ORDERS</span>
                </div>
                <MapContainer center={responderLocation} zoom={15} zoomControl={false} scrollWheelZoom={false} dragging={false} className="h-full w-full z-0">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapUpdater center={responderLocation} />
                  <Marker position={responderLocation} icon={responderIcon} />
                  <Circle center={responderLocation} radius={300} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, stroke: false }} />
                </MapContainer>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STATE 2: ACTIVE INCIDENT DASHBOARD */}
          {/* ======================================================== */}
          {status !== "Available" && incident && (
            <motion.div 
              key="active"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col relative pb-32"
            >
              {/* Dynamic Map Header */}
              <div className="w-full h-[300px] bg-zinc-900 relative z-0">
                <MapContainer 
                  center={incident.latitude && incident.longitude ? [parseFloat(incident.latitude), parseFloat(incident.longitude)] : responderLocation} 
                  zoom={16} zoomControl={false} scrollWheelZoom={false} dragging={false} className="h-full w-full"
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapUpdater center={incident.latitude && incident.longitude ? [parseFloat(incident.latitude), parseFloat(incident.longitude)] : responderLocation} />
                  <Marker 
                    position={incident.latitude && incident.longitude ? [parseFloat(incident.latitude), parseFloat(incident.longitude)] : responderLocation} 
                    icon={emergencyIcon} 
                  />
                  {/* Real-time moving Responder Marker on the Incident map! */}
                  <Marker position={responderLocation} icon={responderIcon} />
                </MapContainer>
                
                {/* Gradient fade into the card */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent z-10 pointer-events-none"></div>
              </div>

              {/* Main Information Card (Overlapping the Map) */}
              <div className="z-10 -mt-10 px-4">
                <Card className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 shadow-2xl rounded-3xl overflow-hidden">
                  
                  {/* Optional Image Evidence */}
                  {(incident.image_path || incident.image_data) && (
                    <div className="w-full h-32 relative border-b border-zinc-800/50">
                      <img src={incident.image_path || incident.image_data} alt="Field Evidence" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
                      <Badge className="absolute bottom-3 left-3 bg-red-600 text-white font-bold tracking-widest text-[10px]">EVIDENCE ATTACHED</Badge>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{incident.incident_type}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-zinc-500 font-mono text-xs">REF: #{incident.id}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            incident.severity_level === 'Critical' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {incident.severity_level} Threat
                          </span>
                        </div>
                      </div>
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                         incident.severity_level === 'Critical' ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-red-500/20' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-amber-500/20'
                      }`}>
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/80 shadow-inner">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                          <MapPin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Target Location</div>
                          <div className="text-sm text-zinc-100 font-medium leading-tight">
                            {incident.exact_location}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Brgy. {incident.reporting_barangay}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/80 shadow-inner">
                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                          <Clock className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Mission Time</div>
                          <div className="text-sm text-zinc-100 font-medium">
                            <span className="text-amber-400 font-mono font-bold text-lg">{elapsedTime}</span> mins elapsed
                          </div>
                        </div>
                      </div>

                      {/* Reporter Information */}
                      {incident.user && (
                        <div className="flex items-start gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/80 shadow-inner mt-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Reporter Information</div>
                            <div className="text-sm text-zinc-100 font-medium">
                              {incident.user.name}
                            </div>
                            {incident.user.phone && (
                              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                {incident.user.phone}
                              </div>
                            )}
                          </div>
                          {incident.user.phone && (
                            <a href={`tel:${incident.user.phone}`} className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 active:scale-95 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                          )}
                        </div>
                      )}

                      {incident.details && (
                        <div className="mt-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 italic text-sm text-zinc-300 leading-relaxed shadow-inner">
                          "{incident.details}"
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Dynamic Context Area (Shows when on scene) */}
              <AnimatePresence>
                {status === "On Scene" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Situation Report (SITREP)
                    </h3>
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 transition-colors mb-3 shadow-sm border ${
                        photoAttached ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                      }`}
                    >
                      {photoAttached ? <CheckCircle className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                      {photoAttached ? "Situation Photo Attached" : "Attach Situation Photo"}
                    </button>
                    <textarea 
                      value={fieldNotes}
                      onChange={(e) => setFieldNotes(e.target.value)}
                      placeholder="Enter field notes, casualties, or required backup..." 
                      className="w-full h-24 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none shadow-sm"
                    ></textarea>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sticky Action Controls */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-12 z-20">
                <div className="max-w-md mx-auto space-y-3 pb-safe">
                  {status === "Dispatched" ? (
                    <>
                      <button onClick={handleGetDirections} className="w-full bg-zinc-800/80 backdrop-blur hover:bg-zinc-700 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg border border-zinc-700/50 group">
                        <Navigation className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" /> Get Directions (GPS)
                      </button>
                      <button onClick={handleAcknowledge} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] border border-blue-400/30 group">
                        <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform" /> ACKNOWLEDGE & EN ROUTE
                      </button>
                    </>
                  ) : status === "En Route" ? (
                    <button onClick={handleArrived} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-zinc-950 font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] border border-amber-300/50 group">
                      <MapPin className="h-5 w-5 group-hover:scale-110 transition-transform" /> UNIT ARRIVED ON SCENE
                    </button>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => escalateIncident('kap')} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 disabled:opacity-70 text-white font-black text-xs tracking-wide py-3 rounded-xl flex items-center justify-center gap-1 transition-all shadow-lg border border-blue-400/30">
                          <CheckCircle className="h-4 w-4" /> VERIFY (KAP)
                        </button>
                        <button onClick={() => escalateIncident('mdrrmo')} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:scale-95 disabled:opacity-70 text-white font-black text-xs tracking-wide py-3 rounded-xl flex items-center justify-center gap-1 transition-all shadow-lg border border-red-400/30">
                          <AlertTriangle className="h-4 w-4" /> ESCALATE MDRRMO
                        </button>
                      </div>
                      <button onClick={handleResolve} disabled={isSubmitting} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 active:scale-95 disabled:opacity-70 disabled:scale-100 text-zinc-950 font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-300/50 group">
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        {isSubmitting ? "TRANSMITTING SITREP..." : "SUBMIT REPORT & RESOLVE"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">&times;</button>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-zinc-800 p-3 rounded-full"><Lock className="h-6 w-6 text-white" /></div>
                <div><h3 className="text-xl font-bold text-white">Security</h3><p className="text-xs text-zinc-500">Update your access credentials</p></div>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Password</label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} required value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none pr-10" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-zinc-500">{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Password</label>
                  <input type="password" required minLength={8} value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confirm New Password</label>
                  <input type="password" required minLength={8} value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none" />
                </div>
                <button type="submit" disabled={passwordLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl mt-2 transition-colors">
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}