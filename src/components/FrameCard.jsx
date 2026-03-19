import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const FrameCard = ({ frame, isSelected, onSelect }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(frame)}
            className={`aspect-square relative rounded-xl border-4 overflow-hidden transition-all duration-200 group 
                ${frame.status === 'coming_soon' ? 'border-gray-400 bg-gray-200' : 'border-black hover:border-game-primary'}
                ${isSelected ? 'border-game-accent ring-4 ring-game-accent/50 scale-105 z-10' : ''}
            `}
        >
            {/* Thumbnail Content */}
            {frame.type === 'basic' ? (
                <div className="w-full h-full" style={{ backgroundColor: frame.hex }}></div>
            ) : (
                <img src={frame.thumbnail || frame.image} alt={frame.name} className={`w-full h-full object-cover ${frame.status === 'coming_soon' ? 'grayscale opacity-50' : ''}`} />
            )}

            {/* Hover Name Overlay */}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white font-bold text-xs uppercase text-center px-1">
                    {frame.name}
                </span>
            </div>

            {/* Coming Soon Badge */}
            {frame.status === 'coming_soon' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-game-accent text-black text-[10px] font-bold px-2 py-1 transform -rotate-12 border border-black z-20 shadow-sm">SOON</span>
                </div>
            )}

            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute top-1 right-1 bg-game-accent text-black p-1 rounded-full border border-black shadow-sm">
                    <Star size={12} fill="black" />
                </div>
            )}
        </motion.button>
    );
};

export default FrameCard;
