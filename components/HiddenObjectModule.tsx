
import React, { useState } from 'react';
import { generateIllustration, generateTracingWords, generateObjectHint, generateWordSearch } from '../services/geminiService';
import { PaperSize, WorksheetLayout, BookFont } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface HiddenItem {
  name: string;
  imageUrl?: string;
}

interface SheetBundle {
  id: string;
  theme: string;
  level: number;
  // Page 1: Hidden Objects
  sceneImageUrl: string;
  items: HiddenItem[];
  // Page 2: Word Search
  wordGrid: string[][];
  wordList: string[];
  frameStyle: 'none' | 'stars' | 'flowers' | 'bubbles' | 'leaves';
}

const HiddenObjectModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [theme, setTheme] = useState('Supergirl');
  const [wordSearchVocab, setWordSearchVocab] = useState('hero, cape, sky, fly, girl');
  const [level, setLevel] = useState(1);
  const [isColor, setIsColor] = useState(true);
  const [objectCount, setObjectCount] = useState(6);
  const [batchSize, setBatchSize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [quotaSavingMode, setQuotaSavingMode] = useState(false);
  
  // Advanced Layout
  const [sceneDensity, setSceneDensity] = useState<'sparse' | 'standard' | 'packed'>('standard');
  const [heroPosition, setHeroPosition] = useState<'center' | 'top' | 'left' | 'right'>('center');
  const [bgComplexity, setBgComplexity] = useState<'minimal' | 'standard' | 'rich'>('standard');
  const [heroCount, setHeroCount] = useState<1 | 2 | 3>(1);
  const [heroSize, setHeroSize] = useState<'full' | '80' | '70' | '50'>('80');
  const [frameStyle, setFrameStyle] = useState<'none' | 'stars' | 'flowers' | 'bubbles' | 'leaves'>('stars');

  const [teacherName, setTeacherName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [worksheetDate, setWorksheetDate] = useState(new Date().toLocaleDateString());
  const [rewardStyle, setRewardStyle] = useState<'stars' | 'flowers' | 'leaf' | 'none'>('stars');
  
  const [generatedBundles, setGeneratedBundles] = useState<SheetBundle[]>([]);
  const [hints, setHints] = useState<Record<string, { text: string; loading: boolean }>>({});

  const handleRandomize = () => {
    const positions: ('center' | 'top' | 'left' | 'right')[] = ['center', 'top', 'left', 'right'];
    const densities: ('sparse' | 'standard' | 'packed')[] = ['sparse', 'standard', 'packed'];
    const bg: ('minimal' | 'standard' | 'rich')[] = ['minimal', 'standard', 'rich'];
    const frames: ('none' | 'stars' | 'flowers' | 'bubbles' | 'leaves')[] = ['none', 'stars', 'flowers', 'bubbles', 'leaves'];
    const sizes: ('full' | '80' | '70' | '50')[] = ['full', '80', '70', '50'];
    
    setHeroPosition(positions[Math.floor(Math.random() * positions.length)]);
    setSceneDensity(densities[Math.floor(Math.random() * densities.length)]);
    setBgComplexity(bg[Math.floor(Math.random() * bg.length)]);
    setHeroCount((Math.floor(Math.random() * 3) + 1) as any);
    setHeroSize(sizes[Math.floor(Math.random() * sizes.length)]);
    setFrameStyle(frames[Math.floor(Math.random() * frames.length)]);
  };

  const generateBundles = async () => {
    if (!theme) return alert("Please provide a theme for the Hidden Object quest!");
    setLoading(true);
    setLoadingMsg("Calibrating educational logic...");
    setHints({});
    
    try {
      const newBundles: SheetBundle[] = [];
      const manualWords = wordSearchVocab.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0);

      for (let i = 0; i < batchSize; i++) {
        setLoadingMsg(`Generating Set ${i + 1}/${batchSize}...`);

        const hiddenWords = await generateTracingWords(`Items found in a ${theme} scene for level ${level} kids.`, objectCount);

        const densityDescription = sceneDensity === 'sparse' 
          ? "clean and simple layout with plenty of white space between items" 
          : sceneDensity === 'packed' 
            ? "packed and dense Wimmelbilder style, filled with tiny details everywhere" 
            : "balanced composition";

        const bgDescription = bgComplexity === 'minimal' 
          ? "plain white background" 
          : bgComplexity === 'rich' 
            ? "fully immersive scenery with a highly detailed background filling the ENTIRE page from edge to edge" 
            : "simple background scenery";

        const sizeDesc = heroSize === 'full' ? 'occupying 100% of the canvas height and width' : `occupying roughly ${heroSize}% of the canvas area`;

        let compositionPart = "";
        if (heroCount === 1) {
          compositionPart = `featuring one main hero character placed ${heroPosition === 'center' ? 'in the center' : 'at the ' + heroPosition}, ${sizeDesc}.`;
        } else if (heroCount === 2) {
          compositionPart = `featuring TWO heroes: Spread them far apart! One hero on the far left side and one hero on the far right side, spanning the full width, ${sizeDesc}.`;
        } else {
          compositionPart = `TRIPLE HERO SPREAD: Place 3 main heroes in a horizontal row. Hero 1 MUST be at the FAR LEFT EDGE. Hero 2 MUST be in the dead center. Hero 3 MUST be at the FAR RIGHT EDGE. Spread them far apart to fill the horizontal width of the frame COMPLETELY with ZERO margins on the sides. Make them large and clear, ${sizeDesc}.`;
        }

        const basePrompt = `Educational hidden object game illustration for kids. 
          Subject: ${theme}. ${compositionPart} ${bgDescription}. Layout: ${densityDescription}. 
          Make it suitable for level ${level} students. 
          Hide these items: ${hiddenWords.join(', ')}. Fill the entire width of the composition from the far left to the far right. No wide empty side margins. Wide aspect ratio style.`;

        const scenePrompt = isColor 
          ? `${basePrompt} High quality color art, bright, friendly illustration.`
          : `${basePrompt} STRICT BLACK AND WHITE line art, bold outlines, coloring book style.`;
        
        const mainImageUrl = await generateIllustration(scenePrompt);

        const itemsWithImages: HiddenItem[] = [];
        for (const word of hiddenWords) {
          if (!quotaSavingMode) {
            setLoadingMsg(`Generating icon for "${word}"...`);
            try {
              const iconUrl = await generateIllustration(
                isColor 
                  ? `Isolated object, white background, simple sticker style icon: ${word}`
                  : `Isolated object, pure white background, minimal black line art: ${word}`
              );
              itemsWithImages.push({ name: word, imageUrl: iconUrl });
            } catch (e) {
              itemsWithImages.push({ name: word });
            }
          } else {
            itemsWithImages.push({ name: word });
          }
        }

        const grid = await generateWordSearch(manualWords, level);

        newBundles.push({
          id: Math.random().toString(36).substr(2, 9),
          theme: theme + (batchSize > 1 ? ` (Set ${i + 1})` : ''),
          level,
          sceneImageUrl: mainImageUrl,
          items: itemsWithImages,
          wordGrid: grid,
          wordList: manualWords,
          frameStyle
        });
      }

      setGeneratedBundles([...newBundles, ...generatedBundles]);
    } catch (e: any) {
      alert("Lab Render Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = () => {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'></head>
        <body style="font-family: 'Segoe UI', sans-serif; margin: 20px;">
          ${generatedBundles.map(bundle => `
            <div style="page-break-after: always; text-align: center;">
              <h1 style="color: #1e293b; text-transform: uppercase;">${bundle.theme}</h1>
              <p style="font-weight: bold;">Hidden Object Quest - Level ${bundle.level}</p>
              <div style="border: 4px solid #000; padding: 5px; background: #fff; display: inline-block; width: 100%;">
                <img src="${bundle.sceneImageUrl}" style="width: 100%; max-width: 650px; display: block;" />
              </div>
              <h3 style="margin-top: 30px; text-transform: uppercase;">Objects to Find:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  ${bundle.items.map((item, idx) => `
                    <td style="padding: 10px; border: 1px solid #eee; text-align: center; width: 12%;">
                      ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 60px; height: 60px; object-fit: contain;" />` : `<div style="width: 60px; height: 60px; border: 1px dashed #ccc;"></div>`}
                      <div style="font-size: 9px; font-weight: bold; margin-top: 5px;">${item.name}</div>
                    </td>
                    ${(idx + 1) % 8 === 0 ? '</tr><tr>' : ''}
                  `).join('')}
                </tr>
              </table>
            </div>
            <div style="page-break-after: always; text-align: center; padding-top: 40px;">
              <h1 style="color: #64748b;">WORD SOUP LAB</h1>
              <div style="background: #f1f5f9; padding: 30px; border-radius: 20px; display: inline-block; font-family: monospace; font-size: 20px; line-height: 1.6; border: 2px solid #cbd5e1;">
                ${bundle.wordGrid.map(row => `<div style="letter-spacing: 12px;">${row.join('')}</div>`).join('')}
              </div>
              <h3 style="margin-top: 30px;">Search List:</h3>
              <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px;">
                ${bundle.wordList.map(w => `<span style="border: 1px solid #94a3b8; padding: 5px 15px; border-radius: 10px; font-weight: bold; text-transform: uppercase;">${w}</span>`).join(' ')}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QuestLab_${theme.replace(/\s+/g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getHintForSheet = async (bundle: SheetBundle) => {
    if (hints[bundle.id]?.loading) return;
    setHints(prev => ({ ...prev, [bundle.id]: { text: '', loading: true } }));
    try {
      const hintText = await generateObjectHint(bundle.sceneImageUrl, bundle.items.map(i => i.name));
      setHints(prev => ({ ...prev, [bundle.id]: { text: hintText, loading: false } }));
    } catch (e: any) {
      setHints(prev => ({ ...prev, [bundle.id]: { text: 'Try looking near the corners!', loading: false } }));
    }
  };

  const FrameDecorator = ({ type }: { type: SheetBundle['frameStyle'] }) => {
    if (!type || type === 'none') return null;
    const icons = {
      stars: 'fa-star',
      flowers: 'fa-clover',
      bubbles: 'fa-circle',
      leaves: 'fa-leaf'
    };
    const icon = icons[type as keyof typeof icons] || 'fa-star';
    
    return (
      <div className="absolute inset-0 pointer-events-none p-4 overflow-hidden print:block z-0">
        <div className="w-full h-full border-[16px] border-slate-900/5 rounded-[2.5rem] relative">
          {[...Array(44)].map((_, i) => (
            <i key={i} className={`fa-solid ${icon} absolute text-slate-200/50 text-xl`} style={{
              top: i < 11 ? '-8px' : i < 22 ? 'auto' : `${(i - 22) * 9}%`,
              bottom: i >= 11 && i < 22 ? '-8px' : 'auto',
              left: i < 11 ? `${i * 9}%` : i >= 11 && i < 22 ? `${(i - 11) * 9}%` : i >= 22 && i < 33 ? '-8px' : 'auto',
              right: i >= 33 ? '-8px' : 'auto',
              transform: `rotate(${i * 15}deg)`
            }}></i>
          ))}
        </div>
      </div>
    );
  };

  const HeaderBlock = ({ title, showScore }: { title: string, showScore?: boolean }) => (
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4 relative z-10">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase text-slate-400">Student: <span className="text-slate-900 font-bold">{studentName || '________________'}</span></p>
        <p className="text-[10px] font-black uppercase text-slate-400">Teacher: <span className="text-slate-900 font-bold">{teacherName || '________________'}</span></p>
      </div>
      <div className="text-center">
        <h2 className="text-xs font-black uppercase italic tracking-tighter">{title}</h2>
        {rewardStyle !== 'none' && (
          <div className="flex gap-1 justify-center mt-1">
            {[1,2,3,4,5].map(s => (
              <i key={s} className={`text-[10px] text-slate-300 ${
                rewardStyle === 'stars' ? 'fa-regular fa-star' : 
                rewardStyle === 'flowers' ? 'fa-solid fa-seedling' : 'fa-solid fa-leaf'
              }`}></i>
            ))}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase text-slate-400">Date: <span className="text-slate-900 font-bold">{worksheetDate}</span></p>
        <div className="mt-1 border border-dashed border-slate-200 p-1 px-3 rounded-lg text-center bg-slate-50/30">
          <p className="text-[7px] font-black uppercase text-slate-300">{showScore ? 'Found' : 'Grade'}</p>
          <div className="h-4 w-12 flex items-center justify-center font-bold">/ {showScore ? objectCount : '10'}</div>
        </div>
      </div>
    </div>
  );

  const PageOneHiddenQuest = ({ bundle }: { bundle: SheetBundle }) => {
    const hint = hints[bundle.id];
    return (
      <div className="flex flex-col h-full relative z-10">
        <h1 className="text-center font-black uppercase text-4xl mb-4 tracking-tighter text-slate-900 italic">
          {bundle.theme.toUpperCase()}
        </h1>
        
        <div className="relative flex-1 min-h-[500px] rounded-[1.5rem] overflow-hidden border-4 border-slate-900 bg-white shadow-inner group">
          <img src={bundle.sceneImageUrl} crossOrigin="anonymous" className="w-full h-full object-cover" />
          <button 
            onClick={() => getHintForSheet(bundle)}
            className="absolute bottom-4 right-4 no-print bg-orange-500 text-white p-4 rounded-2xl shadow-2xl transition-all hover:bg-orange-600 active:scale-95 flex items-center gap-2 group-hover:opacity-100 opacity-0"
          >
            <i className={`fa-solid ${hint?.loading ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Get AI Hint</span>
          </button>
          {hint?.text && !hint.loading && (
            <div className="absolute top-4 left-4 right-4 no-print bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-orange-100 italic font-bold text-xs text-slate-700">
              {hint.text}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-center font-black uppercase text-[12px] tracking-[0.3em] italic mb-4 border-b border-slate-100 pb-2">
            Find {bundle.items.length} Objects In The Picture
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 px-2">
            {bundle.items.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 border-2 border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center p-1 group hover:border-orange-200 transition-colors">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} crossOrigin="anonymous" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-slate-400 rounded-full"></div>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase text-slate-600 text-center truncate w-full tracking-tighter">
                  {item.name} <i className="fa-solid fa-check ml-1 text-slate-200"></i>
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center text-[7px] font-black uppercase text-slate-300">
           <span>Parents' Signature: _________________________________</span>
           <span>Level: {bundle.level} • Quest ID: {bundle.id}</span>
        </div>
      </div>
    );
  };

  const PageTwoWordSoup = ({ bundle }: { bundle: SheetBundle }) => (
    <div className="flex flex-col h-full relative z-10">
      <h1 className="text-center font-black uppercase text-4xl mb-8 tracking-tighter text-slate-400 italic">
        WORD SOUP LAB
      </h1>
      
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] p-10 border-4 border-white shadow-inner">
        <div 
          className="grid gap-2 font-mono font-bold text-slate-800"
          style={{ 
            gridTemplateColumns: `repeat(${bundle.wordGrid.length}, minmax(0, 1fr))`,
            fontSize: bundle.level > 7 ? '16px' : '22px'
          }}
        >
          {bundle.wordGrid.flat().map((char, i) => (
            <div key={i} className="w-11 h-11 flex items-center justify-center border border-slate-200 bg-white rounded shadow-sm">
              {char.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-center font-black uppercase text-[11px] tracking-widest text-slate-500 mb-6">Can you find all these words?</h3>
        <div className="flex flex-wrap gap-4 justify-center max-w-3xl mx-auto">
          {bundle.wordList.map((word, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
               <div className="w-4 h-4 rounded-full border border-slate-300"></div>
               <span className="text-[12px] font-black uppercase text-slate-700 tracking-wider">{word}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner progress={50} message={loadingMsg} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 py-4 px-12 flex items-center justify-between sticky top-0 z-40 no-print shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-orange-600 font-black flex items-center gap-2 uppercase text-xs italic">
            <i className="fa-solid fa-chevron-left"></i> Hub
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Educational Quest Lab</h2>
        </div>
        <div className="flex gap-3">
          {generatedBundles.length > 0 && (
            <>
              <button onClick={exportToWord} className="bg-orange-50 text-orange-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-white transition-all">
                <i className="fa-solid fa-file-word mr-2"></i> Export Word
              </button>
              <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-2.5 rounded-2xl font-black text-xs hover:bg-black transition-all shadow-xl flex items-center gap-2 uppercase tracking-widest">
                <i className="fa-solid fa-print"></i> Print PDF
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-[400px] bg-white border-b lg:border-r border-slate-200 p-8 overflow-y-auto no-print space-y-6 custom-scrollbar shrink-0">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lab Context</h3>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 shadow-inner" placeholder="Student Name" />
            <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 shadow-inner" placeholder="Teacher Name" />
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <label className="text-[10px] font-black text-slate-600 uppercase">Age Level (1-10)</label>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-black text-orange-600">{level === 1 ? 'Toddler' : level}</span>
                   <input type="range" min="1" max="10" value={level} onChange={(e) => setLevel(parseInt(e.target.value))} className="w-24 accent-orange-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <label className="text-[10px] font-black text-slate-600 uppercase">Rewards</label>
                <select value={rewardStyle} onChange={(e) => setRewardStyle(e.target.value as any)} className="bg-transparent text-[10px] font-black text-orange-600 uppercase outline-none text-right">
                  <option value="stars">Stars</option>
                  <option value="flowers">Flowers</option>
                  <option value="leaf">Leaves</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <label className="text-[10px] font-black text-slate-600 uppercase">Page Frame Style</label>
                <select value={frameStyle} onChange={(e) => setFrameStyle(e.target.value as any)} className="bg-transparent text-[10px] font-black text-orange-600 uppercase outline-none text-right">
                  <option value="stars">Stars</option>
                  <option value="flowers">Flowers</option>
                  <option value="bubbles">Bubbles</option>
                  <option value="leaves">Leaves</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scene Calibration</h3>
              <button onClick={handleRandomize} className="text-[9px] font-black text-orange-600 uppercase bg-white px-3 py-1 rounded-full border border-orange-100 shadow-sm hover:bg-orange-50 transition-colors">
                <i className="fa-solid fa-shuffle mr-1"></i> Randomize
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Hero Topics</label>
              <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. Supergirl and Superman" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Hero Count (L-M-R)</label>
              <select value={heroCount} onChange={(e) => setHeroCount(parseInt(e.target.value) as any)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
                <option value={1}>1 Main Hero</option>
                <option value={2}>2 Heroes (L/R)</option>
                <option value={3}>3 Heroes (L/M/R)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Hero Size</label>
              <select value={heroSize} onChange={(e) => setHeroSize(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm">
                <option value="full">Full Screen Paper</option>
                <option value="80">80% Size</option>
                <option value="70">70% Size</option>
                <option value="50">50% Size</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Composition Density</label>
              <select value={sceneDensity} onChange={(e) => setSceneDensity(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
                <option value="sparse">Sparse (Simple)</option>
                <option value="standard">Standard</option>
                <option value="packed">Packed (Dense)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-500 uppercase">Full Color</label>
              <input type="checkbox" checked={isColor} onChange={(e) => setIsColor(e.target.checked)} className="w-5 h-5 accent-orange-500" />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Word Search Words</h3>
            <textarea 
              value={wordSearchVocab} 
              onChange={(e) => setWordSearchVocab(e.target.value)} 
              placeholder="hero, cape, sky, fly, girl" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium h-24 outline-none focus:border-orange-500 shadow-inner" 
            />
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between"><span>Generate Batch</span><span className="text-orange-600 font-black">{batchSize} Sets</span></label>
                <input type="range" min="1" max="10" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))} className="w-full accent-orange-500" />
            </div>
          </section>

          <button onClick={generateBundles} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-orange-600 shadow-2xl transition-all uppercase italic active:scale-95">Generate All Pages</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-16 bg-slate-100/30 custom-scrollbar">
          <div className="mx-auto flex flex-col items-center gap-16">
            {generatedBundles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-slate-300 opacity-20">
                <i className="fa-solid fa-copy text-[120px] mb-8"></i>
                <h4 className="text-2xl font-black uppercase tracking-[0.5em] italic">Quest Designer Standby</h4>
              </div>
            ) : (
              generatedBundles.map((bundle) => (
                <React.Fragment key={bundle.id}>
                  {/* Page 1 (3, 5, ...): Hidden Quest */}
                  <div className="bg-white shadow-2xl flex flex-col print-page size-A4 relative rounded-[2rem] overflow-hidden p-12 mb-8 relative">
                    <FrameDecorator type={bundle.frameStyle} />
                    <HeaderBlock title="HIDDEN OBJECT QUEST" showScore />
                    <PageOneHiddenQuest bundle={bundle} />
                  </div>
                  {/* Page 2 (4, 6, ...): Word Soup */}
                  <div className="bg-white shadow-2xl flex flex-col print-page size-A4 relative rounded-[2rem] overflow-hidden p-12 mb-16 relative">
                    <FrameDecorator type={bundle.frameStyle} />
                    <HeaderBlock title="WORD SEARCH LAB" />
                    <PageTwoWordSoup bundle={bundle} />
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HiddenObjectModule;
