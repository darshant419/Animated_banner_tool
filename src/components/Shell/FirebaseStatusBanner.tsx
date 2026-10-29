import React from 'react';
import { AlertTriangle, HardDrive, Cloud } from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebase';

/**
 * Prominent banner shown on every dashboard page when Firebase is not
 * configured. Warns the user that their work is only stored in browser
 * localStorage and will not sync to the cloud or persist across browsers/
 * devices until the VITE_FIREBASE_* environment variables are set.
 */
export const FirebaseStatusBanner: React.FC = () => {
    const isCloud = isFirebaseConfigured();

    if (isCloud) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 bg-amber-900/90 border-b border-amber-500/50 px-6 py-3 text-sm"
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-center gap-2.5 max-w-5xl mx-auto">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                    <p className="font-semibold text-amber-100">
                        Firebase is not connected — working in local mode
                    </p>
                    <p className="text-amber-200/90 text-[11px] leading-relaxed">
                        Your banners, templates and images are saved only in this
                        browser's local storage. They will <strong>not</strong> appear
                        on other devices or after clearing browser data.
                    </p>
                </div>
                <div className="text-[11px] text-amber-300/80 font-mono shrink-0">
                    Set VITE_FIREBASE_* in .env to enable cloud sync
                </div>
                <HardDrive size={14} className="text-amber-400 shrink-0 ml-2" />
            </div>
        </div>
    );
};
