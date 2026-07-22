import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2, RefreshCw, AlertCircle, Send, X, CheckCircle, Eye, ShieldAlert, CameraOff, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../lib/axios";

export default function IncidentReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Today");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const filterOptions = [
    { value: 'Today', label: 'Today (Active)' },
    { value: 'Yesterday', label: 'Yesterday' },
    { value: 'Past 7 Days', label: 'Past 7 Days' },
    { value: 'All Time', label: 'All Time (Archive)' },
    { value: 'Custom', label: 'Custom Range...' }
  ];

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedResponder, setSelectedResponder] = useState("Alpha-1 Unit");
  const [isDispatching, setIsDispatching] = useState(false);

  // Real Database Fetch - NO FAKE DATA
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/incidents');
      const data = response.data;
      setReports(data);
    } catch (error) {
      console.warn("API Offline, check Laravel server.");
      setReports([]); // If offline, show empty. No more fake fallbacks.
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      await axiosInstance.post(`/incidents/${id}/verify`);
      fetchIncidents();
    } catch (error) {
      console.error("Failed to verify incident", error);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleOpenDispatch = (incident: any) => {
    // Dynamically auto-suggest responder units based on the classified hazard category
    const hazard = incident.incident_type?.toLowerCase() || "";
    if (hazard.includes("flood") || hazard.includes("rescue")) {
      setSelectedResponder("Charlie Squad");
    } else if (hazard.includes("fire")) {
      setSelectedResponder("BFP Fire Unit");
    } else if (hazard.includes("landslide") || hazard.includes("damage")) {
      setSelectedResponder("Bravo Team");
    } else {
      setSelectedResponder("Alpha-1 Unit");
    }
    
    setSelectedIncident(incident);
    setDispatchModalOpen(true);
  };

  const submitDispatch = async () => {
    if (!selectedIncident) return;
    setIsDispatching(true);
    
    try {
      // Real PUT request to update database
      await axiosInstance.put(`/incidents/${selectedIncident.id}`, {
        status: `Dispatched: ${selectedResponder}`
      });
      
      // Update local state to reflect change instantly
      setReports(reports.map(r => r.id === selectedIncident.id ? { ...r, status: `Dispatched: ${selectedResponder}` } : r));
    } catch (error) {
      console.error("Dispatch failed:", error);
    } finally {
      setTimeout(() => {
        setIsDispatching(false);
        setDispatchModalOpen(false);
      }, 1000);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.incident_type?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.reporting_barangay?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    if (!r.created_at) return matchesSearch;

    const incidentDate = new Date(r.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - incidentDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Or strictly by calendar day
    const incidentDay = new Date(incidentDate.getFullYear(), incidentDate.getMonth(), incidentDate.getDate());
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const calendarDiffDays = Math.floor((currentDay.getTime() - incidentDay.getTime()) / (1000 * 60 * 60 * 24));

    let matchesTime = true;
    if (timeFilter === "Today") {
      matchesTime = calendarDiffDays === 0;
    } else if (timeFilter === "Yesterday") {
      matchesTime = calendarDiffDays === 1;
    } else if (timeFilter === "Past 7 Days") {
      matchesTime = calendarDiffDays <= 7;
    } else if (timeFilter === "Custom") {
      if (dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesTime = incidentDate >= start && incidentDate <= end;
      } else if (dateRange.start) {
        const start = new Date(dateRange.start);
        matchesTime = incidentDate >= start;
      } else if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesTime = incidentDate <= end;
      }
    }

    return matchesSearch && matchesTime;
  });

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500 font-sans relative">
      
      {/* DISPATCH & VISUAL VERIFICATION MODAL */}
      <AnimatePresence>
        {dispatchModalOpen && selectedIncident && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto py-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDispatchModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden my-auto">
              
              <div className="bg-zinc-900 dark:bg-zinc-950 p-4 flex items-center justify-between text-white border-b border-zinc-800">
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase flex items-center gap-2 text-red-500">
                    <ShieldAlert className="h-4 w-4" /> Incident Verification Box
                  </h3>
                </div>
                <button onClick={() => setDispatchModalOpen(false)} className="hover:bg-zinc-800 p-1 rounded-full transition-colors text-zinc-400"><X className="h-5 w-5" /></button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                
                {/* 100% REAL UPLOADED FIELD PROOF (Base64 from DB) */}
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Uploaded Field Proof</label>
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 aspect-video group flex items-center justify-center">
                    
                    {(selectedIncident.image_path || (selectedIncident.image_data && selectedIncident.image_data.length > 50)) ? (
                      <>
                        <img 
                          src={selectedIncident.image_path || selectedIncident.image_data} 
                          alt="Incident Evidence" 
                          className="w-full h-full object-contain bg-black"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono backdrop-blur-xs flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Live Metadata Attached
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-500">
                        <CameraOff className="h-10 w-10 mb-2 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">No Image Attached</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* INCIDENT CARD METRICS */}
                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-xl text-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Report Reference</span>
                      <div className="text-zinc-900 dark:text-white font-black text-base">#{selectedIncident.id} - {selectedIncident.incident_type}</div>
                    </div>
                    <Badge className={`font-bold uppercase text-[9px] px-2 py-1 ${selectedIncident.severity_level === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {selectedIncident.severity_level} Threat
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Exact Geolocation</span>
                    <div className="text-zinc-800 dark:text-zinc-200 text-sm font-medium">{selectedIncident.exact_location}, {selectedIncident.reporting_barangay}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Citizen Description Statement</span>
                    <p className="text-zinc-800 dark:text-zinc-200 text-sm mt-1 leading-relaxed bg-white dark:bg-zinc-950 p-3 rounded-md border border-zinc-200 dark:border-zinc-900 font-serif italic shadow-sm">
                      "{selectedIncident.details || "No narrative details provided."}"
                    </p>
                  </div>
                </div>

                {/* DISPATCH ACTIONS CONTROLS */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Servicing Deployment Command</label>
                  <select 
                    value={selectedResponder} 
                    onChange={(e) => setSelectedResponder(e.target.value)} 
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-3 text-sm outline-none focus:border-red-500 font-bold text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="Alpha-1 Unit">Alpha-1 (Medical Emergency Rescue)</option>
                    <option value="Bravo Team">Bravo Team (Roads & Heavy Infrastructure Clearing)</option>
                    <option value="Charlie Squad">Charlie Squad (Amphibious Evacuation Unit)</option>
                    <option value="BFP Fire Unit">Bureau of Fire Protection (BFP Truck)</option>
                  </select>
                </div>
                
                <button 
                  onClick={submitDispatch} 
                  disabled={isDispatching} 
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
                >
                  {isDispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isDispatching ? "Broadcasting Dispatches..." : "Authorize Deployment & Clear"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER TIER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Master Incident Ledger</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Database synchronization and review of all community reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchIncidents} variant="outline" size="sm" className="h-9 dark:border-zinc-800 dark:bg-[#111115]">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sync DB
          </Button>
          <Button size="sm" className="h-9 bg-red-600 hover:bg-red-700 text-white border-none">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-[#111115] overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex w-full xl:max-w-3xl gap-3 flex-col sm:flex-row">
            <div className="relative flex-1 sm:max-w-[280px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <Input placeholder="Search Location or Category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-red-500 shadow-sm" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md h-10 shadow-sm overflow-visible focus-within:ring-1 focus-within:ring-red-500 transition-all">
              
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  className="bg-transparent border-none h-full px-3 text-sm outline-none font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  {filterOptions.find(o => o.value === timeFilter)?.label}
                  <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl z-[200] overflow-hidden"
                    >
                      {filterOptions.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setTimeFilter(opt.value);
                            setDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${timeFilter === opt.value ? 'font-black text-red-600 bg-red-50/50 dark:bg-red-900/10' : 'text-zinc-700 dark:text-zinc-300 font-medium'}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {timeFilter === "Custom" && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center h-full px-2 sm:border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                    className="bg-transparent border-none text-xs px-2 h-full text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                  />
                  <span className="text-zinc-400 text-[10px] font-black uppercase mx-1">to</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                    className="bg-transparent border-none text-xs px-2 h-full text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                  />
                </motion.div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <AlertCircle className="h-4 w-4 text-amber-500" /> 
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-50">{filteredReports.length}</span> records
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-zinc-900">
              <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TrashHeader HeadName="ID" width="w-[100px] px-6" />
                <TrashHeader HeadName="Time" />
                <TrashHeader HeadName="Hazard" />
                <TrashHeader HeadName="Location" />
                <TrashHeader HeadName="Level" />
                <TrashHeader HeadName="Status" />
                <TableHead className="text-right px-6 py-4 text-xs font-black uppercase text-zinc-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-red-500" /></TableCell></TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-zinc-500">No records found.</TableCell></TableRow>
              ) : (
                filteredReports.map((r) => (
                  <TableRow key={r.id} className="border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <TableCell className="font-mono text-xs font-bold text-zinc-500 px-6">#{r.id}</TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                      {r.created_at ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{new Date(r.created_at).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ) : 'Just Now'}
                    </TableCell>
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100">{r.incident_type}</TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                      {r.exact_location}, <span className="text-zinc-400">{r.reporting_barangay}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold px-2 py-0.5 uppercase text-[10px] ${r.severity_level === 'Critical' ? 'text-red-500 border-red-500 bg-red-50 dark:bg-red-500/10' : 'text-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-500/10'}`}>
                        {r.severity_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-blue-500">{r.status}</TableCell>
                    <TableCell className="text-right px-6">
                      {!r.status.includes("Dispatched") && !r.status.includes("Resolved") ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleVerify(r.id); }} 
                            size="sm" 
                            variant="outline" 
                            disabled={r.verifications >= 3}
                            className={`h-8 text-xs font-bold border-blue-200 text-blue-600 ${r.verifications >= 3 ? 'opacity-50' : 'hover:bg-blue-50'}`}
                          >
                            {r.verifications >= 3 ? 'Verified' : 'Verify'} ({Math.min(r.verifications || 0, 3)}/3)
                          </Button>
                          <Button onClick={() => handleOpenDispatch(r)} size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs font-bold shadow-md flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" /> Deploy Responder
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="h-8 text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/10 ml-auto">
                          <CheckCircle className="h-3 w-3 mr-1" /> {r.status.includes("Dispatched") ? "Dispatched" : "Resolved"}
                        </Button>
                      )}
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

function TrashHeader({ HeadName, width = "py-4" }: { HeadName: string, width?: string }) {
  return <TableHead className={`${width} text-xs font-black uppercase text-zinc-500`}>{HeadName}</TableHead>;
}