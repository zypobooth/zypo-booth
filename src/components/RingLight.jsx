import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette } from 'lucide-react';

const COLORS = [
    { name: 'Warm White', value: 'rgba(255, 255, 230, 0.9)', glow: 'rgba(255, 255, 200, 0.5)' },
    { name: 'Pure White', value: 'rgba(255, 255, 255, 0.9)', glow: 'rgba(255, 255, 255, 0.5)' },
    { name: 'Cool Blue', value: 'rgba(200, 230, 255, 0.9)', glow: 'rgba(100, 200, 255, 0.5)' },
    { name: 'Soft Pink', value: 'rgba(255, 200, 230, 0.9)', glow: 'rgba(255, 100, 200, 0.5)' },
    { name: 'Neon Green', value: 'rgba(200, 255, 200, 0.9)', glow: 'rgba(100, 255, 100, 0.5)' },
];

const RingLight = () => {
    const { ringLight, setRingLight } = useTheme();
    const [selectedColor, setSelectedColor] = useState(() => {
        const saved = localStorage.getItem('ringLightColor');
        return saved ? JSON.parse(saved) : COLORS[0];
    });
    const [brightness, setBrightness] = useState(() => {
        const saved = localStorage.getItem('ringLightBrightness');
        return saved ? parseFloat(saved) : 0.8;
    });
    const [showPicker, setShowPicker] = useState(false);

    const handleColorSelect = (color) => {
        setSelectedColor(color);
        localStorage.setItem('ringLightColor', JSON.stringify(color));
    };

    const handleBrightnessChange = (e) => {
        const val = parseFloat(e.target.value);
        setBrightness(val);
        localStorage.setItem('ringLightBrightness', val);
    };

    return (
        <>
            <AnimatePresence>
                {ringLight && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: brightness }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 pointer-events-none z-[100]"
                        style={{
                            boxShadow: `inset 0 0 150px ${selectedColor.glow}, 
                                        inset 0 0 60px ${selectedColor.value},
                                        inset 0 0 20px ${selectedColor.value}`,
                            border: `${40 * brightness}px solid ${selectedColor.value}`,
                        }}
                    >
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <div className="fixed bottom-24 right-6 z-[101] flex flex-col gap-3 items-end">
                <AnimatePresence>
                    {showPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 20 }}
                            className="bg-black/90 backdrop-blur-xl border-2 border-white/20 p-4 rounded-3xl flex flex-col gap-4 mb-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-48"
                        >
                            <div className="space-y-2">
                                <p className="text-[10px] font-titan text-white/50 uppercase tracking-[0.2em] text-center">Intensity</p>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1" 
                                    step="0.05" 
                                    value={brightness}
                                    onChange={handleBrightnessChange}
                                    className="w-full accent-game-accent cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-titan text-white/50 uppercase tracking-[0.2em] text-center">Color Palette</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => handleColorSelect(color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all active:scale-90 ${selectedColor.name === color.name ? 'border-white scale-125 shadow-[0_0_15px_white]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-3">
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowPicker(!showPicker)}
                        className={`p-3 rounded-2xl border-2 shadow-game transition-all ${showPicker ? 'bg-game-accent border-black text-black' : 'bg-black/60 border-white/20 text-white hover:border-game-accent'}`}
                    >
                        <Palette size={20} />
                    </motion.button>
                </div>
            </div>
        </>
    );
};

export default RingLight;
