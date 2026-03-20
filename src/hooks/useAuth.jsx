import { createContext, useContext, useEffect } from 'react';
import { useUser, useClerk, useSession, useSignIn } from '@clerk/clerk-react';
import { setSupabaseToken } from '../lib/supabase';
import { useAlert } from '../context/AlertContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { isLoaded, user } = useUser();
    const { session } = useSession();
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const clerk = useClerk();
    const { showAlert } = useAlert();

    useEffect(() => {
        const syncToken = async () => {
            if (session) {
                try {
                    const token = await session.getToken({ template: 'supabase' });
                    if (token) {
                        setSupabaseToken(token);
                    }
                } catch (err) {
                    console.error("Clerk token sync failed:", err);
                    showAlert("Authentication sync failed. Some features may not work.", "error");
                }
            } else {
                setSupabaseToken(null);
            }
        };
        syncToken();
    }, [session, showAlert]);

    const loading = !isLoaded || !signInLoaded;

    const signInWithGoogle = async () => {
        if (!signInLoaded || !signIn) return;
        try {
            // Directly redirect to Google for login using useSignIn
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: window.location.origin,
                redirectUrlComplete: window.location.origin,
            });
        } catch (error) {
            console.error("Login Error:", error);
            showAlert(`Login Failed: ${error.message}`, "error");
        }
    };

    const signOut = async () => {
        try {
            localStorage.removeItem('pixenze_theme');
            document.body.classList.remove('theme-valentine');
            await clerk.signOut();
            setSupabaseToken(null);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const signInAnonymously = async () => {
        // Clerk handles anonymous users differently (Guest sessions).
        // If the project doesn't have Clerk guest sessions enabled, 
        // this might need adjustment. For now, we point to Google login
        // as Clerk's main entry.
        showAlert("Guest login is being migrated. Please use Google Login for now.", "info");
    };

    return (
        <AuthContext.Provider value={{ 
            user: user ? { ...user, email: user.primaryEmailAddress?.emailAddress, is_anonymous: false } : null, 
            loading, 
            signInWithGoogle, 
            signInAnonymously, 
            signOut 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
