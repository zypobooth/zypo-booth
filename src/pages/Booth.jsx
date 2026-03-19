
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { usePhotoBooth } from '../hooks/usePhotoBooth';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, Zap, Trash2, Upload, Star, ChevronDown, FlipHorizontal2, RefreshCw, ZapOff, Sun, Moon } from 'lucide-react';
import CameraView from '../components/CameraView';
import ImageEditor from '../components/ImageEditor';
import RingLight from '../components/RingLight';




const InventoryPreview = ({ photos, config, onRemove, onRatioChange }) => {
    const [aspectRatio, setAspectRatio] = React.useState(null);
    const slots = config.layout_config || [];
    const frameImage = config.frameImage;

    if (!frameImage) {
        return (
            <div className="flex-1 grid grid-cols-2 gap-3 content-start overflow-y-auto pr-1">
                {Array.from({ length: config.totalPhotos }).map((_, i) => (
                    <div key={i} className="aspect-square relative group">
                        {photos[i] ? (
                            <div className="w-full h-full rounded-xl border-4 border-black overflow-hidden relative shadow-md bg-black">
                                <img src={photos[i]} className="w-full h-full object-cover" alt="" />
                                <div className="absolute top-1 left-1 w-6 h-6 bg-game-secondary text-black font-black text-xs flex items-center justify-center rounded-lg border-2 border-black">
                                    {i + 1}
                                </div>
                                <button
                                    onClick={() => onRemove(i)}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-game-primary"
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-full rounded-xl border-2 border-dashed border-white/20 bg-black/30 flex items-center justify-center group-hover:bg-white/5 transition">
                                <span className="font-titan text-white/10 text-3xl group-hover:text-white/20 transition">{i + 1}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 w-full h-full relative flex items-center justify-center min-h-0 overflow-hidden p-2">
            {/* 
                THE DYNAMIC SIZER
                We use aspect-ratio + max-constraints to ensure it fills the box 
                without ever distorting, regardless of whether the frame is tall or wide.
            */}
            <div 
                className="relative shadow-2xl transition-all duration-300 group/container"
                style={{ 
                    aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
                    maxHeight: '100%',
                    maxWidth: '100%',
                    height: aspectRatio ? 'auto' : '100%',
                    width: aspectRatio ? 'auto' : '100%',
                    opacity: aspectRatio ? 1 : 0 // Wait for ratio to avoid flicker
                }}
            >
                {/* 1. LAYER BAWAH: SLOT FOTO */}
                <div className="absolute inset-0 z-10">
                    <div className="relative w-full h-full">
                        {slots.map((slot, i) => (
                            <div
                                key={i}
                                className="absolute overflow-hidden bg-black/20 group/slot"
                                style={{
                                    left: `${slot.x}%`,
                                    top: `${slot.y}%`,
                                    width: `${slot.width}%`,
                                    height: `${slot.height}%`,
                                }}
                            >
                                {photos[i] ? (
                                    <div className="w-full h-full relative">
                                        <img src={photos[i]} className="w-full h-full object-cover" alt="" />
                                        {/* Action Button - Placed inside slot but accessible */}
                                        <button
                                            onClick={() => onRemove(i)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center text-game-primary z-50 pointer-events-auto"
                                        >
                                            <Trash2 size={24} className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-titan text-white/5 text-2xl lg:text-4xl">{i + 1}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. LAYER ATAS: BINGKAI (FRAME) */}
                <img
                    src={frameImage}
                    alt="Frame"
                    onLoad={(e) => {
                        const { naturalWidth, naturalHeight } = e.target;
                        const ratio = naturalWidth / naturalHeight;
                        setAspectRatio(ratio);
                        if (onRatioChange) onRatioChange(ratio);
                    }}
                    className="w-full h-full block relative z-30 pointer-events-none object-fill"
                />
            </div>
        </div>
    );
};

const Booth = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { showAlert } = useAlert();
    const { ringLight, setRingLight } = useTheme();
    const { status, countdown, photos, liveVideos, setPhotos, startSession, reset, setStatus, setCountdown, videoRef, config, setConfig } = usePhotoBooth();

    const [showInventory, setShowInventory] = useState(false);
    const [editorImage, setEditorImage] = useState(null);
    const [flashOn, setFlashOn] = useState(false);
    const [sidebarRatio, setSidebarRatio] = useState(0.5);



    const cameraControlsRef = useRef(null); // Ref for accessing camera controls



    useEffect(() => {
        if (state?.preConfig) {
            const pre = state.preConfig;
            // Safety: normalize layout_config if it's still an object
            let lc = pre.layout_config;
            if (lc && !Array.isArray(lc)) {
                lc = lc.a || [];
                pre.layout_config = lc;
            }
            let count = pre.totalPhotos || 3;
            if (lc && Array.isArray(lc) && lc.length > 0) {
                count = lc.length;
            }
            setConfig(prev => ({ ...prev, ...pre, totalPhotos: count }));
        }
    }, [state, setConfig]);

    const handleStart = () => {
        if (status === 'finished') {
            navigate('/select-filter', { state: { photos, layout_config: config.layout_config, frameImage: config.frameImage, liveVideos, config } });
            return;
        }
        if (photos.length > 0) {
            setStatus('countdown');
            setCountdown(3);
        } else {
            startSession(config);
        }
    };

    const handleRemovePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        if (status === 'finished') {
            setStatus('idle');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Security validation
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml']; // Added SVG explicitly if you want, but usually unsafe. Removing SVG for safety.
        // Actually standard images only
        const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

        if (!SAFE_TYPES.includes(file.type)) {
            showAlert('Invalid file type. Only JPEG, PNG, and WebP images allowed.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_SIZE) {
            showAlert('File is too large. Maximum 15MB.', 'error');
            e.target.value = '';
            return;
        }

        if (photos.length < config.totalPhotos) {
            const reader = new FileReader();
            reader.onload = (f) => {
                // Open editor instead of directly adding
                setEditorImage(f.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            showAlert(`Full! Delete a photo to upload more.`, 'error');
        }
        e.target.value = '';
    };

    const handleEditorConfirm = (processedImage) => {
        setEditorImage(null);
        setPhotos(prev => {
            const newPhotos = [...prev, processedImage];
            if (newPhotos.length >= config.totalPhotos) {
                setStatus('finished');
            }
            return newPhotos;
        });
    };

    const handleEditorCancel = () => {
        setEditorImage(null);
    };



    return (
        <div className="h-dvh w-full font-nunito flex flex-col overflow-hidden relative select-none">
            {/* Same decorations... */}
            <motion.div
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="hidden md:block absolute top-20 left-10 text-game-secondary pointer-events-none opacity-80"
            >
                <Zap size={48} fill="currentColor" />
            </motion.div>
            <motion.div
                animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="hidden md:block absolute top-32 right-20 text-game-success pointer-events-none opacity-80"
            >
                <Star size={36} fill="currentColor" />
            </motion.div>

            {/* === HEADER === */}
            <header className="flex-none h-20 px-6 py-4 flex items-center justify-between z-30 relative">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/select-frame')}
                    className="w-12 h-12 btn-game-danger btn-cute flex items-center justify-center shadow-game"
                >
                    <ArrowLeft size={24} strokeWidth={3} />
                </motion.button>

                <div className="flex flex-col items-center justify-center w-64 md:w-96">
                    <h1 className="font-titan text-white text-xl tracking-wider mb-2 uppercase drop-shadow-md text-stroke-sm">
                        {config.name || 'CUSTOM'}
                    </h1>
                    <div className="w-full bg-black/60 h-4 rounded-full border-2 border-black p-0.5 shadow-inner">
                        <motion.div
                            className="h-full bg-gradient-to-r from-game-success to-[#32d613] rounded-full border border-white/20"
                            animate={{ width: `${Math.min(100, (photos.length / config.totalPhotos) * 100)}% ` }}
                        />
                    </div>
                </div>

                <div className="bg-game-secondary text-game-bg-dark font-mono font-black text-xl px-4 py-2 rounded-xl border-4 border-black shadow-game min-w-[80px] text-center">
                    {photos.length}/{config.totalPhotos}
                </div>
            </header>

            {/* === MAIN CONTENT === */}
            <main className="flex-1 min-h-0 flex items-center justify-center gap-4 md:gap-8 p-4 z-20">
                {/* CAMERA PREVIEW */}
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-black rounded-3xl md:rounded-[2rem] border-4 md:border-[6px] border-black shadow-game-lg overflow-hidden w-[95vw] h-auto aspect-[4/3] md:w-auto md:h-[min(75vh,56.25vw)]"
                    >
                        {/* Camera Feed */}
                        <div className="w-full h-full relative">
                            <div className="w-full h-full">
                                <div className="absolute inset-0 z-0">
                                    <CameraView
                                        ref={cameraControlsRef}
                                        onReady={(el) => {
                                            if (el) videoRef.current = el;
                                        }}
                                        activeFilter={null}
                                        isMirrored={config.isMirrored}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* HUD Overlay */}
                        <div className="absolute inset-0 pointer-events-none p-3 md:p-5 flex flex-col justify-between">
                            {/* Top Row */}
                            <div className="flex justify-between items-start pointer-events-auto">
                                <div className="bg-[#ff4444] text-white font-mono text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded border-2 border-black flex items-center gap-2 animate-pulse shadow-md">
                                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"></div> REC
                                </div>

                                <div className="flex gap-2 flex-wrap justify-end max-w-[70%]">
                                    <button
                                        onClick={() => setConfig(prev => ({ ...prev, isMirrored: !prev.isMirrored }))}
                                        className={`px-2 py-0.5 md:py-1 rounded-full border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${config.isMirrored
                                            ? 'bg-cyan-400 text-black border-black shadow-[2px_2px_0_#000]'
                                            : 'bg-black/60 text-white border-white/20'
                                            }`}
                                        title="Mirror / Flip"
                                    >
                                        <FlipHorizontal2 size={12} strokeWidth={2.5} />
                                        <span className="hidden sm:inline">MIRROR</span>
                                    </button>

                                    <button
                                        onClick={() => cameraControlsRef.current?.switchCamera()}
                                        className="px-2 py-0.5 md:py-1 rounded-full border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm bg-black/60 text-white border-white/20"
                                        title="Switch Camera"
                                    >
                                        <RefreshCw size={12} strokeWidth={2.5} />
                                        <span className="hidden sm:inline">FLIP</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (cameraControlsRef.current) {
                                                cameraControlsRef.current.toggleFlash();
                                                setFlashOn(prev => !prev);
                                            }
                                        }}
                                        className={`px-2 py-0.5 md:py-1 rounded-full border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${flashOn
                                            ? 'bg-yellow-400 text-black border-black shadow-[2px_2px_0_#000]'
                                            : 'bg-black/60 text-white border-white/20'
                                            }`}
                                        title="Toggle Flash"
                                    >
                                        {flashOn ? <ZapOff size={12} strokeWidth={2.5} /> : <Zap size={12} strokeWidth={2.5} />}
                                        <span className="hidden sm:inline">FLASH</span>
                                    </button>

                                    <button
                                        onClick={() => setConfig(prev => ({ ...prev, isLive: !prev.isLive }))}
                                        className={`px-2 py-0.5 md:py-1 rounded-full border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${config.isLive
                                            ? 'bg-yellow-400 text-black border-black shadow-[2px_2px_0_#000]'
                                            : 'bg-black/60 text-white border-white/20'
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${config.isLive ? 'border-black' : 'border-white'}`}>
                                            <div className={`w-1 h-1 rounded-full ${config.isLive ? 'bg-black' : 'bg-white'}`}></div>
                                        </div>
                                        <span className="hidden sm:inline">LIVE</span>
                                    </button>

                                    <button
                                        onClick={() => setRingLight(!ringLight)}
                                        className={`px-2 py-0.5 md:py-1 rounded-full border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${ringLight
                                            ? 'bg-game-secondary text-black border-black shadow-[2px_2px_0_#000]'
                                            : 'bg-black/60 text-white border-white/20'
                                            }`}
                                        title="Toggle RingLight"
                                    >
                                        {ringLight ? <Sun size={12} strokeWidth={2.5} className="animate-pulse" /> : <Moon size={12} strokeWidth={2.5} />}
                                        <span className="hidden sm:inline">LIGHT</span>
                                    </button>


                                </div>
                            </div>

                            {/* Center Target */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
                                <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-white rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white"></div>
                                <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white"></div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex justify-between items-end">
                                <div className="bg-black/60 backdrop-blur px-2 py-0.5 md:py-1 rounded text-[10px] font-mono text-game-secondary border border-white/10">
                                    ISO 800
                                </div>
                                <div className="bg-black/60 backdrop-blur px-2 py-0.5 md:py-1 rounded text-[10px] font-mono text-game-success border border-white/10 uppercase animate-pulse">
                                    [ FACE ]
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20"></div>

                        <AnimatePresence>
                            {status === 'countdown' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                                >
                                    <div className="flex flex-col items-center">
                                        <motion.span
                                            key={countdown}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1.5, opacity: 1 }}
                                            exit={{ scale: 2, opacity: 0 }}
                                            className="font-titan text-8xl md:text-[120px] text-game-secondary drop-shadow-[4px_4px_0_#000] text-stroke mb-8"
                                        >
                                            {countdown}
                                        </motion.span>

                                        <motion.button
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.1 }}
                                            onClick={() => setCountdown(0)}
                                            className="px-6 py-2 bg-white/20 backdrop-blur-md border-2 border-white text-white font-titan rounded-full hover:bg-white hover:text-black transition-colors"
                                        >
                                            SKIP
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {status === 'capturing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 0] }}
                                    className="absolute inset-0 bg-white z-[60]"
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="hidden lg:flex flex-col bg-game-bg-dark/80 backdrop-blur-md border-4 border-black rounded-[2rem] p-4 shadow-game h-[min(56.25vw,75vh)] relative transition-all duration-500 ease-out"
                    style={{ 
                        width: `clamp(280px, calc((min(56.25vw, 75vh) - 100px) * ${sidebarRatio} + 48px), 480px)` 
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-game-secondary rounded-lg flex items-center justify-center border-2 border-black shadow-sm">
                                <div className="w-3 h-3 bg-black/20 rounded-sm transform rotate-45"></div>
                            </div>
                            <h3 className="font-titan text-white text-lg tracking-wide drop-shadow-md">INVENTORY</h3>
                        </div>
                        <div className="bg-game-success text-black font-black font-mono px-2.5 py-0.5 rounded-lg text-sm border-2 border-black shadow-sm">
                            {photos.length}/{config.totalPhotos}
                        </div>
                    </div>

                    <InventoryPreview 
                        photos={photos} 
                        config={config} 
                        onRemove={handleRemovePhoto}
                        onRatioChange={setSidebarRatio}
                    />
                </motion.div>
            </main>

            {/* === FOOTER CONTROLS === */}
            <footer className="flex-none p-4 md:p-6 z-30 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 pb-8 md:pb-6">


                {/* 2. Action Buttons */}
                <div className="w-full md:w-auto flex items-center gap-2 md:gap-3 order-1 md:order-2">
                    {/* ... Upload and Capture buttons remain same ... */}
                    <motion.label
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-14 md:h-20 px-4 md:px-6 btn-game-primary btn-cute rounded-2xl flex items-center justify-center gap-2 md:gap-3 cursor-pointer shadow-game text-white flex-1 md:flex-none min-w-0"
                    >
                        <Upload size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
                        <span className="font-titan tracking-wider text-sm md:text-lg ">UPLOAD</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </motion.label>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStart}
                        disabled={status !== 'idle' && status !== 'finished'}
                        className={`h-14 md:h-20 px-6 md:px-10 btn-cute rounded-2xl flex items-center justify-center gap-2 md:gap-3 shadow-game text-black transition-all flex-[2] md:flex-none min-w-0 ${status === 'finished'
                            ? 'btn-game-success'
                            : 'btn-game-secondary'
                            }`}
                    >
                        {status === 'finished' ? (
                            <>
                                <span className="font-titan tracking-wider text-lg md:text-2xl">FINISH</span>
                                <ArrowLeft size={24} className="md:w-8 md:h-8 rotate-180" strokeWidth={3} />
                            </>
                        ) : (
                            <>
                                <Camera size={24} className="md:w-8 md:h-8" strokeWidth={2.5} />
                                <span className="font-titan tracking-wider text-lg md:text-2xl">CAPTURE</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </footer>

            {/* Mobile Bottom Sheet for Inventory (Hidden on Desktop) */}
            <div className="lg:hidden absolute top-24 right-4 z-40">
                <button
                    onClick={() => setShowInventory(!showInventory)}
                    className="w-12 h-12 bg-game-dark border-4 border-black rounded-full flex items-center justify-center text-white shadow-game"
                >
                    <span className="font-bold">{photos.length}</span>
                </button>
            </div>
            <AnimatePresence>
                {showInventory && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f3e] border-t-4 border-black p-6 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-titan text-white text-xl">INVENTORY</h3>
                            <button onClick={() => setShowInventory(false)} className="p-2 text-white/50"><ChevronDown /></button>
                        </div>
                        <div className="h-[60vh] flex flex-col">
                            <InventoryPreview 
                                photos={photos} 
                                config={config} 
                                onRemove={handleRemovePhoto} 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Editor Modal */}
            {editorImage && (
                <ImageEditor
                    imageSrc={editorImage}
                    aspectRatio={4 / 3}
                    onConfirm={handleEditorConfirm}
                    onCancel={handleEditorCancel}
                />
            )}

            {/* RingLight Feature */}
            <RingLight />
        </div>
    );
};

export default Booth;
