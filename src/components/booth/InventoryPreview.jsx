import React from 'react';
import { Trash2 } from 'lucide-react';

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

export default InventoryPreview;
