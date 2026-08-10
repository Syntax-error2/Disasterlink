import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, User, Briefcase, Loader2, AlertCircle, MapPin, Home, Phone, Building2 } from "lucide-react";
import axiosInstance from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { LGUsBarangays } from "../../lib/barangays";

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [lgus, setLgus] = useState<any[]>([]);
  const [selectedLgu, setSelectedLgu] = useState("");
  const [availableBarangays, setAvailableBarangays] = useState<string[]>([]);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
    
    // Fetch LGUs
    const fetchLgus = async () => {
      try {
        const response = await axiosInstance.get('/lgus');
        setLgus(response.data);
      } catch (err) {
        console.error("Failed to fetch LGUs", err);
      }
    };
    fetchLgus();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (selectedLgu && LGUsBarangays[selectedLgu]) {
      setAvailableBarangays(LGUsBarangays[selectedLgu]);
    } else {
      setAvailableBarangays([]);
    }
  }, [selectedLgu]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const fd = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(fd);
    
    try {
      const registerUrl = (axiosInstance.defaults.baseURL || '') + "/register/send-otp";
      const fetchResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await fetchResponse.json();
      
      if (!fetchResponse.ok) {
        throw { response: { data: responseData, status: fetchResponse.status } };
      }
      
      setFormData(data);
      setStep(2); // Proceed to OTP step
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || "Failed to initiate registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");

    try {
      const payload = { ...formData, otp };
      const registerUrl = (axiosInstance.defaults.baseURL || '') + "/register";
      const fetchResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await fetchResponse.json();
      
      if (!fetchResponse.ok) {
        throw { response: { data: responseData, status: fetchResponse.status } };
      }
      
      navigate("/login");
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
            <ShieldCheck className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {step === 1 ? "SECURE ACCESS" : "VERIFY IDENTITY"}
          </h2>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            {step === 1 ? "DisasterLink Personnel Clearance" : "Enter the tactical code sent to your inbox"}
          </p>
        </div>

        {step === 1 ? (
          <form className="space-y-5 animate-in fade-in" onSubmit={handleSignup}>
            {errorMsg && (
              <div className="p-3 text-sm text-red-600 bg-red-100 border border-red-200 rounded-lg dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                <input type="text" name="name" placeholder="Juan Dela Cruz" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" required disabled={loading} />
              </div>
            </div>

            <input type="hidden" name="role" value="resident" />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Select City / Municipality</label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors z-10" />
                <select name="lgu_subdomain" value={selectedLgu} onChange={(e) => setSelectedLgu(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner appearance-none" required disabled={loading}>
                  <option value="" className="bg-zinc-900 text-zinc-400">Select City/Municipality...</option>
                  {lgus.map(lgu => (
                    <option key={lgu.id} value={lgu.subdomain} className="bg-zinc-900 text-white py-2">{lgu.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-3.5 pointer-events-none">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Barangay</label>
                <div className="relative group">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors z-10" />
                  <select name="barangay" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner appearance-none" required disabled={loading || !selectedLgu}>
                    <option value="" className="bg-zinc-900 text-zinc-400">Select Barangay...</option>
                    {availableBarangays.map(brgy => (
                      <option key={brgy} value={brgy} className="bg-zinc-900 text-white py-2">{brgy}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-3.5 pointer-events-none">
                    <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Purok / Sitio</label>
                <div className="relative group">
                  <Home className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                  <input type="text" name="purok" placeholder="e.g. Purok 1" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" required disabled={loading} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                  <input type="email" name="email" placeholder={selectedLgu ? `name@${selectedLgu}.gov.ph` : "name@example.gov.ph"} className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" required disabled={loading} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                  <input type="text" name="phone" placeholder="+63 912 345 6789" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" required disabled={loading} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                <input type="password" name="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" required disabled={loading} />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="w-full relative overflow-hidden group bg-white text-black font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-3">
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {loading ? "INITIALIZING..." : "INITIATE CLEARANCE"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500" onSubmit={handleVerifyOTP}>
            {errorMsg && (
              <div className="p-3 text-sm text-red-600 bg-red-100 border border-red-200 rounded-lg dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                We've dispatched a secure transmission to <br/><strong className="text-white font-medium">{formData?.email}</strong>
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] text-center block">Authentication Key</label>
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000" 
                className="w-full py-5 text-center text-4xl tracking-[0.4em] bg-black/60 border border-white/10 rounded-2xl text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 shadow-inner font-mono font-black" 
                required 
                disabled={loading} 
              />
            </div>

            <div className="pt-6 flex flex-col gap-4">
              <button type="submit" disabled={loading || otp.length < 6} className="w-full relative overflow-hidden group bg-red-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-3">
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {loading ? "VERIFYING..." : "CONFIRM CLEARANCE"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button type="button" onClick={() => setStep(1)} disabled={loading} className="w-full text-zinc-500 hover:text-white text-xs font-medium py-2 transition-colors">
                ABORT & RETURN
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500 mt-8 font-medium">
          Already have clearance? <Link to="/login" className="text-white hover:text-red-400 transition-colors">Log in here</Link>
        </p>
      </div>
    </div>
  );
}