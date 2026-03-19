import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoTransitionOverlay = ({ videoUrl, onComplete }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!videoUrl) {
            onComplete();
            return;
        }

        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Force reset video to beginning and play
        videoElement.currentTime = 0;

        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => setIsPlaying(true))
                .catch((error) => {
                    console.error("Video auto-play failed. Completing early...", error);
                    // If video fails (usually browser policy on unmuted auto-play without interaction)
                    // we immediately finish the transition so the user isn't stuck.
                    onComplete();
                });
        }

        const handleEnded = () => {
            onComplete();
        };

        videoElement.addEventListener('ended', handleEnded);

        // Failsafe: if video freezes or stalls for too long, just finish
        const stallTimeout = setTimeout(() => {
            if (!isPlaying) onComplete();
        }, 5000);

        return () => {
            clearTimeout(stallTimeout);
            videoElement.removeEventListener('ended', handleEnded);
        };
    }, [videoUrl, onComplete, isPlaying]);

    if (!videoUrl) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden"
            >
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    muted // Video must be muted to autoplay reliably across all browsers
                />

                <button
                    onClick={onComplete}
                    className="absolute top-6 right-6 z-[100000] bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full font-nunito text-sm backdrop-blur-sm transition-all"
                >
                    Skip Transition
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default VideoTransitionOverlay;
