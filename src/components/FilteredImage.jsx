import React, { useRef, useEffect, useState, useCallback } from 'react';
import HamsterLoader from './Loader/HamsterLoader';
import { drawLutFrame, getSharedCanvas } from '../utils/lutEngine';

const FilteredImage = ({ src, videoSrc, lutUrl, filterCss = 'none', className = '', style = {} }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const videoRef = useRef(null);
    const rafRef = useRef(null);
    const mountedRef = useRef(true);
    const [isLoading, setIsLoading] = useState(false);

    const renderFrame = useCallback(async (source) => {
        if (!canvasRef.current || !ctxRef.current || !source) return;

        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        
        // Handle dimensions
        const width = source.videoWidth || source.naturalWidth || source.width;
        const height = source.videoHeight || source.naturalHeight || source.height;

        // Skip zero dimension media
        if (width === 0 || height === 0) return;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        if (lutUrl) {
            // Use WebGL Engine for LUTs
            const success = await drawLutFrame(source, lutUrl);
            if (success) {
                ctx.clearRect(0, 0, width, height);
                ctx.filter = 'none';
                ctx.drawImage(getSharedCanvas(), 0, 0);
            } else {
                // Fallback to source
                ctx.clearRect(0, 0, width, height);
                ctx.filter = filterCss !== 'none' ? filterCss : 'none';
                ctx.drawImage(source, 0, 0);
            }
        } else {
            // Use native 2D filters for CSS filters
            // Crucial for iOS: must clear and set filter right before drawing
            ctx.clearRect(0, 0, width, height);
            ctx.filter = filterCss !== 'none' ? filterCss : 'none';
            ctx.drawImage(source, 0, 0);
        }
    }, [lutUrl, filterCss]);

    // Render loop for video
    const startVideoLoop = useCallback(() => {
        const loop = async () => {
            if (!mountedRef.current || !videoRef.current) return;
            if (!videoRef.current.paused && !videoRef.current.ended) {
                await renderFrame(videoRef.current);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, [renderFrame]);

    useEffect(() => {
        mountedRef.current = true;
        if (canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d', { alpha: true });
        }

        return () => {
            mountedRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current = null;
            }
        };
    }, []);

    // Effect: Load Media
    useEffect(() => {
        if (!mountedRef.current) return;
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current = null;
        }

        if (videoSrc) {
            const video = document.createElement('video');
            video.src = videoSrc;
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;
            
            video.onloadedmetadata = () => {
                if (!mountedRef.current) return;
                video.play();
                videoRef.current = video;
                startVideoLoop();
            };
        } else if (src) {
            setIsLoading(true);
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
                if (!mountedRef.current) return;
                await renderFrame(img);
                setIsLoading(false);
            };
            img.src = src;
        }
    }, [src, videoSrc, renderFrame, startVideoLoop]);

    // Handle static filter/lut changes for images
    useEffect(() => {
        if (src && !videoSrc && !isLoading) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => renderFrame(img);
            img.src = src;
        }
    }, [lutUrl, filterCss, src, videoSrc, isLoading, renderFrame]);

    return (
        <div className={`relative ${className}`} style={{ ...style, overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto' }}
            />
            {isLoading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none z-20">
                    <HamsterLoader message="" size={0.3} />
                </div>
            )}
        </div>
    );
};

export default FilteredImage;
