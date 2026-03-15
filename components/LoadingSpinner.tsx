
import React from 'react';

interface LoadingSpinnerProps {
  progress: number;
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ progress, message }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-8 z-50 overflow-hidden">
      {/* Relaxing Background Overlay */}
      <div className="absolute inset-0 bg-[#f8fafc] -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative inline-flex items-center justify-center">
        <svg className="w-56 h-56 transform -rotate-90 drop-shadow-2xl">
          <circle
            className="text-slate-100"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="96"
            cy="96"
          />
          <circle
            className="text-orange-500 transition-all duration-700 ease-in-out"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="96"
            cy="96"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black text-slate-800 tracking-tighter italic">{progress}%</span>
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Calibrating</span>
        </div>
      </div>
      
      <div className="mt-12 space-y-3 text-center max-w-md">
        <p className="text-xl font-playfair font-black text-slate-900 italic tracking-tight">{message}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] animate-pulse">Generating your masterpiece. Please stay relaxed.</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
