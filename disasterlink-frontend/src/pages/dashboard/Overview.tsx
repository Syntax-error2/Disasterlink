import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Home, Users, CloudLightning, TrendingUp, Activity, ShieldAlert, Loader2, RefreshCw, ThermometerSun, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import axiosInstance from "../../lib/axios";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weatherTemp, setWeatherTemp] = useState<string>("--");
  const [weatherWind, setWeatherWind] = useState<string>("--");
  
  // LIVE DATABASE STATE
  const [rawIncidents, setRawIncidents] = useState<any[]>([]);
  const [activeIncidentCount, setActiveIncidentCount] = useState(0);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);

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

    // 3. Calculate 7-Day Trends (Bar Chart)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trends = days.map(day => ({ day, incidents: 0, resolved: 0 }));
    
    data.forEach(inc => {
      if (!inc.created_at) return;
      const date = new Date(inc.created_at);
      const dayName = days[date.getDay()];
      const trendItem = trends.find(t => t.day === dayName);
      
      if (trendItem) {
        trendItem.incidents++;
        if (inc.status.includes("Resolved")) trendItem.resolved++;
      }
    });
    // Reorder array to start from 6 days ago up to today
    const todayIndex = new Date().getDay();
    const sortedTrends = [...trends.slice(todayIndex + 1), ...trends.slice(0, todayIndex + 1)];
    setTrendData(sortedTrends);

    // 4. Get 5 Most Recent for the Table
    const sortedRecent = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentIncidents(sortedRecent.slice(0, 5));
  };

  // ==========================================
  // FETCH OPERATION
  // ==========================================
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch Real Incident Data from Laravel
      const dbResponse = await axiosInstance.get("/incidents");
      const dbData = dbResponse.data;
      setRawIncidents(dbData);
      processDatabaseRecords(dbData);

      // Fetch Local Weather Data
      const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,wind_speed_10m&timezone=Asia%2FManila";
      const weatherResponse = await fetch(weatherUrl);
      if (weatherResponse.ok) {
         const wData = await weatherResponse.json();
         setWeatherTemp(wData.current.temperature_2m.toFixed(1));
         setWeatherWind(wData.current.wind_speed_10m.toFixed(1));
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

  return (
    <div className="flex flex-col gap-8 pb-8 animate-in fade-in duration-500">
      
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

      {/* TOP METRICS: High-Density Data Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-200 dark:border-red-900/30 shadow-sm relative overflow-hidden group bg-white dark:bg-[#111115]">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600 dark:bg-red-500 group-hover:w-1.5 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Active Incidents</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {isRefreshing && rawIncidents.length === 0 ? <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mt-1" /> : activeIncidentCount}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-zinc-500 dark:text-zinc-400 ml-1">Requiring immediate attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Evacuation Centers</CardTitle>
            <Home className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              4 <span className="text-lg text-zinc-400 font-normal">/ 15</span>
            </div>
            <div className="flex items-center mt-1 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">85% Capacity</span>
              <span className="text-zinc-500 dark:text-zinc-400 ml-1">in active centers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111115]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Responders Deployed</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
               {rawIncidents.filter(inc => inc.status.includes("Dispatch")).length}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <Activity className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-zinc-500 dark:text-zinc-400">Active rescue units in field</span>
            </div>
          </CardContent>
        </Card>

        {/* LIVE API METRIC */}
        <Card className="shadow-sm border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Live Weather Sync</CardTitle>
            <ThermometerSun className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {weatherTemp}°C
            </div>
            <div className="flex items-center mt-1 text-xs">
              <CloudLightning className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">Wind: {weatherWind} km/h</span>
            </div>
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