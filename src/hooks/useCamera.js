import { useState, useEffect, useRef, useCallback } from 'react';
import { APP_CONFIG } from '../config/constants';

export const useCamera = () => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
    const streamRef = useRef(null); // Track stream in ref to avoid stale closures

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const startCamera = async () => {
        stopCamera(); // Ensure clean slate
        try {
            // Check if API exists
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera API is not available (Check HTTPS or Device)");
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: APP_CONFIG.CAMERA.IDEAL_WIDTH }, // Higher quality 4:3
                    height: { ideal: APP_CONFIG.CAMERA.IDEAL_HEIGHT },
                    aspectRatio: { ideal: 1.333333 }, // Prefer 4:3
                    facingMode: facingMode
                },
                audio: false
            });

            setStream(mediaStream);
            streamRef.current = mediaStream; // Sync ref

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Specifically for mobile, ensure playing
                videoRef.current.play().catch(e => {
                    // Ignore abort errors caused by new load requests (rapid switching)
                    if (e.name !== 'AbortError') {
                    }
                });
            }
            setError(null);
        } catch (err) {
            setError(err.message || "Could not access camera");
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === "user" ? "environment" : "user");
    };

    // Re-start camera when facingMode changes
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [facingMode]);

    const [isFlashOn, setIsFlashOn] = useState(false);
    const [hasFlash, setHasFlash] = useState(false);

    // Check flash capability when stream changes
    useEffect(() => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            let capabilities = {};
            // Safari may throw on getCapabilities
            try {
                capabilities = track.getCapabilities ? track.getCapabilities() : {};
            } catch (e) {
            }

            // Check for torch support
            if (capabilities.torch) {
                setHasFlash(true);
            } else {
                setHasFlash(false);
            }
            setIsFlashOn(false); // Reset flash state on new stream
        }
    }, [stream]);

    const toggleFlash = async () => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const newFlashState = !isFlashOn;

            if (hasFlash) {
                try {
                    await track.applyConstraints({
                        advanced: [{ torch: newFlashState }]
                    });
                } catch (e) {
                }
            }

            // Always toggle state for UI feedback (and for PC simulation)
            setIsFlashOn(newFlashState);
        }
    };

    return { videoRef, stream, error, startCamera, stopCamera, switchCamera, facingMode, toggleFlash, isFlashOn, hasFlash };
};
