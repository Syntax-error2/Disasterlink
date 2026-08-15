import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  CloudRain, 
  Users, 
  MapPin, 
  ThermometerSun, 
  Wind, 
  Droplets,
  Activity,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Minus,
  Layers,
  ChevronRight,
  RefreshCw,
  Info,
  Ambulance,
  Home,
  FileText
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import axiosInstance from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { LGUsBarangays } from "../../lib/barangays";
import { getInfrastructureNodes } from "../../lib/infrastructureNodes";

// --- CUSTOM MAP COMPONENTS ---
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

const createCustomIcon = (colorClass: string, isSOS = false) => {
  return L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative flex items-center justify-center h-8 w-8">
        ${isSOS ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>' : ''}
        <div class="relative flex items-center justify-center h-8 w-8 rounded-full ${colorClass} border-2 border-[#15181D] shadow-lg shadow-black/50 z-10">
          ${isSOS ? '<span class="text-[9px] font-black text-white">SOS</span>' : '<div class="h-2.5 w-2.5 bg-white rounded-full"></div>'}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const icons = {
  sos: createCustomIcon("bg-red-500", true),
  flood: createCustomIcon("bg-cyan-500"),
  fire: createCustomIcon("bg-orange-500"),
  report: createCustomIcon("bg-blue-500"),
  bfp: L.divIcon({
    className: "bg-transparent",
    html: `<div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-orange-600 border-2 border-[#15181D] shadow-lg shadow-black/50 z-10"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
  }),
  infirmary: L.divIcon({
    className: "bg-transparent",
    html: `<div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-red-500 border-2 border-[#15181D] shadow-lg shadow-black/50 z-10"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
  }),
  ldrrmo: L.divIcon({
    className: "bg-transparent",
    html: `<div class="relative flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 border-2 border-[#15181D] shadow-lg shadow-black/50 z-10"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
  }),
  medical: createCustomIcon('bg-emerald-500'),
  evac: createCustomIcon('bg-purple-500'),
  team: createCustomIcon('bg-green-500'),
};

// --- HELPER FUNCTIONS ---
const timeAgo = (dateString: string) => {
  if (!dateString) return "Just now";
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "Just now";
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
};

// --- MAIN COMPONENT ---
export default function Overview() {
  const { user } = useAuth();
  const lat = user?.lgu?.latitude ? Number(user.lgu.latitude) : 10.1866;
  const lng = user?.lgu?.longitude ? Number(user.lgu.longitude) : 122.8587;
  const MAP_CENTER: [number, number] = [isNaN(lat) ? 10.1866 : lat, isNaN(lng) ? 122.8587 : lng];

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapFilter, setMapFilter] = useState("All");
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('auto_refresh') !== 'false');

  useEffect(() => {
    const handleAutoRefreshChange = () => setAutoRefresh(localStorage.getItem('auto_refresh') !== 'false');
    window.addEventListener('auto_refresh_changed', handleAutoRefreshChange);
    return () => window.removeEventListener('auto_refresh_changed', handleAutoRefreshChange);
  }, []);

  // DATA STATES
  const [rawIncidents, setRawIncidents] = useState<any[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [citizensMonitored, setCitizensMonitored] = useState(0);
  const [evacCentersData, setEvacCentersData] = useState<any[]>([]);
  
  // WEATHER
  const [weatherData, setWeatherData] = useState<any>({
    temp: "--", feelsLike: "--", prob: "--", wind: "--", humidity: "--", condition: "Loading..."
  });

  // ANALYTICS MOCKS / DERIVATIVES
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Incidents
      const dbResponse = await axiosInstance.get("/incidents");
      const dbIncidents = dbResponse.data.data ? dbResponse.data.data : dbResponse.data;
      setRawIncidents(dbIncidents);

      // Process KPIs
      const active = dbIncidents.filter((inc: any) => inc.status !== "Resolved" && inc.severity_level === "Critical").length;
      const pending = dbIncidents.filter((inc: any) => inc.status === "Pending" || inc.status === "Under Review").length;
      setActiveEmergencies(active);
      setPendingReports(pending);

      // Process Recent Activity (Timeline)
      const sorted = [...dbIncidents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const activity = sorted.slice(0, 5).map(inc => ({
        id: inc.id,
        time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: inc.status === 'Resolved' ? 'Incident resolved' : (inc.incident_type === 'SOS EMERGENCY PING' ? 'SOS alert received' : 'Citizen report submitted'),
        desc: inc.exact_location || inc.reporting_barangay,
        type: inc.status === 'Resolved' ? 'success' : (inc.severity_level === 'Critical' ? 'critical' : 'info')
      }));
      setRecentActivity(activity);

      // Process Trends dynamically (Group last 24h into 4h intervals)
      const now = new Date();
      const generatedTrends = [];
      for (let i = 6; i >= 0; i--) {
        const intervalEnd = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
        const intervalStart = new Date(intervalEnd.getTime() - 4 * 60 * 60 * 1000);
        
        const inInterval = dbIncidents.filter((inc: any) => {
          const t = new Date(inc.created_at).getTime();
          return t >= intervalStart.getTime() && t <= intervalEnd.getTime();
        });
        
        generatedTrends.push({
          time: intervalEnd.toLocaleTimeString([], { hour: '2-digit' }),
          reported: inInterval.length,
          resolved: inInterval.filter((inc: any) => inc.status === 'Resolved').length,
          critical: inInterval.filter((inc: any) => inc.severity_level === 'Critical').length
        });
      }
      setTrendData(generatedTrends);

      // 2. Fetch Real Teams
      try {
        const teamsRes = await axiosInstance.get('/teams');
        setTeams(teamsRes.data);
      } catch (err) {}

      // 2. Stats
      try {
        const statsRes = await axiosInstance.get("/dashboard/stats");
        setCitizensMonitored(statsRes.data.total_users || 0);
      } catch (err) {}

      // 3. Evac Centers
      try {
        const evacRes = await axiosInstance.get("/evacuation-centers");
        let fetchedEvacs = evacRes.data;
        if (!fetchedEvacs || fetchedEvacs.length === 0) {
           fetchedEvacs = [
             { id: 1, name: 'Binalbagan Central School Evac Center', lat: 10.198305, lng: 122.862121, capacity: 500, current_occupants: 150, status: 'Open', food_level: 'Adequate', water_level: 'Low', medicine_level: 'Adequate', lgu_id: 1 },
             { id: 2, name: 'Binalbagan Catholic College Gym', lat: 10.1970, lng: 122.8610, capacity: 1000, current_occupants: 0, status: 'Standby', food_level: 'High', water_level: 'High', medicine_level: 'High', lgu_id: 1 },
             { id: 3, name: 'Cabanatuan City Central School Evac Center', lat: 15.4851, lng: 120.9734, capacity: 800, current_occupants: 100, status: 'Open', food_level: 'High', water_level: 'Adequate', medicine_level: 'Low', lgu_id: 2 },
             { id: 4, name: 'Nueva Ecija High School Gym', lat: 15.4820, lng: 120.9750, capacity: 1200, current_occupants: 0, status: 'Standby', food_level: 'High', water_level: 'High', medicine_level: 'High', lgu_id: 2 }
           ];
        }
        setEvacCentersData(fetchedEvacs);
      } catch (err) {}

      // 4. Weather (Open-Meteo)
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${MAP_CENTER[0]}&longitude=${MAP_CENTER[1]}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
        const weatherRes = await fetch(weatherUrl);
        const wData = await weatherRes.json();
        
        let condition = "Clear";
        const code = wData.current.weather_code;
        if (code > 0 && code <= 3) condition = "Cloudy";
        if (code >= 45 && code <= 48) condition = "Foggy";
        if (code >= 51 && code <= 67) condition = "Light Rain";
        if (code >= 80 && code <= 82) condition = "Rain Showers";
        if (code >= 95) condition = "Thunderstorm";

        setWeatherData({
          temp: wData.current.temperature_2m.toFixed(0),
          feelsLike: wData.current.apparent_temperature.toFixed(0),
          prob: wData.current.precipitation_probability !== undefined ? wData.current.precipitation_probability : Math.floor(Math.random() * 30),
          wind: wData.current.wind_speed_10m.toFixed(1),
          humidity: wData.current.relative_humidity_2m,
          condition
        });
      } catch (err) {}

    } catch (error) {
      console.error("Dashboard sync failed", error);
    } finally {
      setIsRefreshing(false); 
    }
  };

  useEffect(() => {
    fetchDashboardData();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 15000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // THREAT LEVEL LOGIC
  let threatLevel = "LOW";
  let threatColor = "text-green-500";
  let threatBg = "bg-green-500/20";
  let ThreatIcon = ShieldCheck;
  
  if (activeEmergencies > 0 || pendingReports > 10 || weatherData.condition === 'Thunderstorm') {
    threatLevel = "MODERATE";
    threatColor = "text-amber-500";
    threatBg = "bg-amber-500/20";
    ThreatIcon = ShieldAlert;
  }
  if (activeEmergencies >= 3 || weatherData.condition === 'Typhoon') {
    threatLevel = "HIGH";
    threatColor = "text-orange-500";
    threatBg = "bg-orange-500/20";
    ThreatIcon = AlertTriangle;
  }
  if (activeEmergencies >= 5) {
    threatLevel = "CRITICAL";
    threatColor = "text-red-500";
    threatBg = "bg-red-500/20";
    ThreatIcon = AlertTriangle;
  }

  // MAP FILTERING
  const mapIncidents = rawIncidents.filter(inc => {
    if (mapFilter === "All") return true;
    if (mapFilter === "SOS" && (inc.incident_type === 'SOS EMERGENCY PING' || inc.severity_level === 'Critical')) return true;
    if (mapFilter === "Report" && inc.severity_level !== 'Critical') return true;
    if (mapFilter === "Flood" && inc.incident_type?.toLowerCase().includes("flood")) return true;
    if (mapFilter === "Fire" && inc.incident_type?.toLowerCase().includes("fire")) return true;
    if (mapFilter === "Medical" && inc.incident_type?.toLowerCase().includes("medical")) return true;
    return false;
  });

  const infrastructureNodes = getInfrastructureNodes(user?.lgu?.subdomain || 'binalbagan', icons);

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500 text-zinc-100 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-white uppercase">LGU Command Center</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time disaster intelligence for the local government unit.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#15181D] border border-[#292D34] rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            SYNC
          </button>
        </div>
      </div>

      {/* TOP ROW: KPIs + THREAT LEVEL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* KPI CARDS (Span 8) */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 self-start">
          {/* Active Emergencies */}
          <div className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
            {activeEmergencies > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full blur-2xl"></div>}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${activeEmergencies > 0 ? 'bg-red-500/20' : 'bg-green-500/10'}`}>
                  {activeEmergencies > 0 ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Emergencies</h3>
              </div>
              <p className="text-4xl font-black text-white">{activeEmergencies}</p>
            </div>
            <div className="mt-4">
              <p className={`text-xs font-bold ${activeEmergencies > 0 ? 'text-red-400' : 'text-green-500'}`}>
                {activeEmergencies > 0 ? 'Immediate action required' : 'Good job!'}
              </p>
            </div>
          </div>

          {/* Pending Reports */}
          <Link to="/reports" className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pending Reports</h3>
              </div>
              <p className="text-4xl font-black text-white">{pendingReports}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Reports awaiting action</p>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">View All</span>
            </div>
          </Link>

          {/* Citizens Monitored */}
          <Link to="/admin/users" className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Citizens Monitored</h3>
              </div>
              <p className="text-4xl font-black text-white">{citizensMonitored}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Registered in system</p>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">View Users</span>
            </div>
          </Link>

          {/* System Status */}
          <Link to="/settings" className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Status</h3>
              </div>
              <p className="text-2xl font-black text-white mt-1">Operational</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-zinc-500">All systems running</p>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">All Good!</span>
            </div>
          </Link>
        </div>

        {/* COMMUNITY THREAT LEVEL (Span 4) */}
        <div className="xl:col-span-4 bg-[#15181D] border border-[#292D34] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
           {/* Ambient Glow */}
           <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
              threatLevel === 'LOW' ? 'bg-green-500' : threatLevel === 'MODERATE' ? 'bg-amber-500' : 'bg-red-500'
           }`}></div>
           
           <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Community Threat Level</h3>
           
           <div className="flex items-center gap-5 mt-auto mb-auto">
             <div className={`h-16 w-16 rounded-2xl ${threatBg} flex items-center justify-center border border-current/20 shadow-lg shrink-0`}>
               <ThreatIcon className={`h-8 w-8 ${threatColor}`} />
             </div>
             <div>
               <h2 className={`text-4xl font-black ${threatColor}`}>{threatLevel}</h2>
               <p className="text-xs text-zinc-400 mt-1">
                 {threatLevel === 'LOW' ? 'No active threats detected' : 'Elevated emergency awareness required'}
               </p>
             </div>
           </div>
        </div>
      </div>

      {/* MIDDLE ROW: MAP + QUEUE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LIVE INCIDENT MAP (Span 8) */}
        <div className="xl:col-span-8 bg-[#15181D] border border-[#292D34] rounded-2xl flex flex-col overflow-hidden h-[500px]">
          <div className="p-4 border-b border-[#292D34] flex items-center justify-between bg-[#111115]">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Live Incident Map</h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
              </span>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-300 hover:text-white transition-colors">
              <Filter className="h-3 w-3" /> Filters
            </button>
          </div>
          
          <div className="flex-1 relative z-0 bg-[#0B0D10]">
            {/* MAP CONTROLS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
              <button className="h-8 w-8 bg-[#15181D]/90 backdrop-blur border border-[#292D34] rounded-lg flex items-center justify-center text-white hover:bg-zinc-800 transition-colors shadow-lg"><Plus className="h-4 w-4" /></button>
              <button className="h-8 w-8 bg-[#15181D]/90 backdrop-blur border border-[#292D34] rounded-lg flex items-center justify-center text-white hover:bg-zinc-800 transition-colors shadow-lg"><Minus className="h-4 w-4" /></button>
              <button className="h-8 w-8 mt-2 bg-[#15181D]/90 backdrop-blur border border-[#292D34] rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"><MapPin className="h-4 w-4" /></button>
              <button className="h-8 w-8 bg-[#15181D]/90 backdrop-blur border border-[#292D34] rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"><Layers className="h-4 w-4" /></button>
            </div>

            <MapContainer center={MAP_CENTER} zoom={13} className="h-full w-full" zoomControl={false} attributionControl={false}>
              {/* Dark mode enterprise map tiles (CartoDB Dark Matter) */}
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              
              <MapUpdater center={MAP_CENTER} />
              
              {/* Plot Incidents */}
              {mapIncidents.map(inc => {
                if (!inc.latitude || !inc.longitude) return null;
                const isSOS = inc.incident_type === 'SOS EMERGENCY PING' || inc.severity_level === 'Critical';
                const isFlood = inc.incident_type?.toLowerCase().includes("flood");
                const isFire = inc.incident_type?.toLowerCase().includes("fire");
                
                let icon = icons.report;
                if (isSOS) icon = icons.sos;
                else if (isFlood) icon = icons.flood;
                else if (isFire) icon = icons.fire;

                return (
                  <React.Fragment key={`inc-${inc.id}`}>
                    <Marker position={[inc.latitude, inc.longitude]} icon={icon} />
                    {/* 50m Citizen Radius for SOS/Critical */}
                    {isSOS && (
                      <>
                        <Circle center={[inc.latitude, inc.longitude]} radius={50} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1, dashArray: '4' }} />
                        <Circle center={[inc.latitude, inc.longitude]} radius={200} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.05, weight: 1, dashArray: '4' }} />
                      </>
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* Plot Evac Centers */}
              {evacCentersData.map(evac => (
                evac.latitude && evac.longitude && (
                   <Marker key={`evac-${evac.id}`} position={[evac.latitude, evac.longitude]} icon={icons.evac} />
                )
              ))}

              {/* Plot Infrastructure Nodes */}
              {infrastructureNodes.map(node => (
                <Marker key={node.id} position={[node.lat, node.lng]} icon={node.icon} />
              ))}
              
            </MapContainer>

            {/* BOTTOM FILTER PILLS */}
            <div className="absolute bottom-4 left-4 right-4 z-[1000] flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {[
                { label: 'All', val: 'All', col: 'bg-zinc-700' },
                { label: 'SOS', val: 'SOS', col: 'bg-red-500' },
                { label: 'Report', val: 'Report', col: 'bg-blue-500' },
                { label: 'Flood', val: 'Flood', col: 'bg-cyan-500' },
                { label: 'Fire', val: 'Fire', col: 'bg-orange-500' },
                { label: 'Medical', val: 'Medical', col: 'bg-emerald-500' },
                { label: 'Evac Center', val: 'Evac Center', col: 'bg-purple-500' },
              ].map(pill => (
                <button 
                  key={pill.val}
                  onClick={() => setMapFilter(pill.val)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#292D34] text-[11px] font-bold tracking-wider uppercase transition-colors shadow-lg
                    ${mapFilter === pill.val ? 'bg-[#292D34] text-white' : 'bg-[#15181D]/90 backdrop-blur text-zinc-400 hover:text-white'}
                  `}
                >
                  <span className={`h-2 w-2 rounded-full ${pill.col}`}></span>
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ACTIVE EMERGENCY QUEUE (Span 4) */}
        <div className="xl:col-span-4 bg-[#15181D] border border-[#292D34] rounded-2xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-[#292D34] flex items-center justify-between">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Active Emergency Queue</h3>
            <Link to="/reports" className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:text-red-400">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-600">Priority</th>
                  <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-600">Incident & Loc</th>
                  <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rawIncidents.filter(i => i.status !== 'Resolved').slice(0, 6).map(inc => {
                   let prioColor = 'text-green-500';
                   let prioBg = 'bg-green-500/10 border-green-500/20';
                   if (inc.severity_level === 'Medium') { prioColor = 'text-yellow-500'; prioBg = 'bg-yellow-500/10 border-yellow-500/20'; }
                   if (inc.severity_level === 'High') { prioColor = 'text-orange-500'; prioBg = 'bg-orange-500/10 border-orange-500/20'; }
                   if (inc.severity_level === 'Critical') { prioColor = 'text-red-500'; prioBg = 'bg-red-500/10 border-red-500/20'; }
                   
                   let statColor = 'bg-[#292D34] text-zinc-300';
                   if (inc.status === 'Dispatching' || inc.status === 'Direct to LDRRMO') statColor = 'bg-red-900/50 text-red-400 border border-red-500/30';
                   if (inc.status === 'Under Review') statColor = 'bg-amber-900/50 text-amber-400 border border-amber-500/30';

                   return (
                     <tr key={inc.id} className="border-b border-[#292D34]/50 hover:bg-[#1C1F26] transition-colors cursor-pointer group">
                       <td className="px-3 py-3 align-top">
                         <div className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border ${prioBg} ${prioColor} text-[9px] font-black uppercase tracking-widest`}>
                           {inc.severity_level}
                         </div>
                       </td>
                       <td className="px-3 py-3">
                         <p className="text-xs font-bold text-white mb-0.5 group-hover:text-red-400 transition-colors line-clamp-1">{inc.incident_type === 'SOS EMERGENCY PING' ? 'SOS Alert' : inc.incident_type}</p>
                         <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">{inc.exact_location || inc.reporting_barangay}</p>
                         {inc.latitude && <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">{getDistance(MAP_CENTER[0], MAP_CENTER[1], parseFloat(inc.latitude), parseFloat(inc.longitude))} away</p>}
                       </td>
                       <td className="px-3 py-3 align-top text-right">
                         <div className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${statColor}`}>
                           {inc.status === 'Direct to LDRRMO' ? 'Dispatching' : (inc.status === 'Pending' ? 'Pending' : 'Review')}
                         </div>
                       </td>
                     </tr>
                   );
                })}
                {rawIncidents.filter(i => i.status !== 'Resolved').length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-zinc-600 text-sm font-medium">
                      No active emergencies in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: WEATHER, CHARTS, TEAMS, RECENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* LIVE WEATHER */}
        <div className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col">
          <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Live Weather</h3>
          
          <div className="flex items-center gap-4 mb-6">
             <CloudRain className="h-12 w-12 text-blue-400 shrink-0" />
             <div>
               <h2 className="text-4xl font-black text-white">{weatherData.temp}°c</h2>
               <p className="text-sm font-bold text-zinc-400">{weatherData.condition}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-medium text-zinc-400 mb-6">
             <div className="space-y-1.5">
                <div className="flex justify-between"><span>Feels Like</span> <span className="text-white">{weatherData.feelsLike}°c</span></div>
                <div className="flex justify-between"><span>Rain Prob</span> <span className="text-white">{weatherData.prob}%</span></div>
             </div>
             <div className="space-y-1.5">
                <div className="flex justify-between"><span>Wind</span> <span className="text-white">{weatherData.wind} km/h</span></div>
                <div className="flex justify-between"><span>Humidity</span> <span className="text-white">{weatherData.humidity}%</span></div>
             </div>
          </div>
          
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 mb-3">
             <span className="flex items-center gap-1"><CloudRain className="h-3 w-3"/> PAGASA Monitor</span>
             <span>Updated 2m ago</span>
          </div>
          
          {(weatherData.condition.includes('Rain') || weatherData.condition.includes('Storm')) && (
            <div className="mt-auto bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
               <div className="flex items-center gap-2 mb-1">
                 <AlertTriangle className="h-3 w-3 text-amber-500" />
                 <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Weather Advisory</span>
               </div>
               <p className="text-xs text-amber-400/80 leading-snug">Precipitation expected in {user.lguName} today. Monitor low-lying areas.</p>
            </div>
          )}
        </div>

        {/* INCIDENT ACTIVITY */}
        <div className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Incident Activity</h3>
             <div className="flex bg-[#0B0D10] rounded text-[9px] font-bold border border-[#292D34]">
                <button className="px-2 py-1 bg-red-500/20 text-red-400 rounded-sm">24H</button>
                <button className="px-2 py-1 text-zinc-500 hover:text-white">7D</button>
                <button className="px-2 py-1 text-zinc-500 hover:text-white">30D</button>
             </div>
          </div>
          
          <div className="h-32 w-full mb-4">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#292D34" />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
                 <RechartsTooltip cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#15181D', border: '1px solid #292D34', borderRadius: '8px', fontSize: '12px' }} />
                 <Area type="monotone" dataKey="reported" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                 <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-4 mb-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
             <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> Reported</span>
             <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Resolved</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#292D34] mt-auto">
             <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Avg Response Time</p>
                <p className="text-lg font-black text-white">4m 32s</p>
             </div>
             <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Resolution Rate</p>
                <p className="text-lg font-black text-white flex items-end gap-1">92% <span className="text-[10px] text-green-500 mb-1 flex items-center"><Activity className="h-3 w-3" /> +8%</span></p>
             </div>
          </div>
        </div>

        {/* RESPONSE TEAMS */}
        <div className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Response Teams</h3>
             <Link to="/admin/teams" className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:text-red-400">View All</Link>
          </div>
          
          <div className="flex-1 space-y-3">
             {teams.map(team => (
               <div key={team.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                     <div className={`p-1.5 rounded-md ${team.name.includes('Medical') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>
                        {team.name.includes('Medical') ? <Ambulance className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                     </div>
                     <span className="font-bold text-zinc-200">{team.name}</span>
                  </div>
                  <div className="text-right">
                     <div className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 justify-end
                        ${team.status === 'Available' ? 'text-green-500' : team.status === 'Responding' ? 'text-orange-500' : 'text-zinc-600'}
                     `}>
                        <span className={`h-1.5 w-1.5 rounded-full ${team.status === 'Available' ? 'bg-green-500' : team.status === 'Responding' ? 'bg-orange-500' : 'bg-zinc-600'}`}></span>
                        {team.status}
                     </div>
                     {team.location && <div className="text-[9px] text-zinc-500 mt-0.5">{team.location}</div>}
                  </div>
               </div>
             ))}
          </div>

          <div className="pt-4 border-t border-[#292D34] mt-auto flex justify-between items-center">
             <span className="text-xs font-bold text-white"><span className="text-green-500">{teams.filter(t => t.status === 'Available').length} / {teams.length}</span> Teams Available</span>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-[#15181D] border border-[#292D34] rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Recent Activity</h3>
             <Link to="/reports" className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:text-red-400">View All</Link>
          </div>
          
          <div className="flex-1 space-y-4 relative">
             <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#292D34]"></div>
             {recentActivity.length === 0 ? (
               <p className="text-zinc-600 text-sm text-center pt-8">No recent activity.</p>
             ) : (
               recentActivity.map((act, idx) => (
                 <div key={idx} className="flex gap-4 relative z-10">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border-[3px] border-[#15181D]
                       ${act.type === 'critical' ? 'bg-red-500' : act.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}
                    `}>
                       {act.type === 'critical' ? <span className="text-[8px] font-black text-white">SOS</span> : <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{act.title}</p>
                       </div>
                       <p className="text-[10px] text-zinc-500 line-clamp-1">{act.desc}</p>
                       <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{act.time}</p>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
        
      </div>
    </div>
  );
}