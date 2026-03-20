import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Using "let" and exporting it allows for live bindings. 
// When we re-assign "supabase" in setSupabaseToken, all importers will see the new instance.
let currentToken = null;

const options = {
    auth: {
        persistSession: false, // Help silence "Multiple GoTrueClient instances" warning
        autoRefreshToken: false, // Clerk handles refresh
        detectSessionInUrl: false, // Clerk handles auth flow
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
export const setSupabaseToken = async (token) => {
    if (!supabase) return;
    if (!token) {
        // Clearing session if no token
        await supabase.auth.signOut();
        currentToken = null;
        return;
    }

    if (token === currentToken) {
        return;
    }
    
    currentToken = token;
    
    // Set the session with the Clerk-provided token. 
    // This token is then automatically used in the Authorization header of all outgoing Supabase requests.
    const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // Clerk token doesn't use refresh token with Supabase
    });

    if (error) {
        console.error("Supabase setSession error:", error);
    }
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
