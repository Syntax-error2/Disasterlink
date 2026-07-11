import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Lock, User, Briefcase } from "lucide-react";

export default function Signup() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-[#0a0a0c] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#111115] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Personnel Registration</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">Request access to the DisasterLink system.</p>
        </div>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input type="text" placeholder="Juan Dela Cruz" className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/50" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Department / Role</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <select className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/50 appearance-none">
                <option>MDRRMO Staff</option>
                <option>Emergency Responder</option>
                <option>Barangay Captain</option>
                <option>System Administrator</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input type="email" placeholder="name@binalbagan.gov.ph" className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/50" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input type="password" placeholder="Create a strong password" className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-red-500/50" required />
            </div>
          </div>

          <Link to="/" className="block w-full pt-2">
            <button className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
              <ShieldCheck className="h-4 w-4" />
              Submit Access Request
            </button>
          </Link>
        </form>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
          Already have clearance? <Link to="/login" className="text-zinc-900 dark:text-white font-medium hover:underline">Log in here</Link>
        </p>
      </div>
    </div>
  );
}