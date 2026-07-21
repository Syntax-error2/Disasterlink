import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, CheckCircle, AlertTriangle, Radio, Clock, Camera, ArrowLeft, Info, Send, Loader2, CameraOff, Activity, ShieldAlert } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import axiosInstance from "../../lib/axios";

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

export default function ResponderMobile() {
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

  // Default station coordinates (Standby Location)
  const stationCoords: [number, number] = [10.1866, 122.8587];

  // ==========================================
  // LIVE POLLING: LISTENING FOR DISPATCHES
  // ==========================================
  const checkForDispatches = async () => {
    // If the responder is already busy handling an incident, stop pulling new ones
    if (status !== "Available") return; 

    try {
      const response = await axiosInstance.get("/incidents");
      const data = response.data;
        
        // Find incidents assigned to this unit AND ensure it hasn't already been resolved by this device
        const incomingDispatch = data.find((inc: any) => 
          inc.status === "Dispatched: Alpha-1 Unit" && !resolvedIds.includes(inc.id)
        );

        if (incomingDispatch) {
          setIncident(incomingDispatch);
          setStatus("Dispatched");
          showToast("URGENT: New Incident Dispatched to your unit!", "alert");
        }
    } catch (error) {
      console.warn("Silent poll failed - server might be offline.");
    }
  };

  // Poll the database every 3 seconds
  useEffect(() => {
    checkForDispatches(); // Check immediately on load
    const pollInterval = setInterval(checkForDispatches, 3000);
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
    showToast("Status updated: Arrived On Scene. Please provide SITREP.", "warning");
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
        await axiosInstance.patch(`/incidents/${incident.id}`, { status: "Resolved" });
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
      <header className={`p-4 shadow-md sticky top-0 z-20 flex items-center justify-between transition-colors duration-500 ${
        status === "Available" ? "bg-zinc-900 border-b border-zinc-800" : 
        status === "On Scene" ? "bg-amber-600" : 
        "bg-red-600"
      }`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            {status !== "Available" && <Radio className="h-5 w-5 animate-pulse text-white" />}
            <span className="font-bold text-white tracking-wide uppercase">
              {status === "Available" ? "Unit Status" : `Active: ${status}`}
            </span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
          status === "Available" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/20 text-white shadow-sm"
        }`}>
          {status === "Available" ? "Available" : "Alpha-1"}
        </span>
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
                <MapContainer center={stationCoords} zoom={15} zoomControl={false} scrollWheelZoom={false} dragging={false} className="h-full w-full z-0">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <Marker position={stationCoords} icon={responderIcon} />
                  <Circle center={stationCoords} radius={300} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, stroke: false }} />
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
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 p-4 flex flex-col gap-4 pb-32"
            >
              {/* Incident Details Card */}
              <Card className="bg-zinc-900 border-zinc-800 shadow-xl relative overflow-hidden shrink-0">
                
                <CardContent className="p-0 flex flex-col">
                  {/* REAL INCIDENT IMAGE FROM DATABASE */}
                  <div className="w-full bg-zinc-950 relative border-b border-zinc-800 flex items-center justify-center" style={{ minHeight: '200px' }}>
                    {incident.image_data ? (
                      <img src={incident.image_data} alt="Field Evidence" className="w-full h-[220px] object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-zinc-600">
                        <CameraOff className="h-10 w-10 mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">No Field Image Provided</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{incident.incident_type}</h2>
                        <p className="text-zinc-400 font-mono text-sm mt-1">Ref ID: #{incident.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        incident.severity_level === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {incident.severity_level} Threat
                      </span>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                        <MapPin className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-zinc-200">Location & Intel</div>
                          <div className="text-xs text-white mt-1 font-bold">
                            {incident.exact_location}, {incident.reporting_barangay}
                          </div>
                          <div className="text-xs text-zinc-400 mt-2 leading-relaxed italic bg-zinc-900 p-2 rounded border border-zinc-800">
                            "{incident.details || "No operational details provided by reporter."}"
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                        <Clock className="h-5 w-5 text-zinc-400 shrink-0" />
                        <div>
                          <div className="font-medium text-zinc-200">Time since dispatch</div>
                          <div className="text-xs text-amber-500 mt-1 font-mono">{elapsedTime} mins elapsed</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Context Map */}
                  <div className="h-48 w-full bg-zinc-800 relative z-0 border-t border-zinc-800">
                    <MapContainer center={stationCoords} zoom={15} zoomControl={false} scrollWheelZoom={false} dragging={false} className="h-full w-full z-0">
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <Marker position={stationCoords} icon={emergencyIcon} />
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>

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
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-12 z-10">
                <div className="max-w-md mx-auto space-y-3">
                  {status === "Dispatched" ? (
                    <>
                      <button onClick={handleGetDirections} className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg border border-zinc-700">
                        <Navigation className="h-5 w-5 text-blue-400" /> Get Directions (GPS)
                      </button>
                      <button onClick={handleAcknowledge} className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
                        <CheckCircle className="h-5 w-5" /> Acknowledge & En Route
                      </button>
                    </>
                  ) : status === "En Route" ? (
                    <button onClick={handleArrived} className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                      <MapPin className="h-5 w-5" /> Arrived On Scene
                    </button>
                  ) : (
                    <button onClick={handleResolve} disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-70 disabled:scale-100 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      {isSubmitting ? "Transmitting SITREP..." : "Submit Report & Resolve"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}