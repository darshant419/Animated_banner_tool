import React from 'react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import { ModeSelect, type AppMode } from '../components/ModeSelect/ModeSelect';
import { useDesignStore } from '../store/designStore';
import { navigate } from '../router/hashRouter';

/**
 * "New banner" step — choose the workflow (EMR static / animated) before the
 * editor opens, then jump into the builder page.
 */
export const NewBannerPage: React.FC = () => {
    const { reset } = useDesignStore();

    const handleSelect = (mode: AppMode) => {
        reset();
        navigate(`/builder?mode=${mode}`);
    };

    return (
        <DashboardShell activePath="/new">
            <ModeSelect onSelect={handleSelect} />
        </DashboardShell>
    );
};
