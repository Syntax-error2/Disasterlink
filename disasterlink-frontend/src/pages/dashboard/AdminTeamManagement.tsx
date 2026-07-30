import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../lib/axios";
import { Plus, Users, Loader2, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function AdminTeamManagement() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await axiosInstance.get('/teams');
      setTeams(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/teams', formData);
      setTeams([...teams, res.data]);
      setIsModalOpen(false);
      setFormData({ name: '', category: '' });
    } catch (e) {
      console.error(e);
      alert("Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await axiosInstance.delete(`/teams/${id}`);
      setTeams(teams.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete team");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Deployment Teams</h1>
          <p className="text-zinc-500 mt-1">Manage responder units for rapid incident dispatch.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide">
          <Plus className="h-4 w-4 mr-2" /> Add Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>
        ) : teams.map(team => (
          <Card key={team.id} className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div className="h-2 w-full bg-red-500"></div>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">{team.category || 'General Deployment'}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(team.id)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 p-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="h-3 w-3" /> Assigned Responders ({team.responders?.length || 0})
              </div>
              {team.responders && team.responders.length > 0 ? (
                <ul className="space-y-2">
                  {team.responders.map((r: any) => (
                    <li key={r.id} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center justify-between bg-white dark:bg-zinc-950 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <span className="font-medium">{r.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-zinc-400 italic bg-white dark:bg-zinc-950 px-3 py-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
                  No responders assigned yet.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">&times;</button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 dark:bg-red-500/20 p-3 rounded-full"><ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-500" /></div>
              <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Create Deployment Team</h2><p className="text-xs text-zinc-500">Add a new unit for field dispatches.</p></div>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Team Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500" placeholder="e.g. Alpha-1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Category / Specialty</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500" placeholder="e.g. Medical Emergency Rescue" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Create Team"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
