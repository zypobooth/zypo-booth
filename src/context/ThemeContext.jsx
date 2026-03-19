import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getEmbedData } from '../utils/mediaUtils';
import { supabase } from '../lib/supabase';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeRaw] = useState('default');
    const [audioUrl, setAudioUrl] = useState(null);
    const [ytEmbedSrc, setYtEmbedSrc] = useState(null);
    const [themeConfig, setThemeConfig] = useState(null);
    const audioRef = useRef(null);

    // Initial fetch from Supabase
    useEffect(() => {
        const fetchInitialTheme = async () => {
            const { data, error } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (!error && data) {
                applyThemeData(data);
            }
        };

        fetchInitialTheme();

        // Real-time subscription
        const channel = supabase
            .channel('global-settings-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'global_settings',
                    filter: 'id=eq.1'
                },
                (payload) => {
                    console.log('Theme update received:', payload.new);
                    applyThemeData(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const applyThemeData = (data) => {
        setThemeRaw(data.active_theme || 'default');
        setAudioUrl(data.audio_url || null);
        setThemeConfig(data);
    };

    // Public setter: accepts either a string OR { themeId, audioUrl }
    const setTheme = (value) => {
        if (typeof value === 'object' && value !== null) {
            setThemeRaw(value.themeId || 'default');
            setAudioUrl(value.audioUrl || null);
        } else {
            setThemeRaw(value || 'default');
            setAudioUrl(null);
        }
    };

    // Effect to apply visual theme classes + audio
    useEffect(() => {
        // Remove all theme classes
        document.body.classList.remove('theme-valentine', 'theme-mu', 'theme-vaporwave', 'theme-emerald');

        if (theme && theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }

        // Handle audio
        if (audioUrl) {
            playAudio(audioUrl);
        } else {
            stopAudio();
        }
    }, [theme, audioUrl]);

    const playAudio = (src) => {
        const embedData = getEmbedData(src);
        if (embedData && embedData.type === 'youtube') {
            stopLocalAudio();
            setYtEmbedSrc(embedData.src);
            return;
        }

        // If local file or direct URL
        setYtEmbedSrc(null);
        if (!audioRef.current) {
            audioRef.current = new Audio(src);
            audioRef.current.loop = true;
        } else {
            const currentSrc = new URL(src, window.location.href).href;
            if (audioRef.current.src !== currentSrc) {
                audioRef.current.src = src;
            }
        }

        audioRef.current.play().catch(() => { });
    };

    const stopAudio = () => {
        setYtEmbedSrc(null);
        stopLocalAudio();
    };

    const stopLocalAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const [ringLight, setRingLight] = useState(() => {
        const saved = localStorage.getItem('ringLight');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('ringLight', ringLight);
    }, [ringLight]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, ringLight, setRingLight }}>
            {children}
            {/* Hidden Iframe for YouTube Audio */}
            {ytEmbedSrc && (
                <iframe
                    width="1"
                    height="1"
                    src={ytEmbedSrc}
                    title="Background Audio"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}
                ></iframe>
            )}
        </ThemeContext.Provider>
    );
};
