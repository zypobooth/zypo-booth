import React, { createContext, useContext, useState } from 'react';

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
