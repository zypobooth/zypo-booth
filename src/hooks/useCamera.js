import { useState, useEffect, useRef, useCallback } from 'react';
import { APP_CONFIG } from '../config/constants';

export const useCamera = () => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
    const streamRef = useRef(null); // Track stream in ref to avoid stale closures
    const isStartingRef = useRef(false); // Lock for initialization

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const startCamera = async () => {
        if (isStartingRef.current) return;
        
        setError(null);
        stopCamera(); // Clean up existing
        
        isStartingRef.current = true; // Set lock AFTER calling stopCamera
        
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera API is not available (Check HTTPS or Device)");
            }

            const constraints = {
                video: {
                    width: { ideal: APP_CONFIG.CAMERA.IDEAL_WIDTH }, 
                    height: { ideal: APP_CONFIG.CAMERA.IDEAL_HEIGHT },
                    facingMode: facingMode
                },
                audio: false
            };

            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                // Fallback to basic video if complex constraints fail
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            // If we've been signaled to abort (via cleanup setting it to false)
            if (!isStartingRef.current) {
                mediaStream.getTracks().forEach(track => track.stop());
                return;
            }

            setStream(mediaStream);
            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(() => {});
            }
        } catch (err) {
            if (isStartingRef.current) {
                setError(err.message || "Could not access camera");
            }
        } finally {
            isStartingRef.current = false;
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === "user" ? "environment" : "user");
    };

    useEffect(() => {
        startCamera();
        return () => {
            isStartingRef.current = false; // Abort signal
            stopCamera();
        };
    }, [facingMode, stopCamera]);

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
