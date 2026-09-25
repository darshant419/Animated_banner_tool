import React from 'react';
import { Layout, Home, Images, LayoutTemplate, FolderOpen, Plus, Cloud, HardDrive } from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebase';
import { navigate } from '../../router/hashRouter';

interface DashboardShellProps {
    /** Current route path, used to highlight the active nav item. */
    activePath: string;
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/', icon: Home },
    { label: 'Banners', path: '/banners', icon: FolderOpen },
    { label: 'Templates', path: '/templates', icon: LayoutTemplate },
    { label: 'Images', path: '/images', icon: Images },
];

const isActive = (activePath: string, itemPath: string): boolean => {
    if (itemPath === '/') return activePath === '/';
    return activePath === itemPath || activePath.startsWith(`${itemPath}/`);
};

/**
 * Chrome shared by every non-editor page (dashboard, banners, templates,
 * images) — the banner-tool counterpart of the email builder's dashboard
 * layout: brand, primary navigation and a "create" call to action.
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({ activePath, children }) => {
    const isCloud = isFirebaseConfigured();

    return (
        <div className="min-h-screen bg-[#1e1e26] text-gray-100 flex flex-col">
            <header className="h-14 bg-black border-b border-white/10 flex items-center px-4 gap-4 shrink-0 sticky top-0 z-40">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 shrink-0"
                    title="Banner Studio home"
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Layout size={18} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white leading-none">Banner Studio</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Animated HTML5 builder</div>
                    </div>
                </button>

                <nav className="flex items-center gap-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(activePath, item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition border ${
                                    active
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'text-gray-300 border-transparent hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Icon size={13} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                <span
                    className={`hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isCloud
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                    title={isCloud ? 'Connected to Firebase Firestore & Storage' : 'Running in local mode — add Firebase keys in .env'}
                >
                    {isCloud ? <Cloud size={10} /> : <HardDrive size={10} />}
                    {isCloud ? 'Firebase' : 'Local'}
                </span>

                <button
                    onClick={() => navigate('/new')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                >
                    <Plus size={13} />
                    New banner
                </button>
            </header>

            <main className="flex-1 min-h-0">{children}</main>
        </div>
    );
};
