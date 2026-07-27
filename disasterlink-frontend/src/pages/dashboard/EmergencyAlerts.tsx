import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Radio, Smartphone, CheckCircle2, Loader2, Megaphone, Activity, AlertTriangle } from "lucide-react";
import axiosInstance from "../../lib/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function EmergencyAlerts() {
  const [targetArea, setTargetArea] = useState("All Barangays (Municipality Wide)");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("broadcast_history");
    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      const defaultHistory = [
        { id: 1, title: "Heavy Rain Advisory", message: "Please be advised of expected heavy rainfall tonight. Ensure all emergency kits are prepared.", targetArea: "All Barangays (Municipality Wide)", time: new Date().toISOString() }
      ];
      setHistory(defaultHistory);
      localStorage.setItem("broadcast_history", JSON.stringify(defaultHistory));
    }
  }, []);

  const handleDispatch = async () => {
    if (!title.trim() || !message.trim()) return;
    
    setIsDispatching(true);
    
    try {
      await axiosInstance.post("/broadcast", { message: title + " - " + message });
      const newAlert = {
        id: Date.now(),
        title,
        message,
        targetArea,
        time: new Date().toISOString()
      };
      
      const newHistory = [newAlert, ...history];
      setHistory(newHistory);
      localStorage.setItem("broadcast_history", JSON.stringify(newHistory));
      
      setTitle("");
      setMessage("");
      showToast("Alert broadcast successfully deployed to all citizen devices.", 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || "Failed to dispatch broadcast. Check server.", 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500 font-sans relative">
      
      {/* CUSTOM TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`absolute top-0 right-0 z-[2000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-red-500/10 border-red-500/50 text-red-500'} backdrop-blur-md`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            <span className="font-semibold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2 uppercase">
            <Megaphone className="h-6 w-6 text-red-500" /> Emergency Broadcast
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Dispatch push notifications and SMS alerts to citizens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Compose Alert Form (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-red-200 dark:border-red-900/30 shadow-lg bg-white/95 dark:bg-[#111115]/95 backdrop-blur-md relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
              <Radio className="h-32 w-32 text-red-500" />
            </div>
            
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500 text-lg font-black uppercase tracking-wide">
                <Activity className="h-5 w-5" /> Transmission Uplink
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-zinc-500">Target mass communication to registered devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Target Deployment Zone</label>
                <select 
                  value={targetArea} 
                  onChange={(e) => setTargetArea(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm font-bold text-zinc-900 dark:text-zinc-50 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer shadow-sm"
                >
                  <option>All Barangays (Municipality Wide)</option>
                  <option>Brgy. San Teodoro Only</option>
                  <option>Brgy. Payao Only</option>
                  <option>Identified Low-Lying Zones</option>
                  <option>Coastal Areas</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Broadcast Header / Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., MANDATORY EVACUATION ORDER" className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 h-12 text-sm font-bold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 outline-none focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500 shadow-sm transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Emergency Payload (Instructions)</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium text-zinc-900 dark:text-zinc-50 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none custom-scrollbar shadow-sm transition-all leading-relaxed"
                  placeholder="Type the exact emergency instructions to be sent to citizen devices..."
                ></textarea>
              </div>
              <div className="pt-2">
                <Button disabled={isDispatching || !title || !message} onClick={handleDispatch} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs py-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]">
                  {isDispatching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  {isDispatching ? "Transmitting via SMS Gateway..." : "Authorize & Dispatch Broadcast"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Feed (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white/95 dark:bg-[#111115]/95 backdrop-blur-md h-full flex flex-col">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 text-lg font-black uppercase tracking-wide">
                <Smartphone className="h-5 w-5 text-blue-500" /> Broadcast Ledger
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-zinc-500">Historical log of all dispatched citizen alerts.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative min-h-[400px]">
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <AnimatePresence>
                  {history.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50 pb-10">
                      <AlertTriangle className="h-12 w-12 mb-3" />
                      <p className="text-sm font-bold uppercase tracking-widest">No Broadcasts Found</p>
                    </div>
                  )}
                  {history.map((alert) => (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={alert.id} 
                      className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex gap-4 shadow-sm hover:border-blue-500/30 transition-colors group"
                    >
                      <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                        <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{alert.title}</h4>
                          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Delivered</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50 shadow-inner italic font-serif">"{alert.message}"</p>
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          <div className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {new Date(alert.time).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
                          </div>
                          <div className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {new Date(alert.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20 truncate max-w-[200px]">
                            TARGET: {alert.targetArea}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}