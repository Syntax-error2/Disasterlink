import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../lib/axios";
import { Plus, ShieldCheck, Trash2, Edit2, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminUserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'responder' });
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/admin/users', formData);
      setUsers([res.data.user, ...users]);
      setGeneratedPassword(res.data.generated_password);
    } catch (e) {
      console.error(e);
      alert("Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Personnel Clearance</h1>
          <p className="text-zinc-500 mt-1">Manage accounts for MDRRMO Staff, Responders, and Barangay Captains.</p>
        </div>
        <Button onClick={() => { setIsModalOpen(true); setGeneratedPassword(null); }} className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide">
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Name / Contact</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Role</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-zinc-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{u.email}</div>
                      {u.phone && <div className="text-xs text-zinc-500">{u.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${u.account_status === 'Active' || u.account_status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-blue-500"><Edit2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">&times;</button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 dark:bg-red-500/20 p-3 rounded-full"><ShieldCheck className="h-6 w-6 text-red-600 dark:text-red-500" /></div>
              <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Create Staff Account</h2><p className="text-xs text-zinc-500">Auto-generates credentials securely.</p></div>
            </div>

            {generatedPassword ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-xl text-center">
                  <div className="text-sm text-emerald-800 dark:text-emerald-400 font-medium mb-2">Account Created Successfully!</div>
                  <div className="text-xs text-zinc-500 mb-4">Please securely share these credentials with the staff member. They will be forced to change this password upon first login (coming soon).</div>
                  <div className="bg-white dark:bg-black border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 flex items-center justify-between">
                    <code className="text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white">{generatedPassword}</code>
                    <button onClick={handleCopyPassword} className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-600 dark:text-zinc-400">
                      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={() => { setIsModalOpen(false); setGeneratedPassword(null); }} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500" placeholder="Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500" placeholder="juan@lgu.gov.ph" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500" placeholder="+63 912 345 6789" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500">
                    <option value="responder">Emergency Responder</option>
                    <option value="mdrrmo_staff">MDRRMO Staff</option>
                    <option value="barangay_captain">Barangay Captain</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Generate Credentials & Create"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
