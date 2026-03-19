import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAlert } from '../context/AlertContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useAlert();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!supabase) {
            showAlert("Backend not configured. Cannot login.", "error");
            return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
        if (error) {
            showAlert(`Login Failed: ${error.message}\n(Hint: Did you enable the Google Provider in your Supabase Dashboard?)`, "error");
        }
    };

    const signOut = async () => {
        if (!supabase) return;
        localStorage.removeItem('pixenze_theme');
        document.body.classList.remove('theme-valentine');
        await supabase.auth.signOut();
    };

    const signInAnonymously = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
            showAlert(`Guest Login Failed: ${error.message}\n(Make sure 'Anonymous Sign-ins' is enabled in Supabase Auth Providers)`, "error");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAnonymously, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
