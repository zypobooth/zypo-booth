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
                    .single();

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

            // Download Strip
            const stripBlob = await fetch(gallery.strip_url).then(r => r.blob());
            folder.file("photo-strip.png", stripBlob);

            // Download Raw Photos
            for (let i = 0; i < gallery.raw_photos.length; i++) {
                const photoBlob = await fetch(gallery.raw_photos[i]).then(r => r.blob());
                folder.file(`raw-photo-${i + 1}.png`, photoBlob);
            }

            // Download GIF
            if (gallery.gif_url) {
                const gifBlob = await fetch(gallery.gif_url).then(r => r.blob());
                folder.file("live-animation.gif", gifBlob);
            }

            // Download Video
            if (gallery.video_url) {
                const videoBlob = await fetch(gallery.video_url).then(r => r.blob());
                const ext = gallery.video_url.split('.').pop();
                folder.file(`live-video.${ext}`, videoBlob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pixenze-booth-${id}.zip`;
            link.click();
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
            <header className="w-full max-w-4xl flex items-center justify-between mb-8 z-10">
                <Link to="/" className="p-3 bg-white border-4 border-black rounded-2xl hover:scale-110 transition-transform shadow-[4px_4px_0_#000]">
                    <ArrowLeft size={24} strokeWidth={3} />
                </Link>
                <div className="text-center">
                    <h1 className="text-3xl md:text-5xl font-titan text-game-accent text-stroke-sm drop-shadow-[3px_3px_0_#000]">GALLERY</h1>
                    <p className="text-black/40 font-mono text-xs mt-1">SESSION ID: {id}</p>
                </div>
                <div className="relative">
                    <button 
                        onClick={copyToClipboard}
                        className="p-3 bg-game-secondary border-4 border-black rounded-2xl hover:scale-110 transition-transform shadow-[4px_4px_0_#000] text-black"
                    >
                        {showShareTooltip ? <Check size={24} strokeWidth={3} /> : <Share2 size={24} strokeWidth={3} />}
                    </button>
                    <AnimatePresence>
                        {showShareTooltip && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute -bottom-10 right-0 bg-black text-white text-[10px] py-1 px-3 rounded-full whitespace-nowrap font-bold uppercase tracking-widest"
                            >
                                URL COPIED!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
                
                {/* Visual Content (9 columns) */}
                <section className="lg:col-span-8 flex flex-col items-center">
                    <div className="bg-white border-4 border-black p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full overflow-hidden flex justify-center min-h-[600px] relative">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab}
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="w-full flex justify-center"
                            >
                                {activeTab === 'strip' && (
                                    <motion.img 
                                        layoutId="gallery-main"
                                        src={gallery.strip_url} 
                                        alt="Photo Strip" 
                                        className="max-h-[75vh] w-auto object-contain rounded-sm shadow-xl"
                                        initial={{ rotate: -1 }}
                                        animate={{ rotate: 0 }}
                                    />
                                )}
                                {activeTab === 'raw' && (
                                    <div className="grid grid-cols-2 gap-4 w-full content-start p-2">
                                        {gallery.raw_photos.map((photo, i) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="group relative border-4 border-black rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-100 shadow-sm"
                                            >
                                                <img src={photo} alt={`Raw photo ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <a 
                                                        href={photo} 
                                                        download={`raw-${id}-${i+1}.png`} 
                                                        className="p-3 bg-game-primary border-4 border-black rounded-xl text-white transform scale-90 group-hover:scale-100 transition-transform font-titan text-xs flex items-center gap-2"
                                                    >
                                                        <Download size={16} strokeWidth={3} /> SAVE
                                                    </a>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                                {activeTab === 'live' && (
                                    <div className="flex flex-col gap-8 w-full items-center py-4">
                                        {gallery.gif_url && (
                                            <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center gap-4 w-full max-w-md"
                                            >
                                                <div className="px-4 py-1.5 bg-game-primary border-4 border-black rounded-full font-titan text-[10px] text-white uppercase tracking-widest shadow-[4px_4px_0_#000]">
                                                    Animated Memories
                                                </div>
                                                <div className="border-4 border-black rounded-2xl overflow-hidden bg-white shadow-xl w-full">
                                                    <img src={gallery.gif_url} alt="Animated GIF" className="w-full h-auto" />
                                                </div>
                                                <a href={gallery.gif_url} download={`live-${id}.gif`} className="btn-game-primary py-3 px-8 rounded-2xl border-4 border-black text-white font-titan text-sm flex items-center gap-3 shadow-[4px_4px_0_#000]">
                                                    <Download size={18} strokeWidth={3} /> DOWNLOAD GIF
                                                </a>
                                            </motion.div>
                                        )}
                                        {gallery.video_url && (
                                            <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex flex-col items-center gap-4 w-full max-w-md"
                                            >
                                                <div className="px-4 py-1.5 bg-game-accent border-4 border-black rounded-full font-titan text-[10px] text-black uppercase tracking-widest shadow-[4px_4px_0_#000]">
                                                    Behind the Scenes
                                                </div>
                                                <div className="border-4 border-black rounded-3xl overflow-hidden bg-black shadow-xl w-full aspect-[9/16] max-h-[500px]">
                                                    <video src={gallery.video_url} controls playsInline className="w-full h-full object-contain" />
                                                </div>
                                                <a href={gallery.video_url} download={`live-${id}.mp4`} className="btn-game-accent py-3 px-8 rounded-2xl border-4 border-black text-black font-titan text-sm flex items-center gap-3 shadow-[4px_4px_0_#000]">
                                                    <Download size={18} strokeWidth={3} /> DOWNLOAD MP4
                                                </a>
                                            </motion.div>
                                        )}
                                        {(!gallery.gif_url && !gallery.video_url) && (
                                            <div className="flex flex-col items-center justify-center p-12 text-center text-black/20">
                                                <Video size={80} strokeWidth={1} className="mb-6 opacity-50" />
                                                <p className="font-titan text-2xl uppercase tracking-tighter">THE TAPE IS EMPTY</p>
                                                <p className="text-[10px] font-black uppercase mt-2">No live videos were recorded during this session.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </section>

                {/* Sidebar (4 columns) */}
                <aside className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* Tabs Selection */}
                    <div className="card-game bg-white border-4 border-black p-4 rounded-[32px] shadow-[6px_6px_0_#000]">
                        <h3 className="font-titan text-lg mb-4 text-center border-b-4 border-black pb-2">VIEW MODE</h3>
                        <div className="flex flex-col gap-3">
                            {[
                                { id: 'strip', icon: ImageIcon, label: 'PHOTO STRIP' },
                                { id: 'raw', icon: ImageIcon, label: 'RAW SHOTS' },
                                { id: 'live', icon: Video, label: 'LIVE CONTENT' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-4 transition-all font-titan text-sm tracking-wide ${
                                        activeTab === tab.id 
                                        ? 'bg-game-primary text-white border-black translate-x-1 shadow-[4px_4px_0_#000]' 
                                        : 'bg-zinc-50 border-transparent hover:bg-zinc-100 text-black/50'
                                    }`}
                                >
                                    <tab.icon size={20} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="card-game bg-game-surface border-4 border-black p-6 rounded-[32px] shadow-[6px_6px_0_#000]">
                        <h3 className="font-titan text-lg mb-4 text-center text-game-primary uppercase border-b-4 border-black pb-2">SAVE ALL</h3>
                        <p className="text-center text-[10px] font-bold text-black/50 mb-6 uppercase">Save all shots, strips, and animations into one ZIP file.</p>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDownloadAll}
                            disabled={isZipping}
                            className="w-full py-5 btn-game-accent btn-cute text-black font-titan text-xl tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isZipping ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    ZIPPING...
                                </>
                            ) : (
                                <>
                                    <Download size={24} strokeWidth={3} />
                                    COLLECT ALL
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Share Button (Mobile Only visible if not already copied) */}
                    <div className="card-game bg-game-dark border-4 border-black p-6 rounded-[32px] text-center text-white">
                        <Gift className="mx-auto mb-2 text-game-success" size={32} />
                        <h4 className="font-titan text-sm mb-1 uppercase tracking-widest">Share the joy</h4>
                        <p className="text-[10px] font-bold text-white/50 mb-4 px-2 tracking-tighter">SURPRISE YOUR FRIENDS WITH THESE AWESOME MEMORIES!</p>
                        <div className="flex justify-center gap-3">
                            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + window.location.href)}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white text-fill" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.602 6.033L0 24l6.135-1.61a11.83 11.83 0 005.911 1.583h.005c6.635 0 12.032-5.396 12.035-12.032.001-3.218-1.251-6.243-3.526-8.518" fill="currentColor"/></svg>
                            </a>
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
