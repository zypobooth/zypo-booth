import React from 'react';

const BoothGallery = ({ photos, config, status, onReset }) => {
    return (
        <div className="lg:col-span-1 card-game h-fit bg-game-surface text-black">
            <div className="flex justify-between items-end mb-4 border-b-4 border-black pb-2">
                <h2 className="text-xl font-titan text-game-secondary stroke-black" style={{ WebkitTextStroke: '1px black' }}>INVENTORY</h2>
                <span className="text-black font-mono font-bold text-sm bg-game-success px-2 py-0.5 rounded border-2 border-black">{photos.length}/{config.totalPhotos}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white rounded-full h-4 mb-6 border-2 border-black shadow-[2px_2px_0_#000]">
                <div className="bg-game-success h-full rounded-full transition-all duration-500 relative border-r-2 border-black" style={{ width: `${(photos.length / config.totalPhotos) * 100}%` }}>
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
                </div>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {Array.from({ length: config.totalPhotos }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-xl border-2 border-black flex items-center justify-center relative overflow-hidden group shadow-[2px_2px_0_#000]">
                        {photos[i] ? (
                            <>
                                <img src={photos[i]} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Captured ${i + 1}`} />
                                <div className="absolute top-1 left-1 bg-game-primary text-white text-[10px] px-1.5 rounded font-mono border border-black">#{i + 1}</div>
                            </>
                        ) : (
                            <span className="text-gray-300 font-bold text-2xl opacity-50 font-titan">?</span>
                        )}
                    </div>
                ))}
            </div>

            {photos.length > 0 && status === 'idle' && (
                <button onClick={onReset} className="w-full py-2 btn-game-danger text-xs uppercase tracking-widest">
                    DISCARD ALL
                </button>
            )}
        </div>
    );
};

export default BoothGallery;
