import React from 'react';

const BoothSettings = ({ config, setConfig, onAbort }) => {
    return (
        <div className="lg:col-span-1 card-game h-fit bg-game-surface text-black">
            <h2 className="text-xl font-titan mb-6 text-game-primary border-b-4 border-black pb-2">SETTINGS</h2>

            {/* Selected Template Info */}
            <div className="bg-game-accent/20 border-2 border-black rounded-xl p-4 mb-6 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider mb-1">CURRENT MISSION</p>
                <p className="font-bold text-lg font-titan tracking-wide">{config.name || (config.theme === 'custom' ? 'Custom Raid' : config.theme?.toUpperCase())}</p>
                <p className="text-xs text-gray-600 mt-1">{config.totalPhotos} TARGETS REQUIRED</p>
            </div>

            {/* Delay Selector */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-800 mb-2 uppercase">Time Limit</label>
                <select className="w-full bg-white border-4 border-black text-black rounded-xl p-2 font-bold focus:bg-game-accent outline-none shadow-[2px_2px_0_#000]">
                    <option>3 SECONDS</option>
                    <option disabled>5 SECONDS (LOCKED)</option>
                </select>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-800 mb-2 uppercase">Power Ups</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'none', label: 'NOR', color: 'bg-white' },
                        { id: 'bright', label: 'STR', color: 'bg-yellow-100' },
                        { id: 'bw', label: 'B&W', color: 'bg-gray-200' },
                        { id: 'vintage', label: 'RTR', color: 'bg-orange-100' },
                        { id: 'soft', label: 'SFT', color: 'bg-pink-100' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setConfig(prev => ({ ...prev, filter: f.id }))}
                            className={`py-1 text-xs rounded-lg border-2 border-black font-bold transition-all ${config.filter === f.id ? 'bg-game-success shadow-[2px_2px_0_#000] -translate-y-1' : 'bg-white hover:bg-gray-100'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <button onClick={onAbort} className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:underline text-center uppercase tracking-widest font-titan">
                ← ABORT MISSION
            </button>
        </div>
    );
};

export default BoothSettings;
