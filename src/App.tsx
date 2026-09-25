import { useHashRoute } from './router/useHashRoute';
import { matchPath } from './router/hashRouter';
import { DashboardPage } from './pages/DashboardPage';
import { BannersPage } from './pages/BannersPage';
import { BannerDetailPage } from './pages/BannerDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ImagesPage } from './pages/ImagesPage';
import { NewBannerPage } from './pages/NewBannerPage';
import { BuilderPage } from './pages/BuilderPage';
import type { AppMode } from './components/ModeSelect/ModeSelect';

/**
 * App routes (hash based so the static build works on any host):
 *
 *   #/                 dashboard
 *   #/banners          created banners list
 *   #/banners/:id      dedicated page for one created banner (live preview)
 *   #/templates        saved + built-in banner templates
 *   #/images           image library
 *   #/new              pick a workflow for a new banner
 *   #/builder          editor (fresh banner)
 *   #/builder/:id      editor with an existing banner loaded
 */
function App() {
  const { path, query } = useHashRoute();

  const bannerMatch = matchPath(path, '/banners/:id');
  if (bannerMatch) {
    return <BannerDetailPage key={bannerMatch.id} id={bannerMatch.id} />;
  }

  const builderMatch = matchPath(path, '/builder/:id');
  if (builderMatch) {
    return <BuilderPage key={builderMatch.id} projectId={builderMatch.id} />;
  }

  const queryMode = query.mode === 'emr' || query.mode === 'animated' ? (query.mode as AppMode) : undefined;

  switch (path) {
    case '/banners':
      return <BannersPage />;
    case '/templates':
      return <TemplatesPage />;
    case '/images':
      return <ImagesPage />;
    case '/new':
      return <NewBannerPage />;
    case '/builder':
      return <BuilderPage mode={queryMode} />;
    default:
      return <DashboardPage />;
  }
}

export default App;
