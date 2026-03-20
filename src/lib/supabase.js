import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Using "let" and exporting it allows for live bindings. 
// When we re-assign "supabase" in setSupabaseToken, all importers will see the new instance.
let currentToken = null;

const options = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
    global: {
        // Use a custom fetch to inject the Clerk token into every request header.
        // This avoids re-creating the client and the "Multiple GoTrueClient instances" warning.
        fetch: (url, options) => {
            const headers = new Headers(options?.headers || {});
            if (currentToken) {
                headers.set('Authorization', `Bearer ${currentToken}`);
            }
            return fetch(url, { ...options, headers });
        },
    },
};

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey, options) 
    : null;

/**
 * Helper to set the bearer token for Supabase requests.
 * Essential when bridging Clerk auth with Supabase RLS.
 * 
 * @param {string} token - Clerk session token
 */
export const setSupabaseToken = (token) => {
    if (!supabase) return;
    currentToken = token;
};

// Helper to check if backend is available
export const isBackendAvailable = () => !!supabase;

/**
 * Generates an optimized URL for Supabase Storage images.
 * appends ?width=X to the URL if it's a Supabase URL.
 * 
 * @param {string} url - The original image URL
 * @param {number} width - The desired width
 * @returns {string} - The optimized URL
 */
export const getOptimizedUrl = (url, width = 300) => {
    if (!url) return '';
    if (!url.includes('supabase.co')) return url; // basic check, adjust if using custom domain

    // Check if it already has query params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&resize=contain&quality=80`;
};
