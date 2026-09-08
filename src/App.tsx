import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { MainLayout } from './components/Layout/MainLayout';
import type { BannerProject } from './services/projectsService';

type View =
    | { page: 'dashboard' }
    | { page: 'editor'; project: BannerProject };

function App() {
    const [view, setView] = useState<View>({ page: 'dashboard' });

    if (view.page === 'editor') {
        return (
            <MainLayout
                project={view.project}
                onBack={() => setView({ page: 'dashboard' })}
                onProjectUpdate={(updated) =>
                    setView({ page: 'editor', project: updated })
                }
            />
        );
    }

    return (
        <Dashboard
            onOpenProject={(project) => setView({ page: 'editor', project })}
        />
    );
}

export default App;
