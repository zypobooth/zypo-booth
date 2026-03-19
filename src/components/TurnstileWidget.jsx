import React from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

/**
 * TurnstileWidget
 * 
 * A wrapper component for Cloudflare Turnstile.
 * 
 * Usage:
 * 1. Get your Site Key from Cloudflare Dashboard (Turnstile > Add Site).
 * 2. Add VITE_TURNSTILE_SITE_KEY=your_site_key to your .env file
 * 3. Import and place this component where you need verification.
 * 
 * @param {Function} onSuccess - Callback when verification succeeds. Receives the token.
 * @param {Function} onError - Callback when verification fails.
 */
const TurnstileWidget = ({ onSuccess, onError, theme = 'auto' }) => {
    const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Default testing key

    return (
        <div className="flex justify-center my-4">
            <div className="bg-white p-2 rounded-xl shadow-game border-2 border-black inline-block">
                <Turnstile
                    siteKey={SITE_KEY}
                    onSuccess={onSuccess}
                    onError={onError}
                    options={{
                        theme: theme,
                        size: 'flexible',
                    }}
                />
            </div>
        </div>
    );
};

export default TurnstileWidget;
