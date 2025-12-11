import React, { useEffect, useState } from 'react';
import { getInitData } from '@/lib/telegram';

interface TelegramAuthGuardProps {
    children: React.ReactNode;
}

export const TelegramAuthGuard: React.FC<TelegramAuthGuardProps> = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const checkAuth = () => {
            const tg = (window as any).Telegram?.WebApp;

            if (!tg) {
                setError("Telegram WebApp environment not detected.");
                setIsAuthorized(false);
                return;
            }

            const initData = getInitData();
            if (!initData) {
                setError("Authentication data missing. Please open from Telegram.");
                setIsAuthorized(false);
                return;
            }

            // Platform check (Anti-spoofing/emulation)
            const platform = tg.platform;
            // legitimate platforms
            const allowedPlatforms = ['android', 'ios', 'tdesktop', 'macos', 'weba', 'web'];

            // Strict check: if platform is unknown or not in list, we might block.
            // But 'web' and 'weba' are used for web versions.
            if (!allowedPlatforms.includes(platform)) {
                // If platform is unknown, check User Agent for "Telegram"
                if (platform === 'unknown') {
                    const ua = navigator.userAgent || "";
                    if (!ua.includes('Telegram') && !ua.includes('TWA')) {
                        setError("Suspicious environment detected (Unknown Platform).");
                        setIsAuthorized(false);
                        return;
                    }
                } else {
                    // Completely unknown platform string
                    setError(`Unsupported platform: ${platform}`);
                    setIsAuthorized(false);
                    return;
                }
            }

            setIsAuthorized(true);
        };

        checkAuth();
    }, []);

    if (isAuthorized === null) {
        return <div className="flex items-center justify-center h-screen bg-background text-foreground">Verifying Telegram Security...</div>;
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="p-4 bg-muted rounded-lg text-sm">
                    <p>This application is protected and can only be accessed via the official Telegram App.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
