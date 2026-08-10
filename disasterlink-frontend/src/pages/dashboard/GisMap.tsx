import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Layers, MapPin, Search, Filter, AlertTriangle, Home, 
  Activity, Radio, ShieldAlert, Zap, Thermometer, Wind,
  Navigation, Crosshair, Clock, BarChart3, Camera, Eye
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, LayersControl, ZoomControl, useMap } from "react-leaflet";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";

// ==========================================
// 1. SPATIAL DATA & MOCK TELEMETRY
// ==========================================
import axiosInstance from "../../lib/axios";
import echo from "../../lib/echo";

import { useAuth } from "../../context/AuthContext";

// ==========================================
// 2. CUSTOM GIS ICONS (GLOWING & ANIMATED)
// ==========================================
const createIcon = (colorClass: string, pingClass: string, iconHtml: string) => L.divIcon({
  className: "bg-transparent",
  html: `
    <div class="relative flex h-10 w-10 items-center justify-center group cursor-pointer">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pingClass} opacity-60"></span>
      <div class="relative flex items-center justify-center h-7 w-7 rounded-full ${colorClass} border-[2.5px] border-white dark:border-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110">
        ${iconHtml}
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const icons = {
  critical: createIcon("bg-red-600", "bg-red-500", `<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`),
  high: createIcon("bg-orange-500", "bg-orange-400", `<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`),
  medium: createIcon("bg-amber-500", "bg-amber-400", `<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`),
  evac: createIcon("bg-emerald-500", "bg-emerald-400", `<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`),
  responder: createIcon("bg-blue-500", "bg-blue-400", `<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`),
};

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================
import { useIncidents } from "../../context/IncidentsContext";

export default function GisDashboard() {
  const { user } = useAuth();
  const { incidents: rawIncidents } = useIncidents();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    evac: false,
    responders: false,
    floodRisk: false,
    weatherRadar: false,
    aiPredictions: true
  });
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [evacCenters, setEvacCenters] = useState<any[]>([]);
  const [liveResponders, setLiveResponders] = useState<any[]>([]);
  const [aiPredictions, setAiPredictions] = useState<any[]>([]);
  const [incomingSOS, setIncomingSOS] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Process incidents from context instead of refetching
  useEffect(() => {
    const data = rawIncidents || [];
    const unresolvedData = data.filter((inc: any) => inc.status !== 'Resolved');
    const mapped = unresolvedData.map((inc: any) => {
       let lat = parseFloat(inc.latitude);
       let lng = parseFloat(inc.longitude);
       if (lat === null || lat === undefined || isNaN(lat) || lng === null || lng === undefined || isNaN(lng)) {
          lat = MAP_CENTER[0] + (Math.random() - 0.5) * 0.02;
          lng = MAP_CENTER[1] + (Math.random() - 0.5) * 0.02;
       }
       return {
          id: `INC-${inc.id}`,
          type: inc.incident_type,
          brgy: inc.reporting_barangay,
          lat,
          lng,
          severity: inc.severity_level,
          status: inc.status,
          time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reporter: "Civilian Report",
          image: inc.image_path || inc.image_data || null,
          confidence: Math.floor(Math.random() * 11) + 88
       };
    });
    setLiveIncidents(mapped);
    
    // Compute Trend Data
    const now = new Date();
    const buckets: any = {};
    data.forEach((inc: any) => {
       const d = new Date(inc.created_at);
       if (now.getTime() - d.getTime() < 24 * 60 * 60 * 1000) {
          const h = d.getHours().toString().padStart(2, '0') + ':00';
          buckets[h] = (buckets[h] || 0) + 1;
       }
    });
    const trends = Object.keys(buckets).sort().map(k => ({ time: k, incidents: buckets[k] }));
    setTrendData(trends.length ? trends : [{ time: '12:00', incidents: 0 }]);
  }, [rawIncidents]);

  useEffect(() => {

    const fetchEvacCenters = async () => {
      try {
        const response = await axiosInstance.get("/evacuation-centers");
        const withCoords = response.data.map((ec: any) => ({
          ...ec,
          lat: parseFloat(ec.lat) || (10.1866 + (Math.random() * 0.02 - 0.01)),
          lng: parseFloat(ec.lng) || (122.8587 + (Math.random() * 0.02 - 0.01)),
          dist: "1.2km"
        }));
        setEvacCenters(withCoords);
      } catch (error) {
        console.error("Failed to fetch evac centers:", error);
      }
    };

    const fetchResponders = async () => {
      try {
        const res = await axiosInstance.get("/responder/locations");
        const safeRes = res.data.map((r: any) => ({ ...r, lat: Number(r.lat) || MAP_CENTER[0], lng: Number(r.lng) || MAP_CENTER[1] }));
        setLiveResponders(safeRes);
      } catch (e) {}
    };

    const fetchAiPredictions = async () => {
      try {
        // We need to fetch telemetry once for the weather cache, then we can fetch AI predictions
        await axiosInstance.get(`/telemetry?lat=${MAP_CENTER[0]}&lng=${MAP_CENTER[1]}`);
        const res = await axiosInstance.get(`/ai/predictions?lat=${MAP_CENTER[0]}&lng=${MAP_CENTER[1]}`);
        setAiPredictions(res.data);
      } catch (e) {}
    };

    fetchEvacCenters();
    fetchResponders();
    fetchAiPredictions();
    
    const handleSOS = (e: any) => {
      setIncomingSOS(e.detail);
      // Try to play an alert sound
      try {
        const audio = new Audio('/alarm.mp3'); // Assuming there's a loud alarm sound
        audio.play().catch(e => console.log('Audio autoplay blocked'));
      } catch(e) {}
    };
    window.addEventListener('new_sos_alert', handleSOS);

    return () => {
       window.removeEventListener('new_sos_alert', handleSOS);
    };
  }, []);

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const filteredIncidents = liveIncidents.filter(inc => 
    inc.brgy.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4 font-sans relative">
      
      {/* CUSTOM TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-[2000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-red-500/10 border-red-500/50 text-red-500'} backdrop-blur-md`}
          >
            {toast.type === 'success' ? <Zap className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            <span className="font-semibold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INCOMING SOS FULL-SCREEN OVERLAY */}
      <AnimatePresence>
        {incomingSOS && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[9999] bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="bg-red-600 p-8 rounded-full shadow-[0_0_100px_rgba(220,38,38,1)] mb-8"
            >
              <ShieldAlert className="h-32 w-32 text-white" />
            </motion.div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter mb-4 text-center">
              Critical SOS Detected!
            </h1>
            <div className="bg-white/10 border border-white/20 p-8 rounded-3xl max-w-2xl w-full text-center mb-8">
              <h2 className="text-3xl font-bold text-red-400 mb-2">{incomingSOS.incident_type || "Emergency Signal"}</h2>
              <p className="text-xl text-white mb-6 font-medium">{incomingSOS.details || "A citizen is requesting immediate assistance."}</p>
              <div className="flex items-center justify-center gap-4 text-zinc-300 font-mono text-lg">
                <MapPin className="h-6 w-6 text-red-500" /> 
                {incomingSOS.exact_location || incomingSOS.reporting_barangay || "Tracking coordinates..."}
              </div>
            </div>
            <button 
              onClick={() => setIncomingSOS(null)}
              className="px-12 py-5 bg-white text-red-600 text-2xl font-black uppercase tracking-widest rounded-full shadow-2xl hover:bg-zinc-200 active:scale-95 transition-all"
            >
              Acknowledge Dispatch
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MASS ALERT MODAL */}
      <AnimatePresence>
        {isAlertModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setIsAlertModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">&times;</button>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/20 p-3 rounded-full"><ShieldAlert className="h-6 w-6 text-red-500" /></div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Mass Broadcast Alert</h2>
                  <p className="text-xs text-zinc-400">Send an emergency SMS to all registered residents.</p>
                  <p className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wider">Note: Global alert state remains active for 60 minutes.</p>
                </div>
              </div>
              <textarea placeholder="Enter emergency message..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 min-h-[100px] mb-4 outline-none focus:border-red-500 transition-colors" defaultValue={`EMERGENCY ALERT: Pre-emptive evacuation is now in effect for all low-lying areas in the municipality. Please proceed to designated Evacuation Centers immediately.`}></textarea>
              <button 
                onClick={async () => { 
                  try {
                    await axiosInstance.post("/broadcast", { message: "EMERGENCY ALERT: Pre-emptive evacuation is now in effect for all low-lying areas in the municipality. Please proceed to designated Evacuation Centers immediately." });
                    setIsAlertModalOpen(false); 
                    showToast("Alert broadcast successfully deployed to all citizen devices via API and SMS Gateway.", "success"); 
                  } catch(e: any) {
                    showToast(e.response?.data?.message || "Failed to broadcast due to Server Error.", "error");
                  }
                }} 
                className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Radio className="h-5 w-5" /> TRANSMIT NOW
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER TIER */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <GlobeIcon /> Tactical Operations GIS
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Live &bull; LGU Node &bull; {currentTime}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAlertModalOpen(true)} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-md text-sm font-bold shadow-md hover:opacity-90 transition-opacity flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Issue Mass Alert
          </button>
        </div>
      </div>

      {/* THREE-PANE ARCHITECTURE */}
      <div className="flex flex-1 gap-4 overflow-hidden relative">
        
        {/* PANE 1: LEFT CONTROL PANEL */}
        <Card className="w-80 flex flex-col hidden xl:flex border-r border-y-0 border-l-0 rounded-none border-zinc-200 dark:border-zinc-800 shadow-none z-10 relative bg-white/60 dark:bg-zinc-950/60 backdrop-blur-2xl shrink-0">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} type="text" placeholder="Search coordinates, ID, Brgy..." className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-md pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none text-zinc-900 dark:text-zinc-50 transition-shadow" />
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Operational Layers */}
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="h-3 w-3" /> Operational Layers
              </h3>
              <div className="space-y-3 pl-1">
                <LayerToggle label="Active Incidents" count={liveIncidents.length} color="bg-red-500" checked={activeLayers.incidents} onChange={() => toggleLayer('incidents')} />
                <LayerToggle label="Evacuation Centers" count={evacCenters.length} color="bg-emerald-500" checked={activeLayers.evac} onChange={() => toggleLayer('evac')} />
                <LayerToggle label="Live Responders" count={liveResponders.length} color="bg-blue-500" checked={activeLayers.responders} onChange={() => toggleLayer('responders')} />
              </div>
            </div>

            {/* Hazard Overlays */}
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> Hazard Overlays
              </h3>
              <div className="space-y-3 pl-1">
                <LayerToggle label="Flood Susceptibility" color="bg-cyan-500" checked={activeLayers.floodRisk} onChange={() => toggleLayer('floodRisk')} />
                <LayerToggle label="Live Weather Radar" color="bg-indigo-500" checked={activeLayers.weatherRadar} onChange={() => toggleLayer('weatherRadar')} />
                <LayerToggle label="AI Predictions" count={aiPredictions.length} color="bg-yellow-500" checked={activeLayers.aiPredictions} onChange={() => toggleLayer('aiPredictions')} />
              </div>
            </div>

            {/* AI Incident Feed */}
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="h-3 w-3" /> Priority Feed
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredIncidents.length === 0 && <div className="text-xs text-zinc-500 text-center py-4">No incidents found.</div>}
                  {filteredIncidents.map(incident => (
                    <motion.div 
                      key={incident.id} 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      onClick={() => setSelectedIncident(incident)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedIncident?.id === incident.id ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/50 shadow-sm' : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-800'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{incident.type}</div>
                        <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${incident.severity === 'Critical' ? 'bg-red-600 text-white' : incident.severity === 'High' ? 'bg-orange-500 text-white' : 'bg-amber-500 text-zinc-950'}`}>
                          {incident.severity}
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3" /> {incident.brgy}
                      </div>
                      <div className="flex justify-between items-center text-[10px] border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
                        <span className="text-zinc-400">{incident.time}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            className="text-red-500 hover:bg-red-500/20 px-2 py-0.5 rounded-full transition-all border border-red-500/30"
                            onClick={async (e) => {
                                e.stopPropagation();
                                if(confirm('Are you sure you want to permanently delete this incident?')) {
                                    try {
                                        await axiosInstance.delete(`/incidents/${incident.id.replace('INC-', '')}`);
                                    } catch(err) { alert('Failed to delete'); }
                                }
                            }}
                          >
                            Delete
                          </button>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">{incident.status}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </Card>

        {/* PANE 2: THE GIS MAP CORE */}
        <div className="flex-1 relative bg-zinc-950 flex flex-col">
          
          {/* Map Overlay Controls (Top Right) */}
          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
             <button className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-2 rounded-md shadow-lg text-zinc-700 dark:text-zinc-300 hover:text-red-500 transition-colors">
                <Crosshair className="h-5 w-5" />
             </button>
             <button className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-2 rounded-md shadow-lg text-zinc-700 dark:text-zinc-300 hover:text-red-500 transition-colors">
                <Navigation className="h-5 w-5" />
             </button>
          </div>

          <MapContainer center={MAP_CENTER} zoom={13} scrollWheelZoom={true} className="flex-1 w-full z-0" zoomControl={false}>
            <MapController liveIncidents={liveIncidents} />
            <LayersControl position="bottomleft">
              <LayersControl.BaseLayer checked name="Dark Matter (Ops Default)">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="High-Res Satellite">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              
              {/* Live Weather Overlays (Prepared for OpenWeather) */}
              {activeLayers.weatherRadar && (
                <LayersControl.Overlay checked name="Live Precipitation Radar">
                  <TileLayer url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9fd7a449d055dba26a982a3220f32aa2" opacity={0.5}/>
                </LayersControl.Overlay>
              )}
            </LayersControl>

            <ZoomControl position="bottomright" />

            {/* Hazard Polygons / Risk Zones */}
            {activeLayers.aiPredictions && aiPredictions.map((pred, i) => (
              <Polygon 
                key={`ai-pred-${i}`} 
                positions={pred.polygon} 
                pathOptions={{ 
                  color: '#eab308', 
                  fillColor: '#eab308', 
                  fillOpacity: 0.4, 
                  dashArray: '10, 10', 
                  className: 'animate-pulse' 
                }}
              >
                <Popup>
                  <div className="p-2 w-[220px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 animate-ping"></div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-yellow-600 m-0">AI Prediction: {pred.type}</h4>
                    </div>
                    <p className="text-[11px] text-zinc-600 m-0 mb-2">
                      <span className="font-bold text-red-600">Risk:</span> {pred.risk_level}<br/>
                      <span className="font-bold">ETA:</span> {pred.time_to_impact}<br/>
                      <span className="font-bold">Zone:</span> {pred.barangay}
                    </p>
                    <div className="w-full bg-yellow-100 p-2 rounded text-[10px] text-yellow-800 font-mono">
                      Algorithm detected rising water levels intersecting with topography.
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {activeLayers.floodRisk && liveIncidents.filter((i:any) => i.type?.includes('Flood')).map(inc => (
              <Circle key={`risk-${inc.id}`} center={[inc.lat, inc.lng]} radius={1200} pathOptions={{ fillColor: '#06b6d4', color: '#06b6d4', fillOpacity: 0.15, weight: 1, dashArray: '5, 5' }} />
            ))}

            {/* Marker Layers */}
            {activeLayers.incidents && filteredIncidents.map(inc => (
              <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={inc.severity === 'Critical' ? icons.critical : inc.severity === 'High' ? icons.high : icons.medium}>
                <Popup className="custom-popup rounded-xl">
                  <div className="p-2 w-64">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-[10px] font-mono text-zinc-500">{inc.id}</div>
                      <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${inc.severity === 'Critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>{inc.severity}</div>
                    </div>
                    <h3 className="font-bold text-lg text-zinc-900 leading-tight m-0 mb-1">{inc.type}</h3>
                    <p className="text-sm text-zinc-600 m-0 mb-4">{inc.brgy}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-zinc-50 rounded p-2 border border-zinc-100">
                        <div className="text-[9px] uppercase text-zinc-400 font-bold mb-1">Status</div>
                        <div className="text-xs font-semibold text-blue-600">{inc.status}</div>
                      </div>
                      <div className="bg-zinc-50 rounded p-2 border border-zinc-100">
                        <div className="text-[9px] uppercase text-zinc-400 font-bold mb-1">Reporter</div>
                        <div className="text-xs font-semibold text-zinc-700 truncate">{inc.reporter}</div>
                      </div>
                    </div>

                    <button onClick={() => setSelectedIncident(inc)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-md text-xs font-bold transition-colors">
                      Open Command Detail
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* EVACUATION CENTERS LAYER */}
            {activeLayers.evac && evacCenters.map(evac => (
              <Marker key={evac.id} position={[evac.lat, evac.lng]} icon={icons.evac}>
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-sm text-zinc-900 m-0 mb-1">{evac.name}</h3>
                    <div className="w-full bg-zinc-200 rounded-full h-1.5 mb-1 mt-2">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${evac.capacity}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 m-0 text-right">{evac.capacity}% Full</p>
                    
                    <div className="mt-2 border-t border-zinc-200 pt-2 space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-600">
                        <span>FOOD</span>
                        <span className={evac.food_level < 30 ? 'text-red-500' : ''}>{evac.food_level || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1">
                        <div className={`h-1 rounded-full ${evac.food_level < 30 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${evac.food_level || 0}%` }}></div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-600 mt-1">
                        <span>WATER</span>
                        <span className={evac.water_level < 30 ? 'text-red-500' : ''}>{evac.water_level || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1">
                        <div className={`h-1 rounded-full ${evac.water_level < 30 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${evac.water_level || 0}%` }}></div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-600 mt-1">
                        <span>MEDS</span>
                        <span className={evac.medicine_level < 30 ? 'text-red-500' : ''}>{evac.medicine_level || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1">
                        <div className={`h-1 rounded-full ${evac.medicine_level < 30 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${evac.medicine_level || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {activeLayers.responders && liveResponders.map(res => (
              <Marker key={res.id} position={[res.lat, res.lng]} icon={icons.responder}>
                <Popup><div className="font-bold text-sm text-center">{res.unit_name}<br/><span className="text-blue-500 text-xs">{res.status}</span></div></Popup>
              </Marker>
            ))}

            {/* ALGORITHMIC ROUTING: Draw lines from responder to incident if dispatched */}
            {activeLayers.responders && activeLayers.incidents && liveIncidents.filter((inc:any) => inc.status?.includes('Dispatched')).map((inc:any) => {
              const unitNameMatch = inc.status.replace('Dispatched: ', '').trim();
              const responder = liveResponders.find(r => r.unit_name === unitNameMatch);
              if (responder) {
                return (
                  <Polyline 
                    key={`route-${inc.id}`} 
                    positions={[[responder.lat, responder.lng], [inc.lat, inc.lng]]} 
                    pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 15', className: 'animate-pulse' }} 
                  />
                );
              }
              return null;
            })}
          </MapContainer>

          {/* Map Footer Telemetry */}
          <div className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-[10px] text-zinc-400 font-mono tracking-wider shrink-0 z-10">
            <div className="flex items-center gap-4">
              <span>EPSG:4326</span>
              <span>10.1866° N, 122.8587° E</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> OpenWeather API Connected</span>
              <span>Scale: 1:25,000</span>
            </div>
          </div>
        </div>

        {/* PANE 3: RIGHT ANALYTICS PANEL */}
        <Card className="w-80 flex flex-col hidden 2xl:flex border-l border-y-0 border-r-0 rounded-none border-zinc-200 dark:border-zinc-800 shadow-none z-10 relative bg-white/60 dark:bg-zinc-950/60 backdrop-blur-2xl shrink-0">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Real-Time Analytics</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg text-center shadow-sm">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{liveIncidents.length}</div>
                <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1">Active Alerts</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg text-center shadow-sm">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{liveResponders.length}</div>
                <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">Units Deployed</div>
              </div>
            </div>

            {/* AI Verification Preview */}
            <div>
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Eye className="h-3 w-3" /> AI Verification Feed
              </h3>
              {selectedIncident ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-video group">
                  {selectedIncident.image ? (
                    <>
                      <img src={selectedIncident.image} alt={selectedIncident.type} className="w-full h-full object-cover opacity-80" />
                      {/* Dynamic AI Bounding Box Simulation */}
                      <div className="absolute top-[20%] left-[25%] w-[50%] h-[60%] border-2 border-red-500 bg-red-500/20">
                        <div className="absolute -top-5 left-0 bg-red-500 text-white text-[8px] font-mono px-1 py-0.5 whitespace-nowrap">
                          {selectedIncident.type?.toUpperCase().replace(/[^A-Z]/g, '_') || 'UNKNOWN'}_DETECTED: {selectedIncident.confidence}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <Camera className="h-8 w-8 text-zinc-500 mb-2" />
                      <span className="text-xs text-zinc-400">No visual telemetry</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                    <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {selectedIncident.brgy} Node
                    </div>
                    {selectedIncident.image && (
                      <button onClick={()=>alert('AI Verification confirmed.')} className="bg-white text-zinc-900 text-[10px] font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg aspect-video flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-xs text-zinc-500">Select an incident to view feed</span>
                </div>
              )}
            </div>

            {/* Incident Trend Chart */}
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" /> 24-Hour Incident Velocity
              </h3>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111115', border: '1px solid #333', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorIncidents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
}

// --- HELPER COMPONENT FOR LAYER TOGGLES ---
function LayerToggle({ label, count, color, checked, onChange }: any) {
  return (
    <label className="flex items-center justify-between cursor-pointer group p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-md transition-colors">
      <div className="flex items-center gap-3">
        <div className={`relative flex items-center justify-center w-4 h-4 rounded border ${checked ? 'border-transparent ' + color : 'border-zinc-300 dark:border-zinc-700'}`}>
          <input type="checkbox" checked={checked} onChange={onChange} className="absolute opacity-0 w-full h-full cursor-pointer" />
          {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
        </div>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 flex items-center gap-2">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{count}</span>
      )}
    </label>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// --- MAP FLY-TO CONTROLLER ---
function MapController({ liveIncidents }: { liveIncidents: any[] }) {
  const map = useMap();
  const prevIncidentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (liveIncidents.length === 0) return;
    
    // Check for NEW critical incidents
    const newIncidents = liveIncidents.filter(inc => !prevIncidentIds.current.has(inc.id));
    const newSOS = newIncidents.find(inc => inc.severity === 'Critical');
    
    if (newSOS && prevIncidentIds.current.size > 0) { // Only fly if it's a genuine new update, not initial load
      map.flyTo([newSOS.lat, newSOS.lng], 16, { animate: true, duration: 1.5 });
    }

    prevIncidentIds.current = new Set(liveIncidents.map(inc => inc.id));
  }, [liveIncidents, map]);

  return null;
}