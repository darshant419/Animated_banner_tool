import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { MainLayout } from '../components/Layout/MainLayout';
import type { AppMode } from '../components/ModeSelect/ModeSelect';
import { loadProject } from '../services/projectService';
import { useDesignStore } from '../store/designStore';
import { navigate } from '../router/hashRouter';

interface BuilderPageProps {
    /** Project id when opened as `#/builder/:id` (existing banner). */
    projectId?: string;
    /** Mode passed as `#/builder?mode=emr` for a brand new banner. */
    mode?: AppMode;
}

/**
 * Hosts the editor. Loads an existing banner into the store when the route has
 * an id, otherwise starts from a clean design so `#/builder` always opens a
 * fresh, unsaved banner.
 */
export const BuilderPage: React.FC<BuilderPageProps> = ({ projectId, mode: routeMode }) => {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(projectId ? 'loading' : 'ready');
    const [mode, setMode] = useState<AppMode>(routeMode ?? 'animated');

    const { loadProjectState, reset } = useDesignStore();

    useEffect(() => {
        if (projectId) return undefined;

        // Fresh builder: start from a clean design. The only local-state write
        // is the ready flag; mode is already seeded from the route above.
        reset();
        setStatus('ready');
        return undefined;
        // The ready flag documents the "fresh canvas initialized" state — not a
        // render cascade — so the set-state-in-effect warning is suppressed here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [projectId, routeMode, reset]);

    useEffect(() => {
        if (!projectId) return;

        let cancelled = false;
        const load = async () => {
            setStatus('loading');
            try {
                const project = await loadProject(projectId);
                if (cancelled) return;
                if (!project) {
                    setStatus('error');
                    return;
                }
                loadProjectState(project);
                setMode(project.mode);
                setStatus('ready');
            } catch (err) {
                console.error('Failed to open banner in the editor:', err);
                if (!cancelled) setStatus('error');
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [projectId, loadProjectState]);

    if (status === 'loading') {
        return (
            <div className="h-screen bg-[#1e1e26] flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-sm">Opening banner...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="h-screen bg-[#1e1e26] flex flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle size={26} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-gray-100">Could not open this banner</h2>
                <p className="text-sm text-gray-400">It may have been deleted, or the storage is unreachable.</p>
                <button
                    onClick={() => navigate('/banners')}
                    className="mt-2 px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                >
                    Back to banners
                </button>
            </div>
        );
    }

    return (
        <MainLayout
            mode={mode}
            onChangeMode={() => {
                reset();
                navigate('/new');
            }}
        />
    );
};
