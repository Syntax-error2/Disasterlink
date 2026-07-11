import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Radio, Smartphone, CheckCircle2 } from "lucide-react";

export default function EmergencyAlerts() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Emergency Broadcast</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Dispatch push notifications and SMS alerts to residents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Compose Alert Form */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-red-500" /> New Broadcast</CardTitle>
            <CardDescription>Instantly push alerts to registered mobile devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Target Area</label>
              <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2.5 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-1 focus:ring-red-500">
                <option>All Barangays (Municipality Wide)</option>
                <option>Brgy. Payao Only</option>
                <option>Low-Lying Zones</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Alert Title</label>
              <Input placeholder="e.g., Mandatory Evacuation Order" className="bg-zinc-50 dark:bg-zinc-900/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Message Payload</label>
              <textarea 
                className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-1 focus:ring-red-500 resize-none"
                placeholder="Type the emergency instructions here..."
              ></textarea>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white"><Send className="mr-2 h-4 w-4" /> Dispatch Alert Now</Button>
          </CardContent>
        </Card>

        {/* History Feed */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50/50 dark:bg-zinc-900/20">
          <CardHeader>
            <CardTitle>Broadcast History</CardTitle>
            <CardDescription>Recently dispatched notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Heavy Rain Advisory</h4>
                    <span className="text-xs text-zinc-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Sent</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">Please be advised of expected heavy rainfall tonight. Ensure all emergency kits are prepared.</p>
                  <div className="text-[10px] text-zinc-400 mt-2 font-mono">July 1, 2026 • 08:00 AM • Target: All Brgys</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}