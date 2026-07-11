import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Layers, MapPin, Search, Filter, AlertTriangle, Home, 
  Activity, Radio, ShieldAlert, Zap, Thermometer, Wind,
  Navigation, Crosshair, Clock, BarChart3, Camera, Eye
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, ZoomControl, useMap } from "react-leaflet";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";

// ==========================================
// 1. SPATIAL DATA & MOCK TELEMETRY
// ==========================================
const MAP_CENTER: [number, number] = [10.1866, 122.8587]; // Binalbagan Municipal Hall

const LIVE_INCIDENTS = [
  { id: 'INC-1043', type: "Flood", brgy: "Brgy. San Teodoro", lat: 10.1810, lng: 122.8500, severity: "High", status: "Active", time: "10 mins ago", reporter: "Kap. Teodoro" },
  { id: 'INC-1044', type: "Landslide", brgy: "Brgy. Payao", lat: 10.1550, lng: 122.8800, severity: "Critical", status: "Dispatching", time: "2 mins ago", reporter: "AI Drone Node 4" },
  { id: 'INC-1045', type: "Road Block", brgy: "Brgy. Enclaro", lat: 10.1950, lng: 122.8400, severity: "Medium", status: "Assessing", time: "1 hr ago", reporter: "Civilian (Verified)" },
];

const EVACUATION_CENTERS = [
  { id: 'EVAC-01', name: "Binalbagan National High School", lat: 10.1904, lng: 122.8581, capacity: 85, total: 1000, status: "Open", generator: true },
  { id: 'EVAC-02', name: "San Isidro Labrador Church", lat: 10.1877, lng: 122.8589, capacity: 40, total: 500, status: "Open", generator: false },
];

const ACTIVE_RESPONDERS = [
  { id: 'RES-ALPHA', type: "Rescue Boat", lat: 10.1830, lng: 122.8520, status: "En Route" },
  { id: 'RES-BRAVO', type: "Ambulance", lat: 10.1866, lng: 122.8550, status: "Available" },
];

const TREND_DATA = [
  { time: '08:00', incidents: 2 }, { time: '10:00', incidents: 5 }, { time: '12:00', incidents: 12 },
  { time: '14:00', incidents: 8 }, { time: '16:00', incidents: 15 }, { time: '18:00', incidents: 18 },
];

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
export default function GisDashboard() {
  const [activeLayers, setActiveLayers] = useState({
    incidents: true, evac: true, responders: true, floodRisk: false, weatherRadar: true
  });
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Real-time clock for EOC realism
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4 font-sans">
      
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
            System Live &bull; Binalbagan Node &bull; {currentTime}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-md text-sm font-bold shadow-md hover:opacity-90 transition-opacity flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Issue Mass Alert
          </button>
        </div>
      </div>

      {/* THREE-PANE ARCHITECTURE */}
      <div className="flex flex-1 gap-4 overflow-hidden relative">
        
        {/* PANE 1: LEFT CONTROL PANEL */}
        <Card className="w-80 flex flex-col hidden xl:flex border-zinc-200 dark:border-zinc-800 shadow-sm z-10 relative bg-white/95 dark:bg-[#111115]/95 backdrop-blur-md shrink-0">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input type="text" placeholder="Search coordinates, ID, Brgy..." className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-md pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none text-zinc-900 dark:text-zinc-50 transition-shadow" />
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Operational Layers */}
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="h-3 w-3" /> Operational Layers
              </h3>
              <div className="space-y-3 pl-1">
                <LayerToggle label="Active Incidents" count={12} color="bg-red-500" checked={activeLayers.incidents} onChange={() => toggleLayer('incidents')} />
                <LayerToggle label="Evacuation Centers" count={4} color="bg-emerald-500" checked={activeLayers.evac} onChange={() => toggleLayer('evac')} />
                <LayerToggle label="Live Responders" count={8} color="bg-blue-500" checked={activeLayers.responders} onChange={() => toggleLayer('responders')} />
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
              </div>
            </div>

            {/* AI Incident Feed */}
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="h-3 w-3" /> Priority Feed
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {LIVE_INCIDENTS.map(incident => (
                    <motion.div 
                      key={incident.id} 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
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
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{incident.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </Card>

        {/* PANE 2: THE GIS MAP CORE */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-900 flex flex-col">
          
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
            {activeLayers.floodRisk && LIVE_INCIDENTS.map(inc => (
              <Circle key={`risk-${inc.id}`} center={[inc.lat, inc.lng]} radius={1200} pathOptions={{ fillColor: '#06b6d4', color: '#06b6d4', fillOpacity: 0.15, weight: 1, dashArray: '5, 5' }} />
            ))}

            {/* Marker Layers */}
            {activeLayers.incidents && LIVE_INCIDENTS.map(inc => (
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

                    <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-md text-xs font-bold transition-colors">
                      Open Command Detail
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {activeLayers.evac && EVACUATION_CENTERS.map(evac => (
              <Marker key={evac.id} position={[evac.lat, evac.lng]} icon={icons.evac}>
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-sm text-zinc-900 m-0 mb-1">{evac.name}</h3>
                    <div className="w-full bg-zinc-200 rounded-full h-1.5 mb-1 mt-2">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${evac.capacity}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 m-0 text-right">{evac.capacity}% Full</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {activeLayers.responders && ACTIVE_RESPONDERS.map(res => (
              <Marker key={res.id} position={[res.lat, res.lng]} icon={icons.responder}>
                <Popup><div className="font-bold text-sm text-center">{res.type}<br/><span className="text-blue-500 text-xs">{res.status}</span></div></Popup>
              </Marker>
            ))}
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
        <Card className="w-80 flex flex-col hidden 2xl:flex border-zinc-200 dark:border-zinc-800 shadow-sm z-10 relative bg-white/95 dark:bg-[#111115]/95 backdrop-blur-md shrink-0">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Real-Time Analytics</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 p-3 rounded-lg text-center">
                <div className="text-2xl font-black text-red-600 dark:text-red-400">{LIVE_INCIDENTS.length}</div>
                <div className="text-[9px] font-bold text-red-800/70 dark:text-red-400/70 uppercase tracking-widest mt-1">Active Alerts</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg text-center">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{ACTIVE_RESPONDERS.length}</div>
                <div className="text-[9px] font-bold text-blue-800/70 dark:text-blue-400/70 uppercase tracking-widest mt-1">Units Deployed</div>
              </div>
            </div>

            {/* AI Verification Preview */}
            <div>
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Eye className="h-3 w-3" /> AI Verification Feed
              </h3>
              <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-video group">
                <img src="https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80" alt="Flood" className="w-full h-full object-cover opacity-60" />
                
                {/* AI Bounding Box Simulation */}
                <div className="absolute top-[20%] left-[30%] w-[40%] h-[50%] border-2 border-red-500 bg-red-500/20">
                  <div className="absolute -top-5 left-0 bg-red-500 text-white text-[8px] font-mono px-1 py-0.5">FLOOD_DETECTED: 98%</div>
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Drone Node 4
                  </div>
                  <button className="bg-white text-zinc-900 text-[10px] font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    Verify
                  </button>
                </div>
              </div>
            </div>

            {/* Incident Trend Chart */}
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" /> 24-Hour Incident Velocity
              </h3>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={TREND_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
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