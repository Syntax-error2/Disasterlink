import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, CheckCircle, AlertTriangle, CloudRain, Send, Loader2, Activity, ShieldAlert, LogOut, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../lib/axios";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { useIncidents } from "../../context/IncidentsContext";

export default function RepresentativeMobile() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  
  // Real-time states
  const [incident, setIncident] = useState<any>(null);
  const [status, setStatus] = useState("Available"); // Available, Dispatched
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' | 'warning' | 'alert' } | null>(null);

  // Local Alerts
  const activeLocalIncidents = incidents.filter(i => i.reporting_barangay === user?.assigned_barangay && !['Resolved', 'False Alarm'].includes(i.status));

  // ==========================================
  // KEEP AWAKE
  // ==========================================
  useEffect(() => {
    const keepScreenAwake = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (e) {}
    };
    keepScreenAwake();
    return () => { KeepAwake.allowSleep().catch(() => {}); };
  }, []);

  // ==========================================
  // WEBSOCKETS: LISTENING FOR DISPATCHES
  // ==========================================
  const checkForDispatches = async () => {
    if (status !== "Available") return; 

    try {
      const response = await axiosInstance.get("/incidents");
      const dbIncidents = response.data.data ? response.data.data : response.data;
        
        // Ensure incident hasn't been resolved locally and is dispatched to reps
        const incomingDispatch = dbIncidents.find((inc: any) => 
          inc.status?.startsWith("Dispatched:") && 
          inc.reporting_barangay === user?.assigned_barangay && 
          !resolvedIds.includes(inc.id)
        );

        if (incomingDispatch) {
          setIncident(incomingDispatch);
          setStatus("Dispatched");
          showToast("URGENT: SOS Alert in your Barangay!", "alert");
          
          try {
            Haptics.vibrate();
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1000);
            
            TextToSpeech.speak({
              text: `URGENT. New SOS Incident Dispatched. ${incomingDispatch.incident_type}`,
              lang: 'en-US',
              rate: 0.9,
            }).catch(() => {});
            
            LocalNotifications.schedule({
              notifications: [
                {
                  title: "🚨 URGENT SOS ALERT",
                  body: `Emergency in your jurisdiction: ${incomingDispatch.incident_type}`,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 500) }
                }
              ]
            }).catch(() => {});
          } catch(e) {}
        }
    } catch (error) {}
  };

  useEffect(() => {
    import('../../lib/echo').then(({ default: echo }) => {
      echo.channel('incidents')
        .listen('.incident.event', (e: any) => {
          if (e.type === 'created' || e.type === 'updated') {
            checkForDispatches();
          }
        });
    });

    checkForDispatches(); // Initial check

    return () => {
      import('../../lib/echo').then(({ default: echo }) => {
        echo.leaveChannel('incidents');
      });
    };
  }, [status, resolvedIds, user]); 

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' | 'alert' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'alert' ? 6000 : 3500);
  };

  // ==========================================
  // RESPONDER ACTION CONTROLS
  // ==========================================
  const escalateIncident = async (target: 'kap' | 'mdrrmo') => {
    if (!incident) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/incidents/${incident.id}/verify`, { escalation_target: target });
      setResolvedIds(prev => [...prev, incident.id]);
      showToast(target === 'kap' ? "Escalated to Barangay Captain." : "Escalated to MDRRMO.", "success");
      setIncident(null);
      setStatus("Available");
    } catch (e) {
      showToast("Failed to escalate incident.", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-screen w-full bg-zinc-950 font-sans overflow-hidden flex flex-col relative text-zinc-50">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 16, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className="fixed top-0 left-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
              toast.type === 'alert' ? 'bg-red-600/90 border-red-500 text-white' : 
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-zinc-900' :
              'bg-zinc-800/90 border-zinc-700 text-white'
            }`}>
              {toast.type === 'alert' ? <AlertTriangle className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
              <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC DASHBOARD OR SOS ALERT VIEW */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <AnimatePresence mode="wait">
          {status === "Available" ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-full pb-20">
              {/* Premium Dashboard Header */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 px-6 pt-12 pb-8 rounded-b-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <ShieldAlert className="h-32 w-32" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      On Duty
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Brgy. {user?.assigned_barangay}</h1>
                    <p className="text-indigo-200 text-sm font-medium mt-1">{user?.name} &bull; Representative</p>
                  </div>
                  <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-indigo-800/50 flex items-center justify-center hover:bg-indigo-700 transition-colors">
                    <LogOut className="h-5 w-5 text-indigo-200" />
                  </button>
                </div>
              </div>

              {/* Action Grid */}
              <div className="p-6 space-y-6 -mt-4 relative z-20">
                {/* Threat Status Card */}
                <Card className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-lg overflow-hidden">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <CloudRain className="h-7 w-7 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Local Threat Level</div>
                      <div className="text-lg font-bold text-zinc-100">Low to Moderate</div>
                      <div className="text-xs text-zinc-400">Light scattered rain showers expected.</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {/* Local Alerts */}
                  <Card className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-lg overflow-hidden hover:bg-zinc-800/80 transition-colors cursor-pointer" onClick={() => navigate('/portal')}>
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 relative">
                        {activeLocalIncidents.length > 0 && (
                          <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
                        )}
                        <Activity className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{activeLocalIncidents.length}</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Alerts</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Report */}
                  <Card className="bg-indigo-600 border border-indigo-500 rounded-3xl shadow-[0_0_20px_rgba(79,70,229,0.3)] overflow-hidden hover:bg-indigo-500 transition-colors cursor-pointer" onClick={() => navigate('/portal')}>
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3 h-full">
                      <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Send className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white leading-tight">File Local<br/>Report</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Secondary Action */}
                <button className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Radio className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-zinc-100">Broadcast Channel</div>
                      <div className="text-xs text-zinc-500">Tune in to MDRRMO updates</div>
                    </div>
                  </div>
                  <Navigation className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </button>

              </div>
            </motion.div>
          ) : (
            <motion.div key="dispatch" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="min-h-full bg-red-950 p-6 pt-12 pb-32">
              <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay pointer-events-none"></div>
              
              <div className="flex justify-center mb-6 relative">
                <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <div className="h-20 w-20 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.6)] border-4 border-red-500/30 relative z-10">
                  <AlertTriangle className="h-10 w-10 text-white animate-pulse" />
                </div>
              </div>
              
              <div className="text-center mb-8 relative z-10">
                <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">SOS ALERT</h1>
                <p className="text-red-300 font-medium">Verify emergency immediately.</p>
              </div>

              <div className="bg-zinc-900/90 backdrop-blur-xl border border-red-500/30 overflow-hidden shadow-2xl relative z-10 mb-6 rounded-3xl">
                <div className="bg-red-600/20 p-4 border-b border-red-500/20">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-red-600 text-white">{incident?.incident_type}</span>
                    <span className="text-xs font-bold text-red-400">HIGH PRIORITY</span>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/80 shadow-inner">
                    <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                      <MapPin className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Target Location</div>
                      <div className="text-sm text-zinc-100 font-medium leading-tight">{incident?.exact_location}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Brgy. {incident?.reporting_barangay}</div>
                    </div>
                  </div>

                  {incident?.details && (
                    <div className="mt-2 p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 italic text-sm text-zinc-300 leading-relaxed shadow-inner">
                      "{incident.details}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-3 relative z-10">
                <button onClick={() => escalateIncident('kap')} disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 disabled:opacity-70 text-white font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg border border-blue-400/30">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  VERIFY & ESCALATE (KAP)
                </button>
                <button onClick={() => escalateIncident('mdrrmo')} disabled={isSubmitting} className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:scale-95 disabled:opacity-70 text-white font-black tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-400/30">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
                  CRITICAL: ESCALATE MDRRMO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
