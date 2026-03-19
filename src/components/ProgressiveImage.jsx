import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProgressiveImage = ({ src, placeholderSrc, alt, className, style }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(false);
        const img = new Image();
        img.src = src;
        img.onload = () => {
            setIsLoaded(true);
        };
    }, [src]);

    return (
        <div className={`relative overflow-hidden ${className}`} style={style}>
            {/* High Res Image - Always mounted, opacity controlled */}
            <motion.img
                key={src}
                src={src}
                alt={alt}
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isLoaded ? 1 : 0,
                    scale: isLoaded ? 1 : 1.05 // Slight zoom out effect when loading
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`w-full h-full object-contain`}
            />

            {/* Placeholder - Absolute overlay */}
            <AnimatePresence>
                {!isLoaded && placeholderSrc && (
                    <motion.img
                        key="placeholder"
                        src={placeholderSrc}
                        alt={alt || "loading..."}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProgressiveImage;
