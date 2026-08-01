import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, CheckCircle, AlertTriangle, CloudRain, Send, Loader2, Activity, ShieldAlert, LogOut, Radio, Home, Map as MapIcon, Thermometer, Wind, Droplets, Camera as CameraIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../lib/axios";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { useIncidents } from "../../context/IncidentsContext";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const evacIcon = L.divIcon({ className: "bg-transparent", html: `<div class="h-6 w-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"></div>`, iconSize: [24, 24] });

export default function RepresentativeMobile() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  
  // Real-time states
  const [activeTab, setActiveTab] = useState("home");
  const [userLoc, setUserLoc] = useState<[number, number]>([10.1866, 122.8587]);
  const [incident, setIncident] = useState<any | null>(null);
  
  // Report Form States
  const [reportType, setReportType] = useState("General Hazard");
  const [reportDesc, setReportDesc] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"Available" | "Dispatched">("Available");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [weather, setWeather] = useState<any>(() => {
    try {
      const cached = sessionStorage.getItem('cp_weather_cache');
      return cached && cached !== "undefined" ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' | 'warning' | 'alert' } | null>(null);

  // Helper functions
  const normalize = (str: string) => {
    if (!str) return "";
    return str.toLowerCase().replace(/brgy\.?/g, '').replace(/barangay/g, '').replace(/sta\.?/g, 'santa').replace(/sto\.?/g, 'santo').replace(/[^a-z0-9]/g, '');
  };

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Local Alerts
  const activeLocalIncidents = incidents.filter(i => {
    if (['Resolved', 'False Alarm', 'Dismissed'].includes(i.status)) return false;
    
    // Check Name Match
    const s1 = normalize(i.reporting_barangay);
    const s2 = normalize(user?.assigned_barangay);
    const isNameMatch = s1 && s2 && (s1.includes(s2) || s2.includes(s1));
    
    // Check Distance Match
    let isDistanceMatch = false;
    if (i.latitude && i.longitude) {
      const dist = getDistanceInMeters(userLoc[0], userLoc[1], Number(i.latitude), Number(i.longitude));
      isDistanceMatch = dist <= 200; // Within 200 meters
    }
    
    return isNameMatch || isDistanceMatch;
  });

  // ==========================================
  // KEEP AWAKE
  // ==========================================
  useEffect(() => {
    const keepScreenAwake = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (e) {}
    };
    keepScreenAwake();
    return () => { KeepAwake.allowSleep().catch(() => {}); };
  }, []);

  // Fetch Weather globally
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${userLoc[0]}&longitude=${userLoc[1]}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability&hourly=precipitation,precipitation_probability&timezone=Asia%2FManila`;
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
  }, [userLoc[0], userLoc[1]]);

  // ==========================================
  // WEBSOCKETS: LISTENING FOR DISPATCHES
  // ==========================================
  const checkForDispatches = async () => {
    if (status !== "Available") return; 

    try {
      const response = await axiosInstance.get("/incidents");
      const dbIncidents = response.data.data ? response.data.data : response.data;
        
        // Ensure incident hasn't been resolved locally, belongs to this barangay, and is in an interceptable state
        const incomingDispatch = dbIncidents.find((inc: any) => {
          const isInterceptable = ['Pending Review', 'Active'].includes(inc.status);
          
          const s1 = normalize(inc.reporting_barangay);
          const s2 = normalize(user?.assigned_barangay);
          const isNameMatch = s1 && s2 && (s1.includes(s2) || s2.includes(s1));
          
          let isDistanceMatch = false;
          if (inc.latitude && inc.longitude) {
            const dist = getDistanceInMeters(userLoc[0], userLoc[1], Number(inc.latitude), Number(inc.longitude));
            isDistanceMatch = dist <= 200;
          }
          
          const isMatch = isNameMatch || isDistanceMatch;
          
          return isInterceptable && isMatch && !resolvedIds.includes(inc.id);
        });

        if (incomingDispatch) {
          setIncident(incomingDispatch);
          setStatus("Dispatched");
          showToast("URGENT: SOS Alert in your Barangay!", "alert");
          
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
                  title: "🚨 URGENT SOS ALERT",
                  body: `Emergency in your jurisdiction: ${incomingDispatch.incident_type}`,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 500) }
                }
              ]
            }).catch(() => {});
          } catch(e) {}
        }
    } catch (error) {}
  };

  useEffect(() => {
    import('../../lib/echo').then(({ default: echo }) => {
      echo.channel('incidents')
        .listen('.incident.event', (e: any) => {
          if (e.type === 'created' || e.type === 'updated') {
            checkForDispatches();
          }
        });
    });

    checkForDispatches(); // Initial check

    return () => {
      import('../../lib/echo').then(({ default: echo }) => {
        echo.leaveChannel('incidents');
      });
    };
  }, [status, resolvedIds, user]); 

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' | 'alert' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'alert' ? 6000 : 3500);
  };

  // ==========================================
  // FETCH WEATHER AND LOCATION DATA
  // ==========================================
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      let lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
      let lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
      
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setUserLoc([lat, lng]);
      } catch (err) {
        console.warn("Location error, using fallback.", err);
        setUserLoc([lat, lng]);
      }

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability&hourly=precipitation,precipitation_probability&timezone=Asia%2FManila`;
        const response = await fetch(url);
        const data = await response.json();
        setWeather(data.current);
      } catch (e) {
        console.warn("Weather fetch failed");
      }
    };
    fetchLocationAndWeather();
    const weatherInterval = setInterval(fetchLocationAndWeather, 15000);
    return () => clearInterval(weatherInterval);
  }, [user]);

  const submitLocalReport = async () => {
    if (!reportDesc) return showToast("Description is required", "alert");
    setIsSubmitting(true);
    try {
      await axiosInstance.post("/incidents", {
        incident_type: reportType,
        severity_level: "Medium",
        reporting_barangay: user?.assigned_barangay || "Unknown",
        exact_location: "Representative Location",
        details: reportDesc,
        latitude: userLoc[0],
        longitude: userLoc[1],
        status: "Active", // Auto-active for Reps
        source: "Representative"
      });
      showToast("Report submitted to MDRRMO successfully", "success");
      setReportDesc("");
      setReportImage(null);
      setActiveTab("home");
    } catch (e) {
      showToast("Failed to submit report", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      setReportImage(image.dataUrl || null);
    } catch (e) {
      console.warn("User cancelled photo");
    }
  };

  // ==========================================
  // RESPONDER ACTION CONTROLS
  // ==========================================
  const escalateIncident = async (target: 'kap' | 'mdrrmo') => {
    if (!incident) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/incidents/${incident.id}/verify`, { escalation_target: target });
      setResolvedIds(prev => [...prev, incident.id]);
      showToast(target === 'kap' ? "Escalated to Barangay Captain." : "Escalated to MDRRMO.", "success");
      setIncident(null);
      setStatus("Available");
    } catch (e) {
      showToast("Failed to escalate incident.", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-screen w-full bg-zinc-950 font-sans overflow-hidden flex flex-col relative text-zinc-50">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 16, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className="fixed top-0 left-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
              toast.type === 'alert' ? 'bg-red-600/90 border-red-500 text-white' : 
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-zinc-900' :
              'bg-zinc-800/90 border-zinc-700 text-white'
            }`}>
              {toast.type === 'alert' ? <AlertTriangle className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
              <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC DASHBOARD OR SOS ALERT VIEW */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <AnimatePresence mode="wait">
          {status === "Available" ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-full pb-20">
              {activeTab === "home" && (
                <>
                  {/* Premium Dashboard Header - Dark Minimalist */}
              <div className="bg-zinc-950/90 backdrop-blur-md px-6 pt-12 pb-6 border-b border-zinc-800 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      On Duty
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight line-clamp-2">{user?.assigned_barangay}</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-1">{user?.name} &bull; Representative</p>
                  </div>
                  <button onClick={handleLogout} className="h-10 w-10 shrink-0 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                    <LogOut className="h-5 w-5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Action Grid */}
              <div className="p-6 space-y-6 relative z-20">
                {/* Threat Status Card */}
                {weather && (() => {
                  const rainProb = weather.precipitation_probability ?? 0;
                  let threat = { title: "Low Threat", desc: "Clear skies and stable weather conditions.", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
                  if (rainProb > 80) threat = { title: "High Alert", desc: "Heavy rain and severe weather expected.", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
                  else if (rainProb > 50) threat = { title: "Moderate to High", desc: "Scattered rain and potential thunderstorms.", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
                  else if (rainProb > 20) threat = { title: "Low to Moderate", desc: "Light scattered rain showers expected.", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };

                  return (
                    <Card className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-lg overflow-hidden">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border ${threat.bg} ${threat.border}`}>
                          <CloudRain className={`h-7 w-7 ${threat.color}`} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Local Threat Level</div>
                          <div className="text-lg font-bold text-zinc-100">{threat.title}</div>
                          <div className="text-xs text-zinc-400">{threat.desc}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  {/* Local Alerts */}
                  <Card className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-lg overflow-hidden hover:bg-zinc-800/80 transition-colors cursor-pointer" onClick={() => navigate('/portal')}>
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 relative">
                        {activeLocalIncidents.length > 0 && (
                          <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
                        )}
                        <Activity className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{activeLocalIncidents.length}</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Alerts</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Report */}
                  <Card className="bg-indigo-600 border border-indigo-500 rounded-3xl shadow-[0_0_20px_rgba(79,70,229,0.3)] overflow-hidden hover:bg-indigo-500 transition-colors cursor-pointer" onClick={() => setActiveTab('report')}>
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3 h-full">
                      <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Send className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white leading-tight">File Local<br/>Report</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Secondary Action */}
                <button className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Radio className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-zinc-100">Broadcast Channel</div>
                      <div className="text-xs text-zinc-500">Tune in to MDRRMO updates</div>
                    </div>
                  </div>
                  <Navigation className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </button>
              </div>
            </>
          )}

              {activeTab === "map" && (
                <div className="fixed inset-0 pb-20 flex flex-col z-0 bg-zinc-950">
                  {weather && (
                    <div className="absolute top-0 left-0 w-full z-10 p-4 safe-top pointer-events-none mt-4">
                      <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1">
                          <MapIcon className="h-5 w-5 text-indigo-500" />
                          <h2 className="text-white font-bold tracking-wide">Jurisdictional Radar</h2>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-5 w-5 text-orange-400" />
                            <span className="text-xl font-bold">{Math.round(weather.temperature_2m)}°C</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="flex items-center gap-1.5"><Wind className="h-4 w-4 text-sky-400"/> {Math.round(weather.wind_speed_10m)}</div>
                            <div className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-blue-400"/> {Math.round(weather.relative_humidity_2m)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 w-full relative z-0">
                    <MapContainer 
                      center={userLoc} 
                      zoom={16} 
                      zoomControl={false} 
                      className="h-full w-full bg-zinc-950"
                      key={`full-map-${userLoc[0]}-${userLoc[1]}`}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      />
                      <Circle center={userLoc} radius={800} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.1 }} />
                      
                      {activeLocalIncidents.map((inc: any) => inc.latitude && inc.longitude ? (
                        <Marker 
                          key={inc.id} 
                          position={[Number(inc.latitude), Number(inc.longitude)]} 
                          icon={evacIcon}
                        >
                          <Popup className="custom-popup">
                            <div className="font-bold text-red-600 mb-1">{inc.incident_type}</div>
                            <div className="text-xs text-zinc-600">{inc.exact_location}</div>
                          </Popup>
                        </Marker>
                      ) : null)}
                    </MapContainer>
                  </div>
                </div>
              )}

              {activeTab === "report" && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-white">File Report</h2>
                    <p className="text-zinc-400 text-sm">Directly report hazards to MDRRMO.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Incident Type</label>
                      <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl p-4 appearance-none">
                        <option>General Hazard</option>
                        <option>Flood</option>
                        <option>Fire</option>
                        <option>Medical Emergency</option>
                        <option>Landslide</option>
                        <option>Crime / Violence</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                      <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Describe the situation..." className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl p-4 min-h-[120px]" />
                    </div>

                    {reportImage && (
                      <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-zinc-800">
                        <img src={reportImage} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => setReportImage(null)} className="absolute top-2 right-2 h-8 w-8 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-md">X</button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={capturePhoto} className="bg-zinc-900 border border-zinc-700 text-white rounded-xl p-4 font-bold flex items-center justify-center gap-2 hover:bg-zinc-800">
                        <CameraIcon className="h-5 w-5" /> Photo
                      </button>
                      <button onClick={submitLocalReport} disabled={isSubmitting} className="bg-indigo-600 text-white rounded-xl p-4 font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="dispatch" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[100] bg-red-950 p-6 pt-12 pb-safe flex flex-col overflow-hidden">
              <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay pointer-events-none"></div>
              
              <div className="flex justify-center mb-4 relative shrink-0">
                <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <div className="h-16 w-16 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.6)] border-4 border-red-500/30 relative z-10">
                  <AlertTriangle className="h-8 w-8 text-white animate-pulse" />
                </div>
              </div>
              
              <div className="text-center mb-6 relative z-10 shrink-0">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase mb-1">SOS ALERT</h1>
                <p className="text-red-300 font-medium text-sm">Verify emergency immediately.</p>
              </div>

              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/90 backdrop-blur-xl border border-red-500/30 shadow-2xl relative z-10 mb-6 rounded-3xl overflow-hidden">
                <div className="bg-red-600/20 p-4 border-b border-red-500/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-red-600 text-white">{incident?.incident_type}</span>
                    <span className="text-xs font-bold text-red-400">HIGH PRIORITY</span>
                  </div>
                </div>
                
                {/* Incident Map Pin */}
                {incident?.latitude && incident?.longitude && (
                  <div className="h-40 w-full relative shrink-0 border-b border-zinc-800">
                    <MapContainer 
                      center={[Number(incident.latitude), Number(incident.longitude)]} 
                      zoom={16} 
                      zoomControl={false} 
                      className="h-full w-full bg-zinc-950"
                      key={`alert-map-${incident.id}`}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      />
                      <Marker position={[Number(incident.latitude), Number(incident.longitude)]} icon={evacIcon} />
                    </MapContainer>
                  </div>
                )}
                
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  <div className="flex items-start gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/80 shadow-inner">
                    <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                      <MapPin className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Target Location</div>
                      <div className="text-sm text-zinc-100 font-medium leading-tight">{incident?.exact_location}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Brgy. {incident?.reporting_barangay}</div>
                    </div>
                  </div>

                  {incident?.details && (
                    <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 italic text-sm text-zinc-300 leading-relaxed shadow-inner">
                      "{incident.details}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-3 relative z-10 shrink-0">
                <button onClick={() => escalateIncident('kap')} disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 disabled:opacity-70 text-white font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg border border-blue-400/30">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  VERIFY & ESCALATE (KAP)
                </button>
                <button onClick={() => escalateIncident('mdrrmo')} disabled={isSubmitting} className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:scale-95 disabled:opacity-70 text-white font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-400/30">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
                  CRITICAL: ESCALATE MDRRMO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="h-20 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-zinc-800/50 flex items-center justify-around px-8 pb-safe shrink-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "home" ? 'text-indigo-500' : 'text-zinc-500'}`}>
          <Home className="h-6 w-6" strokeWidth={activeTab === "home" ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => setActiveTab("map")} className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === "map" ? 'text-indigo-500' : 'text-zinc-500'}`}>
          <MapIcon className="h-6 w-6" strokeWidth={activeTab === "map" ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Map</span>
        </button>
      </nav>
    </div>
  );
}
