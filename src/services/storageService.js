import { supabase } from '../lib/supabase';

/**
 * Storage Service for handling media uploads to Cloudflare R2 and Supabase Database.
 */

const API_BASE_URL = ''; // Leave empty for same-origin (functions/api)

/**
 * Uploads a file to Cloudflare R2 via server-side proxy.
 * 
 * Di development: File dikirim ke server lokal kita (/api/upload-r2),
 * yang kemudian meng-upload ke R2 dari sisi server (tanpa CORS).
 * 
 * Di production (Cloudflare Pages): Menggunakan presigned URL via /api/get-signed-url.
 * 
 * @param {Blob|File} file - The file to upload.
 * @param {string} fileName - The desired name of the file in R2 (including path/extension).
 * @param {string} contentType - The MIME type of the file.
 * @returns {Promise<string>} - Returns the public URL of the uploaded file.
 */
export const uploadToR2 = async (file, fileName, contentType) => {
    try {
        const isDev = import.meta.env.DEV;

        if (isDev) {
            // === MODE DEVELOPMENT: Proxy melalui server lokal ===
            const response = await fetch(`${API_BASE_URL}/api/upload-r2`, {
                method: 'POST',
                headers: {
                    'x-file-name': fileName,
                    'x-content-type': contentType,
                },
                body: file, // Kirim file langsung sebagai body
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Proxy upload failed: ${errorText || response.statusText}`);
            }

            const { publicUrl } = await response.json();
            return publicUrl;
        } else {
            // === MODE PRODUCTION: Presigned URL (Cloudflare Pages) ===
            const response = await fetch(`${API_BASE_URL}/api/get-signed-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, contentType }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get signed URL: ${errorText || response.statusText}`);
            }

            const { uploadUrl, publicUrl } = await response.json();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
            }

            return publicUrl;
        }
    } catch (error) {
        console.error('Error in uploadToR2:', error);
        throw error;
    }
};

/**
 * Saves a gallery session record to the Supabase 'galleries' table.
 * 
 * @param {Object} data - The gallery record data.
 * @returns {Promise<Object>} - The created record data.
 */
export const saveGalleryToSupabase = async (galleryData) => {
    try {
        const { data, error } = await supabase
            .from('galleries')
            .insert([
                {
                    session_id: galleryData.sessionId,
                    strip_url: galleryData.stripUrl,
                    raw_photos: galleryData.rawPhotos || [],
                    gif_url: galleryData.gifUrl || null,
                    video_url: galleryData.videoUrl || null,
                    config: galleryData.config || {},
                    created_at: new Date().toISOString(),
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving gallery to Supabase:', error);
        throw error;
    }
};

/**
 * Helper to generate a unique filename for a session.
 * 
 * @param {string} sessionId 
 * @param {string} type - 'strip', 'photo', 'gif', 'video'
 * @param {string} ext - extension like 'png', 'jpg', 'mp4'
 * @param {number} index - optional index for multiple photos
 * @returns {string}
 */
export const generateR2Path = (sessionId, type, ext, index = null) => {
    const timestamp = Date.now();
    const fileName = index !== null ? `${type}_${index}_${timestamp}.${ext}` : `${type}_${timestamp}.${ext}`;
    return `sessions/${sessionId}/${fileName}`;
};
