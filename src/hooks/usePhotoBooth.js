import { useRef, useCallback, useEffect, useState } from 'react';
import { captureVideoFrame } from '../utils/imageUtils';
import { usePhotoBoothContext } from '../context/PhotoBoothContext';

export const usePhotoBooth = () => {
    const { 
        photos, setPhotos, 
        liveVideos, setLiveVideos, 
        config, setConfig 
    } = usePhotoBoothContext();

    const [status, setStatus] = useState('idle'); // idle, countdown, capturing, processing, finished
    const [countdown, setCountdown] = useState(0);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Sync state when config changes (e.g. going from 6 frames to 3 frames)
    useEffect(() => {
        if (photos.length > config.totalPhotos && config.totalPhotos > 0) {
            // Truncate if we have too many photos for the new layout
            setPhotos(prev => prev.slice(0, config.totalPhotos));
            setLiveVideos(prev => prev.slice(0, config.totalPhotos));
        }

        // Auto-update status based on photo count vs requirement
        if (photos.length >= config.totalPhotos && config.totalPhotos > 0) {
            if (status !== 'finished') setStatus('finished');
        } else if (status === 'finished' && photos.length < config.totalPhotos) {
            // If we were finished but now need more (e.g. switched from 3 to 6)
            setStatus('idle');
        }
    }, [config.totalPhotos, photos.length, status, setPhotos, setLiveVideos]);

    const startSession = useCallback((newConfig) => {
        if (newConfig) setConfig(prev => ({ ...prev, ...newConfig }));
        // If we want to persist photos when going back/forth, 
        // we should only reset if the user is starting a TRULY new session.
        // However, usually startSession is called when entering Booth.
        // If photos already exist, we might want to ask or just keep them?
        // Let's modify it to only reset if empty or explicitly called.
        if (photos.length === 0) {
            setPhotos([]);
            setLiveVideos([]);
            setCountdown(3);
            setStatus('countdown');
        } else {
            // We don't force 'idle' here, the sync useEffect handles 'finished' vs 'idle'
        }
    }, [photos.length, setPhotos, setLiveVideos, setConfig]);

    useEffect(() => {
        let timer;
        const handleVisibilityChange = () => {
            if (document.hidden && status === 'countdown') {
                // pause or handle
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (status === 'countdown') {
            if (countdown > 0) {
                if (countdown === 2 && config.isLive && videoRef.current) {
                    startRecording();
                }

                timer = setTimeout(() => {
                    setCountdown(prev => prev - 1);
                }, 1000);
            } else if (countdown === 0) {
                capture();
            }
        }
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [status, countdown, config.isLive, config.isMirrored, config.filter]);

    const startRecording = useCallback(() => {
        try {
            if (!videoRef.current) return;

            let stream;
            // Prefer capturing from WebGL canvas to include filters
            if (videoRef.current._canvas) {
                stream = videoRef.current._canvas.captureStream(30); // 30 FPS
            } else if (videoRef.current.srcObject) {
                stream = videoRef.current.srcObject;
            } else {
                return;
            }

            // Detect best supported mime type
            const mimeTypes = [
                'video/mp4;codecs=h264,aac',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm'
            ];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

            if (!mimeType) {
                return;
            }

            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
            mediaRecorderRef.current = recorder;
            chunksRef.current = []; // Reset chunks

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setLiveVideos(prev => [...prev, blob]);
            };

            recorder.start();
        } catch (e) {
            console.error("Recording failed", e);
        }
    }, [config.filter, setLiveVideos]);

    const capture = useCallback(() => {
        setStatus('capturing');

        // Capture the photo immediately
        let photo = null;
        if (videoRef.current) {
            photo = captureVideoFrame(videoRef.current, config.filter, 4 / 3, config.isMirrored);
        }

        if (photo) {
            setPhotos(prev => [...prev, photo]);

            // If NOT live, push null video to keep arrays synced
            if (!config.isLive) {
                setLiveVideos(prev => [...prev, null]);
            }
        } else {
            setStatus('countdown');
            setCountdown(3);
            return;
        }

        // Handle Recording Stop
        if (config.isLive && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // Stop recording after 1.5 seconds to capture post-moment
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 1500);
        }

        // Proceed to next state is handled by the sync useEffect
        // but we need a small delay for UI flash
        setTimeout(() => {
            if (photos.length + 1 >= config.totalPhotos) {
                // Sync effect will handle status: finished
            } else {
                setStatus('countdown');
                setCountdown(3);
            }
        }, config.isLive ? 1600 : 600);

    }, [config.totalPhotos, config.filter, config.isLive, config.isMirrored, photos.length, setPhotos, setLiveVideos]);

    const reset = () => {
        setStatus('idle');
        setPhotos([]);
        setLiveVideos([]);
        setCountdown(0);
    };

    return {
        status,
        countdown,
        photos,
        liveVideos,
        setPhotos, // Expose setPhotos manually for uploads
        config,
        setConfig,
        startSession,
        reset,
        setStatus,
        setCountdown,
        videoRef
    };
};
