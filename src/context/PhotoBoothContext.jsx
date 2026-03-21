import React, { createContext, useContext, useState } from 'react';
import { disposeEngine } from '../utils/lutEngine';

const PhotoBoothContext = createContext();

export const PhotoBoothProvider = ({ children }) => {
    const [photos, setPhotos] = useState([]);
    const [liveVideos, setLiveVideos] = useState([]);
    const [config, setConfig] = useState({ 
        totalPhotos: 3, 
        filter: 'none', 
        theme: 'pink', 
        isLive: false, 
        isMirrored: true 
    });

    const resetSession = () => {
        setPhotos([]);
        setLiveVideos([]);
        // Force garbage collection of WebGL textures and context when a session ends/starts
        disposeEngine();
    };

    return (
        <PhotoBoothContext.Provider value={{ 
            photos, setPhotos, 
            liveVideos, setLiveVideos, 
            config, setConfig,
            resetSession
        }}>
            {children}
        </PhotoBoothContext.Provider>
    );
};

export const usePhotoBoothContext = () => {
    const context = useContext(PhotoBoothContext);
    if (!context) {
        throw new Error('usePhotoBoothContext must be used within a PhotoBoothProvider');
    }
    return context;
};
