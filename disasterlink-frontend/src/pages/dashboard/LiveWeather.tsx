import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CloudRain, Wind, Droplets, AlertTriangle, 
  Map as MapIcon, Activity, ShieldAlert,
  Thermometer, Gauge, Zap, Loader2, RefreshCw, Send, X, CheckCircle, Info
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle } from "react-leaflet";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";

// --- TYPES & CONSTANTS ---
interface WeatherData {
  current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; surface_pressure: number; };
  hourly: { time: string[]; precipitation: number[]; };
}

const TCWS_SIGNALS = [
  { level: 1, active: true }, { level: 2, active: true }, { level: 3, active: false }, { level: 4, active: false }, { level: 5, active: false },
];

const HAZARD_MATRIX = [
  { name: "Flood Risk", level: "High", color: "bg-red-500", percent: 85 },
  { name: "Landslide", level: "Medium", color: "bg-amber-500", percent: 45 },
  { name: "Storm Surge", level: "Low", color: "bg-emerald-500", percent: 15 },
  { name: "Heat Index", level: "Warning", color: "bg-orange-500", percent: 70 },
];

const binalbaganCoords: [number, number] = [10.1866, 122.8587];

// --- MODULAR COMPONENTS ---

const WeatherMap = () => (
  <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden col-span-1 lg:col-span-2 relative h-[500px]">
    <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center gap-2">
      <MapIcon className="h-4 w-4 text-red-500" />
      <span className="text-sm font-bold tracking-wider text-zinc-900 dark:text-zinc-50 uppercase">GIS Radar Module</span>
    </div>
    
    <MapContainer center={binalbaganCoords} zoom={10} className="h-full w-full z-0" zoomControl={false}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Dark Satellite (Default)">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Topographical Terrain">
          <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Simulated Approaching Storm Front */}
      <Circle center={[10.05, 123.00]} radius={15000} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, dashArray: '10, 10' }} />
      <Circle center={[10.05, 123.00]} radius={8000} pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.2 }} />
      
      {/* Binalbagan Center */}
      <Marker position={binalbaganCoords} icon={L.divIcon({ className: 'bg-blue-500 h-4 w-4 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)]' })}>
        <Popup>Binalbagan MDRRMO Center</Popup>
      </Marker>
    </MapContainer>
  </Card>
);

const CycloneTracker = () => {
  // Live Telemetry Engine (Updates every 3 seconds to look like real sensor data)
  const [telemetry, setTelemetry] = useState({ wind: 120, gust: 150, dist: 285.4 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        wind: prev.wind + (Math.random() > 0.5 ? 1 : -1),
        gust: prev.gust + (Math.random() > 0.5 ? 2 : -2),
        dist: Math.max(0, Number((prev.dist - 0.1).toFixed(1))) // Storm slowly moving closer
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-lg border-red-500/30 dark:border-red-500/30 bg-gradient-to-br from-white to-red-50 dark:from-[#111115] dark:to-red-950/20 relative overflow-hidden h-[500px] col-span-1">
      <div className="absolute -right-12 -top-12 opacity-5 animate-[spin_20s_linear_infinite]">
        <AlertTriangle className="w-64 h-64 text-red-500" />
      </div>
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 uppercase tracking-wider text-sm">
          <Activity className="h-4 w-4 animate-pulse" /> Live Cyclone Telemetry
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-6">
        <div>
          <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">TY "AGHON"</h2>
          <span className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">SEVERE TROPICAL STORM</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm transition-all">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Max Sustained</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{telemetry.wind} km/h</div>
          </div>
          <div className="bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm transition-all">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Gustiness</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{telemetry.gust} km/h</div>
          </div>
          <div className="bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Movement</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">NW @ 15 km/h</div>
          </div>
          <div className="bg-white/50 dark:bg-black/50 p-3 rounded-lg border border-red-500/30 backdrop-blur-sm transition-all">
            <div className="text-xs text-red-500 dark:text-red-400 mb-1">Dist. to Center</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{telemetry.dist} km</div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-sm font-semibold mb-3">TCWS Active Signals</div>
          <div className="flex gap-2">
            {TCWS_SIGNALS.map((sig) => (
              <div key={sig.level} className={`flex-1 text-center py-2 rounded border transition-colors ${sig.active ? 'bg-amber-500 border-amber-600 text-amber-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 font-bold'}`}>
                #{sig.level}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function LiveWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [chartData, setChartData] = useState<{time: string, rain: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  // Broadcast Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchWeather = async () => {
    setLoading(true);
    try {
      // Free Open-Meteo API (No Key Required) targeting Binalbagan
      const url = "https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure&hourly=precipitation&timezone=Asia%2FManila&forecast_days=2";
      const response = await fetch(url);
      const data = await response.json();
      
      setWeather(data);
      
      // Parse Hourly Precipitation for the Chart
      const now = new Date();
      const currentHourIndex = data.hourly.time.findIndex((t: string) => new Date(t) >= now);
      const startIndex = currentHourIndex > -1 ? currentHourIndex : 0;
      
      const upcomingRain = data.hourly.time
        .slice(startIndex, startIndex + 24)
        .map((t: string, i: number) => ({
            time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rain: data.hourly.precipitation[startIndex + i]
        }))
        .filter((_: any, i: number) => i % 3 === 0); // Every 3 hours
        
      setChartData(upcomingRain);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 min refresh
    return () => clearInterval(interval);
  }, []);

  const handleSendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    setIsBroadcasting(true);
    // Simulate Network Request
    setTimeout(() => {
      setIsBroadcasting(false);
      setIsBroadcastOpen(false);
      setBroadcastMsg("");
      showToast(`Emergency alert successfully broadcasted to ${broadcastTarget === 'all' ? 'All Barangays' : broadcastTarget}.`, 'success');
    }, 2000);
  };

  if (loading && !weather) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-red-500" />
        <p className="font-mono text-sm tracking-widest uppercase animate-pulse">Establishing Satellite Uplink...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8 relative">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -50 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[999]">
            <div className={`px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md border ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-blue-600/90 border-blue-400 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              <span className="font-bold text-sm">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMERGENCY BROADCAST MODAL */}
      <AnimatePresence>
        {isBroadcastOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBroadcastOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden">
              <div className="bg-red-600 p-4 flex items-center justify-between text-white">
                <h3 className="font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Issue Emergency Broadcast</h3>
                <button onClick={() => setIsBroadcastOpen(false)} className="hover:bg-red-700 p-1 rounded-full transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Target Audience</label>
                  <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500">
                    <option value="all">Entire Municipality (All Barangays)</option>
                    <option value="Brgy. San Teodoro">Brgy. San Teodoro Only</option>
                    <option value="Brgy. Payao">Brgy. Payao Only</option>
                    <option value="Brgy. Progreso">Brgy. Progreso Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Broadcast Message (SMS & App Push)</label>
                  <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder="Type official emergency advisory here..." className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500 h-32 resize-none"></textarea>
                </div>
                <button onClick={handleSendBroadcast} disabled={isBroadcasting || !broadcastMsg.trim()} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                  {isBroadcasting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {isBroadcasting ? "Transmitting Alert..." : "Transmit Official Broadcast"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Disaster Weather Intelligence</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Telemetry synchronized. Last API fetch: <span className="font-mono">{lastUpdated}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchWeather} disabled={loading} className="flex items-center justify-center h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsBroadcastOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <ShieldAlert className="h-4 w-4" /> Issue Broadcast
          </button>
        </div>
      </div>

      {/* TOP METRICS (HERO) - POWERED BY FREE OPEN-METEO API */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-zinc-900 dark:bg-black text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-5">
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Thermometer className="h-4 w-4 text-blue-400"/> Current Air Temp</div>
              <div className="text-4xl font-black tracking-tighter">{weather?.current.temperature_2m.toFixed(1)}°C</div>
              <div className="text-sm text-zinc-500 mt-1">Feels like {weather?.current.apparent_temperature.toFixed(1)}°C</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-zinc-900 dark:bg-black text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-5">
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-300"/> Humidity</div>
              <div className="text-4xl font-black tracking-tighter">{weather?.current.relative_humidity_2m}%</div>
              <div className="text-sm text-blue-400 mt-1 font-medium">Real-time RH levels</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-zinc-900 dark:bg-black text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-5">
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Wind className="h-4 w-4 text-zinc-300"/> Avg Wind Speed</div>
              <div className="text-4xl font-black tracking-tighter">{weather?.current.wind_speed_10m.toFixed(1)} <span className="text-lg font-normal text-zinc-500">km/h</span></div>
              <div className="text-sm text-zinc-500 mt-1">Sustained at 10m height</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-zinc-900 dark:bg-black text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-5">
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Gauge className="h-4 w-4 text-amber-500"/> Pressure</div>
              <div className="text-4xl font-black tracking-tighter">{weather?.current.surface_pressure.toFixed(0)} <span className="text-lg font-normal text-zinc-500">hPa</span></div>
              <div className="text-sm text-amber-500 mt-1 font-medium flex items-center gap-1">Surface Level</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="hidden lg:block">
           <Card className="bg-red-600 text-white border-none shadow-md overflow-hidden relative h-full flex flex-col justify-center items-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="relative z-10 text-center">
              <div className="text-xl font-black tracking-widest mb-1">DEFCON</div>
              <div className="text-5xl font-black">3</div>
              <div className="text-[10px] uppercase tracking-widest mt-2 font-bold opacity-80">Elevated Readiness</div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* MIDDLE SECTION: MAP & CYCLONE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeatherMap />
        <CycloneTracker />
      </div>

      {/* BOTTOM SECTION: ANALYTICS & HAZARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rainfall Forecast Chart */}
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400">24-Hour Precipitation Model (mm)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111115', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="rain" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRain)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hazard Matrix Cards */}
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> AI Hazard Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {HAZARD_MATRIX.map((hazard) => (
              <div key={hazard.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{hazard.name}</span>
                  <span className={`font-bold ${hazard.color.replace('bg-', 'text-')}`}>{hazard.level}</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className={`${hazard.color} h-full rounded-full`} style={{ width: `${hazard.percent}%` }}></div>
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" /> Action Recommendation
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                High flood probability in low-lying areas (Purok 4, Riverside) within the next 12 hours. Pre-emptive evacuation sequence recommended.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}