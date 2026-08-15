import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FALLBACK_EVAC_CENTERS } from '../../lib/evacCenters';
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, CheckCircle, ShieldAlert, Radio, AlertTriangle, Users, Tent, Navigation, LogOut, ShieldCheck, Plus, X } from "lucide-react";
import axiosInstance from "../../lib/axios";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { Loader2, Search } from "lucide-react";

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/leaflet-shadow.png",
});

const LocationPicker = ({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return <Marker position={position} />;
};
export default function KapMobile() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incidents");
  
  const [reports, setReports] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: string} | null>(null);

  const [showAddEvac, setShowAddEvac] = useState(false);
  const [evacForm, setEvacForm] = useState({ name: '', location: '', capacity: '', lat: 10.203, lng: 122.862 });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const provider = new OpenStreetMapProvider();
  
  const [showAddTanod, setShowAddTanod] = useState(false);
  const [tanodForm, setTanodForm] = useState({ name: '', phone: '', purok: '' });

  const normalize = (str: string) => {
    if (!str) return "";
    return str.toLowerCase().replace(/brgy\.?/g, '').replace(/barangay/g, '').replace(/sta\.?/g, 'santa').replace(/sto\.?/g, 'santo').replace(/[^a-z0-9]/g, '');
  };

  const fetchIncidents = async () => {
    try {
      const res = await axiosInstance.get('/incidents');
      // Filter for the kap's barangay using normalized string
      const local = res.data.filter((r: any) => {
        const s1 = normalize(r.reporting_barangay);
        const s2 = normalize(user?.assigned_barangay);
        return s1 && s2 && (s1.includes(s2) || s2.includes(s1));
      });
      setReports(local);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await axiosInstance.get('/evacuation-centers');
      let fetched = res.data;
      if (!fetched || fetched.length === 0) {
        fetched = FALLBACK_EVAC_CENTERS;
      }
      setCenters(fetched);
    } catch (e) {}
  };

  const fetchPersonnel = async () => {
    try {
      const res = await axiosInstance.get('/personnel/representatives');
      setPersonnel(res.data);
    } catch (e) {}
  };

  const showToast = (msg: string, type: string = 'info') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddEvac = async () => {
    try {
      const payload = {
        name: evacForm.name,
        location: evacForm.location,
        capacity: evacForm.capacity,
        current_occupants: 0,
        status: 'Active',
        barangay: user?.assigned_barangay,
        lat: evacForm.lat,
        lng: evacForm.lng
      };
      
      const res = await axiosInstance.post('/evacuation-centers', payload);
      setCenters([res.data, ...centers]);
      setShowAddEvac(false);
      setEvacForm({ name: '', location: '', capacity: '', lat: 10.203, lng: 122.862 });
      showToast("Evacuation center added successfully");
    } catch (e) {
      showToast('Failed to add center', 'error');
    }
  };

  const handleAddTanod = async () => {
    try {
      await axiosInstance.post('/superadmin/users', {
        name: tanodForm.name,
        phone: tanodForm.phone || "09123456789",
        role: 'Responder',
        assigned_barangay: user?.assigned_barangay,
        lgu_id: user?.lgu?.id,
        password: 'password123',
        email: `${tanodForm.name.replace(/\s/g, '').toLowerCase()}@tanod.com`
      });
      showToast('Tanod added successfully', 'success');
      setShowAddTanod(false);
      setTanodForm({ name: '', phone: '', purok: '' });
      fetchPersonnel();
    } catch (e) {
      showToast('Failed to add tanod', 'error');
    }
  };

  const triggerAlert = (incident: any) => {
    if (!toast || !toast.msg.includes(incident.incident_type)) {
      showToast(`NEW INCIDENT REPORTED: ${incident.incident_type} at ${incident.exact_location}`, 'alert');
      try {
        Haptics.vibrate();
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1000);
        TextToSpeech.speak({
          text: `URGENT. New incident reported in your barangay. ${incident.incident_type}`,
          lang: 'en-US',
          rate: 0.9,
        }).catch(() => {});
        LocalNotifications.schedule({
          notifications: [
            {
              title: "🚨 URGENT INCIDENT",
              body: `New emergency in your barangay: ${incident.incident_type}`,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 500) }
            }
          ]
        }).catch(() => {});
      } catch(e) {}
    }
  };

  useEffect(() => {
    // Request push notification permissions on mount for Capacitor
    try {
      LocalNotifications.requestPermissions().catch(() => {});
    } catch(e) {}

    fetchIncidents();
    fetchCenters();
    fetchPersonnel();
    
    import('../../lib/echo').then(({ default: echo }) => {
      echo.channel('incidents')
        .listen('.incident.event', async (e: any) => {
          if (e.type === 'created' || e.type === 'updated') {
            await fetchIncidents();
            // Try to find the incident from the event if it matches Kap's barangay
            if (e.type === 'created' && e.incident) {
              const s1 = normalize(e.incident.reporting_barangay);
              const s2 = normalize(user?.assigned_barangay);
              if (s1 && s2 && (s1.includes(s2) || s2.includes(s1))) {
                triggerAlert(e.incident);
              }
            }
          }
        });
    });

    return () => {
      import('../../lib/echo').then(({ default: echo }) => {
        echo.leaveChannel('incidents');
      });
    };
  }, [user]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await axiosInstance.put(`/incidents/${id}`, { status: newStatus });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
      showToast('Failed to update status', 'alert');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    setIsBroadcasting(true);
    try {
      await axiosInstance.post('/broadcast/local', { message: broadcastMsg });
      setBroadcastMsg("");
      showToast("Broadcast sent to community", "success");
    } catch (e) {
      showToast("Failed to send broadcast", "alert");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'Pending Review') return <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded text-[10px] font-bold">PENDING</span>;
    if (status === 'Verified / Escalated to Kap') return <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-[10px] font-bold">ESCALATED TO KAP</span>;
    if (status === 'Dispatched / Responding') return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold animate-pulse">RESPONDING</span>;
    if (status === 'On-Scene') return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[10px] font-bold">ON SCENE</span>;
    if (status === 'Resolved / Cleared') return <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold">RESOLVED</span>;
    if (status === 'Direct to LDRRMO') return <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold border border-red-500">LDRRMO DIRECT</span>;
    return <span className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-100 dark:bg-[#0a0a0c] text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="pt-safe-top bg-white dark:bg-[#111115] border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-red-600">DisasterLink</h1>
          <p className="text-xs font-bold text-zinc-500">Kapitan Command: {user?.assigned_barangay}</p>
        </div>
        <button onClick={logout} className="p-2 bg-red-50 text-red-600 rounded-full">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2 ${toast.type === 'alert' ? 'bg-red-600 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'alert' ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle className="h-4 w-4"/>}
          {toast.msg}
        </div>
      )}

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto pb-[90px] p-4 hide-scrollbar">
        
        {/* INCIDENTS TAB */}
        {activeTab === "incidents" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h2 className="font-black text-xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500"/> Live Incidents</h2>
            
            {reports.length === 0 ? (
              <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-zinc-400">No active incidents in your barangay.</p>
              </div>
            ) : (
              reports.map(r => (
                <Card key={r.id} className="border-0 shadow-md bg-white dark:bg-[#15151a] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{r.incident_type}</h3>
                      {renderStatusBadge(r.status)}
                    </div>
                    <p className="text-xs font-bold text-zinc-500 flex items-center gap-1 mb-2"><MapPin className="h-3 w-3"/> {r.exact_location}</p>
                    {r.details && <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded">{r.details}</p>}
                    
                    {/* KAP STATUS PROGRESSION BUTTONS */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      
                      {r.status === 'Pending Review' && (
                        <>
                          <button onClick={() => handleUpdateStatus(r.id, 'Verified / Escalated to Kap')} className="col-span-2 bg-emerald-500 text-white font-bold py-2 rounded text-xs shadow">Verify Incident</button>
                          <button onClick={() => handleUpdateStatus(r.id, 'False Alarm / Dismissed')} className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold py-2 rounded text-xs">Dismiss</button>
                          <button onClick={() => handleUpdateStatus(r.id, 'Direct to LDRRMO')} className="bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded text-xs">LDRRMO Direct</button>
                        </>
                      )}

                      {r.status === 'Verified / Escalated to Kap' && (
                        <>
                          <button onClick={() => handleUpdateStatus(r.id, 'Dispatched / Responding')} className="col-span-2 bg-blue-600 text-white font-bold py-2 rounded text-xs shadow flex justify-center items-center gap-1"><Navigation className="h-3 w-3"/> Dispatch Tanod</button>
                          <button onClick={() => handleUpdateStatus(r.id, 'Direct to LDRRMO')} className="col-span-2 mt-1 bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded text-xs flex justify-center items-center gap-1"><AlertTriangle className="h-3 w-3"/> Escalate to LDRRMO</button>
                        </>
                      )}

                      {r.status === 'Dispatched / Responding' && (
                        <button onClick={() => handleUpdateStatus(r.id, 'On-Scene')} className="col-span-2 bg-orange-500 text-white font-bold py-2 rounded text-xs shadow">Mark On-Scene</button>
                      )}

                      {r.status === 'On-Scene' && (
                        <button onClick={() => handleUpdateStatus(r.id, 'Resolved / Cleared')} className="col-span-2 bg-emerald-600 text-white font-bold py-2 rounded text-xs shadow flex justify-center items-center gap-1"><CheckCircle className="h-3 w-3"/> Mark Resolved</button>
                      )}

                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* BROADCAST TAB */}
        {activeTab === "broadcast" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h2 className="font-black text-xl flex items-center gap-2"><Radio className="h-5 w-5 text-blue-500"/> Public Address</h2>
            <Card className="border-0 shadow-md bg-white dark:bg-[#15151a]">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-4">Send a push notification directly to all citizens currently inside your barangay.</p>
                <form onSubmit={handleBroadcast}>
                  <textarea 
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Type urgent announcement here..."
                    className="w-full h-32 p-3 bg-zinc-50 dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm resize-none mb-3 outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button type="submit" disabled={isBroadcasting || !broadcastMsg} className="w-full h-12 bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2">
                    {isBroadcasting ? <span className="animate-pulse">Broadcasting...</span> : <><Radio className="h-4 w-4"/> Broadcast Alert</>}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EVACUATION TAB */}
        {activeTab === "evacuation" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-xl flex items-center gap-2"><Tent className="h-5 w-5 text-emerald-500"/> Evacuation Centers</h2>
              <button onClick={() => setShowAddEvac(true)} className="bg-emerald-500 text-white p-2 rounded-full shadow-md"><Plus className="h-4 w-4" /></button>
            </div>
            
            {showAddEvac && (
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 shadow-lg relative">
                <button onClick={() => setShowAddEvac(false)} className="absolute top-2 right-2 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
                <h3 className="text-white font-bold text-sm">Add New Center</h3>
                <input type="text" placeholder="Center Name" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={evacForm.name} onChange={e => setEvacForm({...evacForm, name: e.target.value})} />
                <input type="text" placeholder="Location Details" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={evacForm.location} onChange={e => setEvacForm({...evacForm, location: e.target.value})} />
                <input type="number" placeholder="Capacity" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={evacForm.capacity} onChange={e => setEvacForm({...evacForm, capacity: e.target.value})} />
                
                {/* OSM GEOSEARCH API INTEGRATION */}
                <div className="space-y-1.5 mt-2 border border-emerald-500/30 p-2 rounded-lg bg-emerald-950/10 relative">
                  <label className="text-xs font-semibold flex items-center gap-2 text-emerald-400">
                    <Search className="h-3 w-3" /> GeoSearch
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search landmark..." 
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      className="w-full bg-zinc-800 text-white rounded p-2 text-sm outline-none border border-emerald-500/50"
                    />
                    {isSearchingLocation && (
                      <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-emerald-500" />
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-[100] w-[calc(100%-1rem)] bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl mt-1 max-h-40 overflow-y-auto">
                      {searchResults.map((res, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleSelectLocation(res)}
                          className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm border-b border-zinc-700 last:border-0"
                        >
                          <div className="font-bold text-white">{res.label.split(',')[0]}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{res.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MAP SELECTOR */}
                <div className="space-y-1.5 mt-2">
                  <label className="text-xs font-semibold flex items-center gap-2 text-white">
                    <MapPin className="h-3 w-3 text-emerald-500" /> Pinpoint Location
                  </label>
                  <div className="h-40 w-full rounded-md overflow-hidden border border-zinc-700 z-10">
                    <MapContainer center={[evacForm.lat, evacForm.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <LocationPicker 
                        position={[evacForm.lat, evacForm.lng]} 
                        setPosition={(pos) => setEvacForm({ ...evacForm, lat: pos[0], lng: pos[1] })} 
                      />
                    </MapContainer>
                  </div>
                </div>

                <button onClick={handleAddEvac} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-2 text-sm font-bold shadow-md transition-colors mt-2">Save Evac Center</button>
              </div>
            )}

            {centers.length === 0 ? (
              <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <Tent className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-zinc-400">No active evacuation centers.</p>
              </div>
            ) : (
              centers.map(center => (
                <Card key={center.id} className="border-0 shadow-md bg-white dark:bg-[#15151a] overflow-hidden relative">
                  <div className={`absolute top-0 left-0 w-1 h-full ${center.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-base">{center.name}</h3>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${center.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>{center.status}</span>
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/> {center.location}</p>
                    <div className="mt-4 flex gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Occupants</p>
                        <p className="font-black text-lg">{center.current_occupants} <span className="text-zinc-500 text-sm font-normal">/ {center.capacity}</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* PERSONNEL TAB */}
        {activeTab === "personnel" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-xl flex items-center gap-2"><Users className="h-5 w-5 text-purple-500"/> Tanods / Responders</h2>
              <button onClick={() => setShowAddTanod(true)} className="bg-purple-500 text-white p-2 rounded-full shadow-md"><Plus className="h-4 w-4" /></button>
            </div>
            
            {showAddTanod && (
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 shadow-lg relative">
                <button onClick={() => setShowAddTanod(false)} className="absolute top-2 right-2 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
                <h3 className="text-white font-bold text-sm">Add New Tanod</h3>
                <input type="text" placeholder="Full Name" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={tanodForm.name} onChange={e => setTanodForm({...tanodForm, name: e.target.value})} />
                <input type="text" placeholder="Phone Number" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={tanodForm.phone} onChange={e => setTanodForm({...tanodForm, phone: e.target.value})} />
                <input type="text" placeholder="Purok (Optional)" className="w-full bg-zinc-800 text-white rounded p-2 text-sm" value={tanodForm.purok} onChange={e => setTanodForm({...tanodForm, purok: e.target.value})} />
                <button onClick={handleAddTanod} className="w-full bg-purple-600 text-white rounded py-2 text-sm font-bold shadow-md">Create Tanod Profile</button>
              </div>
            )}

            {personnel.length === 0 ? (
              <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <Users className="h-8 w-8 text-purple-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-zinc-400">No active personnel assigned yet.</p>
              </div>
            ) : (
              personnel.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15151a] rounded-lg shadow-sm">
                  <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{p.name}</h3>
                    <p className="text-xs text-zinc-500">Purok {p.purok} • {p.phone}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full h-[80px] bg-white dark:bg-[#111115] border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center pb-safe z-50 px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'incidents', icon: ShieldAlert, label: 'Incidents', color: 'text-red-500', bg: 'bg-red-500' },
          { id: 'broadcast', icon: Radio, label: 'Broadcast', color: 'text-blue-500', bg: 'bg-blue-500' },
          { id: 'evacuation', icon: Tent, label: 'Evac', color: 'text-emerald-500', bg: 'bg-emerald-500' },
          { id: 'personnel', icon: Users, label: 'Tanod', color: 'text-purple-500', bg: 'bg-purple-500' }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center w-16 h-full relative"
            >
              <div className={`flex flex-col items-center justify-center w-full h-12 rounded-xl transition-all duration-300 ${isActive ? '' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                {isActive && (
                  <div className={`absolute top-0 w-8 h-1 rounded-b-full ${item.bg}`} />
                )}
                <Icon className={`h-6 w-6 transition-all duration-300 ${isActive ? item.color : 'text-zinc-400 dark:text-zinc-500'} ${isActive && item.id === 'incidents' ? 'animate-pulse' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] mt-1 font-bold transition-colors duration-300 ${isActive ? item.color : 'text-zinc-500'}`}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
