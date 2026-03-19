import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw, ZoomIn, ZoomOut, RefreshCw, Move, Maximize, RotateCw } from 'lucide-react';
import { APP_CONFIG } from '../config/constants';

const ImageEditor = ({ imageSrc, onConfirm, onCancel, aspectRatio = 4 / 3 }) => {
    const containerRef = useRef(null);
    const [image, setImage] = useState(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Transform state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);

    // Interaction refs
    const isDragging = useRef(false);
    const dragPointerId = useRef(null);
    const lastPointer = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(0);
    const initialScale = useRef(1);

    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5;

    // Load image
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setImage(img);
            if (containerSize.width > 0) {
                resetImage(img);
            }
        };
        img.src = imageSrc;
    }, [imageSrc, containerSize.width, aspectRatio]);

    // Measure container
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({ width: rect.width, height: rect.height });
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const getCropDimensions = useCallback(() => {
        if (!containerSize.width || !containerSize.height) return { width: 0, height: 0, left: 0, top: 0 };
        const isDesktop = containerSize.width > 768;
        const maxWidth = isDesktop ? Math.min(containerSize.width * 0.8, 800) : containerSize.width * 0.9;
        const maxHeight = containerSize.height * (isDesktop ? 0.7 : 0.6);

        let w = maxWidth;
        let h = w / aspectRatio;

        if (h > maxHeight) {
            h = maxHeight;
            w = h * aspectRatio;
        }

        return {
            width: w,
            height: h,
            left: (containerSize.width - w) / 2,
            top: (containerSize.height - h) / 2
        };
    }, [containerSize, aspectRatio]);

    const { width: cropW, height: cropH, left: cropX, top: cropY } = getCropDimensions();

    const resetImage = useCallback((img = image) => {
        if (!img || cropW === 0) return;
        const imgRatio = img.width / img.height;
        let s;
        if (imgRatio > aspectRatio) {
            s = cropH / img.height;
        } else {
            s = cropW / img.width;
        }
        setScale(s * 1.05);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
        initialScale.current = s * 1.05;
    }, [image, cropW, cropH, aspectRatio]);

    // --- REFACTORED POINTER EVENTS ---
    const handlePointerDown = (e) => {
        if (isDragging.current) return;
        isDragging.current = true;
        dragPointerId.current = e.pointerId;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current || e.pointerId !== dragPointerId.current) return;
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const handlePointerUp = (e) => {
        if (e.pointerId === dragPointerId.current) {
            isDragging.current = false;
            dragPointerId.current = null;
        }
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            lastPinchDist.current = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / lastPinchDist.current;
            lastPinchDist.current = dist;
            setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor)));
        }
    };

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor)));
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        el.style.touchAction = 'none';
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const handleConfirm = () => {
        if (!image || cropW === 0) return;
        const outputW = Math.min(APP_CONFIG.CANVAS.OUTPUT_WIDTH, image.naturalWidth || image.width);
        const outputH = outputW / aspectRatio;
        const canvas = document.createElement('canvas');
        canvas.width = outputW;
        canvas.height = outputH;
        const ctx = canvas.getContext('2d');
        const sf = outputW / cropW;

        ctx.save();
        ctx.translate(outputW / 2, outputH / 2);
        ctx.translate(position.x * sf, position.y * sf);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale * sf, scale * sf);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        ctx.restore();
        onConfirm(canvas.toDataURL('image/jpeg', 0.85));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-game-dark font-nunito overflow-hidden"
            >
                {/* Background Decoration */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-game-primary rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-game-secondary rounded-full blur-[120px]" />
                </div>

                {/* Header */}
                <div className="flex-none w-full px-6 py-6 flex items-center justify-between z-30">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onCancel}
                        className="w-12 h-12 bg-game-bg-dark text-white rounded-2xl flex items-center justify-center shadow-game border-4 border-black group"
                    >
                        <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                    </motion.button>
                    <h2 className="font-titan text-white text-2xl tracking-wider text-stroke-sm drop-shadow-md uppercase">Adjust Photo</h2>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleConfirm}
                        className="w-12 h-12 bg-game-success text-black rounded-2xl flex items-center justify-center shadow-game border-4 border-black"
                    >
                        <Check size={28} strokeWidth={4} />
                    </motion.button>
                </div>

                {/* Editor Area */}
                <div
                    ref={containerRef}
                    className="flex-1 w-full relative overflow-hidden cursor-grab active:cursor-grabbing select-none focus:outline-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                >
                    {image && (
                        <div
                            className="absolute will-change-transform"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                                transformOrigin: 'center center',
                                transition: isDragging.current ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
                            }}
                        >
                            <img src={imageSrc} alt="" className="pointer-events-none max-w-none" draggable={false} />
                        </div>
                    )}

                    {/* Crop Overlays */}
                    {cropW > 0 && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute inset-0 bg-game-bg-dark/80 backdrop-blur-[2px]" style={{ clipPath: `polygon(0% 0%, 0% 100%, ${cropX}px 100%, ${cropX}px ${cropY}px, ${cropX + cropW}px ${cropY}px, ${cropX + cropW}px ${cropY + cropH}px, ${cropX}px ${cropY + cropH}px, ${cropX}px 100%, 100% 100%, 100% 0%)` }} />
                            
                            <div className="absolute border-[6px] border-white shadow-game-lg pointer-events-none" style={{ left: cropX, top: cropY, width: cropW, height: cropH }}>
                                {/* Rule of thirds grid */}
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                                    <div className="border-r border-b border-white/50" />
                                    <div className="border-r border-b border-white/50" />
                                    <div className="border-b border-white/50" />
                                    <div className="border-r border-b border-white/50" />
                                    <div className="border-r border-b border-white/50" />
                                    <div className="border-b border-white/50" />
                                    <div className="border-r border-white/50" />
                                    <div className="border-r border-white/50" />
                                    <div />
                                </div>
                                {/* Corner Accents */}
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-game-secondary" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-game-secondary" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls Bar */}
                <div className="flex-none w-full max-w-2xl px-6 py-8 z-30">
                    <div className="bg-game-bg-dark/80 backdrop-blur-xl border-4 border-black rounded-[2.5rem] p-6 shadow-game space-y-6">
                        
                        {/* Zoom Slider */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-black/40 rounded-xl text-game-primary flex-none border-2 border-black/20">
                                <Maximize size={20} />
                            </div>
                            <div className="flex-1 relative h-8 flex items-center group">
                                <input
                                    type="range"
                                    min={Math.max(MIN_SCALE, initialScale.current * 0.2)}
                                    max={MAX_SCALE}
                                    step="0.01"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="w-full h-3 bg-black/60 rounded-full appearance-none cursor-pointer accent-game-primary border-2 border-black/20"
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-game-primary text-black font-black text-[10px] px-2 py-0.5 rounded-full border-2 border-black">
                                    {Math.round((scale / initialScale.current) * 100)}%
                                </div>
                            </div>
                            <div className="flex-none w-12 text-center font-mono font-black text-game-primary drop-shadow-sm">
                                {Math.round(scale * 100)}
                            </div>
                        </div>

                        {/* Rotation Slider */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-black/40 rounded-xl text-game-secondary flex-none border-2 border-black/20">
                                <RefreshCw size={20} />
                            </div>
                            <div className="flex-1 relative h-8 flex items-center group">
                                <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    step="1"
                                    value={rotation}
                                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                                    className="w-full h-3 bg-black/60 rounded-full appearance-none cursor-pointer accent-game-secondary border-2 border-black/20"
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-game-secondary text-black font-black text-[10px] px-2 py-0.5 rounded-full border-2 border-black">
                                    {rotation}°
                                </div>
                            </div>
                            <div className="flex-none w-12 text-center font-mono font-black text-game-secondary drop-shadow-sm">
                                {rotation}°
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setRotation(prev => prev - 90)}
                                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition border-2 border-white/5"
                                    title="Rotate Left"
                                >
                                    <RotateCcw size={22} />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setRotation(prev => prev + 90)}
                                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition border-2 border-white/5"
                                    title="Rotate Right"
                                >
                                    <RotateCw size={22} />
                                </motion.button>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => resetImage()}
                                className="px-6 py-3 bg-game-bg-dark text-white font-titan text-sm rounded-2xl border-4 border-black shadow-game flex items-center gap-2 hover:bg-black transition"
                            >
                                <RefreshCw size={18} />
                                RESET
                            </motion.button>
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-white/40 font-mono text-[11px] tracking-widest uppercase flex items-center justify-center gap-2">
                            <Move size={12} /> Use pinch or drag to adjust directly
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageEditor;
