import { parseCubeLUT, createLUTTexture, createFilterProgram, createQuadValues } from './lutUtils';

// --- GLOBAL STATE ---
let sharedGl = null;
let sharedCanvas = null;
let sharedProgram = null;
let sharedVao = null;
let sharedImageTexture = null; // Re-use this texture for source images/videos
let isContextLost = false;

// Uniform Locations Cache
let locUseLUT = null;
let locIntensity = null;
let locImage = null;
let locLut = null;

// Global cache for parsed LUT data and textures
// Map of url -> { data (Float32Array), size, title, min, max, texture (WebGLTexture, optional) }
const globalLutCache = new Map();

/**
 * Initialize the shared WebGL2 context lazily.
 */
const initEngine = () => {
    if (sharedGl && !isContextLost) return true;
    if (isContextLost) return false;

    try {
        if (!sharedCanvas) {
            sharedCanvas = document.createElement('canvas');
            sharedCanvas.addEventListener('webglcontextlost', handleContextLost, false);
            sharedCanvas.addEventListener('webglcontextrestored', handleContextRestored, false);
        }

        sharedGl = sharedCanvas.getContext('webgl2', {
            preserveDrawingBuffer: true,
            alpha: true,
            premultipliedAlpha: false,
            powerPreference: 'high-performance'
        });

        if (!sharedGl) {
            console.error('[lutEngine] WebGL2 not supported.');
            return false;
        }

        sharedProgram = createFilterProgram(sharedGl);
        
        // Cache Uniform Locations
        locUseLUT = sharedGl.getUniformLocation(sharedProgram, 'u_useLUT');
        locIntensity = sharedGl.getUniformLocation(sharedProgram, 'u_intensity');
        locImage = sharedGl.getUniformLocation(sharedProgram, 'u_image');
        locLut = sharedGl.getUniformLocation(sharedProgram, 'u_lut');

        const { vao } = createQuadValues(sharedGl);
        sharedVao = vao;

        // Shared Image Texture creation
        sharedImageTexture = sharedGl.createTexture();
        sharedGl.bindTexture(sharedGl.TEXTURE_2D, sharedImageTexture);
        sharedGl.texParameteri(sharedGl.TEXTURE_2D, sharedGl.TEXTURE_MIN_FILTER, sharedGl.LINEAR);
        sharedGl.texParameteri(sharedGl.TEXTURE_2D, sharedGl.TEXTURE_MAG_FILTER, sharedGl.LINEAR);
        sharedGl.texParameteri(sharedGl.TEXTURE_2D, sharedGl.TEXTURE_WRAP_S, sharedGl.CLAMP_TO_EDGE);
        sharedGl.texParameteri(sharedGl.TEXTURE_2D, sharedGl.TEXTURE_WRAP_T, sharedGl.CLAMP_TO_EDGE);

        // Pixel alignment
        sharedGl.pixelStorei(sharedGl.UNPACK_ALIGNMENT, 1);
        
        return true;
    } catch (err) {
        console.error('[lutEngine] Initialization failed:', err);
        return false;
    }
};

const handleContextLost = (e) => {
    e.preventDefault();
    console.warn('[lutEngine] WebGL context lost.');
    isContextLost = true;
};

const handleContextRestored = () => {
    console.log('[lutEngine] WebGL context restored. Re-initializing...');
    isContextLost = false;
    
    // Clear WebGL specific resources from cache (textures)
    for (const [url, cacheItem] of globalLutCache.entries()) {
        if (cacheItem.texture) {
            cacheItem.texture = null; // Let it be recreated
        }
    }

    sharedGl = null;
    sharedImageTexture = null;
    initEngine();
};

/**
 * Fetches and parses a .cube file. Returns cached data if available.
 * Does NOT create WebGL textures by default, just parses the array.
 * @param {string} lutUrl URL of the .cube file
 * @returns {Promise<Object>} The parsed LUT data
 */
export const getLutData = async (lutUrl) => {
    if (!lutUrl) return null;

    if (globalLutCache.has(lutUrl)) {
        return globalLutCache.get(lutUrl);
    }

    try {
        const response = await fetch(lutUrl, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const parsedData = parseCubeLUT(text);

        const cacheEntry = { ...parsedData, texture: null };
        globalLutCache.set(lutUrl, cacheEntry);

        return cacheEntry;
    } catch (err) {
        console.error('[lutEngine] Failed to load LUT:', lutUrl, err);
        throw err;
    }
};

/**
 * Loads an image from a URL or DataURL.
 */
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error('Failed to load image: ' + src));
        img.src = src;
    });
};

/**
 * Draws a single frame (image or video) with a LUT applied to the shared canvas.
 * Optimized to re-use textures and avoid per-frame allocations.
 */
export const drawLutFrame = async (source, lutUrl, intensity = 1.0) => {
    if (!source) return false;
    
    const isInitialized = initEngine();
    if (!isInitialized) return false;

    try {
        const lutData = await getLutData(lutUrl);
        
        // Handle source dimensions (Image or Video)
        const width = source.videoWidth || source.naturalWidth || source.width;
        const height = source.videoHeight || source.naturalHeight || source.height;
        
        if (sharedCanvas.width !== width || sharedCanvas.height !== height) {
            sharedCanvas.width = width;
            sharedCanvas.height = height;
            sharedGl.viewport(0, 0, width, height);
        }

        sharedGl.useProgram(sharedProgram);
        sharedGl.bindVertexArray(sharedVao);

        // Update existing Image Texture
        sharedGl.activeTexture(sharedGl.TEXTURE0);
        sharedGl.bindTexture(sharedGl.TEXTURE_2D, sharedImageTexture);
        // texImage2D is fine for updating existing texture object with new pixel data
        sharedGl.texImage2D(sharedGl.TEXTURE_2D, 0, sharedGl.RGBA, sharedGl.RGBA, sharedGl.UNSIGNED_BYTE, source);

        // LUT Texture
        if (lutData) {
            if (!lutData.texture) lutData.texture = createLUTTexture(sharedGl, lutData);
            sharedGl.activeTexture(sharedGl.TEXTURE1);
            sharedGl.bindTexture(sharedGl.TEXTURE_3D, lutData.texture);
            sharedGl.uniform1i(locUseLUT, 1);
        } else {
            sharedGl.uniform1i(locUseLUT, 0);
        }

        sharedGl.uniform1i(locImage, 0);
        sharedGl.uniform1i(locLut, 1);
        sharedGl.uniform1f(locIntensity, intensity);

        sharedGl.drawArrays(sharedGl.TRIANGLES, 0, 6);

        return true;
    } catch (err) {
        console.error('[lutEngine] drawLutFrame error:', err);
        return false;
    }
};

/**
 * Returns the shared canvas for components that need to copy from it.
 */
export const getSharedCanvas = () => sharedCanvas;

/**
 * Applies a LUT to an image source and returns a new DataURL.
 */
export const applyLUTToImage = async (imageSrc, lutUrl, intensity = 1.0) => {
    if (!imageSrc) return null;
    if (!lutUrl) return imageSrc;

    try {
        const img = await loadImage(imageSrc);
        const success = await drawLutFrame(img, lutUrl, intensity);
        
        if (!success) return imageSrc;
        
        return sharedCanvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
        console.error('[lutEngine] applyLUTToImage error:', err);
        return imageSrc;
    }
};

/**
 * Disposes completely of the shared WebGL context and clears the cache.
 */
export const disposeEngine = () => {
    if (sharedGl) {
        // Delete cached textures
        for (const [_, cacheItem] of globalLutCache.entries()) {
            if (cacheItem.texture) {
                sharedGl.deleteTexture(cacheItem.texture);
            }
        }
        
        if (sharedImageTexture) sharedGl.deleteTexture(sharedImageTexture);
        if (sharedProgram) sharedGl.deleteProgram(sharedProgram);
        if (sharedVao) sharedGl.deleteVertexArray(sharedVao);

        // Force context loss
        const ext = sharedGl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
    }

    globalLutCache.clear();
    sharedGl = null;
    sharedImageTexture = null;
    sharedProgram = null;
    sharedVao = null;
    
    if (sharedCanvas) {
        sharedCanvas.removeEventListener('webglcontextlost', handleContextLost);
        sharedCanvas.removeEventListener('webglcontextrestored', handleContextRestored);
        sharedCanvas = null;
    }

    isContextLost = false;
};

// Re-export for convenience
export { parseCubeLUT };
