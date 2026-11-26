import React from 'react';
import { Layout, Home, Images, LayoutTemplate, FolderOpen } from 'lucide-react';
import { navigate } from '../../router/hashRouter';
import { FirebaseStatusBanner } from './FirebaseStatusBanner';

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
    return (
        <div className="min-h-screen bg-[#1e1e26] text-gray-100 flex flex-col">
            <FirebaseStatusBanner />
            <header className="h-14 bg-[#0e0e14]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 sticky top-0 z-40">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 shrink-0"
                    title="Banner Studio home"
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Layout size={18} />
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="font-bold text-white leading-none">Banner Studio</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Animated HTML5 builder</div>
                    </div>
                </button>

                <nav className="flex items-center gap-1 min-w-0 overflow-x-auto p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ scrollbarWidth: 'none' }}>
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(activePath, item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                    active
                                        ? 'bg-red-600 text-white shadow-[0_2px_10px_rgba(220,38,38,0.35)]'
                                        : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                                }`}
                                title={item.label}
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="flex-1" />

            </header>

            <main className="flex-1 min-h-0">{children}</main>
        </div>
    );
};
