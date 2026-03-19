import React, { useRef, useEffect, useCallback } from 'react';
import { drawLutFrame, getSharedCanvas } from '../utils/lutEngine';

const FilterCanvas = ({ videoElement, lutUrl, intensity = 1.0, isMirrored = false, onCanvasReady }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const rafRef = useRef();
    const mountedRef = useRef(true);

    const render = useCallback(async () => {
        if (!mountedRef.current || !videoElement || videoElement.readyState < 2 || !canvasRef.current || !ctxRef.current) return;

        const canvas = canvasRef.current;
        const ctx = ctxRef.current;

        // Sync dimensions
        if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
        }

        if (lutUrl) {
            const success = await drawLutFrame(videoElement, lutUrl, intensity);
            if (success) {
                ctx.filter = 'none';
                ctx.drawImage(getSharedCanvas(), 0, 0);
            } else {
                ctx.filter = 'none';
                ctx.drawImage(videoElement, 0, 0);
            }
        } else {
            ctx.filter = 'none';
            ctx.drawImage(videoElement, 0, 0);
        }
    }, [videoElement, lutUrl, intensity]);

    useEffect(() => {
        mountedRef.current = true;
        
        if (canvasRef.current && !ctxRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d', { alpha: false });
            if (onCanvasReady) onCanvasReady(canvasRef.current);
        }

        const animate = async () => {
            if (!mountedRef.current) return;
            await render();
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            mountedRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [render, onCanvasReady]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover ${isMirrored ? 'transform -scale-x-100' : ''}`}
        />
    );
};

export default FilterCanvas;
