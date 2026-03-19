import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraView from '../CameraView';

const BoothCamera = ({ videoRef, status, countdown, config, setPhotos, onStart, navigate }) => { // Added navigate prop or handle upload internally? 
    // Actually better to handle upload logic here or pass a handler. 
    // For now I'll inline the file input logic but it needs setPhotos and config from parent.

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                const newPhoto = f.target.result;
                setPhotos(prev => {
                    const updated = [...prev, newPhoto];
                    if (updated.length >= config.totalPhotos) {
                        // We might need to handle navigation in parent if this happens
                        // For now, let's just update state, parent useEffect handles navigation
                    }
                    return updated;
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const getFilterCss = (filterName) => {
        switch (filterName) {
            case 'bright': return 'brightness(1.2) contrast(1.1)';
            case 'vintage': return 'sepia(0.4) contrast(1.2)';
            case 'bw': return 'grayscale(1)';
            case 'soft': return 'contrast(0.9) brightness(1.1) blur(0.5px)';
            default: return 'none';
        }
    };

    return (
        <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Top Tabs */}
            <div className="bg-white rounded-full p-1 border-4 border-black w-fit mx-auto flex gap-1 shadow-[4px_4px_0_#000]">
                <button className="px-6 py-2 rounded-full bg-game-primary text-white font-bold text-sm border-2 border-black font-titan">CAMERA 01</button>
                <label className="px-6 py-2 rounded-full text-black font-bold text-sm cursor-pointer hover:bg-game-accent transition flex items-center gap-2 font-titan">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    UPLOAD FILE
                </label>
            </div>

            {/* Viewport */}
            <div className="bg-black p-3 rounded-3xl border-4 border-black shadow-game relative min-h-[400px] flex flex-col justify-center overflow-hidden">
                {/* CRT Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

                <div className="rounded-xl overflow-hidden border-2 border-gray-800 relative bg-neutral-900 aspect-video">
                    <div style={{ filter: getFilterCss(config.filter) }} className="w-full h-full">
                        <CameraView onReady={(ref) => { if (videoRef) videoRef.current = ref.current; }} />
                    </div>

                    {/* Overlay Countdown */}
                    {status === 'countdown' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                            <h2 className="text-9xl font-titan text-game-accent stroke-black drop-shadow-[5px_5px_0_#000]" style={{ WebkitTextStroke: '3px black' }}>{countdown}</h2>
                        </div>
                    )}

                    {/* Flash Effect */}
                    <AnimatePresence>
                        {status === 'capturing' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-30" />
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Button */}
                <div className="mt-4 text-center pb-2 px-2">
                    {status === 'idle' ? (
                        <button
                            onClick={onStart}
                            className="w-full py-4 text-white text-2xl btn-game-primary"
                        >
                            CAPTURE
                        </button>
                    ) : (
                        <div className="py-4 bg-gray-800 rounded-xl font-bold text-yellow-400 animate-pulse border-2 border-gray-700 font-mono tracking-widest">
                            {status === 'processing' ? 'PROCESSING DATA...' : status === 'countdown' ? 'GET READY...' : 'CAPTURING...'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BoothCamera;
