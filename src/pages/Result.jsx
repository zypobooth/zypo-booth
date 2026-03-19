import React, { useEffect, useState, useRef } from 'react';
import HamsterLoader from '../components/Loader/HamsterLoader';
import { useAlert } from '../context/AlertContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { createStrip, recordStripVideo, createLiveStripGif, getFilterCss } from '../utils/imageUtils';
import JSZip from 'jszip';
import { Download, Share2, RotateCcw, Star, X, Zap, Printer } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ConfirmationModal from '../components/ConfirmationModal';
import FilteredImage from '../components/FilteredImage';

import { usePhotoBoothContext } from '../context/PhotoBoothContext';
import { uploadToR2, saveGalleryToSupabase, generateR2Path } from '../services/storageService';
import { QRCodeSVG } from 'qrcode.react';
import { dataURItoBlob } from '../utils/imageUtils';

const Result = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const { resetSession } = usePhotoBoothContext();
    const reducedMotion = useReducedMotion();
    const [stripUrl, setStripUrl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0); // For video generation progress
    const [sessionId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());

    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [downloadingVideo, setDownloadingVideo] = useState(false);
    const [liveVideoUrls, setLiveVideoUrls] = useState([]);
    const [showConfirmRetake, setShowConfirmRetake] = useState(false);

    // Gallery & Upload States
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadError, setUploadError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [galleryData, setGalleryData] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [galleryEnabled, setGalleryEnabled] = useState(true);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const hasUploaded = useRef(false);


    // Create stable URLs from Blobs to prevent revocation issues
    useEffect(() => {
        if (state?.liveVideos) {
            const createdUrls = [];
            const urls = state.liveVideos.map(v => {
                if (v instanceof Blob) {
                    const url = URL.createObjectURL(v);
                    createdUrls.push(url);
                    return url;
                }
                return v; // Return existing URLs as-is
            });
            setLiveVideoUrls(urls);

            return () => {
                // Only revoke URLs we explicitly created in this effect
                createdUrls.forEach(u => URL.revokeObjectURL(u));
            };
        }
    }, [state?.liveVideos]);

    useEffect(() => {
        if (state?.photos) {
            const generate = async () => {
                try {
                    const url = await createStrip(state.photos, state.config);
                    setStripUrl(url);
                    
                    // Check if Auto-upload is enabled in global settings
                    const { data: settings } = await supabase
                        .from('global_settings')
                        .select('gallery_auto_upload')
                        .eq('id', 1)
                        .single();

                    setGalleryEnabled(settings?.gallery_auto_upload !== false);
                    setSettingsLoaded(true);

                    if (settings?.gallery_auto_upload !== false) {
                        handleAutoUpload(url, state.photos, state.liveVideos, state.config);
                    } else {
                        console.log("Auto-upload is disabled by admin.");
                    }
                } catch (error) {
                    console.error("Generation error:", error);
                    showAlert("Failed to generate your photo strip. Please try again.", "error");
                    navigate('/');
                }
            };
            generate();
        } else {
            navigate('/');
        }
    }, [state, navigate, showAlert]);

    const handleAutoUpload = async (stripDataUrl, rawPhotosArr, liveVideosArr, config) => {
        if (isUploading || hasUploaded.current) return;
        hasUploaded.current = true;
        setIsUploading(true);

        setUploadError(null);
        setUploadProgress(5);
        setUploadStatus('PREPARING MISSION...');

        try {
            // 1. Upload Strip
            setUploadStatus('TRANSMITTING PHOTO STRIP...');
            const stripBlob = dataURItoBlob(stripDataUrl);
            const stripPath = generateR2Path(sessionId, 'strip', 'png');
            const stripR2Url = await uploadToR2(stripBlob, stripPath, 'image/png');
            setUploadProgress(25);

            // 2. Upload Raw Photos
            setUploadStatus('PACKAGING RAW SHOTS...');
            const rawPhotoUrls = [];
            for (let i = 0; i < rawPhotosArr.length; i++) {
                setUploadStatus(`UPLOADING SHOT ${i+1}/${rawPhotosArr.length}...`);
                const photoBlob = dataURItoBlob(rawPhotosArr[i]);
                const photoPath = generateR2Path(sessionId, 'photo', 'png', i);
                const photoR2Url = await uploadToR2(photoBlob, photoPath, 'image/png');
                rawPhotoUrls.push(photoR2Url);
                setUploadProgress(25 + ((i + 1) / rawPhotosArr.length) * 40);
            }

            // 3. Optional: Export and Upload GIF/Video if live videos exist
            let gifR2Url = null;
            let videoR2Url = null;

            if (liveVideosArr && liveVideosArr.some(v => v)) {
                try {
                    setUploadStatus('CREATING ANIMATION...');
                    const gifBlob = await createLiveStripGif(liveVideoUrls, rawPhotosArr, config);
                    const gifPath = generateR2Path(sessionId, 'live', 'gif');
                    gifR2Url = await uploadToR2(gifBlob, gifPath, 'image/gif');
                    setUploadProgress(75);
                    
                    setUploadStatus('RECORDING LIVE TAPE...');
                    const videoBlob = await recordStripVideo(liveVideoUrls, rawPhotosArr, config);
                    const videoExt = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
                    const videoPath = generateR2Path(sessionId, 'live', videoExt);
                    videoR2Url = await uploadToR2(videoBlob, videoPath, videoBlob.type);
                    setUploadProgress(90);
                } catch (err) {
                    console.error("Failed to auto-upload video/gif:", err);
                    // Continue without video/gif if it fails
                }
            }

            // 4. Save to Supabase
            setUploadStatus('FINALIZING GALLERY...');
            const savedGallery = await saveGalleryToSupabase({
                sessionId,
                stripUrl: stripR2Url,
                rawPhotos: rawPhotoUrls,
                gifUrl: gifR2Url,
                videoUrl: videoR2Url,
                config: config || {}
            });

            setGalleryData(savedGallery);
            setUploadProgress(100);
            setUploadStatus('GALLERY READY!');
            console.log("Gallery saved successfully:", savedGallery);
        } catch (error) {
            console.error("Auto-upload failed:", error);
            setUploadError(error.message || "UPLOAD FAILED");
            showAlert("Failed to sync online gallery, but you can still download locally!", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = () => {
        if (state?.liveVideos && state.liveVideos.some(v => v)) {
            setShowDownloadOptions(true);
        } else {
            processImageDownload();
        }
    };

    const processImageDownload = () => {
        const link = document.createElement('a');
        link.download = `pixenze-booth-${Date.now()}.jpg`;
        link.href = stripUrl;
        link.click();
        showAlert("Photo strip saved to your device!", "success");
    };

    const processVideoDownload = async () => {
        setDownloadingVideo(true);
        try {
            const blob = await recordStripVideo(liveVideoUrls, state.photos, state.config);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
            link.download = `pixenze-booth-live-${Date.now()}.${ext}`;
            link.href = url;
            link.click();
            showAlert(`Live video saved as .${ext.toUpperCase()}!`, "success");
            setShowDownloadOptions(false);
        } catch (e) {
            showAlert("Failed to generate video.", "error");
        } finally {
            setDownloadingVideo(false);
        }
    };

    const processGifDownload = async () => {
        setDownloadingVideo(true);
        try {
            // Updated to use Live Strip GIF generator
            const blob = await createLiveStripGif(liveVideoUrls, state.photos, state.config, () => {
                // Optional: Update progress UI
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `pixenze-booth-live-${Date.now()}.gif`;
            link.href = url;
            link.click();
            showAlert("Animated GIF saved to your device!", "success");
            setShowDownloadOptions(false);
        } catch (e) {
            showAlert("Failed to generate GIF.", "error");
        } finally {
            setDownloadingVideo(false);
        }
    };



    const handleRetake = () => {
        resetSession();
        navigate('/');
    };

    const handlePrint = () => {
        if (!stripUrl) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Photo - PixenzeBooth</title>
                    <style>
                        @page {
                            size: 4in 6in;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: white;
                        }
                        img {
                            max-width: 100%;
                            max-height: 100%;
                            width: auto;
                            height: auto;
                            object-fit: contain;
                        }
                    </style>
                </head>
                <body>
                    <img src="${stripUrl}" onload="window.print(); window.close();" />
                </body>
            </html>
        `);
        printWindow.document.close();
    };



    if (!stripUrl) return (
        <div className="flex justify-center items-center h-screen bg-game-bg">
            <HamsterLoader message="PREPARING YOUR PHOTOS..." />
        </div>
    );



    return (
        <div className="h-dvh font-nunito flex flex-col items-center justify-start lg:justify-center p-4 pt-4 lg:pt-4 relative overflow-y-auto overflow-x-hidden">

            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            {/* Animated Background Blobs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="hidden md:block fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-game-accent/20 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{
                    scale: [1.1, 1, 1.1],
                    x: [0, 30, 0],
                    y: [0, -20, 0]
                }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                className="hidden md:block fixed bottom-1/3 right-1/4 w-[500px] h-[500px] bg-game-success/15 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            {/* Floating Stars — Hidden on mobile for performance */}
            {!reducedMotion && (
                <>
                    <motion.div
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, 360]
                        }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        className="fixed top-16 right-12 md:right-24"
                    >
                        <Star className="w-8 h-8 md:w-10 md:h-10 text-game-accent" fill="currentColor" />
                    </motion.div>

                    <motion.div
                        animate={{
                            y: [0, 20, 0],
                            scale: [1, 1.3, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="fixed top-32 left-12 md:left-24"
                    >
                        <Zap className="w-7 h-7 md:w-9 md:h-9 text-game-primary" fill="currentColor" />
                    </motion.div>
                </>
            )}

            <div className="text-center mb-6 md:mb-8 z-10 w-full">
                <motion.h1
                    initial={{ scale: 0.8, y: -30 }}
                    animate={{
                        scale: 1,
                        y: [0, -10, 0]
                    }}
                    transition={{
                        scale: { duration: 0.5 },
                        y: reducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }
                    }}
                    className="text-3xl sm:text-5xl md:text-7xl font-titan text-game-accent text-stroke drop-shadow-[5px_5px_0_#000]"
                >
                    MISSION COMPLETE!
                </motion.h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-center justify-center z-10 w-full max-w-6xl">

                {/* Result Strip Preview */}
                {/* Result Strip Preview (LIVE FRAME) */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                        rotate: [0, -2, 0, 2, 0]
                    }}
                    transition={{
                        scale: { type: 'spring', bounce: 0.5 },
                        rotate: reducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 4, ease: "easeInOut" }
                    }}
                    className="bg-zinc-800 p-3 md:p-4 pb-10 md:pb-12 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white relative group max-w-[90vw]"
                >
                    {/* Tape Effect */}
                    <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 w-24 md:w-32 h-8 md:h-10 bg-white/20 backdrop-blur-sm rotate-2 z-20 shadow-sm border-l border-r border-white/30"></div>

                    {stripUrl ? (
                        <div className="relative shadow-inner bg-white overflow-hidden max-h-[45dvh] md:max-h-[60vh]">
                            {/* Live Frame Assembly */}
                            {(state.liveVideos && (() => {
                                const lc = state.config?.layout_config;
                                const slots = !lc ? [] : Array.isArray(lc) ? lc : (lc.a || []);
                                return slots.length > 0 && state.config.frameImage;
                            })()) ? (
                                <div className="relative inline-flex items-center justify-center h-[45dvh] md:h-[60vh] w-fit mx-auto overflow-hidden">
                                    {/* 1. Underlying Slots (Videos/Photos) */}
                                    <div className="absolute inset-0 w-full h-full z-0">
                                        {(Array.isArray(state.config.layout_config) ? state.config.layout_config : (state.config.layout_config?.a || [])).map((slot, i) => (
                                            <div
                                                key={i}
                                                className="absolute overflow-hidden bg-gray-200"
                                                style={{
                                                    left: `${slot.x}%`,
                                                    top: `${slot.y}%`,
                                                    width: `${slot.width}%`,
                                                    height: `${slot.height}%`,
                                                }}
                                            >
                                                <FilteredImage
                                                    src={state.liveVideos[i] ? null : state.photos[i]}
                                                    videoSrc={state.liveVideos[i] ? liveVideoUrls[i] : null}
                                                    className={`w-full h-full object-cover ${state.liveVideos[i] && state.config?.isMirrored !== false ? 'transform -scale-x-100' : ''}`}
                                                    filterCss={!state.config?.is_lut ? getFilterCss(state.config?.filter) : 'none'}
                                                    lutUrl={state.config?.is_lut ? state.config.lutUrl : null}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* 2. Frame Overlay (Top Layer) */}
                                    <img
                                        src={state.config.frameImage}
                                        alt="Frame"
                                        className="relative z-10 h-full w-auto pointer-events-none block"
                                    />
                                </div>
                            ) : (state.liveVideos && !state.config?.frameImage) ? (
                                // Default Theme Live View (Vertical Stack)
                                <div className={`flex flex-col p-4 gap-4 items-center bg-game-bg-dark`}>
                                    {state.photos.map((photo, i) => (
                                        <div key={i} className="relative w-64 h-48 bg-black border-4 border-white shadow-sm overflow-hidden">
                                            <FilteredImage
                                                src={state.liveVideos[i] ? null : photo}
                                                videoSrc={state.liveVideos[i] ? liveVideoUrls[i] : null}
                                                className={`w-full h-full object-cover ${state.liveVideos[i] && state.config?.isMirrored !== false ? 'transform -scale-x-100' : ''}`}
                                                filterCss={!state.config?.is_lut ? getFilterCss(state.config?.filter) : 'none'}
                                                lutUrl={state.config?.is_lut ? state.config.lutUrl : null}
                                            />
                                        </div>
                                    ))}
                                    <div className="font-bold font-mono text-black text-center mt-2">PixenzeBooth</div>
                                </div>
                            ) : (
                                // Fallback Static Image
                                <img src={stripUrl} alt="Photostrip" className="max-h-[45dvh] md:max-h-[60vh] object-contain block" />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96 w-32 bg-gray-200 animate-pulse text-gray-400 font-mono text-sm">GENERATING...</div>
                    )}
                </motion.div>

                {/* Action Panel */}
                <div className="flex flex-col gap-4 w-full lg:w-auto min-w-[90vw] sm:min-w-0 sm:w-full md:w-auto md:min-w-[300px]">
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="card-game bg-game-surface text-black border-4 p-5 md:p-6"
                    >
                        <h2 className="text-xl md:text-2xl font-titan text-game-primary mb-4 border-b-4 border-black pb-2 text-stroke-sm">DATA SAVE</h2>

                        <div className="space-y-3">
                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                                className="w-full py-3 btn-game-accent btn-cute flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <Download size={20} /> SAVE TO DISK
                            </motion.button>



                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePrint}
                                className="w-full py-3 btn-game-primary btn-cute flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <Printer size={20} /> PRINT PHOTO (4R)
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowConfirmRetake(true)}
                                className="w-full py-3 btn-game-danger btn-cute flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <RotateCcw size={20} /> REPLAY MISSION
                            </motion.button>
                        </div>

                        {/* QR GALLERY SECTION */}
                        <div className="mt-6 pt-6 border-t-4 border-black/10">
                            {isUploading ? (
                                <div className="text-center space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-titan text-game-accent uppercase tracking-widest">{uploadStatus}</p>
                                        <p className="text-[10px] font-titan text-game-accent">{Math.round(uploadProgress)}%</p>
                                    </div>
                                    <div className="w-full h-4 bg-black/10 rounded-full overflow-hidden border-2 border-black/5 p-0.5">
                                        <motion.div 
                                            className="h-full bg-game-accent rounded-full shadow-[0_0_10px_rgba(255,182,0,0.5)]" 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${uploadProgress}%` }}
                                            transition={{ ease: "easeOut" }}
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-black/30 uppercase tracking-tighter">Please keep this page open until complete</p>
                                </div>
                            ) : uploadError ? (
                                <motion.div 
                                    initial={{ x: [-5, 5, -5, 5, 0] }}
                                    className="bg-rose-50 border-4 border-game-danger p-4 rounded-2xl text-center space-y-3"
                                >
                                    <p className="text-[10px] font-titan text-game-danger uppercase tracking-widest leading-tight">UPLOADING DATA FAILED</p>
                                    <button 
                                        onClick={() => handleAutoUpload(stripUrl, state.photos, state.liveVideos, state.config)}
                                        className="py-2 px-4 bg-game-danger text-white border-2 border-black rounded-xl font-titan text-[10px] uppercase shadow-[3px_3px_0_#000] active:scale-95"
                                    >
                                        RETRY UPLOAD
                                    </button>
                                </motion.div>
                            ) : galleryData ? (
                                <div className="bg-white border-4 border-black p-3 rounded-2xl flex flex-col items-center gap-3 shadow-[4px_4px_0_#000]">
                                    <div className="bg-white p-2 rounded-lg cursor-pointer" onClick={() => setShowQRModal(true)}>
                                        <QRCodeSVG 
                                            value={`${import.meta.env.VITE_GALLERY_URL || window.location.origin}/g/${sessionId}`}
                                            size={120}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-titan text-xs text-game-primary leading-tight">SCAN TO VIEW GALLERY</p>
                                        <p className="text-[10px] text-black/50 font-bold uppercase mt-1">RAW PHOTOS + GIF INCLUDED!</p>
                                    </div>
                                </div>
                            ) : !settingsLoaded ? (
                                <div className="text-center py-2">
                                    <p className="text-[10px] text-black/20 font-bold uppercase animate-pulse">Checking gallery status...</p>
                                </div>
                            ) : !galleryEnabled ? (
                                <div className="bg-zinc-100 border-4 border-dashed border-black/20 p-4 rounded-2xl text-center">
                                    <p className="text-[10px] text-black/30 font-bold uppercase">QR Gallery disabled by admin</p>
                                </div>
                            ) : (
                                <p className="text-[10px] text-center text-black/30 font-bold uppercase">Gallery system unavailable</p>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-game-dark border-4 border-black p-4 rounded-xl text-center shadow-game"
                    >
                        <p className="text-game-success text-xs font-mono mb-1">SESSION ID: {sessionId}</p>
                        <p className="text-white font-bold text-sm">THANK YOU FOR PLAYING!</p>
                    </motion.div>
                </div>
            </div>

            {/* DOWNLOAD OPTIONS MODAL */}
            <AnimatePresence>
                {showDownloadOptions && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/95">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-white border-[6px] border-black p-6 rounded-3xl max-w-sm w-full relative shadow-[8px_8px_0_#000] text-center"
                        >
                            <button
                                onClick={() => setShowDownloadOptions(false)}
                                className="absolute top-4 right-4 text-black/50 hover:text-black transition-transform"
                                aria-label="Close Download Options"
                            >
                                <X size={24} strokeWidth={3} />
                            </button>

                            <h3 className="font-titan text-2xl text-black mb-6">CHOOSE FORMAT</h3>

                            <div className="flex flex-col gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={processImageDownload}
                                    className="w-full py-3 btn-game-primary btn-cute text-white font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2"
                                >
                                    GET PHOTO (JPG)
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={processVideoDownload}
                                    disabled={downloadingVideo}
                                    className="w-full py-3 btn-game-secondary btn-cute text-black font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {downloadingVideo ? (
                                        <span className="animate-pulse">GENERATING...</span>
                                    ) : (
                                        "GET VIDEO (MP4)"
                                    )}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={processGifDownload}
                                    disabled={downloadingVideo}
                                    className="w-full py-3 bg-game-accent btn-cute text-black font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    GET GIF (ANIMATED)
                                </motion.button>


                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
 
             {/* QR FULLSCREEN MODAL */}
             <AnimatePresence>
                {showQRModal && galleryData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-game-surface border-[6px] border-black p-8 rounded-[40px] max-w-sm w-full relative shadow-[12px_12px_0_#000] text-center"
                        >
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="absolute -top-4 -right-4 bg-game-danger text-white p-2 rounded-full border-4 border-black hover:scale-110 transition-transform"
                            >
                                <X size={24} strokeWidth={4} />
                            </button>

                            <div className="mb-6">
                                <h3 className="font-titan text-3xl text-game-accent text-stroke-sm mb-2 uppercase">Your Gallery</h3>
                                <p className="text-black/60 font-bold text-sm uppercase">Scan with your phone to save all media!</p>
                            </div>

                            <div className="bg-white p-6 rounded-[32px] border-4 border-black mb-6 shadow-inner mx-auto w-fit">
                                <QRCodeSVG 
                                    value={`${import.meta.env.VITE_GALLERY_URL || window.location.origin}/g/${sessionId}`}
                                    size={240}
                                    level="H"
                                />
                            </div>

                            <div className="bg-white/50 border-4 border-black rounded-2xl p-3 mb-6">
                                <p className="font-mono text-xs break-all text-black font-bold uppercase">{(import.meta.env.VITE_GALLERY_URL || window.location.origin).replace(/^https?:\/\//, '')}/g/{sessionId}</p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowQRModal(false)}
                                className="w-full py-4 btn-game-primary btn-cute text-xl font-titan tracking-wider"
                            >
                                CLOSE
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* RETAKE CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showConfirmRetake}
                onClose={() => setShowConfirmRetake(false)}
                onConfirm={handleRetake}
                title="REPLAY MISSION?"
                message="Are you sure you want to start over? Your current photo strip will be lost if not saved!"
            />

        </div>
    );
};

export default Result;
