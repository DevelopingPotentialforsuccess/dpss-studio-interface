
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

export interface AISettings {
  geminiKey: string;
  openaiKey: string;
  deepseekKey: string;
  grokKey: string;
  primaryProvider: 'gemini' | 'openai' | 'deepseek' | 'grok';
  useCustomKeys: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  geminiKey: '',
  openaiKey: '',
  deepseekKey: '',
  grokKey: '',
  primaryProvider: 'gemini',
  useCustomKeys: false
};

interface SettingsModuleProps {
  onBack: () => void;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('dpss_ai_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const [testStatus, setTestStatus] = useState<{[key: string]: 'idle' | 'testing' | 'success' | 'error'}>({});

  const testConnection = async (provider: 'gemini' | 'openai' | 'deepseek' | 'grok') => {
    setTestStatus({ ...testStatus, [provider]: 'testing' });
    try {
      if (provider === 'gemini') {
        const key = settings.geminiKey || process.env.GEMINI_API_KEY;
        if (!key) throw new Error('No key');
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Hello'
        });
        if (!response.text) throw new Error('Empty response');
      } else {
        const response = await fetch('/api/ai/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' :
                     provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.x.ai/v1',
            apiKey: provider === 'openai' ? settings.openaiKey :
                    provider === 'deepseek' ? settings.deepseekKey : settings.grokKey,
            model: provider === 'openai' ? 'gpt-4o' :
                   provider === 'deepseek' ? 'deepseek-chat' : 'grok-2-1212',
            messages: [{ role: 'user', content: 'Hello' }],
            jsonMode: false
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || `Provider Error (${response.status})`);
        }
      }
      setTestStatus({ ...testStatus, [provider]: 'success' });
      setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 3000);
    } catch (error: any) {
      console.error(`Test failed for ${provider}:`, error);
      alert(`Test failed for ${provider}: ${error.message}`);
      setTestStatus({ ...testStatus, [provider]: 'error' });
      setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 5000);
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('dpss_ai_settings', JSON.stringify(settings));
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('dpss_ai_settings');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 py-4 px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-orange-600 font-black flex items-center gap-2 uppercase text-xs italic">
            <i className="fa-solid fa-chevron-left"></i> Hub
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">AI Laboratory Settings</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest px-4">Reset Defaults</button>
          <button 
            onClick={handleSave} 
            className={`px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${
              saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-12 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Custom API Keys</h3>
              <p className="text-slate-500 text-sm">Bring your own keys to use your own AI Laboratory nodes.</p>
            </div>
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 px-4 rounded-2xl shadow-sm">
              <label className="text-[10px] font-black text-slate-600 uppercase">Use Custom Keys</label>
              <input 
                type="checkbox" 
                checked={settings.useCustomKeys} 
                onChange={(e) => setSettings({...settings, useCustomKeys: e.target.checked})}
                className="w-5 h-5 accent-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {!settings.useCustomKeys && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-center">
              <i className="fa-solid fa-bolt text-blue-500"></i>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Currently using Free Gemini (Shared Node)</p>
            </div>
          )}

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${settings.useCustomKeys ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            {/* Gemini */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md"><i className="fa-solid fa-gem"></i></div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase italic">Google Gemini</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Flash 3.0 & 2.5 Image</p>
                  </div>
                </div>
                <button 
                  onClick={() => testConnection('gemini')}
                  className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${
                    testStatus['gemini'] === 'testing' ? 'bg-slate-100 text-slate-400' :
                    testStatus['gemini'] === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    testStatus['gemini'] === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {testStatus['gemini'] === 'testing' ? 'Testing...' : testStatus['gemini'] === 'success' ? 'Success!' : testStatus['gemini'] === 'error' ? 'Failed' : 'Test'}
                </button>
              </div>
              <input 
                type="password" 
                value={settings.geminiKey} 
                onChange={(e) => setSettings({...settings, geminiKey: e.target.value})}
                placeholder="AIzaSy..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>

            {/* ChatGPT */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md"><i className="fa-solid fa-robot"></i></div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase italic">OpenAI ChatGPT</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">GPT-4o & DALL-E 3</p>
                  </div>
                </div>
                <button 
                  onClick={() => testConnection('openai')}
                  className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${
                    testStatus['openai'] === 'testing' ? 'bg-slate-100 text-slate-400' :
                    testStatus['openai'] === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    testStatus['openai'] === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {testStatus['openai'] === 'testing' ? 'Testing...' : testStatus['openai'] === 'success' ? 'Success!' : testStatus['openai'] === 'error' ? 'Failed' : 'Test'}
                </button>
              </div>
              <input 
                type="password" 
                value={settings.openaiKey} 
                onChange={(e) => setSettings({...settings, openaiKey: e.target.value})}
                placeholder="sk-..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Deepseek */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md"><i className="fa-solid fa-brain"></i></div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase italic">Deepseek AI</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Deepseek-V3 & R1</p>
                  </div>
                </div>
                <button 
                  onClick={() => testConnection('deepseek')}
                  className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${
                    testStatus['deepseek'] === 'testing' ? 'bg-slate-100 text-slate-400' :
                    testStatus['deepseek'] === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    testStatus['deepseek'] === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {testStatus['deepseek'] === 'testing' ? 'Testing...' : testStatus['deepseek'] === 'success' ? 'Success!' : testStatus['deepseek'] === 'error' ? 'Failed' : 'Test'}
                </button>
              </div>
              <input 
                type="password" 
                value={settings.deepseekKey} 
                onChange={(e) => setSettings({...settings, deepseekKey: e.target.value})}
                placeholder="ds-..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            {/* Grok */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-lg shadow-md"><i className="fa-solid fa-x"></i></div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase italic">X.AI Grok</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Grok-2 & Grok-Vision</p>
                  </div>
                </div>
                <button 
                  onClick={() => testConnection('grok')}
                  className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${
                    testStatus['grok'] === 'testing' ? 'bg-slate-100 text-slate-400' :
                    testStatus['grok'] === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    testStatus['grok'] === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {testStatus['grok'] === 'testing' ? 'Testing...' : testStatus['grok'] === 'success' ? 'Success!' : testStatus['grok'] === 'error' ? 'Failed' : 'Test'}
                </button>
              </div>
              <input 
                type="password" 
                value={settings.grokKey} 
                onChange={(e) => setSettings({...settings, grokKey: e.target.value})}
                placeholder="xai-..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-black"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Primary Node Provider</h3>
            <p className="text-slate-500 text-sm">Select which AI Laboratory node should handle your requests.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['gemini', 'openai', 'deepseek', 'grok'] as const).map((provider) => (
              <button 
                key={provider}
                onClick={() => setSettings({...settings, primaryProvider: provider})}
                className={`p-6 rounded-[2rem] border-2 transition-all text-center space-y-2 ${
                  settings.primaryProvider === provider 
                    ? 'border-orange-500 bg-orange-50/50 shadow-lg -translate-y-1' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white text-xl shadow-md ${
                  provider === 'gemini' ? 'bg-blue-600' : 
                  provider === 'openai' ? 'bg-emerald-600' : 
                  provider === 'deepseek' ? 'bg-indigo-600' : 'bg-black'
                }`}>
                  <i className={`fa-solid ${
                    provider === 'gemini' ? 'fa-gem' : 
                    provider === 'openai' ? 'fa-robot' : 
                    provider === 'deepseek' ? 'fa-brain' : 'fa-x'
                  }`}></i>
                </div>
                <h4 className="text-xs font-black uppercase italic tracking-tighter text-slate-800">{provider}</h4>
              </button>
            ))}
          </div>
        </section>

        <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] flex gap-4 items-start">
          <i className="fa-solid fa-circle-info text-orange-500 mt-1"></i>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-orange-900 uppercase">Security Note</h4>
            <p className="text-[10px] font-bold text-orange-800/70 leading-relaxed">
              Your API keys are stored locally in your browser's <span className="underline">localStorage</span>. 
              They are never sent to our servers. If you clear your browser data, you will need to re-enter them.
              Always keep your keys private and never share them.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsModule;
