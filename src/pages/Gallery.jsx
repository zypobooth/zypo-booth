import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Image as ImageIcon, Video, Gift, ArrowLeft, Loader2, Check, Copy } from 'lucide-react';
import HamsterLoader from '../components/Loader/HamsterLoader';
import JSZip from 'jszip';

const Gallery = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [gallery, setGallery] = useState(null);
    const [activeTab, setActiveTab] = useState('strip'); // 'strip', 'raw', 'live'
    const [isZipping, setIsZipping] = useState(false);
    const [showShareTooltip, setShowShareTooltip] = useState(false);
    const [shareText, setShareText] = useState('Check out my photo booth gallery!');

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const { data, error } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('session_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                setGallery(data);
            } catch (err) {
                console.error("Gallery not found:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchGlobalSettings = async () => {
            try {
                const { data } = await supabase
                    .from('global_settings')
                    .select('gallery_share_text')
                    .eq('id', 1)
                    .single();
                if (data?.gallery_share_text) setShareText(data.gallery_share_text);
            } catch (err) {
                console.error("Settings load error:", err);
            }
        };

        if (id) {
            fetchGallery();
            fetchGlobalSettings();
        }
    }, [id]);

    const handleDownloadAll = async () => {
        if (!gallery || isZipping) return;
        setIsZipping(true);

        try {
            const zip = new JSZip();
            const folder = zip.folder(`pixenze-${id}`);

            // Helper to fetch through proxy to avoid CORS
            const fetchThroughProxy = async (url) => {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error(`Failed to fetch through proxy: ${res.statusText}`);
                return res.blob();
            };

            // Download Strip
            const stripBlob = await fetchThroughProxy(gallery.strip_url);
            folder.file("photo-strip.png", stripBlob);

            // Download Raw Photos
            for (let i = 0; i < gallery.raw_photos.length; i++) {
                const photoBlob = await fetchThroughProxy(gallery.raw_photos[i]);
                folder.file(`raw-photo-${i + 1}.png`, photoBlob);
            }

            // Download GIF
            if (gallery.gif_url) {
                const gifBlob = await fetchThroughProxy(gallery.gif_url);
                folder.file("live-animation.gif", gifBlob);
            }

            // Download Video
            if (gallery.video_url) {
                const videoBlob = await fetchThroughProxy(gallery.video_url);
                const ext = gallery.video_url.split('.').pop() || 'mp4';
                folder.file(`live-video.${ext}`, videoBlob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pixenze-booth-${id}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to create zip:", err);
            alert("Failed to download all media. Please try individual downloads.");
        } finally {
            setIsZipping(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
    };

    const downloadFile = async (url, filename) => {
        try {
            // Use proxy to avoid CORS issues
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to direct link if fetch fails
            window.open(url, '_blank');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-game-bg">
            <HamsterLoader message="RETRIEVING YOUR MEMORIES..." />
        </div>
    );

    if (!gallery) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-game-bg text-center p-6">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white border-4 border-black p-10 rounded-[40px] shadow-[12px_12px_0_#000] max-w-md"
            >
                <h1 className="text-4xl font-titan text-game-danger mb-4">MISSION FAILED</h1>
                <p className="text-black/60 font-bold mb-8 uppercase tracking-wider">The gallery you're looking for doesn't exist or has expired.</p>
                <Link to="/" className="inline-block py-4 px-8 btn-game-primary btn-cute text-xl font-titan tracking-wider rounded-2xl w-full">
                    BACK TO HOME
                </Link>
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen bg-game-bg font-nunito flex flex-col items-center py-10 px-4">
            <Helmet>
                <title>Your Pixenze Gallery | #{id}</title>
                <meta property="og:title" content="Pixenze Photo Booth Gallery" />
                <meta property="og:description" content={shareText} />
                <meta property="og:image" content={gallery.strip_url} />
                <meta name="twitter:card" content="summary_large_image" />
            </Helmet>

            {/* Header */}
            <header className="w-full max-w-5xl flex items-center justify-between mb-10 z-10">
                <Link to="/" className="p-3 bg-white border-4 border-black rounded-2xl hover:bg-game-secondary transition-all shadow-game group">
                    <ArrowLeft size={24} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div className="text-center">
                    <h1 className="text-4xl md:text-6xl font-titan text-white text-stroke drop-shadow-game text-center uppercase tracking-tighter">
                        GALLERY
                    </h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/30 rounded-full mt-2 backdrop-blur-sm border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-game-success animate-pulse"></span>
                        <p className="text-white/80 font-mono text-[10px] uppercase tracking-widest">SESSION: {id}</p>
                    </div>
                </div>
                <div className="relative">
                    <button 
                        onClick={copyToClipboard}
                        className="p-3 bg-game-secondary border-4 border-black rounded-2xl hover:rotate-6 transition-all shadow-game text-black"
                    >
                        {showShareTooltip ? <Check size={24} strokeWidth={3} /> : <Share2 size={24} strokeWidth={3} />}
                    </button>
                    <AnimatePresence>
                        {showShareTooltip && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute -bottom-10 right-0 bg-game-success text-black text-[10px] py-1.5 px-4 rounded-xl border-2 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_#000]"
                            >
                                COPIED!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-start">
                
                {/* Visual Content (8 columns) */}
                <section className="lg:col-span-8 flex flex-col items-center">
                    <div className="bg-game-surface/95 border-4 border-black p-4 md:p-8 rounded-[40px] shadow-game-lg w-full overflow-hidden flex justify-center min-h-[650px] relative">
                        {/* Internal Pattern decoration */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
                        
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab}
                                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                                transition={{ type: "spring", damping: 20, stiffness: 150 }}
                                className="w-full flex justify-center z-10"
                            >
                                {activeTab === 'strip' && (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative group">
                                            <div className="absolute -inset-2 bg-gradient-to-br from-game-primary/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                                            <motion.img 
                                                layoutId="gallery-main"
                                                src={gallery.strip_url} 
                                                alt="Photo Strip" 
                                                className="max-h-[70vh] w-auto object-contain rounded-lg border-2 border-black/5 shadow-2xl relative z-10"
                                                initial={{ rotate: -0.5 }}
                                                animate={{ rotate: 0 }}
                                                whileHover={{ scale: 1.02, rotate: 0.5 }}
                                            />
                                        </div>
                                        <motion.button 
                                            onClick={() => downloadFile(gallery.strip_url, `pixenze-strip-${id}.png`)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="btn-game-primary py-4 px-10 rounded-2xl border-4 border-black text-white font-titan text-base flex items-center gap-3 shadow-game"
                                        >
                                            <Download size={20} strokeWidth={3} /> DOWNLOAD STRIP
                                        </motion.button>
                                    </div>
                                )}
                                {activeTab === 'raw' && (
                                    <div className="grid grid-cols-2 gap-6 w-full content-start p-2">
                                        {gallery.raw_photos.map((photo, i) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="group relative border-4 border-black rounded-[24px] overflow-hidden aspect-[3/4] bg-white shadow-game"
                                            >
                                                <img src={photo} alt={`Raw photo ${i+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                    <button 
                                                        onClick={() => downloadFile(photo, `raw-${id}-${i+1}.png`)}
                                                        className="py-3 px-6 btn-game-primary text-sm font-titan flex items-center gap-2 rounded-xl"
                                                    >
                                                        <Download size={18} strokeWidth={3} /> EXPORT
                                                    </button>
                                                </div>
                                                {/* Mobile visible download button */}
                                                <div className="absolute bottom-2 right-2 lg:hidden">
                                                     <button 
                                                        onClick={() => downloadFile(photo, `raw-${id}-${i+1}.png`)}
                                                        className="p-2 bg-game-primary border-2 border-black rounded-lg text-white shadow-game"
                                                    >
                                                        <Download size={16} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                                {activeTab === 'live' && (
                                    <div className="flex flex-col gap-10 w-full items-center py-6">
                                        {gallery.gif_url && (
                                            <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center gap-6 w-full max-w-sm"
                                            >
                                                <div className="px-6 py-2 bg-game-primary border-4 border-black rounded-full font-titan text-xs text-white uppercase tracking-widest shadow-game -rotate-1">
                                                    ANIMATED CLIP
                                                </div>
                                                <div className="border-4 border-black rounded-[32px] overflow-hidden bg-white shadow-game-lg w-full p-2">
                                                    <img src={gallery.gif_url} alt="Animated GIF" className="w-full h-auto rounded-[24px]" />
                                                </div>
                                                <button 
                                                    onClick={() => downloadFile(gallery.gif_url, `live-${id}.gif`)}
                                                    className="btn-game-primary py-4 px-10 rounded-2xl border-4 border-black text-white font-titan text-base flex items-center gap-3 shadow-game"
                                                >
                                                    <Download size={20} strokeWidth={3} /> DOWNLOAD GIF
                                                </button>
                                            </motion.div>
                                        )}
                                        {gallery.video_url && (
                                            <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex flex-col items-center gap-6 w-full max-w-sm"
                                            >
                                                <div className="px-6 py-2 bg-game-secondary border-4 border-black rounded-full font-titan text-xs text-black uppercase tracking-widest shadow-game rotate-1">
                                                    LIVE VIDEO
                                                </div>
                                                <div className="border-4 border-black rounded-[32px] overflow-hidden bg-black shadow-game-lg w-full aspect-[9/16] max-h-[500px] p-1">
                                                    <video src={gallery.video_url} controls playsInline className="w-full h-full object-contain rounded-[28px]" />
                                                </div>
                                                <button 
                                                    onClick={() => downloadFile(gallery.video_url, `live-${id}.mp4`)}
                                                    className="btn-game-accent py-4 px-10 rounded-2xl border-4 border-black text-black font-titan text-base flex items-center gap-3 shadow-game"
                                                >
                                                    <Download size={20} strokeWidth={3} /> DOWNLOAD VIDEO
                                                </button>
                                            </motion.div>
                                        )}
                                        {(!gallery.gif_url && !gallery.video_url) && (
                                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                                <div className="w-32 h-32 bg-zinc-100 rounded-full border-4 border-dashed border-black/10 flex items-center justify-center mb-6">
                                                    <Video size={48} strokeWidth={1.5} className="text-black/10" />
                                                </div>
                                                <p className="font-titan text-3xl text-black/20 uppercase tracking-tighter">THE TAPE IS EMPTY</p>
                                                <p className="text-xs font-black text-black/30 uppercase mt-4 tracking-widest max-w-[200px]">NO VIDEOS WERE RECORDED DURING THIS SESSION.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </section>

                {/* Sidebar (4 columns) */}
                <aside className="lg:col-span-4 flex flex-col gap-8">
                    
                    {/* View Modes Selection */}
                    <div className="bg-white border-4 border-black p-6 rounded-[40px] shadow-game flex flex-col gap-6">
                        <div className="flex flex-col">
                            <h3 className="font-titan text-xl text-black uppercase tracking-tight">VIEW MODE</h3>
                            <div className="w-12 h-1.5 bg-game-primary border-2 border-black rounded-full mt-1"></div>
                        </div>
                        <div className="flex flex-col gap-3">
                            {[
                                { id: 'strip', icon: ImageIcon, label: 'PHOTO STRIP', color: 'bg-game-primary' },
                                { id: 'raw', icon: ImageIcon, label: 'RAW SHOTS', color: 'bg-game-secondary' },
                                { id: 'live', icon: Video, label: 'LIVE CONTENT', color: 'bg-game-success' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl border-4 transition-all overflow-hidden group ${
                                        activeTab === tab.id 
                                        ? `${tab.color} text-white border-black shadow-game translate-x-1 translate-y-1` 
                                        : 'bg-game-surface border-transparent hover:border-black/10 text-black/40 hover:text-black shadow-none'
                                    }`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div 
                                            layoutId="active-pill" 
                                            className="absolute inset-0 bg-white/10" 
                                        />
                                    )}
                                    <tab.icon size={22} className={activeTab === tab.id ? "relative z-10" : "opacity-30"} />
                                    <span className="relative z-10 font-titan text-sm tracking-wide">{tab.label}</span>
                                    {activeTab !== tab.id && (
                                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-1.5 h-1.5 rounded-full bg-black/20"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Batch Actions */}
                    <div className="bg-game-surface border-4 border-black p-8 rounded-[40px] shadow-game relative overflow-hidden flex flex-col gap-6">
                        <div className="flex flex-col">
                            <h3 className="font-titan text-xl text-black uppercase tracking-tight italic">SAVE ALL</h3>
                            <div className="w-12 h-1.5 bg-game-secondary border-2 border-black rounded-full mt-1"></div>
                        </div>
                        <p className="text-[11px] font-fredoka font-medium text-black/60 leading-relaxed">
                            COLLECT ALL PHOTOS, STRIPS, AND ANIMATIONS INTO A SINGLE HIGH-QUALITY ZIP FILE.
                        </p>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDownloadAll}
                            disabled={isZipping}
                            className={`w-full py-5 btn-game-primary btn-cute text-white font-titan text-2xl tracking-wider flex items-center justify-center gap-4 rounded-[24px] ${isZipping ? 'opacity-70 grayscale' : ''}`}
                        >
                            {isZipping ? (
                                <>
                                    <Loader2 className="animate-spin" size={28} strokeWidth={3} />
                                    ZIPPING
                                </>
                            ) : (
                                <>
                                    <Download size={28} strokeWidth={3} />
                                    COLLECT
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Fun Share Card */}
                    <div className="bg-black border-4 border-black p-8 rounded-[40px] shadow-game text-white relative overflow-hidden group">
                        {/* Decorative background circle */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-game-success/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-game-success rounded-2xl rotate-3 flex items-center justify-center border-4 border-black shadow-[4px_4px_0_#fff] mb-2 group-hover:-rotate-3 transition-transform">
                                <Gift className="text-black" size={32} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-titan text-xl uppercase tracking-tight">Spread Love</h4>
                                <p className="text-[10px] font-fredoka font-black text-game-success uppercase tracking-widest opacity-80">
                                    Send these memories to your friends!
                                </p>
                            </div>
                            
                            <div className="w-full h-px bg-white/10 my-2"></div>
                            
                            <div className="flex flex-col w-full gap-3">
                                <a 
                                    href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + window.location.href)}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="w-full h-14 bg-[#25D366] border-4 border-black rounded-2xl flex items-center justify-center gap-3 hover:shadow-[4px_4px_0_#fff] transition-all hover:-translate-x-1 hover:-translate-y-1 shadow-none"
                                >
                                    <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.602 6.033L0 24l6.135-1.61a11.83 11.83 0 005.911 1.583h.005c6.635 0 12.032-5.396 12.035-12.032.001-3.218-1.251-6.243-3.526-8.518" /></svg>
                                    <span className="font-titan text-base tracking-wide mt-1">SEND TO FRIENDS</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Background Decorations */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("/grid-pattern.svg")', backgroundSize: '100px 100px' }}></div>
            <div className="fixed -top-24 -left-24 w-96 h-96 bg-game-accent/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-game-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
        </div>
    );
};

export default Gallery;
