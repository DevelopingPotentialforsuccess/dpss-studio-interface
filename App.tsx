
import React, { useState } from 'react';
import { AppMode } from './types';
import ColoringModule from './components/ColoringModule';
import HiddenObjectModule from './components/HiddenObjectModule';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  
  const renderDashboard = () => (
    <div className="min-h-screen bg-[#f8fafc] p-12 lg:p-24 overflow-x-hidden relative">
      <div className="max-w-7xl mx-auto space-y-20">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-1 bg-orange-600 rounded-full"></div>
             <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">Premium AI Multi-Lab Hub</p>
          </div>
          <h1 className="text-7xl font-playfair font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">DPSS STUDIO</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button onClick={() => setMode(AppMode.COLORING_LAB)} className="bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all p-10 text-left space-y-6 group border border-slate-100">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg"><i className="fa-solid fa-palette"></i></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Coloring Lab</h3>
              <p className="text-slate-500 text-sm font-medium">Tracing sheets and custom B&W art.</p>
            </div>
          </button>

          <button onClick={() => setMode(AppMode.HIDDEN_OBJECTS)} className="bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all p-10 text-left space-y-6 group border border-slate-100">
            <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg"><i className="fa-solid fa-magnifying-glass"></i></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Hidden Objects</h3>
              <p className="text-slate-500 text-sm font-medium">Spot the item games in B&W or Color.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  switch (mode) {
    case AppMode.COLORING_LAB: return <ColoringModule onBack={() => setMode(AppMode.DASHBOARD)} />;
    case AppMode.HIDDEN_OBJECTS: return <HiddenObjectModule onBack={() => setMode(AppMode.DASHBOARD)} />;
    default: return renderDashboard();
  }
};

export default App;
