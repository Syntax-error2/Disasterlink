import React, { useEffect, useState } from 'react';
import echo from '../lib/echo';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function GlobalEmergencySiren() {
    const { isAuthenticated } = useAuth();
    const [siren, setSiren] = useState<{ title: string, message: string } | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const channel = echo.channel('broadcasts');
        
        channel.listen('.emergency.broadcast.event', (e: any) => {
            console.log("URGENT BROADCAST RECEIVED:", e);
            if (e.broadcast) {
                setSiren({
                    title: e.broadcast.title || "EMERGENCY ALERT",
                    message: e.broadcast.message
                });
                
                // Try to play a siren sound or vibrate
                try {
                    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
                    const audio = new Audio('/siren.mp3'); // Assuming there's a siren.mp3 in public
                    audio.play().catch(e => console.log("Audio autoplay blocked by browser", e));
                } catch (err) {}
            }
        });

        return () => {
            echo.leaveChannel('broadcasts');
        };
    }, [isAuthenticated]);

    return (
        <AnimatePresence>
            {siren && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-red-950/90 backdrop-blur-md" 
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="bg-red-600 w-full max-w-md rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.5)] overflow-hidden relative z-10 border-4 border-red-500"
                    >
                        <div className="bg-red-950/50 p-6 text-center animate-pulse">
                            <AlertTriangle className="h-20 w-20 text-white mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">{siren.title}</h2>
                        </div>
                        
                        <div className="p-8 text-center bg-zinc-950/20">
                            <p className="text-white text-lg font-bold leading-relaxed mb-8">
                                {siren.message}
                            </p>
                            
                            <button 
                                onClick={() => setSiren(null)}
                                className="w-full bg-white text-red-600 font-black uppercase tracking-widest py-5 rounded-xl hover:bg-zinc-100 transition-colors shadow-xl"
                            >
                                Acknowledge Order
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
