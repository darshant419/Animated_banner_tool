import React from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { ModeSelect, type AppMode } from './components/ModeSelect/ModeSelect';

function App() {
  const [mode, setMode] = React.useState<AppMode | null>(null);

  if (!mode) {
    return <ModeSelect onSelect={setMode} />;
  }

  return (
    <MainLayout
      mode={mode}
      onChangeMode={() => setMode(null)}
    />
  );
}

export default App;
