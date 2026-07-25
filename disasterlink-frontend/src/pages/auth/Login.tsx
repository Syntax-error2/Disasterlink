import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, Activity, MapPin, Loader2, Server, AlertCircle, CheckCircle, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../lib/axios";

export default function Login() {
  // Enhanced State Management for the Boot Sequence
  const [loginState, setLoginState] = useState<'idle' | 'authenticating' | 'booting'>('idle');
  const [bootText, setBootText] = useState("Verifying credentials...");
  const [errorMsg, setErrorMsg] = useState("");
  const [tenant, setTenant] = useState<any>(null);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Extract Subdomain for SaaS Branding
  const hostname = window.location.hostname;
  // Default to binalbagan for local dev, local IPs, and VS Code Dev Tunnels
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes(".devtunnels.ms") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const currentSubdomain = isLocalDev 
    ? "binalbagan" 
    : hostname.split('.')[0];

  useEffect(() => {
    axiosInstance.get(`/tenant-config/${currentSubdomain}`)
      .then(res => {
        const tenantData = res.data.data || res.data;
        setTenant(tenantData);
      })
      .catch(err => console.log("Generic SaaS Mode Active"));
  }, [currentSubdomain]);

  // Real Laravel API Network Request
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginState('authenticating');
    setErrorMsg(""); 
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    data.subdomain = currentSubdomain; // Pass the subdomain to enforce security
    
    try {
      // Send data to Laravel Backend
      const response = await axiosInstance.post("/login", data);
      const result = response.data.data || response.data;
      
      const token = result.token || response.data.token;
      const user = result.user || response.data.user;

      // 1. Save Token
      login(token, user);

      // 2. Trigger the "Boot Sequence" UI
      setLoginState('booting');

      // 3. Cycle through realistic loading phrases to give the dashboard time to prep
      setTimeout(() => setBootText("Establishing secure connection..."), 600);
      setTimeout(() => setBootText("Synchronizing GIS telemetry..."), 1200);
      setTimeout(() => setBootText("Loading operational dashboard..."), 1800);

      // 4. Secure Role-Based Redirection after the boot sequence completes
      setTimeout(() => {
        try {
          const userRole = user?.role || 'admin';
          
          if (userRole === 'superadmin') {
            navigate("/superadmin");
          } else if (userRole === 'admin' || userRole === 'mdrrmo_staff') {
            navigate("/"); // Send to Master Dashboard
        } else if (userRole === 'barangay_captain') {
          navigate("/barangay-command"); // Send to Localized Dashboard
        } else if (userRole === 'responder') {
          navigate("/responder-dispatch"); // Send to Mobile Field UI
        } else if (userRole === 'resident' || userRole === 'citizen') {
          navigate("/portal"); // Send to Community Portal
        } else {
          navigate("/"); // Fallback
        }
        } catch (navError) {
          console.error("Navigation error", navError);
          navigate("/");
        }
      }, 2500); // 2.5 seconds total loading time

    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || "Login failed");
      setLoginState('idle');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-[#0a0a0c] font-sans">
      
      {/* LEFT PANEL: Dynamic Enterprise Branding */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-black to-zinc-900/50 z-0"></div>
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Top Logo */}
        <div className="flex flex-col items-start justify-start relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="DisasterLink" className="h-10 w-10 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
            <span className="text-2xl font-bold tracking-tight">DisasterLink</span>
          </div>
        </div>

        {/* Main Value Prop */}
        <div className="relative z-10 max-w-md animate-in fade-in slide-in-from-left-8 duration-1000 delay-150 fill-mode-both">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Command<br/>Center Portal
          </h1>
          <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
            Secure access to real-time meteorological intelligence, emergency dispatching, and spatial tracking for the Binalbagan LGU.
          </p>
          
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-xl">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Western Visayas Node
            </span>
            <div className="w-px h-4 bg-white/20 mx-2"></div>
            <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Server className="h-4 w-4" /> Systems Operational
            </span>
          </div>
        </div>
        
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      </div>

      {/* RIGHT PANEL: Secure Login Form & Boot Sequence */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md relative">
          
          <AnimatePresence mode="wait">
            {/* STATE 1: LOGIN FORM */}
            {loginState !== 'booting' && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
            {/* SaaS Dynamic Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                <ShieldCheck className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
                {tenant ? `${tenant.name} Command` : 'DisasterLink'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                {tenant ? 'Authorized personnel access only.' : 'Multi-Tenant Disaster Management System'}
              </p>
            </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Welcome back</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">Enter your credentials to securely access the system.</p>
                </div>

                <form className="space-y-5 mt-8" onSubmit={handleLogin}>
                  
                  {errorMsg && (
                    <div className="p-3 text-sm text-red-600 bg-red-100 border border-red-200 rounded-lg dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}
                  
                  <div className="space-y-1.5 group">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300 transition-colors group-focus-within:text-red-600 dark:group-focus-within:text-red-400">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-red-500" />
                      <input 
                        type="email" 
                        name="email"
                        placeholder="user@binalbagan.gov.ph" 
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                        required
                        disabled={loginState === 'authenticating'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300 transition-colors group-focus-within:text-red-600 dark:group-focus-within:text-red-400">
                        Password
                      </label>
                      <a href="#" className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-red-500" />
                      <input 
                        type="password" 
                        name="password"
                        placeholder="••••••••" 
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                        required
                        disabled={loginState === 'authenticating'}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={loginState === 'authenticating'}
                      className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loginState === 'authenticating' ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          Authenticate Session
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
                  Don't have clearance? <Link to="/signup" className="text-red-600 dark:text-red-400 font-medium hover:underline hover:text-red-700 dark:hover:text-red-300 transition-colors">Request access</Link>
                </p>
              </motion.div>
            )}

            {/* STATE 2: BOOT SEQUENCE / LOADING SCREEN */}
            {loginState === 'booting' && (
              <motion.div 
                key="booting"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 rounded-full border-t-2 border-red-500 w-24 h-24 animate-spin -m-4"></div>
                  {/* Inner glowing circle */}
                  <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                    <ShieldCheck className="h-8 w-8 text-red-500" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                    Access Granted <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </h3>
                  
                  {/* Dynamic Terminal Text */}
                  <div className="mt-4 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-md flex items-center gap-3 border border-zinc-200 dark:border-zinc-800">
                    <Terminal className="h-4 w-4 text-zinc-400" />
                    <motion.span 
                      key={bootText} 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="text-sm font-mono text-zinc-600 dark:text-zinc-400"
                    >
                      {bootText}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}