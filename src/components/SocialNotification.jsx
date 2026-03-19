import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SocialNotification = () => {
    const [isVisible, setIsVisible] = useState(true);

    // Optional: Auto-hide after some time? Use state if we want it dismissible.
    // For now, let's keep it until dismissed or persistent as per request "popup" implies it might appear.
    // Let's make it dismissible for UX.

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0, x: '-50%' }}
                animate={{ y: 0, opacity: 1, x: '-50%' }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ delay: 1, type: 'spring', stiffness: 120, damping: 20 }}
                className="fixed top-4 left-1/2 z-[100] w-auto whitespace-nowrap"
            >
                <div className="bg-black/90 backdrop-blur-md border border-yellow-400/50 text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                    <span className="text-sm animate-bounce">📸</span>
                    <span className="text-[10px] md:text-xs font-bold tracking-wide">
                        Share & tag us <span className="text-yellow-400">@zypobooth</span>!
                    </span>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Dismiss notification"
                    >
                        <X size={12} className="text-gray-400 hover:text-white" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SocialNotification;
