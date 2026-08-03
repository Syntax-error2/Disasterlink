import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Home, Users, CloudLightning, TrendingUp, Activity, ShieldAlert, Loader2, RefreshCw, ThermometerSun, Clock, Plus, X, MapPin, Crosshair, Search } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import axiosInstance from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
function LocationPicker({ position, setPosition }: { position: [number, number] | null, setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
  });
  
  const icon = L.divIcon({
    className: "bg-transparent",
    html: `<div class="h-6 w-6 bg-emerald-500 rounded-full border-[3px] border-white shadow-[0_0_15px_rgba(16,185,129,0.9)] animate-pulse"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return position ? <Marker position={position} icon={icon} /> : null;
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { animate: true, duration: 1 });
    }
  }, [center, map]);
  return null;
}

// --- HELPER FUNCTIONS ---
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Critical": return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 animate-pulse";
    case "High": return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "Medium": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "Low": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default: return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400";
  }
};

const getStatusIndicator = (status: string) => {
  if (!status) return <div className="h-2 w-2 rounded-full bg-zinc-400 mr-2" />;
  if (status.includes("Resolved")) return <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />;
  if (status.includes("Dispatch")) return <div className="h-2 w-2 rounded-full bg-blue-500 mr-2 animate-ping" />;
  if (status.includes("Review")) return <div className="h-2 w-2 rounded-full bg-amber-500 mr-2 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />;
  return <div className="h-2 w-2 rounded-full bg-zinc-400 mr-2" />;
};

const timeAgo = (dateString: string) => {
  if (!dateString) return "Just now";
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hrs ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "Just now";
};

export default function Overview() {
  const { user } = useAuth();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weatherTemp, setWeatherTemp] = useState<string>("--");
  const [weatherWind, setWeatherWind] = useState<string>("--");
  
  // LIVE DATABASE STATE
  const [rawIncidents, setRawIncidents] = useState<any[]>([]);
  const [activeIncidentCount, setActiveIncidentCount] = useState(0);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  
  // NEW ANALYTICS & EVAC CENTERS STATE
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeBarangays, setActiveBarangays] = useState(0);
  const [demographics, setDemographics] = useState<any[]>([]);
  const [evacCentersData, setEvacCentersData] = useState<any[]>([]);
  
  // MODAL STATE
  const [showEvacModal, setShowEvacModal] = useState(false);
  const [isSubmittingEvac, setIsSubmittingEvac] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [evacForm, setEvacForm] = useState<{name: string, location: string, capacity: number, current_occupants: number, status: string, lat?: number, lng?: number}>({ name: '', location: '', capacity: 100, current_occupants: 0, status: 'Active' });

  // BROADCAST STATE
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // ==========================================
  // DATA PROCESSING ENGINE
  // ==========================================
  const processDatabaseRecords = (data: any[]) => {
    // 1. Calculate Active Incidents
    const active = data.filter(inc => !inc.status.includes("Resolved")).length;
    setActiveIncidentCount(active);

    // 2. Calculate Severity Distribution (Pie Chart)
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    data.forEach(inc => {
      const sev = inc.severity_level as keyof typeof counts;
      if (counts[sev] !== undefined) counts[sev]++;
    });
    setSeverityData([
      { name: "Critical", value: counts.Critical, color: "#dc2626" },
      { name: "High", value: counts.High, color: "#f97316" },
      { name: "Medium", value: counts.Medium, color: "#f59e0b" },
      { name: "Low", value: counts.Low, color: "#10b981" },
    ].filter(item => item.value > 0)); // Only show slices that have data

    // 3. Calculate 7-Day Trends (Bar Chart) - FIX: Use EXACT last 7 calendar days
    const trends = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { 
        day: d.toLocaleDateString('en-US', { weekday: 'short' }), 
        dateStr: d.toDateString(),
        incidents: 0, 
        resolved: 0 
      };
    });
    
    data.forEach(inc => {
      if (!inc.created_at) return;
      const incDate = new Date(inc.created_at).toDateString();
      const trendItem = trends.find(t => t.dateStr === incDate);
      
      if (trendItem) {
        trendItem.incidents++;
        if (inc.status.includes("Resolved")) trendItem.resolved++;
      }
    });
    setTrendData(trends);

    // 4. Get 5 Most Recent for the Table
    const sortedRecent = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentIncidents(sortedRecent.slice(0, 5));
  };

  // ==========================================
  // FETCH OPERATION
  // ==========================================
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    
    // Fetch Local Weather Data (Independent)
    try {
      const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,wind_speed_10m&timezone=Asia%2FManila";
      const weatherResponse = await fetch(weatherUrl);
      if (weatherResponse.ok) {
         const wData = await weatherResponse.json();
         setWeatherTemp(wData.current.temperature_2m.toFixed(1));
         setWeatherWind(wData.current.wind_speed_10m.toFixed(1));
      }
    } catch (error) {
      console.warn("Weather fetch failed.", error);
    }

    try {
      // Fetch Real Incident Data from Laravel
      const dbResponse = await axiosInstance.get("/incidents");
      const dbIncidents = dbResponse.data.data ? dbResponse.data.data : dbResponse.data;
      setRawIncidents(dbIncidents);
      processDatabaseRecords(dbIncidents);

      // Fetch Stats & Evacuation Centers
      try {
        const statsRes = await axiosInstance.get("/dashboard/stats");
        setTotalUsers(statsRes.data.total_users);
        setActiveBarangays(statsRes.data.active_barangays);
        setDemographics(statsRes.data.demographics || []);
        
        const evacRes = await axiosInstance.get("/evacuation-centers");
        setEvacCentersData(evacRes.data);

        const broadcastRes = await axiosInstance.get("/broadcast");
        if (broadcastRes.data.broadcast) {
            setActiveBroadcast(broadcastRes.data.broadcast);
            setActiveBroadcastId(broadcastRes.data.broadcast_id);
            const dismissed = sessionStorage.getItem(`dismissed_dashboard_broadcast_${broadcastRes.data.broadcast_id}`);
            if (dismissed === "true") {
                setIsBannerDismissed(true);
            } else {
                setIsBannerDismissed(false);
            }
        } else {
            setActiveBroadcast(null);
            setActiveBroadcastId(null);
        }
      } catch (err) {
        console.warn("Could not fetch new analytics (Endpoints may not exist yet)", err);
      }
    } catch (error) {
      console.error("Dashboard sync failed. Ensure Laravel backend is running.", error);
    } finally {
      setIsRefreshing(false); 
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh dashboard every 15 seconds to ensure command center is always accurate
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const searchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setEvacForm(prev => ({
          ...prev, 
          lat: parseFloat(data[0].lat), 
          lng: parseFloat(data[0].lon)
        }));
      } else {
        alert("Location not found. Try a different search term.");
      }
    } catch (e) {
      alert("Failed to search location.");
    } finally {
      setIsSearching(false);
    }
  };

  const submitEvacuationCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEvac(true);
    try {
      await axiosInstance.post("/evacuation-centers", evacForm);
      setShowEvacModal(false);
      setEvacForm({ name: '', location: '', capacity: 100, current_occupants: 0, status: 'Active' });
      fetchDashboardData(); // Refresh immediately
    } catch (err) {
      console.error(err);
      alert("Failed to create Evacuation Center.");
    } finally {
      setIsSubmittingEvac(false);
    }
  };

  const totalEvacCapacity = evacCentersData.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalEvacOccupants = evacCentersData.reduce((acc, curr) => acc + curr.current_occupants, 0);
  const evacOccupancyRate = totalEvacCapacity > 0 ? Math.round((totalEvacOccupants / totalEvacCapacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 pb-8 animate-in fade-in duration-500 relative">
      
      {/* ACTIVE BROADCAST BANNER */}
      <AnimatePresence>
        {activeBroadcast && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`w-full p-4 rounded-xl flex items-center gap-3 border shadow-sm backdrop-blur-md ${
              activeBroadcast.includes('RED') || activeBroadcast.includes('EARTHQUAKE') || activeBroadcast.includes('VOLCANIC') || activeBroadcast.includes('CYCLONE')
                ? 'bg-red-500/10 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' 
                : activeBroadcast.includes('ORANGE')
                  ? 'bg-orange-500/10 border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400'
                  : activeBroadcast.includes('YELLOW')
                    ? 'bg-yellow-500/10 border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                    : 'bg-blue-500/10 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400'
            }`}
          >
            <ShieldAlert className="h-6 w-6 shrink-0 animate-pulse" />
            <div className="flex-1 font-semibold text-sm">
              {activeBroadcast}
            </div>
            <Badge variant="outline" className="bg-transparent uppercase tracking-wider text-[10px] border-current opacity-70">Automated Warning</Badge>
            <button 
              onClick={() => {
                setIsBannerDismissed(true);
                if (activeBroadcastId) {
                   sessionStorage.setItem(`dismissed_dashboard_broadcast_${activeBroadcastId}`, "true");
                }
              }}
              className="ml-2 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAY FOR EVACUATION CENTER */}
      {createPortal(
        <AnimatePresence>
          {showEvacModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white"><Home className="text-emerald-500"/> Add Evacuation Center</h2>
                <button onClick={() => setShowEvacModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={submitEvacuationCenter} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Center Name</label>
                  <input type="text" required value={evacForm.name} onChange={e => setEvacForm({...evacForm, name: e.target.value})} placeholder="e.g. Binalbagan Covered Court" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Barangay / Area Name</label>
                  <input type="text" required value={evacForm.location} onChange={e => setEvacForm({...evacForm, location: e.target.value})} placeholder="e.g. Brgy. San Teodoro" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex justify-between items-center">
                    <span>Pin Exact Location on Map</span>
                    {evacForm.lat && <span className="text-emerald-500 text-xs flex items-center font-bold"><MapPin className="h-3 w-3 mr-1"/> GPS Locked</span>}
                  </label>

                  <div className="h-[220px] w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0 shadow-inner bg-zinc-100 dark:bg-zinc-900">
                    
                    {/* FLOATING SEARCH BAR */}
                    <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
                      <div className="relative flex-1 shadow-lg rounded-lg">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
                          placeholder="Search area (e.g. Binalbagan Plaza)" 
                          className="w-full bg-white dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-700 py-2 pl-9 pr-3 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm"
                        />
                      </div>
                      <button type="button" onClick={searchLocation} disabled={isSearching} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                      </button>
                    </div>

                    <MapContainer center={MAP_CENTER} zoom={14} className="h-full w-full" zoomControl={false}>
                      <TileLayer 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <MapUpdater center={evacForm.lat ? [evacForm.lat, evacForm.lng!] : null} />
                      <LocationPicker 
                         position={evacForm.lat ? [evacForm.lat, evacForm.lng!] : null} 
                         setPosition={(p) => setEvacForm({...evacForm, lat: p[0], lng: p[1]})} 
                      />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Search for a location, or manually tap anywhere on the map to drop the pin.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Max Capacity</label>
                    <input type="number" required min="1" value={evacForm.capacity} onChange={e => setEvacForm({...evacForm, capacity: parseInt(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Occupants</label>
                    <input type="number" required min="0" value={evacForm.current_occupants} onChange={e => setEvacForm({...evacForm, current_occupants: parseInt(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-sm" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmittingEvac} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20">
                  {isSubmittingEvac ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deploy Evacuation Center"}
                </button>
              </form>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {/* HEADER: Enterprise Title Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">LGU Command Center</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Real-time disaster intelligence for Binalbagan and surrounding municipalities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center justify-center h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-1.5 px-3 shadow-sm">
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">System Live</span>
          </div>
        </div>
      </div>

      {/* KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-red-500/10 p-2 rounded-md"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" /></div>
              {activeIncidentCount > 0 && <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping"></span>}
            </div>
            <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-1">{activeIncidentCount}</h3>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active Incidents</p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-blue-500/10 p-2 rounded-md"><Users className="h-5 w-5 text-blue-600 dark:text-blue-500" /></div>
            </div>
            <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-1">{totalUsers.toLocaleString()}</h3>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Registered Citizens</p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/10 p-2 rounded-md"><Home className="h-5 w-5 text-emerald-600 dark:text-emerald-500" /></div>
                  <button onClick={() => setShowEvacModal(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded p-1.5 transition-colors"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <h3 className="text-3xl font-black text-zinc-900 dark:text-white">{evacOccupancyRate}%</h3>
              <span className="text-sm font-semibold text-zinc-400 pb-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Cap</span>
            </div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Evacuation Centers</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-amber-500/10 p-2 rounded-md"><ThermometerSun className="h-5 w-5 text-amber-600 dark:text-amber-500" /></div>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <h3 className="text-3xl font-black text-zinc-900 dark:text-white">{weatherTemp}°c</h3>
              <span className="text-sm font-semibold text-zinc-400 pb-1">/ {weatherWind}km/h</span>
            </div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Current Weather</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115]">
          <CardHeader>
            <CardTitle>7-Day Incident Trends</CardTitle>
            <CardDescription>Comparison of reported vs. resolved incidents based on live data.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#71717a', opacity: 0.1 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="incidents" name="Reported" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-[#111115]">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Current database incidents by threat level.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <div className="h-[300px] w-full">
              {severityData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No severity data recorded yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DEMOGRAPHICS ROW */}
      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115]">
        <CardHeader>
          <CardTitle>Citizen Demographics</CardTitle>
          <CardDescription>Distribution of verified citizens across participating Barangays.</CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[320px] w-full mt-4">
            {demographics.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No demographic data recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demographics} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.15} />
                  <XAxis dataKey="barangay" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a', fontWeight: 500 }} />
                  <RechartsTooltip 
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  />
                  <Area type="monotone" dataKey="users" name="Registered Citizens" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" animationDuration={1500} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RECENT INCIDENTS TABLE */}
      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Live Incident Feed 
              {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            </CardTitle>
            <CardDescription>The most recent community reports synchronized from the database.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="w-[100px] px-4 font-black uppercase text-xs">Report ID</TableHead>
                <TableHead className="font-black uppercase text-xs">Location & Time</TableHead>
                <TableHead className="font-black uppercase text-xs">Category</TableHead>
                <TableHead className="font-black uppercase text-xs">Severity</TableHead>
                <TableHead className="text-right px-4 font-black uppercase text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">No incident records found in the database.</TableCell>
                </TableRow>
              ) : (
                recentIncidents.map((incident) => (
                  <TableRow key={incident.id} className={`transition-colors cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}>
                    <TableCell className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 px-4">
                      #{incident.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{incident.exact_location}</div>
                      <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(incident.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold">
                        {incident.incident_type?.includes("Flood") && <Activity className="h-3 w-3 text-blue-500" />}
                        {incident.incident_type?.includes("Fire") && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                        {incident.incident_type?.includes("Landslide") && <ShieldAlert className="h-3 w-3 text-red-500" />}
                        <span className="text-sm">{incident.incident_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[10px] ${getSeverityColor(incident.severity_level)}`}>
                        {incident.severity_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex items-center justify-end text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {getStatusIndicator(incident.status)}
                        {incident.status}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}