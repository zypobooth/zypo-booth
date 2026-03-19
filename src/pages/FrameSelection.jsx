import React, { useState, useEffect, useRef, useMemo } from 'react';
import HamsterLoader from '../components/Loader/HamsterLoader';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Star, Zap, Lock, User, Plus, Mail, Heart, Sparkles, Layers, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFrames } from '../services/frames';
import { getOptimizedUrl } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { resolveLayoutSlots, hasMultipleLayouts as checkMultipleLayouts, getLayoutImage } from '../utils/layoutUtils';
import LetterPopup from '../components/LetterPopup';
import AnimationOverlay from '../components/AnimationOverlay';
import VideoTransitionOverlay from '../components/VideoTransitionOverlay';
import { getMyLetters } from '../services/letters';
import { Helmet } from 'react-helmet-async';

// Lazy load modal izinn
const ComingSoonModal = React.lazy(() => import('../components/ComingSoonModal'));

const FrameSelection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedFrame, setSelectedFrame] = useState(null);
    const [selectedLayout, setSelectedLayout] = useState('a'); // Default to layout 'a'
    const [showComingSoon, setShowComingSoon] = useState(false);
    const { setTheme } = useTheme();

    const [frames, setFrames] = useState([]);
    const [specialFrames, setSpecialFrames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState('all');
    const observerTarget = useRef(null);
    const [artists, setArtists] = useState(['Default']);
    const [visibleLimit, setVisibleLimit] = useState(16);
    const [activeLetter, setActiveLetter] = useState(null);
    const [availableLetters, setAvailableLetters] = useState([]);
    const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(true);
    const scrollContainerRef = useRef(null);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop > 20) {
            setShowScrollHint(false);
        } else {
            setShowScrollHint(true);
        }

        if (scrollHeight - scrollTop - clientHeight < 50) {
            setIsScrolledToEnd(true);
        } else {
            setIsScrolledToEnd(false);
        }
    };

    const checkLetters = async () => {
        try {
            const letters = await getMyLetters();
            const seenLetters = JSON.parse(localStorage.getItem('seen_letters') || '[]');
            const unseenLetters = letters.filter(l => !seenLetters.includes(l.id));
            setAvailableLetters(letters);
            if (unseenLetters && unseenLetters.length > 0) {
                setActiveLetter(unseenLetters[0]);
            }
        } catch (error) {
            console.error('Error checking letters:', error);
        }
    };

    const handleCloseLetter = () => {
        if (activeLetter) {
            const seenLetters = JSON.parse(localStorage.getItem('seen_letters') || '[]');
            if (!seenLetters.includes(activeLetter.id)) {
                seenLetters.push(activeLetter.id);
                localStorage.setItem('seen_letters', JSON.stringify(seenLetters));
            }
        }
        setActiveLetter(null);
    };

    useEffect(() => {
        checkLetters();
    }, [user]);

    useEffect(() => {
        setVisibleLimit(16);
    }, [selectedArtist]);

    useEffect(() => {
        if (!selectedFrame) return;
        const frameTheme = selectedFrame.theme_id || 'default';
        const frameAudio = selectedFrame.audio_url || null;
        setTheme({ themeId: frameTheme, audioUrl: frameAudio });
    }, [selectedFrame, setTheme]);

    const filteredFrames = frames.filter(f => selectedArtist === 'all' || f.artist === selectedArtist);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && visibleLimit < filteredFrames.length) {
                    setVisibleLimit(prev => prev + 12);
                }
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }
        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget, visibleLimit, filteredFrames]);

    const basicThemes = [

    ];

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const dbFrames = await getFrames();
            const userEmail = user?.email?.toLowerCase();
            const formattedDbFrames = dbFrames
                .filter(f => {
                    if (f.status !== 'active' && f.status !== 'coming_soon') return false;
                    if (f.allowed_emails && f.allowed_emails.length > 0) {
                        if (!userEmail) return false;
                        const allowed = f.allowed_emails.map(e => e.toLowerCase());
                        if (!allowed.includes(userEmail)) return false;
                    }
                    return true;
                })
                .map(f => ({
                    id: f.id,
                    type: 'custom',
                    name: f.name,
                    image: f.image_url,
                    thumbnail: f.thumbnail_url || f.image_url,
                    layout_config: f.layout_config,
                    stats: { style: f.style || 'Custom', vibes: '???' },
                    rarity: f.rarity || 'Common',
                    status: f.status,
                    artist: f.artist || 'PixenzeBooth',
                    sort_order: f.sort_order ?? 999999,
                    is_special: f.allowed_emails && f.allowed_emails.length > 0,
                    theme_id: f.theme_id || 'default',
                    audio_url: f.audio_url || null,
                    animation_type: f.animation_type || 'none',
                    transition_video_url: f.transition_video_url || null
                }));

            const specialUserFrames = formattedDbFrames.filter(f => f.is_special);
            const regularDbFrames = formattedDbFrames.filter(f => !f.is_special);
            let safeCustomFrames = [];
            try {
                const localData = JSON.parse(localStorage.getItem('custom_frames') || '[]');
                if (Array.isArray(localData)) {
                    safeCustomFrames = localData
                        .filter(f => f && f.image && typeof f.image === 'string' && f.image.startsWith('data:image'))
                        .map(f => ({
                            id: f.id,
                            type: 'user_created',
                            name: f.name || 'My Custom',
                            image: f.image,
                            thumbnail: f.image,
                            layout_config: null,
                            stats: { style: 'DIY', vibes: '∞' },
                            rarity: 'Legendary',
                            status: 'active',
                            artist: 'Me'
                        }));
                }
            } catch (e) {
                console.error('Error loading custom frames state:', e);
            }

            const allFrames = [...safeCustomFrames, ...regularDbFrames, ...basicThemes];
            const uniqueArtists = [...new Set(allFrames.map(f => f.artist).filter(Boolean))];
            setArtists(uniqueArtists);
            allFrames.sort((a, b) => (a.sort_order ?? 999999) - (b.sort_order ?? 999999));
            specialUserFrames.sort((a, b) => (a.sort_order ?? 999999) - (b.sort_order ?? 999999));
            setFrames(allFrames);
            setSpecialFrames(specialUserFrames);
            if (specialUserFrames.length > 0) {
                setSelectedFrame(specialUserFrames[0]);
                setSelectedLayout('a');
            } else if (allFrames.length > 0) {
                setSelectedFrame(allFrames[0]);
                setSelectedLayout('a');
            } else {
                setSelectedFrame(basicThemes[0]);
            }
        } catch (error) {
            console.error('Error loading frames:', error);
            setFrames([...basicThemes]);
            setSelectedFrame(basicThemes[0]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!selectedFrame) return;
        if (selectedFrame.status === 'coming_soon') {
            setShowComingSoon(true);
            return;
        }
        if (selectedFrame.transition_video_url) {
            setIsTransitioning(true);
            return;
        }
        proceedToBooth();
    };

    const proceedToBooth = () => {
        let config = {};
        if (selectedFrame.type === 'basic') {
            config = { theme: selectedFrame.id, frameImage: null };
        } else {
            const activeLayout = resolveLayoutSlots(selectedFrame.layout_config, selectedLayout);
            const overrideImage = getLayoutImage(selectedFrame.layout_config, selectedLayout);
            const activeImage = overrideImage || selectedFrame.image;
            config = {
                theme: 'custom',
                frameImage: activeImage,
                layout_config: activeLayout,
                name: selectedFrame.name
            };
        }
        navigate('/booth', { state: { preConfig: config } });
    };

    const frameHasMultipleLayouts = checkMultipleLayouts(selectedFrame?.layout_config);

    return (
        <div className="h-dvh font-nunito flex flex-col overflow-hidden relative bg-game-bg text-game-surface">
            {isTransitioning && selectedFrame?.transition_video_url && (
                <VideoTransitionOverlay
                    videoUrl={selectedFrame.transition_video_url}
                    onComplete={proceedToBooth}
                />
            )}
            <AnimationOverlay type={selectedFrame?.animation_type} />
            <Helmet>
                <title>Select Frame | PixenzeBooth</title>
                <meta name="description" content="Choose from dozens of cute, cool, and aesthetic frames for your photos." />
            </Helmet>

            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            <div className="relative z-20 h-14 md:h-20 px-4 border-b-4 border-black bg-game-bg-dark/95 shrink-0 flex items-center justify-center">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    onClick={() => navigate('/')}
                    className="absolute left-4 w-10 h-10 md:w-12 md:h-12 btn-game-danger btn-cute flex items-center justify-center shadow-game"
                    aria-label="Back to Home"
                >
                    <ArrowLeft size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                </motion.button>
                <motion.h1
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-titan text-game-secondary text-center text-stroke-sm md:text-stroke drop-shadow-game-lg"
                >
                    SELECT FRAME
                </motion.h1>
            </div>

            <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden min-h-0 bg-black/20">
                {/* LEFT: Frame Selector Sidebar (Mobile: Bottom Sheet) */}
                <div className="flex-1 md:flex-none md:w-[350px] lg:w-[400px] md:border-r-4 border-black flex flex-col order-2 md:order-1 h-full bg-game-bg-dark md:bg-black/40 backdrop-blur-xl min-h-0 rounded-t-[2.5rem] md:rounded-none shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-none relative z-20">
                    {/* Mobile Handle */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                    </div>

                    <div className="p-3 md:p-4 border-b-4 border-black/20 md:border-black bg-black/20 shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Layers size={18} className="text-game-secondary" />
                            <h2 className="font-titan text-xs md:text-sm tracking-widest text-white">BROWSE FRAMES</h2>
                        </div>
                        <div
                            className="scroll-x-container gap-2 pb-2 -mx-1 px-1 mb-2 select-none cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                                const el = e.currentTarget;
                                const startX = e.pageX - el.offsetLeft;
                                const scrollLeft = el.scrollLeft;

                                const onMouseMove = (moveE) => {
                                    const x = moveE.pageX - el.offsetLeft;
                                    const walk = (x - startX) * 2;
                                    el.scrollLeft = scrollLeft - walk;
                                };

                                const onMouseUp = () => {
                                    window.removeEventListener('mousemove', onMouseMove);
                                    window.removeEventListener('mouseup', onMouseUp);
                                };

                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                        >
                            <button
                                onClick={() => setSelectedArtist('all')}
                                className={`px-5 py-2 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-titan tracking-wider whitespace-nowrap border-2 transition-all ${selectedArtist === 'all' ? 'bg-game-secondary text-black border-black shadow-[2px_2px_0_#000]' : 'bg-black/40 text-white/50 border-white/10 opacity-70'}`}
                            >
                                ALL
                            </button>
                            {artists.map(artist => (
                                <button
                                    key={artist}
                                    onClick={() => setSelectedArtist(artist)}
                                    className={`px-5 py-2 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-titan tracking-wider whitespace-nowrap border-2 transition-all ${selectedArtist === artist ? 'bg-game-primary text-white border-black shadow-[2px_2px_0_#000]' : 'bg-black/40 text-white/50 border-white/10 opacity-70'}`}
                                >
                                    {artist.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white/5 rounded-2xl p-2 md:p-3 border-2 border-white/10 mt-2">
                            <div className="flex flex-col gap-2 md:gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[8px] md:text-[10px] font-titan text-game-secondary/60 tracking-widest mb-0.5">SELECTED</div>
                                        <h3 className="font-titan text-sm md:text-xl text-white truncate drop-shadow-md">{selectedFrame?.name || '---'}</h3>
                                    </div>
                                    <div className="bg-game-secondary/20 px-2 py-0.5 rounded-md border border-game-secondary/30">
                                        <span className="text-[8px] font-titan text-game-secondary">{selectedFrame?.rarity || 'Common'}</span>
                                    </div>
                                </div>
                                {frameHasMultipleLayouts && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedLayout('a')} className={`flex-1 py-1.5 rounded-lg font-titan text-[10px] border-2 transition-all ${selectedLayout === 'a' ? 'bg-game-primary text-white border-black shadow-[2px_2px_0_#000]' : 'bg-black/40 text-white/30 border-white/10'}`}>LAYOUT A</button>
                                        <button onClick={() => setSelectedLayout('b')} className={`flex-1 py-1.5 rounded-lg font-titan text-[10px] border-2 transition-all ${selectedLayout === 'b' ? 'bg-game-secondary text-black border-black shadow-[2px_2px_0_#000]' : 'bg-black/40 text-white/30 border-white/10'}`}>LAYOUT B</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative min-h-0">
                        <AnimatePresence>
                            {showScrollHint && !loading && frames.length > 6 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-4 left-0 right-0 z-[60] flex flex-col items-center pointer-events-none"
                                >
                                    <div className="bg-game-primary/90 backdrop-blur-md px-4 py-2 rounded-full border-2 border-black shadow-game flex items-center gap-2">
                                        <ChevronDown className="animate-bounce" size={16} />
                                        <span className="font-titan text-[10px] tracking-widest text-white">SCROLL FOR MORE</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={scrollContainerRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 md:p-4 pb-32">
                            {availableLetters.length > 0 && (
                                <div className="mb-4">
                                    <button onClick={() => setActiveLetter(availableLetters[0])} className="w-full btn-game-danger btn-cute text-white px-4 py-2.5 shadow-game border-4 border-black flex items-center justify-center gap-2"><Mail size={16} />MESSAGES ({availableLetters.length})</button>
                                </div>
                            )}

                            {!loading && specialFrames.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 opacity-70"><Sparkles size={16} className="text-yellow-400" /><h3 className="font-titan text-[10px] tracking-[0.2em] text-white uppercase">Exclusive</h3></div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3">
                                        {specialFrames.map(f => (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                key={f.id}
                                                onClick={() => setSelectedFrame(f)}
                                                className={`aspect-square rounded-xl border-4 overflow-hidden relative transition-all duration-300 ${selectedFrame?.id === f.id ? 'border-game-secondary shadow-[0_0_15px_rgba(250,206,16,0.5)] scale-105 z-10' : 'border-black opacity-80'}`}
                                            >
                                                <img src={getOptimizedUrl(f.thumbnail || f.image, 300)} className="absolute inset-0 w-full h-full object-cover" />
                                                {checkMultipleLayouts(f.layout_config) && <div className="absolute top-1 right-1 bg-pink-500 text-[8px] font-black px-1.5 py-0.5 rounded text-white border border-black z-20">A/B</div>}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3 opacity-70"><Zap size={16} className="text-game-primary" /><h3 className="font-titan text-[10px] tracking-[0.2em] text-white uppercase">All Frames</h3></div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3">
                                    {loading ? [1, 2, 3, 4, 5, 6].map(n => <div key={n} className="aspect-square bg-white/5 animate-pulse rounded-xl border-2 border-white/5" />) : (
                                        <>
                                            {filteredFrames.slice(0, visibleLimit).map(f => (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    key={f.id}
                                                    onClick={() => setSelectedFrame(f)}
                                                    className={`aspect-square rounded-xl border-4 overflow-hidden relative transition-all duration-300 ${selectedFrame?.id === f.id ? 'border-game-secondary shadow-[0_0_15px_rgba(250,206,16,0.5)] scale-105 z-10' : 'border-black'} ${f.status === 'coming_soon' ? 'opacity-40 grayscale' : ''}`}
                                                >
                                                    <div className={`absolute inset-0 ${f.type === 'basic' ? f.color : 'bg-zinc-800'}`} />
                                                    {f.type !== 'basic' && <img src={getOptimizedUrl(f.thumbnail || f.image, 300)} className="absolute inset-0 w-full h-full object-cover" />}
                                                    {checkMultipleLayouts(f.layout_config) && <div className="absolute top-1 right-1 bg-black text-[8px] font-black px-1.5 py-0.5 rounded text-white border border-white/20 z-20">A/B</div>}
                                                    {f.status === 'coming_soon' && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock size={12} className="text-white" /></div>}
                                                </motion.button>
                                            ))}
                                            <div ref={observerTarget} className="col-span-full h-4" />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 border-t-4 border-black/10 md:border-black bg-black/60 md:bg-black/40 backdrop-blur-lg md:backdrop-none shadow-[0_-15px_35px_rgba(0,0,0,0.5)] md:shadow-lg shrink-0 rounded-b-none md:rounded-none z-50 sticky bottom-0">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleConfirm}
                            disabled={loading || !selectedFrame}
                            className="w-full btn-game-primary btn-cute py-3 md:py-5 text-lg md:text-2xl font-titan flex items-center justify-center gap-3 md:gap-4 shadow-game relative overflow-hidden disabled:opacity-50"
                        >
                            <span className="text-stroke-sm drop-shadow-md">USE THIS FRAME</span>
                            <ArrowRight className="h-5 w-5 md:h-8 md:w-8" />
                        </motion.button>
                    </div>
                </div>

                {/* RIGHT: Visual Preview Stage (Mobile: Top Half) */}
                <div className="h-[35dvh] md:h-full md:flex-1 flex flex-col p-4 md:p-6 lg:p-10 order-1 md:order-2 overflow-hidden relative bg-black/30 shrink-0">
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">
                        {/* Area Preview Background Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-game-primary/30 blur-[100px] md:blur-[150px] rounded-full -z-10 animate-pulse pointer-events-none" />

                        <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
                            <div className="h-full relative flex items-center justify-center w-full">
                                {loading || !selectedFrame ? (
                                    <HamsterLoader message="LOADING PREVIEW" />
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div key={`${selectedFrame.id}-${selectedLayout}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} className="h-full relative flex items-center justify-center max-w-[90vw] md:max-w-full mx-auto">
                                            <div className="h-full bg-zinc-900 px-4 md:px-6 py-4 md:py-6 pb-12 md:pb-20 rounded-sm border-[6px] md:border-[12px] border-white shadow-2xl flex items-center justify-center relative rotate-[-0.5deg]">
                                                <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 w-24 md:w-32 h-6 md:h-10 bg-black/40 backdrop-blur-md rounded-b-2xl border-x-2 md:border-x-4 border-b-2 md:border-b-4 border-white/50 z-40" />
                                                {selectedFrame.type === 'basic' ? (
                                                    <div className={`aspect-[3/4] h-full ${selectedFrame.color} rounded shadow-inner flex items-center justify-center border-2 md:border-4 border-black/10`}><Star size={80} className="md:size-[120px] text-white/20" fill="currentColor" /></div>
                                                ) : (
                                                    <img src={getLayoutImage(selectedFrame.layout_config, selectedLayout) || selectedFrame.image} alt={selectedFrame.name} className="h-full w-auto object-contain drop-shadow-2xl" />
                                                )}
                                                <div className="absolute bottom-3 md:bottom-6 left-0 right-0 flex items-center justify-between px-6 md:px-10 opacity-30 font-titan text-[8px] md:text-[10px] tracking-[0.3em] md:tracking-[0.5em] text-white"><span>{selectedFrame.rarity}</span></div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <React.Suspense fallback={null}><ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} /></React.Suspense>
            <LetterPopup letter={activeLetter} onClose={handleCloseLetter} />
        </div>
    );
};

export default FrameSelection;
