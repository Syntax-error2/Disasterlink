import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TermsPrivacyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("terms_accepted");
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("terms_accepted", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-600/20 blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="h-16 w-16 bg-red-950/50 border border-red-900/50 rounded-2xl flex items-center justify-center text-red-500 mb-2">
              <ShieldAlert className="h-8 w-8" />
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight">Terms & Privacy Policy</h2>
            
            <div className="text-sm text-zinc-400 space-y-3 leading-relaxed bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 max-h-48 overflow-y-auto text-left">
              <p><strong className="text-zinc-200">1. Data Collection & Privacy:</strong> By using DisasterLink, you consent to the collection of location data, device information, and incident reports solely for emergency response and disaster management purposes.</p>
              <p><strong className="text-zinc-200">2. Real-Time Tracking:</strong> If you are a responder, your location will be actively tracked during dispatch to coordinate rescue efforts efficiently.</p>
              <p><strong className="text-zinc-200">3. Content Moderation:</strong> You agree not to post malicious content, spam, or abusive material in the Community Feed. Violators will be banned.</p>
              <p><strong className="text-zinc-200">4. Misuse of Emergency Services:</strong> Submitting false SOS alerts or fake incident reports is strictly prohibited and may result in legal action by the Local Government Unit.</p>
            </div>

            <p className="text-xs text-zinc-500 pt-2">By clicking "I Accept", you acknowledge that you have read and agree to our full Terms of Service and Privacy Policy.</p>

            <button 
              onClick={handleAccept}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
            >
              <CheckCircle className="h-5 w-5" />
              I Accept & Agree
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
