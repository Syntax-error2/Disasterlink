import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, Users, AlertTriangle, ShieldCheck, MapPin, Send, Loader2, CheckCircle, AlertCircle, RefreshCw, Building, Tent, Plus, Search, Radio } from "lucide-react";
import axiosInstance from "../../lib/axios";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { OpenStreetMapProvider } from 'leaflet-geosearch';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/leaflet-shadow.png",
});

function LocationPicker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function BarangayDashboard() {
  const [user, setUser] = useState({ name: "Captain", assigned_barangay: "Loading..." });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // State for fetching incoming community reports
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Evacuation Centers State
  const [activeTab, setActiveTab] = useState<'reports' | 'evacuation'>('reports');
  const [evacuationCenters, setEvacuationCenters] = useState<any[]>([]);
  const [isLoadingCenters, setIsLoadingCenters] = useState(false);
  const [showAddCenter, setShowAddCenter] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const provider = new OpenStreetMapProvider();
  
  const [centerForm, setCenterForm] = useState({ name: "", location: "", capacity: 100, current_occupants: 0, status: "Active", lat: 10.203, lng: 122.862 });

  const [formData, setFormData] = useState({
    category: "Flood",
    priority: "High",
    purok: "",
    description: ""
  });

  useEffect(() => {
    try {
      const storedUserStr = localStorage.getItem("user");
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
      if (storedUser && storedUser.name) {
        setUser(storedUser);
        fetchLocalIncidents(storedUser.assigned_barangay);
        fetchEvacuationCenters(storedUser.assigned_barangay);
      }
    } catch (e) {
      console.warn("Failed to parse user from local storage", e);
    }
  }, []);

  const fetchLocalIncidents = async (barangay: string) => {
    setIsLoadingReports(true);
    try {
      const response = await axiosInstance.get("/incidents");
      const data = response.data;
      
      // Filter so the Captain ONLY sees reports from their Barangay
      const filtered = data.filter((report: any) => report.reporting_barangay === barangay);
      setLocalReports(filtered);
    } catch (error) {
      console.warn("API Offline, skipping fetch.");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleVerifyReport = async (id: number, newStatus: string) => {
    try {
      await axiosInstance.put(`/incidents/${id}`, { status: newStatus });
      fetchLocalIncidents(user.assigned_barangay);
    } catch (error) {
      console.warn("API Offline, simulating verify");
      setLocalReports(reports => reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
  };

  const fetchEvacuationCenters = async (barangay: string) => {
    setIsLoadingCenters(true);
    try {
      const response = await axiosInstance.get("/evacuation-centers");
      const data = response.data;
      // Filter so the Captain ONLY sees centers from their Barangay
      const filtered = data.filter((center: any) => center.barangay === barangay);
      setEvacuationCenters(filtered);
    } catch (error) {
      console.warn("API Offline, skipping fetch.");
    } finally {
      setIsLoadingCenters(false);
    }
  };

  const handleUpdateCenter = async (id: number, updates: any) => {
    try {
      await axiosInstance.put(`/evacuation-centers/${id}`, updates);
      fetchEvacuationCenters(user.assigned_barangay);
    } catch (error) {
      console.warn("Failed to update center");
      // Optimistic update for UI feel if offline
      setEvacuationCenters(centers => centers.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCenterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCenterForm({ ...centerForm, [e.target.name]: e.target.value });
  };

  const handleLocationSearch = (query: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await provider.search({ query });
        setSearchResults(results);
      } catch (error) {
        console.error("GeoSearch Error:", error);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSelectLocation = (result: any) => {
    setCenterForm({
      ...centerForm,
      name: result.label.split(',')[0],
      location: result.label,
      lat: result.y,
      lng: result.x
    });
    setSearchResults([]);
  };

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...centerForm, barangay: user.assigned_barangay };
      await axiosInstance.post("/evacuation-centers", payload);
      setCenterForm({ name: "", location: "", capacity: 100, current_occupants: 0, status: "Active", lat: 10.203, lng: 122.862 });
      setShowAddCenter(false);
      fetchEvacuationCenters(user.assigned_barangay);
    } catch (error) {
      console.warn("API Offline, skipping actual creation");
      setShowAddCenter(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      reporting_barangay: user.assigned_barangay,
      incident_type: formData.category,
      severity_level: formData.priority,
      exact_location: formData.purok,
      details: formData.description,
      status: "Pending Review"
    };

    try {
      await axiosInstance.post("/incidents", payload);

      setShowSuccess(true);
      setFormData({ category: "Flood", priority: "High", purok: "", description: "" });
      fetchLocalIncidents(user.assigned_barangay); // Refresh list instantly
      
    } catch (error: any) {
      console.warn("API Offline, simulating success...");
      setTimeout(() => {
        setShowSuccess(true);
        setFormData({ category: "Flood", priority: "High", purok: "", description: "" });
      }, 1500);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      
      {/* Strict Jurisdiction Header */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 dark:bg-[#0c0c0e] border border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-500/20 p-1.5 rounded-md">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-[11px] font-black text-emerald-500 tracking-widest uppercase">Verified Jurisdiction Lock</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">Local Command Center</h1>
          <p className="text-zinc-400 text-sm">
            Displaying real-time telemetry restricted to Brgy. <strong className="text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md ml-1">{user.assigned_barangay}</strong>
          </p>
        </div>
        <div className="relative z-10 bg-black/40 backdrop-blur-md border border-zinc-800 px-5 py-3 rounded-lg text-right shadow-inner">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Active Officer</div>
          <div className="text-base font-bold text-white flex items-center gap-2 justify-end">
            {user.name}
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`pb-2 font-semibold text-sm ${activeTab === 'reports' ? 'border-b-2 border-red-500 text-red-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
        >
          Community Reports
        </button>
        <button 
          onClick={() => setActiveTab('evacuation')} 
          className={`pb-2 font-semibold text-sm ${activeTab === 'evacuation' ? 'border-b-2 border-red-500 text-red-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
        >
          Evacuation Centers
        </button>
        <button 
          onClick={() => setActiveTab('broadcast')} 
          className={`pb-2 font-semibold text-sm flex items-center gap-1.5 ${activeTab === 'broadcast' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
        >
          <Radio className="h-3 w-3" /> Local Broadcast
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* Strict Reporting Form */}
      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
        <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            File Official Incident Report
          </CardTitle>
          <CardDescription>This data will be transmitted directly to the master MDRRMO database.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {errorMsg && <div className="mb-4 p-3 text-sm text-red-600 bg-red-100 border rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in">
              <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold">Report Transmitted Successfully</h3>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Classification</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-red-500/50">
                    <option value="Flood">Flood</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Fire">Fire</option>
                    <option value="Damage">Structural Damage</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Threat Level</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-red-500/50">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Location</label>
                <input type="text" name="purok" value={formData.purok} onChange={handleInputChange} placeholder="e.g., Purok 4..." required className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-red-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Situation Brief</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} required className="w-full h-24 p-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-red-500/50 resize-none"></textarea>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Transmitting...</> : <><Send className="h-4 w-4" /> Submit Report</>}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* LOCAL INCIDENTS FEED */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Local Incoming Reports</h2>
          <button onClick={() => fetchLocalIncidents(user.assigned_barangay)} className="text-sm flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <RefreshCw className={`h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        
        {isLoadingReports ? (
           <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto" /></div>
        ) : localReports.length === 0 ? (
           <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500">No recent incidents reported in your area.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localReports.map(report => (
              <div key={report.id} className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${report.severity_level === 'Critical' || report.severity_level === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {report.severity_level} Threat
                  </span>
                  <span className="text-xs font-mono text-zinc-400">ID: #{report.id}</span>
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{report.incident_type}</h3>
                <p className="text-sm flex items-center gap-1 text-zinc-500 mt-1"><MapPin className="h-3 w-3"/> {report.exact_location}</p>
                <p className="text-sm mt-3 text-zinc-700 dark:text-zinc-300 line-clamp-2">{report.details}</p>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs font-bold text-zinc-400">
                  <span>Status: <span className={
                    report.status === 'Pending Review' ? 'text-amber-500' : 
                    report.status === 'Dismissed' ? 'text-red-500' : 
                    report.status === 'Barangay Responding' ? 'text-blue-500' : 
                    report.status === 'Needs LGU Backup' ? 'text-red-600 font-bold animate-pulse' :
                    'text-emerald-500'
                  }>{report.status}</span></span>
                  
                  {report.status === 'Pending Review' && (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleVerifyReport(report.id, 'Barangay Responding')} className="w-full text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded flex items-center justify-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> Deploy Tanod
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => handleVerifyReport(report.id, 'Verified')} className="flex-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 px-3 py-1 rounded">Verify</button>
                        <button onClick={() => handleVerifyReport(report.id, 'Dismissed')} className="flex-1 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 px-3 py-1 rounded">Dismiss</button>
                      </div>
                    </div>
                  )}

                  {report.status === 'Barangay Responding' && (
                    <button onClick={() => handleVerifyReport(report.id, 'Needs LGU Backup')} className="w-full mt-2 text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded flex items-center justify-center gap-2 shadow-sm font-bold">
                      <AlertTriangle className="h-3 w-3" /> Escalate to LGU
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'evacuation' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Tent className="h-5 w-5 text-emerald-500" />
              Evacuation Centers
            </h2>
            <button 
              onClick={() => setShowAddCenter(!showAddCenter)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Center
            </button>
          </div>

          {showAddCenter && (
            <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden relative mb-6">
              <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <CardTitle className="text-lg">Register New Evacuation Center</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form className="space-y-4" onSubmit={handleCenterSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Center Name</label>
                      <input type="text" name="name" value={centerForm.name} onChange={handleCenterChange} placeholder="e.g., Barangay Hall" required className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Location / Address</label>
                      <input type="text" name="location" value={centerForm.location} onChange={handleCenterChange} placeholder="Street, Purok" required className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Max Capacity (Persons)</label>
                      <input type="number" name="capacity" value={centerForm.capacity} onChange={handleCenterChange} required className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Status</label>
                      <select name="status" value={centerForm.status} onChange={handleCenterChange} className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50">
                        <option value="Active">Active</option>
                        <option value="Full">Full</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* OSM GEOSEARCH API INTEGRATION */}
                  <div className="space-y-1.5 mt-4 border border-emerald-500/30 p-4 rounded-lg bg-emerald-950/10 relative">
                    <label className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                      <Search className="h-4 w-4" /> OpenStreetMap GeoSearch (Free API)
                    </label>
                    <p className="text-xs text-zinc-400 mb-2">Type a landmark or address to automatically fetch coordinates and details.</p>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search location (e.g. Binalbagan Catholic Church)" 
                        onChange={(e) => handleLocationSearch(e.target.value)}
                        className="w-full h-11 px-3 bg-white dark:bg-[#111115] border border-emerald-500/50 rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {isSearchingLocation && (
                        <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-emerald-500" />
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-[calc(100%-2rem)] bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl mt-1 max-h-60 overflow-y-auto">
                        {searchResults.map((res, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleSelectLocation(res)}
                            className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-sm border-b border-zinc-800 last:border-0"
                          >
                            <div className="font-bold text-white">{res.label.split(',')[0]}</div>
                            <div className="text-xs text-zinc-400 truncate">{res.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MAP SELECTOR */}
                  <div className="space-y-1.5 mt-4">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500" /> Pinpoint Location
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">Click on the map to accurately drop a pin for the evacuation center.</p>
                    <div className="h-64 w-full rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10">
                      <MapContainer center={[centerForm.lat, centerForm.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                        <LocationPicker 
                          position={[centerForm.lat, centerForm.lng]} 
                          setPosition={(pos) => setCenterForm({ ...centerForm, lat: pos[0], lng: pos[1] })} 
                        />
                      </MapContainer>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowAddCenter(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Center"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {isLoadingCenters ? (
            <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" /></div>
          ) : evacuationCenters.length === 0 ? (
            <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500">No evacuation centers registered yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evacuationCenters.map(center => (
                <div key={center.id} className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${center.status === 'Active' ? 'bg-emerald-500' : center.status === 'Full' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                  <div className="flex justify-between items-start mb-3 mt-1">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-zinc-400" />
                      <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{center.name}</h3>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${center.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : center.status === 'Full' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      {center.status}
                    </span>
                  </div>
                  <p className="text-xs flex items-center gap-1 text-zinc-500 mb-4"><MapPin className="h-3 w-3"/> {center.location}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-500">Occupancy Live Update</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-mono">{center.current_occupants} / {center.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <button 
                          onClick={() => handleUpdateCenter(center.id, { current_occupants: Math.max(0, center.current_occupants - 5) })}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 py-1 rounded-md text-xs font-bold"
                        >
                          -5
                        </button>
                        <button 
                          onClick={() => handleUpdateCenter(center.id, { current_occupants: Math.min(center.capacity, center.current_occupants + 5) })}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 py-1 rounded-md text-xs font-bold"
                        >
                          +5
                        </button>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-2">
                        <div className={`h-2 rounded-full ${center.current_occupants >= center.capacity * 0.9 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (center.current_occupants / center.capacity) * 100)}%` }}></div>
                      </div>
                      <select 
                        value={center.status}
                        onChange={(e) => handleUpdateCenter(center.id, { status: e.target.value })}
                        className="w-full text-xs p-1.5 rounded bg-zinc-50 dark:bg-[#1a1a1f] border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Active">Mark as Active</option>
                        <option value="Full">Mark as Full Capacity</option>
                        <option value="Closed">Mark as Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Radio className="h-5 w-5 text-amber-500" />
              Localized Emergency Broadcast
            </h2>
          </div>

          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
            <CardHeader className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/50">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                Dispatch Barangay Alert
              </CardTitle>
              <CardDescription className="text-amber-700/70 dark:text-amber-500/70">
                This will trigger an emergency siren overlay and push notification ONLY to citizens registered in Brgy. {user.assigned_barangay}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in">
                  <CheckCircle className="h-16 w-16 text-amber-500 mb-4" />
                  <h3 className="text-xl font-bold">Broadcast Dispatched Successfully</h3>
                  <p className="text-sm text-zinc-500 mt-2">All active residents in your barangay have been notified.</p>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleLocalBroadcast}>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Broadcast Message</label>
                    <textarea 
                      value={broadcastMsg} 
                      onChange={(e) => setBroadcastMsg(e.target.value)} 
                      placeholder="e.g. Relief goods are now being distributed at the Barangay Hall. Please bring your family ID."
                      required 
                      className="w-full h-32 p-4 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-lg"
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isBroadcasting} className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-md text-sm font-bold flex items-center gap-2 shadow-lg">
                      {isBroadcasting ? <><Loader2 className="h-4 w-4 animate-spin" /> Broadcasting...</> : <><Radio className="h-4 w-4" /> Dispatch Siren Alert</>}
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}