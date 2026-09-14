
import React from 'react';
import WandIcon from './icons/WandIcon';

interface HeaderProps {
  baseModel: string;
  setBaseModel: (model: string) => void;
  useGoogleSearch: boolean;
  setUseGoogleSearch: (use: boolean) => void;
  useDeepThink: boolean;
  setUseDeepThink: (use: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ baseModel, setBaseModel, useGoogleSearch, setUseGoogleSearch, useDeepThink, setUseDeepThink }) => {
  return (
    <header className="text-center relative">
      <div className="absolute top-0 right-0 hidden md:flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Base Engine:</span>
            <select
                value={baseModel}
                onChange={(e) => setBaseModel(e.target.value)}
                className="bg-[#bd93f9]/10 text-[#bd93f9] border border-[#bd93f9]/30 rounded-full py-1 px-3 text-[10px] font-black tracking-tight uppercase focus:outline-none focus:ring-1 focus:ring-[#bd93f9] appearance-none cursor-pointer pr-6"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23bd93f9\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.6rem' }}
            >
                <optgroup label="Gemini">
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                    <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
                </optgroup>
                <optgroup label="Gemma 4">
                    <option value="gemma-4-26b-a4b-it">Gemma 4 (Light/26b-a4b)</option>
                    <option value="gemma-4-31b-it">Gemma 4 (Heavy/31b)</option>
                </optgroup>
            </select>
        </div>
        <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Deep Think:</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${useDeepThink ? 'bg-[#ff79c6]' : 'bg-[#44475a]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-[#282a36] transition-transform ${useDeepThink ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <input type="checkbox" className="hidden" checked={useDeepThink} onChange={(e) => setUseDeepThink(e.target.checked)} />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Google Grounding:</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${useGoogleSearch ? 'bg-[#50fa7b]' : 'bg-[#44475a]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-[#282a36] transition-transform ${useGoogleSearch ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <input type="checkbox" className="hidden" checked={useGoogleSearch} onChange={(e) => setUseGoogleSearch(e.target.checked)} />
            </label>
        </div>
      </div>
      <div className="inline-flex items-center gap-3 bg-[#282a36]/90 px-8 py-4 rounded-full border border-[#44475a] shadow-xl">
        <WandIcon className="w-8 h-8 text-[#ff79c6] drop-shadow-[0_0_8px_rgba(255,121,198,0.5)]" />
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#F8F8F2]">
          AI PROMPT STUDIO
        </h1>
      </div>
      <p className="mt-4 max-w-2xl mx-auto text-lg text-[#6272a4] font-medium italic opacity-80">
        "Your AI sidekick for crafting wild and wonderful art prompts."
      </p>
    </header>
  );
};

export default Header;
