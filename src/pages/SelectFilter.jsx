import React, { useState, useEffect, useMemo } from 'react';
import HamsterLoader from '../components/Loader/HamsterLoader';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import FilteredImage from '../components/FilteredImage';
import { getFilterCss } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Star, Sparkles, ArrowLeft, Layers, Palette } from 'lucide-react';

const SelectFilter = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { photos = [], layout_config, frameImage, liveVideos, config } = location.state || {};

    const [activeFilterId, setActiveFilterId] = useState('none');
    const [loading, setLoading] = useState(true);
    const [lutFilters, setLutFilters] = useState([]);

    // Built-in CSS filters
    const builtInFilters = [
        { id: 'none', name: 'Original', is_lut: false, icon: '🌈' },
        { id: 'bright', name: 'Bright', is_lut: false, icon: '☀️' },
        { id: 'retro', name: 'Retro', is_lut: false, icon: '📺' },
        { id: 'mono', name: 'Mono', is_lut: false, icon: '🎞️' },
        { id: 'soft', name: 'Soft', is_lut: false, icon: '✨' }
    ];

    // Fetch LUT filters from Supabase
    useEffect(() => {
        const fetchLuts = async () => {
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('luts')
                        .select('*')
                        .eq('is_active', true)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        const dataWithUrls = data.map(lut => {
                            if (lut.storage_path && lut.storage_path.startsWith('http')) {
                                return { ...lut, public_url: lut.storage_path };
                            }
                            const { data: urlData } = supabase.storage
                                .from('luts')
                                .getPublicUrl(lut.storage_path);
                            return { ...lut, public_url: urlData.publicUrl };
                        });
                        setLutFilters(dataWithUrls);
                    }
                }
            } catch (err) {
                console.error('Error fetching filters:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLuts();
        if (!photos.length) navigate('/booth');
    }, [navigate, photos.length]);

    // Combine all filters
    const allFilters = useMemo(() => [
        ...builtInFilters,
        ...lutFilters.map(l => ({
            id: l.id,
            name: l.name,
            icon: '🎨',
            is_lut: true,
            storage_path: l.public_url || l.storage_path,
        }))
    ], [lutFilters]);

    // Layout slots for preview
    const slots = useMemo(() => {
        if (!layout_config) return [];
        return Array.isArray(layout_config) ? layout_config : (layout_config.a || []);
    }, [layout_config]);

    const activeFilter = useMemo(() =>
        allFilters.find(f => f.id === activeFilterId) || builtInFilters[0],
        [allFilters, activeFilterId]);

    const handleContinue = () => {
        navigate('/result', {
            state: {
                photos,
                activeFilter: {
                    id: activeFilter.id,
                    name: activeFilter.name,
                    is_lut: activeFilter.is_lut,
                    lutUrl: activeFilter.storage_path,
                    filter: activeFilter.is_lut ? 'none' : activeFilter.id
                },
                layout_config,
                frameImage,
                liveVideos,
                config: {
                    ...config,
                    filter: activeFilter.is_lut ? 'none' : activeFilter.id,
                    is_lut: !!activeFilter.is_lut,
                    lutUrl: activeFilter.storage_path || null
                }
            }
        });
    };

    return (
        <div className="h-dvh font-nunito flex flex-col overflow-hidden relative bg-game-bg text-game-surface">
            <Helmet>
                <title>Select Filter | PixenzeBooth</title>
            </Helmet>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-game-primary/20 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-game-secondary/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="flex-none h-14 md:h-20 px-4 md:px-6 py-2 md:py-4 flex items-center justify-between z-30 relative bg-game-bg-dark/95 border-b-4 border-black">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 md:w-12 md:h-12 btn-game-danger btn-cute flex items-center justify-center shadow-game"
                >
                    <ArrowLeft size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                </motion.button>

                <h1 className="font-titan text-white text-lg md:text-3xl tracking-widest uppercase text-stroke-sm drop-shadow-md">
                    SELECT FILTER
                </h1>

                <div className="bg-game-secondary text-black font-mono font-black text-sm md:text-xl px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border-2 md:border-4 border-black shadow-game min-w-[60px] md:min-w-[80px] text-center truncate max-w-[80px] md:max-w-none">
                    {activeFilter.name.toUpperCase()}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 relative z-10 bg-black/20">

                {/* LEFT: Filter Selector Sidebar (Mobile: Bottom Sheet) */}
                <div className="flex-1 md:flex-none md:w-[320px] lg:w-[380px] flex flex-col order-2 md:order-1 h-full bg-game-bg-dark md:bg-black/40 backdrop-blur-xl border-t-4 md:border-t-0 md:border-r-4 border-black rounded-t-[2.5rem] md:rounded-none shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-none overflow-hidden select-none relative z-20">

                    {/* Mobile Handle */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                    </div>

                    {/* Filter Category Titles */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 md:space-y-8 pb-32">

                        {/* 1. Classic Filters */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 opacity-70">
                                <Palette size={18} className="text-game-primary" />
                                <h3 className="font-titan text-xs md:text-sm tracking-widest uppercase">Classic Effects</h3>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3">
                                {builtInFilters.map(filter => (
                                    <FilterButton
                                        key={filter.id}
                                        filter={filter}
                                        isActive={activeFilterId === filter.id}
                                        onClick={() => setActiveFilterId(filter.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 2. m LUTs */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 opacity-70">
                                <Star size={18} className="text-game-secondary" fill="currentColor" />
                                <h3 className="font-titan text-xs md:text-sm tracking-widest uppercase">Premium LUTs</h3>
                            </div>
                            {loading ? (
                                <div className="py-8 bg-black/20 rounded-2xl flex items-center justify-center">
                                    <HamsterLoader message="UNPACKING LUTS..." size={0.6} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3">
                                    {lutFilters.map(l => (
                                        <FilterButton
                                            key={l.id}
                                            filter={{ ...l, icon: '✨' }}
                                            isActive={activeFilterId === l.id}
                                            onClick={() => setActiveFilterId(l.id)}
                                            isLut
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTON (Mobile: Sticky Bottom) */}
                    <div className="p-4 md:p-6 border-t-4 border-black/10 md:border-black bg-black/60 md:bg-black/40 backdrop-blur-lg md:backdrop-none shadow-[0_-15px_35px_rgba(0,0,0,0.5)] md:shadow-lg shrink-0 rounded-b-none md:rounded-none z-50 sticky bottom-0">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleContinue}
                            className="w-full btn-game-primary btn-cute py-3 md:py-5 text-lg md:text-2xl font-titan flex items-center justify-center gap-3 md:gap-4 group shadow-game relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
                            <span className="text-stroke-sm drop-shadow-md">PROCEED</span>
                            <ArrowRight className="group-hover:translate-x-2 transition-transform h-5 w-5 md:h-8 md:w-8" />
                        </motion.button>
                    </div>
                </div>

                {/* RIGHT: Visual Preview Stage (Mobile: Top Half) */}
                <div className="h-[35dvh] md:h-full md:flex-1 flex flex-col p-4 md:p-6 order-1 md:order-2 overflow-hidden relative bg-black/30 shrink-0">

                    {/* Area Preview Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-game-primary/30 blur-[100px] md:blur-[150px] rounded-full -z-10 animate-pulse pointer-events-none" />


                    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0">
                        {/* The Stage */}
                        <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
                            <div className="h-full relative flex items-center justify-center w-full">
                                {/* The Photo Strip (Clean Modern Look) */}
                                <div className="h-full max-h-full bg-zinc-900 p-2 md:p-4 rounded-sm border-[6px] md:border-[10px] border-white shadow-[0_40px_80px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center w-fit mx-auto relative group transition-all duration-300 max-w-[90vw] md:max-w-full">

                                    <div className="flex-1 relative bg-white overflow-hidden h-full rounded-sm">
                                        {slots.length > 0 && frameImage ? (
                                            <div className="relative h-full w-auto mx-auto inline-block">
                                                <img src={frameImage} alt="Frame" className="relative z-10 h-full w-auto pointer-events-none block" />
                                                <div className="absolute inset-0 z-0">
                                                    {slots.map((slot, i) => (
                                                        <div key={i} className="absolute overflow-hidden bg-gray-100"
                                                            style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }}>
                                                            <FilteredImage
                                                                src={photos[i]}
                                                                className="w-full h-full object-cover"
                                                                filterCss={activeFilter.is_lut ? 'none' : getFilterCss(activeFilter.id)}
                                                                lutUrl={activeFilter.is_lut ? activeFilter.storage_path : null}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col p-3 gap-3 h-full items-center justify-center bg-game-bg-dark w-[280px]">
                                                {photos.map((photo, i) => (
                                                    <div key={i} className="relative w-full aspect-[4/3] bg-black border-4 border-white shadow-md overflow-hidden shrink-0">
                                                        <FilteredImage
                                                            src={photo}
                                                            className="w-full h-full object-cover"
                                                            filterCss={activeFilter.is_lut ? 'none' : getFilterCss(activeFilter.id)}
                                                            lutUrl={activeFilter.is_lut ? activeFilter.storage_path : null}
                                                        />
                                                    </div>
                                                ))}
                                                <div className="font-bold font-mono text-sm text-black text-center mt-auto tracking-[0.2em]">PIXENZE BOOTH</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterButton = ({ filter, isActive, onClick, isLut }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`aspect-square rounded-2xl border-4 overflow-hidden relative group transition-all duration-300 ${isActive
            ? 'border-game-secondary shadow-[0_0_15px_rgba(250,206,16,0.5)] scale-105 z-10'
            : 'border-black hover:border-white/40 opacity-80'
            }`}
    >
        <div className={`absolute inset-0 flex items-center justify-center p-2 text-center ${isActive ? 'bg-game-secondary/10' : 'bg-white/5'
            }`}>
            <span className={`text-[10px] sm:text-sm md:text-base font-titan uppercase tracking-widest leading-tight ${isActive ? 'text-game-secondary' : 'text-white/60'
                }`}>
                {filter.name}
            </span>
        </div>

        {isLut && (
            <div className="absolute top-1 right-1 bg-game-secondary text-black text-[7px] font-black px-1 py-0.5 rounded border border-black z-20">
                PRO
            </div>
        )}

        {isActive && (
            <motion.div
                layoutId="active-highlight"
                className="absolute inset-0 border-4 border-game-secondary pointer-events-none z-30"
            />
        )}
    </motion.button>
);

export default SelectFilter;
