import { useState, useEffect } from "react";
import { Users, Server, Activity, Plus } from "lucide-react";
import axiosInstance from "../../lib/axios";

interface Lgu {
  id: number;
  name: string;
  subdomain: string;
  subscription_status: string;
  users_count: number;
  incident_reports_count: number;
}

export default function SuperAdmin() {
  const [lgus, setLgus] = useState<Lgu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    latitude: '',
    longitude: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchLgus();
  }, []);

  const fetchLgus = async () => {
    try {
      const response = await axiosInstance.get("/superadmin/lgus");
      setLgus(response.data);
    } catch (error) {
      console.error("Error fetching LGUs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await axiosInstance.post("/superadmin/lgus", formData);
      setShowModal(false);
      setFormData({ name: '', subdomain: '', latitude: '', longitude: '' });
      fetchLgus(); // Refresh table
    } catch (error) {
      console.error("Error onboarding LGU:", error);
      alert("Failed to onboard LGU. Please check subdomain uniqueness.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">DisasterLink SuperAdmin</h1>
            <p className="text-zinc-400">Manage multi-tenant subscriptions and client LGUs.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Onboard New LGU</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-bold">Active Clients</h3>
              <Server className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-4xl font-black">{lgus.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-bold">Total Users</h3>
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-4xl font-black">
              {lgus.reduce((sum, lgu) => sum + lgu.users_count, 0)}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-bold">System Health</h3>
              <Activity className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-4xl font-black text-emerald-500">100%</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-bold">LGU Name</th>
                <th className="px-6 py-4 font-bold">Subdomain</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Next Billing</th>
                <th className="px-6 py-4 font-bold">Users</th>
                <th className="px-6 py-4 font-bold">Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {lgus.map((lgu) => (
                <tr key={lgu.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{lgu.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{lgu.subdomain}.disasterlink.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
                      {lgu.subscription_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{(lgu as any).next_payment_date || 'N/A'}</td>
                  <td className="px-6 py-4 text-zinc-400">{lgu.users_count}</td>
                  <td className="px-6 py-4 text-zinc-400">{lgu.incident_reports_count}</td>
                </tr>
              ))}
              {lgus.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Onboard New LGU</h2>
            <form onSubmit={handleOnboard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">LGU Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Kabankalan City" 
                  className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Subdomain</label>
                <input 
                  type="text" 
                  value={formData.subdomain} 
                  onChange={e => setFormData({...formData, subdomain: e.target.value})} 
                  placeholder="e.g. kabankalan" 
                  className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.latitude} 
                    onChange={e => setFormData({...formData, latitude: e.target.value})} 
                    placeholder="10.1234" 
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.longitude} 
                    onChange={e => setFormData({...formData, longitude: e.target.value})} 
                    placeholder="122.1234" 
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" 
                    required 
                  />
                </div>
              </div>
              
              <div className="flex space-x-4 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg font-bold transition-colors">Cancel</button>
                <button type="submit" disabled={submitLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold transition-colors disabled:opacity-50">
                  {submitLoading ? 'Onboarding...' : 'Onboard Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
