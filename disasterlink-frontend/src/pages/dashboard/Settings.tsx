import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { User, Bell, Palette, Shield, Save, Smartphone, Mail, Key, MonitorSmartphone, LogOut, Loader2, CheckCircle } from "lucide-react";
import axiosInstance from "../../lib/axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { LGUsBarangays } from "../../lib/barangays";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  
  const lguSubdomain = user?.lgu?.subdomain || 'binalbagan';
  const barangays = LGUsBarangays[lguSubdomain] || LGUsBarangays['binalbagan'];

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      showToast("New passwords do not match", "error");
      return;
    }
    setPasswordLoading(true);
    try {
      await axiosInstance.post('/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });
      showToast("Password updated securely.", "success");
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (e: any) {
      showToast(e.response?.data?.message || "Failed to update password", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-5xl animate-in fade-in duration-500 relative">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-0 right-0 z-50">
            <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              <CheckCircle className="h-4 w-4" /> {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">System Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your account preferences and LGU system configuration.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Settings Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <button 
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "profile" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
            >
              <User className="h-4 w-4" /> Profile Data
            </button>
            <button 
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "appearance" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
            >
              <Palette className="h-4 w-4" /> Appearance
            </button>
            <button 
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "notifications" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
            >
              <Bell className="h-4 w-4" /> Notifications
            </button>
            <button 
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "security" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
            >
              <Shield className="h-4 w-4" /> Security
            </button>
          </nav>
        </aside>

        {/* Settings Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle>Personnel Profile</CardTitle>
                <CardDescription>Update your public LGU identity and assignment. (Mapped to Laravel DB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Full Name</label>
                    <Input defaultValue={user?.name || "LGU Admin"} className="bg-zinc-50 dark:bg-zinc-900/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Official Email</label>
                    <Input defaultValue={user?.email || "admin@binalbagan.gov.ph"} className="bg-zinc-50 dark:bg-zinc-900/50" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Department</label>
                    <Input defaultValue={user?.role === 'responder' ? 'Emergency Response Team' : 'MDRRMO Office'} className="bg-zinc-50 dark:bg-zinc-900/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Assigned Barangay (Optional)</label>
                    <select className="w-full h-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-1 focus:ring-red-500" defaultValue={user?.barangay || "All (Municipality Wide)"}>
                      <option>All (Municipality Wide)</option>
                      {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button className="bg-red-600 hover:bg-red-700 text-white"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the Command Center.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Theme Preference</h4>
                      <p className="text-sm text-zinc-500 mt-1">Select your UI environment.</p>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <button 
                        onClick={() => setTheme("light")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "light" ? "bg-white text-zinc-900 shadow" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme("dark")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "dark" ? "bg-zinc-700 text-white shadow" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => setTheme("system")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "system" ? "bg-zinc-700 text-white shadow" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
                      >
                        System
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle>Alert Preferences</CardTitle>
                <CardDescription>Configure how you receive emergency dispatches and system updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-red-100 dark:bg-red-500/20 p-2 rounded-full"><Bell className="h-4 w-4 text-red-600 dark:text-red-400" /></div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Browser Push Alerts</h4>
                      <p className="text-sm text-zinc-500 mt-1 max-w-sm">Receive instant desktop notifications for critical weather and disaster reports.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-blue-100 dark:bg-blue-500/20 p-2 rounded-full"><Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">SMS Dispatch Routing</h4>
                      <p className="text-sm text-zinc-500 mt-1 max-w-sm">Send emergency dispatch orders directly to your registered mobile device.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"><Mail className="h-4 w-4 text-zinc-600 dark:text-zinc-400" /></div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Daily Digest Email</h4>
                      <p className="text-sm text-zinc-500 mt-1 max-w-sm">Receive a daily summary of resolved incidents and resource allocation.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>

              </CardContent>
            </Card>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Current Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input type="password" required value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} placeholder="••••••••" className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 max-w-md" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">New Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input type="password" required minLength={8} value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} placeholder="••••••••" className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 max-w-md" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Confirm New Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input type="password" required minLength={8} value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} placeholder="••••••••" className="pl-9 bg-zinc-50 dark:bg-zinc-900/50 max-w-md" />
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button type="submit" disabled={passwordLoading} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white">
                        {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-red-100 dark:border-red-900/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Active Sessions</CardTitle>
                  <CardDescription>Manage the devices currently logged into your LGU account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                      <MonitorSmartphone className="h-6 w-6 text-emerald-500" />
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">Windows PC - Chrome</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Binalbagan, PH • IP: 192.168.1.1</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded">Current Session</span>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20">
                      <LogOut className="mr-2 h-4 w-4" /> Log out other devices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}