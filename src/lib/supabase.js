import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Using "let" and exporting it allows for live bindings. 
// When we re-assign "supabase" in setSupabaseToken, all importers will see the new instance.
export let supabase = null;
let currentToken = null;

const initSupabase = (token = null) => {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    const options = {
        auth: {
            persistSession: false, // Help silence "Multiple GoTrueClient instances" warning
        },
        global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
    };

    return createClient(supabaseUrl, supabaseAnonKey, options);
};

// Initial instance
supabase = initSupabase();

/**
 * Helper to set the bearer token for Supabase requests.
 * Essential when bridging Clerk auth with Supabase RLS.
 * 
 * @param {string} token - Clerk session token
 */
export const setSupabaseToken = (token) => {
    // Check if token actually changed to prevent redundant client initializations
    if (token === currentToken && supabase !== null) {
        return;
    }
    
    currentToken = token;
    // Re-assign the exported 'supabase' variable.
    supabase = initSupabase(token);
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
