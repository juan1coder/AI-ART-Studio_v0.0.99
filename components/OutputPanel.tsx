import React, { useState, useMemo } from 'react';
import Loader from './Loader';
import WandIcon from './icons/WandIcon';
import SparklesIcon from './icons/SparklesIcon';
import CopyIcon from './icons/CopyIcon';
import ReadAloudIcon from './icons/ReadAloudIcon';
import TrashIcon from './icons/TrashIcon';
import StopIcon from './icons/StopIcon';
import PhotoIcon from './icons/PhotoIcon';
import DownloadIcon from './icons/DownloadIcon';
import CodeIcon from './icons/CodeIcon';
import EditIcon from './icons/EditIcon';
import { HistoryItem, GeneratedImage, AspectRatio, EnhancementLevel, ArtStyle, Persona, OutputFormat } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { PREDEFINED_STYLES, PREDEFINED_PERSONAS } from '../config/styles';
import { exportAllToZip } from '../utils/zipExporter';

interface OutputPanelProps {
  isLoading: boolean;
  error: string | null;
  outputText: string | null;
  onEnhance: (styles: string[], level: EnhancementLevel, persona?: Persona, styleNames?: string[]) => void;
  onSecondPass: (format: OutputFormat, instructions: string) => void;
  onSpeak: () => void;
  onStop: () => void;
  isSpeaking: boolean;
  isTtsReady: boolean;
  onClear: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
  generatedImage: GeneratedImage | null;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  onCancelGeneration: () => void;
  onClearHistory: () => void;
}

const aspectRatios: { label: string, value: AspectRatio }[] = [
    { label: '1:1', value: '1:1' },
    { label: '9:16', value: '9:16' },
    { label: '16:9', value: '16:9' },
    { label: '3:4', value: '3:4' },
    { label: '4:3', value: '4:3' },
];

const OutputPanel: React.FC<OutputPanelProps> = ({
  isLoading,
  error,
  outputText,
  onEnhance,
  onSecondPass,
  onSpeak,
  onStop,
  isSpeaking,
  isTtsReady,
  onClear,
  history,
  onSelectHistory,
  onGenerateImage,
  isGeneratingImage,
  generatedImage,
  aspectRatio,
  setAspectRatio,
  onCancelGeneration,
  onClearHistory,
}) => {
  const [copyStatus, setCopyStatus] = useState('Copy');
  const [copyStylesStatus, setCopyStylesStatus] = useState('Copy JSON');
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>(2);
  
  // Multi-style selection
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customStyleName, setCustomStyleName] = useState<string>('');
  const [customStyleValue, setCustomStyleValue] = useState<string>('');
  const [isAddingCustomStyle, setIsAddingCustomStyle] = useState(false);
  const [editingStyleName, setEditingStyleName] = useState<string | null>(null);
  
  // Persona selection
  const [selectedPersonaName, setSelectedPersonaName] = useState<string>(PREDEFINED_PERSONAS[0].name);
  const [customPersonas, setCustomPersonas] = useLocalStorage<Persona[]>('custom-personas', []);
  const [isAddingCustomPersona, setIsAddingCustomPersona] = useState(false);
  const [editingPersonaName, setEditingPersonaName] = useState<string | null>(null);
  const [customPersonaName, setCustomPersonaName] = useState('');
  const [customPersonaDesc, setCustomPersonaDesc] = useState('');
  const [customPersonaInst, setCustomPersonaInst] = useState('');

  const personas = useMemo(() => {
    const predefinedNames = new Set(PREDEFINED_PERSONAS.map(p => p.name.toLowerCase()));
    const uniqueCustomPersonas = customPersonas.filter(p => !predefinedNames.has(p.name.toLowerCase()));

    return [
        ...PREDEFINED_PERSONAS,
        ...uniqueCustomPersonas
    ];
  }, [customPersonas]);

  // Second pass state
  const [secondPassFormat, setSecondPassFormat] = useState<OutputFormat>('json');
  const [secondPassInstructions, setSecondPassInstructions] = useState<string>('');
  const [isSecondPassOpen, setIsSecondPassOpen] = useState(false);
  
  const [customStyles, setCustomStyles] = useLocalStorage<ArtStyle[]>('custom-art-styles', []);
  
  const styles = useMemo(() => {
    const predefinedNames = new Set(PREDEFINED_STYLES.map(s => s.name.toLowerCase()));
    const uniqueCustomStyles = customStyles.filter(s => !predefinedNames.has(s.name.toLowerCase()));

    return [
        ...PREDEFINED_STYLES,
        ...uniqueCustomStyles
    ];
  }, [customStyles]);

  const handleEnhanceClick = () => {
    const activeStyles = selectedStyles.map(styleName => {
        const styleObj = styles.find(s => s.name === styleName);
        return styleObj ? styleObj.value : '';
    }).filter(v => v !== '');

    const activePersona = personas.find(p => p.name === selectedPersonaName);
    onEnhance(activeStyles, enhancementLevel, activePersona, selectedStyles);
  };

  const toggleStyle = (styleName: string) => {
      setSelectedStyles(prev => 
          prev.includes(styleName) 
            ? prev.filter(s => s !== styleName)
            : [...prev, styleName]
      );
  };
  
  const handleSaveStyle = () => {
    const trimmedName = customStyleName.trim();
    const trimmedValue = customStyleValue.trim();
    
    if (trimmedName && trimmedValue) {
        if (editingStyleName) {
            setCustomStyles(prev => prev.map(s => 
                s.name === editingStyleName 
                ? { name: trimmedName, value: trimmedValue } 
                : s
            ));
            if (trimmedName !== editingStyleName) {
                setSelectedStyles(prev => prev.map(s => s === editingStyleName ? trimmedName : s));
            }
            setEditingStyleName(null);
        } else {
            if (!styles.find(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
                const newStyle = { name: trimmedName, value: trimmedValue };
                setCustomStyles(prev => [...prev, newStyle]);
                setSelectedStyles(prev => [...prev, trimmedName]); 
            } else {
                alert("A style with this name already exists.");
                return;
            }
        }
        setCustomStyleName('');
        setCustomStyleValue('');
        setIsAddingCustomStyle(false);
    }
  };

  const handleEditStyle = (name: string) => {
      const style = customStyles.find(s => s.name === name);
      if (style) {
          setCustomStyleName(style.name);
          setCustomStyleValue(style.value);
          setEditingStyleName(name);
          setIsAddingCustomStyle(true);
      }
  };

  const handleDeleteStyle = (name: string) => {
      if (window.confirm(`Delete style "${name}"?`)) {
          setCustomStyles(prev => prev.filter(s => s.name !== name));
          setSelectedStyles(prev => prev.filter(s => s !== name));
      }
  };

  const handleSavePersona = () => {
    const trimmedName = customPersonaName.trim();
    const trimmedDesc = customPersonaDesc.trim();
    const trimmedInst = customPersonaInst.trim();
    
    if (trimmedName && trimmedDesc && trimmedInst) {
        if (editingPersonaName) {
            setCustomPersonas(prev => prev.map(p => 
                p.name === editingPersonaName 
                ? { name: trimmedName, description: trimmedDesc, instruction: trimmedInst } 
                : p
            ));
            setSelectedPersonaName(trimmedName);
            setEditingPersonaName(null);
        } else {
            if (!personas.find(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
                const newPersona = { name: trimmedName, description: trimmedDesc, instruction: trimmedInst };
                setCustomPersonas(prev => [...prev, newPersona]);
                setSelectedPersonaName(trimmedName); 
            } else {
                alert("A persona with this name already exists.");
                return;
            }
        }
        setCustomPersonaName('');
        setCustomPersonaDesc('');
        setCustomPersonaInst('');
        setIsAddingCustomPersona(false);
    }
  };

  const handleEditPersona = (name: string) => {
      const persona = customPersonas.find(p => p.name === name);
      if (persona) {
          setCustomPersonaName(persona.name);
          setCustomPersonaDesc(persona.description);
          setCustomPersonaInst(persona.instruction);
          setEditingPersonaName(name);
          setIsAddingCustomPersona(true);
      }
  };

  const handleDeletePersona = (name: string) => {
      if (window.confirm(`Delete persona "${name}"?`)) {
          setCustomPersonas(prev => prev.filter(p => p.name !== name));
          if (selectedPersonaName === name) {
              setSelectedPersonaName(PREDEFINED_PERSONAS[0].name);
          }
      }
  };

    const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const handleDownloadCustomStyles = () => {
    if (customStyles.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(customStyles, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "custom_styles.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCustomPersonasForDev = () => {
     if (customPersonas.length === 0) return;
     const jsonString = JSON.stringify(customPersonas, null, 2);
     const formattedForCode = jsonString.trim().replace(/^\[/, '').replace(/\]$/, '').trim() + ',';

     navigator.clipboard.writeText(formattedForCode).then(() => {
         setCopyStylesStatus('Copied Code!');
         setTimeout(() => setCopyStylesStatus('Copy JSON'), 2000);
     });
  };

  const handleCopyCustomStylesForDev = () => {
     if (customStyles.length === 0) return;
     const jsonString = JSON.stringify(customStyles, null, 2);
     const formattedForCode = jsonString.trim().replace(/^\[/, '').replace(/\]$/, '').trim();

     navigator.clipboard.writeText(formattedForCode).then(() => {
         setCopyStylesStatus('Copied Code!');
         setTimeout(() => setCopyStylesStatus('Copy JSON'), 2000);
     });
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    }, () => {
      setCopyStatus('Failed!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    });
  };
  
  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTxt = () => {
    if (history.length === 0) return;
    const textContent = history.map(item => {
        let entry = `Timestamp: ${new Date(item.timestamp).toLocaleString()}\n`;
        if (item.wasInspired) entry += `source: AI Inspiration\n`;
        else if (item.originalIdea) entry += `userIdea: ${item.originalIdea}\n`;
        else if (item.imagePreviewUrl) entry += `source: From Image\n`;

        if (item.preEnhancementPrompt) entry += `basePrompt: ${item.preEnhancementPrompt}\n`;
        if (item.styleUsed) entry += `style: ${Array.isArray(item.styleUsed) ? item.styleUsed.join(', ') : item.styleUsed}\n`;
        if (item.personaUsed) entry += `persona: ${item.personaUsed}\n`;
        if (item.enhancementLevel) entry += `level: ${item.enhancementLevel}\n`;
        if (item.secondPassFormat) entry += `secondPassFormat: ${item.secondPassFormat}\n`;
        if (item.modelUsed) entry += `modelUsed: ${item.modelUsed}\n`;
        entry += `finalEmbellishedIdea: ${item.prompt}\n\n---\n\n`;
        return entry;
    }).join('');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompt-history.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
      if (history.length === 0) return;
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(history, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "prompt-history.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleDownloadZip = async () => {
    try {
      await exportAllToZip(history, customStyles, customPersonas);
    } catch (e) {
      console.error('Failed to export ZIP', e);
      alert('Failed to export to ZIP. Check console for details.');
    }
  };

  const Placeholder = () => (
    <div className="text-center text-[#6272a4] py-12">
      <div className="bg-[#44475a]/30 p-10 rounded-full inline-block mb-6 border border-[#44475a]/50 shadow-inner">
        <WandIcon className="h-20 w-20 text-[#bd93f9]/40" />
      </div>
      <h3 className="text-xl font-black text-[#f8f8f2] tracking-tight uppercase mb-1">Studio Ready</h3>
      <p className="text-xs text-[#6272a4] tracking-tight uppercase font-bold">Awaiting your creative signal</p>
    </div>
  );

  const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-[#ff5555]/10 border border-[#ff5555]/50 text-[#ff5555] px-6 py-5 rounded-2xl text-center shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <h3 className="font-black flex items-center justify-center gap-2 uppercase tracking-tight mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Processing Failure
      </h3>
      <p className="text-sm font-medium opacity-90">{message}</p>
    </div>
  );

  return (
    <div className="bg-[#282a36] p-4 sm:p-6 rounded-3xl shadow-2xl flex flex-col gap-4 h-full border border-[#44475a] relative overflow-hidden group/studio">
        {/* Ambient Glows */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#ff79c6]/5 rounded-full blur-[100px] pointer-events-none group-hover/studio:bg-[#ff79c6]/10 transition-colors duration-1000"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#bd93f9]/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col flex-1 min-h-0 relative z-10">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-black text-[#F8F8F2] flex items-center gap-3 uppercase tracking-tight">
                <span className="bg-[#ff79c6] w-2 h-8 rounded-full shadow-[0_0_12px_rgba(255,121,198,0.5)]"></span>
                3. PROMPT MASTER
              </h2>
              {outputText && <span className="text-[10px] font-black bg-[#50fa7b]/10 text-[#50fa7b] px-3 py-1 rounded-full border border-[#50fa7b]/20 tracking-tight uppercase">ENHANCED v3.1</span>}
            </div>
            
            <div className="w-full bg-[#1E1E1E]/90 rounded-2xl p-4 flex-1 min-h-0 flex flex-col border border-[#44475a]/50 shadow-inner group/output">
              <div className="w-full flex justify-center items-center flex-grow">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                      <Loader />
                      <p className="mt-6 text-[#bd93f9] font-black tracking-widest uppercase text-sm animate-pulse drop-shadow-[0_0_8px_rgba(189,147,249,0.5)]">
                          Crafting Prompt...
                      </p>
                      <button 
                          onClick={onCancelGeneration} 
                          className="mt-8 flex items-center gap-2 px-6 py-2 bg-[#ff5555]/10 text-[#ff5555] border border-[#ff5555]/30 rounded-full font-black tracking-widest uppercase text-xs hover:bg-[#ff5555]/20 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,85,85,0.2)]"
                      >
                          <StopIcon className="w-4 h-4" />
                          STOP GENERATION
                      </button>
                  </div>
                ) : error ? (
                  <ErrorDisplay message={error} />
                ) : outputText ? (
                  <div className="w-full h-full flex flex-col relative group/textarea">
                    <textarea
                        readOnly
                        value={outputText}
                        className="w-full flex-1 min-h-[300px] md:min-h-[400px] p-6 bg-[#181920] border border-[#44475a]/70 rounded-2xl text-[#F8F8F2] resize-none font-mono text-sm leading-relaxed shadow-sm focus:outline-none scrollbar-thin scrollbar-thumb-[#44475a] scrollbar-track-transparent"
                    />
                    <div className="flex items-center justify-end gap-3 mt-2">
                        <div className="flex items-center gap-2">
                            <button 
                              onClick={handleCopy}
                              className="p-1.5 bg-[#44475a] rounded-lg text-[#F8F8F2] hover:bg-[#50fa7b] hover:text-[#282a36] transition-all shadow-sm active:scale-95"
                              title="Copy prompt"
                            >
                              <CopyIcon className="w-3.5 h-3.5"/>
                            </button>
                            <button 
                              onClick={() => {
                                const blob = new Blob([outputText], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = "prompt.txt";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              }}
                              className="p-1.5 bg-[#44475a] rounded-lg text-[#F8F8F2] hover:bg-[#8be9fd] hover:text-[#282a36] transition-all shadow-sm active:scale-95"
                              title="Download prompt"
                            >
                              <DownloadIcon className="w-3.5 h-3.5"/>
                            </button>
                        </div>
                        <div className={`text-[10px] font-black tracking-tight uppercase ${outputText.length > 4600 ? 'text-[#ff5555]' : 'text-[#6272a4]'}`}>
                          SYMBOLS: {outputText.length} / 4600
                        </div>
                    </div>
                  </div>
                ) : (
                  <Placeholder />
                )}
              </div>
              
              {outputText && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-t border-[#44475a]/50 pt-5">
                      
                      {/* Personas and Complexity */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                              <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Persona (Soul):</label>
                                  <button 
                                    onClick={() => setIsAddingCustomPersona(!isAddingCustomPersona)}
                                    className="text-[10px] font-black text-[#bd93f9] hover:text-[#ff79c6] uppercase tracking-tight"
                                  >
                                    + Add Custom
                                  </button>
                              </div>
                                  <div className="flex items-center gap-2 w-full md:w-64">
                                      <select
                                          value={selectedPersonaName}
                                          onChange={(e) => setSelectedPersonaName(e.target.value)}
                                          disabled={isLoading || isGeneratingImage}
                                          className="w-full bg-[#1E1E1E] border border-[#44475a] rounded-2xl py-2 px-4 text-xs font-bold text-[#F8F8F2] focus:ring-1 focus:ring-[#bd93f9] transition-all outline-none appearance-none pr-10 cursor-pointer shadow-md"
                                          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236272a4\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.75rem' }}
                                      >
                                          {personas.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>)}
                                      </select>
                                      {customPersonas.some(p => p.name === selectedPersonaName) && (
                                          <div className="flex items-center gap-1 shrink-0">
                                              <button 
                                                onClick={() => handleEditPersona(selectedPersonaName)}
                                                className="p-1.5 bg-[#44475a] text-[#f8f8f2] hover:text-[#8be9fd] rounded-xl transition-all"
                                                title="Edit Persona"
                                              ><EditIcon className="w-4 h-4"/></button>
                                              <button 
                                                onClick={() => handleDeletePersona(selectedPersonaName)}
                                                className="p-1.5 bg-[#ff5555]/10 text-[#ff5555] hover:bg-[#ff5555]/20 rounded-xl transition-all"
                                                title="Delete Persona"
                                              ><TrashIcon className="w-4 h-4"/></button>
                                          </div>
                                      )}
                                  </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Complexity:</span>
                              <div className="flex bg-[#1E1E1E] p-1 rounded-2xl border border-[#44475a] shadow-md">
                                {[1, 2, 3].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setEnhancementLevel(level as EnhancementLevel)}
                                        disabled={isLoading || isGeneratingImage}
                                        className={`px-5 py-1.5 text-[10px] font-black rounded-xl transition-all active:scale-90 ${
                                            enhancementLevel === level
                                                ? 'bg-[#bd93f9] text-[#282a36] shadow-lg scale-105'
                                                : 'text-[#6272a4] hover:text-[#bd93f9]'
                                        }`}
                                    >
                                        LEVEL {level}
                                    </button>
                                ))}
                              </div>
                          </div>
                      </div>

                      {customPersonas.length > 0 && (
                         <div className="mb-5 flex items-center justify-center gap-4 py-2 bg-[#44475a]/10 rounded-2xl border border-[#44475a]/30 shadow-sm">
                            <span className="text-[9px] text-[#6272a4] font-black uppercase tracking-tight ml-2">Vaulted Personas:</span>
                            <div className="flex gap-2">
                              <button 
                                  onClick={() => {
                                    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(customPersonas, null, 2))}`;
                                    const link = document.createElement("a");
                                    link.href = jsonString;
                                    link.download = "custom_personas.json";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="flex items-center gap-2 bg-[#44475a]/50 hover:bg-[#6272a4] text-[#F8F8F2] text-[10px] font-black px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95"
                              >
                                  <DownloadIcon className="w-3.5 h-3.5" />
                                  EXPORT
                              </button>
                              <label className="flex items-center gap-2 bg-[#44475a]/50 hover:bg-[#6272a4] text-[#F8F8F2] text-[10px] font-black px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer">
                                  <CodeIcon className="w-3.5 h-3.5" />
                                  IMPORT
                                  <input 
                                    type="file" 
                                    accept=".json" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          try {
                                            const importedPersonas = JSON.parse(event.target?.result as string);
                                            if (Array.isArray(importedPersonas)) {
                                              setCustomPersonas(prev => [...prev, ...importedPersonas]);
                                            }
                                          } catch (err) {
                                            console.error("Failed to parse imported personas", err);
                                          }
                                        };
                                        reader.readAsText(file);
                                      }
                                    }}
                                  />
                              </label>
                            </div>
                        </div>
                      )}

                      {isAddingCustomPersona && (
                          <div className="mb-5 flex flex-col gap-4 p-5 bg-[#1E1E1E] rounded-3xl border border-[#44475a] shadow-2xl animate-in zoom-in-95 duration-300">
                              <input
                                  type="text"
                                  value={customPersonaName}
                                  onChange={(e) => setCustomPersonaName(e.target.value)}
                                  placeholder="New Persona Name"
                                  className="w-full px-5 py-3 bg-[#181920] border border-[#44475a] rounded-2xl text-xs font-bold focus:ring-1 focus:ring-[#bd93f9] outline-none text-[#F8F8F2] placeholder-[#6272a4]"
                              />
                              <textarea
                                  rows={2}
                                  value={customPersonaDesc}
                                  onChange={(e) => setCustomPersonaDesc(e.target.value)}
                                  placeholder="Short description of the persona..."
                                  className="w-full px-5 py-3 bg-[#181920] border border-[#44475a] rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#bd93f9] outline-none text-[#F8F8F2] resize-none placeholder-[#6272a4]"
                              />
                              <textarea
                                  rows={3}
                                  value={customPersonaInst}
                                  onChange={(e) => setCustomPersonaInst(e.target.value)}
                                  placeholder="Detailed system instructions for the AI..."
                                  className="w-full px-5 py-3 bg-[#181920] border border-[#44475a] rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#bd93f9] outline-none text-[#F8F8F2] resize-none placeholder-[#6272a4]"
                              />
                              <div className="flex gap-2">
                                <button
                                    onClick={() => { setIsAddingCustomPersona(false); setEditingPersonaName(null); setCustomPersonaName(''); setCustomPersonaDesc(''); setCustomPersonaInst(''); }}
                                    className="w-1/3 py-3 bg-[#44475a] text-[#F8F8F2] font-black rounded-2xl hover:brightness-110 text-[10px] uppercase shadow-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePersona}
                                    disabled={!customPersonaName.trim() || !customPersonaDesc.trim() || !customPersonaInst.trim() || isLoading || isGeneratingImage}
                                    className="w-2/3 py-3 bg-[#bd93f9] text-[#282a36] font-black rounded-2xl hover:brightness-110 transition-all disabled:bg-[#44475a] disabled:text-[#6272a4] text-[10px] uppercase tracking-tight shadow-lg"
                                >
                                    {editingPersonaName ? 'Update Persona' : 'Commit Persona to Vault'}
                                </button>
                              </div>
                          </div>
                      )}

                      {/* Styles Multi-Select */}
                      <div className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Active Styles (Select Multiple):</label>
                              <button 
                                onClick={() => setIsAddingCustomStyle(!isAddingCustomStyle)}
                                className="text-[10px] font-black text-[#bd93f9] hover:text-[#ff79c6] uppercase tracking-tight"
                              >
                                + Add Custom
                              </button>
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                              {styles.map(s => {
                                  if (s.name === 'Default (No Style)') return null;
                                  const isSelected = selectedStyles.includes(s.name);
                                  const isCustom = customStyles.some(custom => custom.name === s.name);
                                  return (
                                      <div 
                                          key={s.name}
                                          className={`flex items-stretch rounded-xl border transition-all ${
                                              isSelected 
                                                ? 'bg-[#50fa7b]/20 border-[#50fa7b] text-[#50fa7b] shadow-[0_0_8px_rgba(80,250,123,0.2)]' 
                                                : 'bg-[#1E1E1E] border-[#44475a] text-[#6272a4] hover:border-[#bd93f9]/50 hover:text-[#f8f8f2]'
                                          }`}
                                      >
                                          <button
                                              onClick={() => toggleStyle(s.name)}
                                              disabled={isLoading || isGeneratingImage}
                                              className={`px-3 py-1.5 text-[10px] font-black ${isCustom ? 'rounded-l-xl' : 'rounded-xl'}`}
                                          >
                                              {s.name.toUpperCase()}
                                          </button>
                                          {isCustom && (
                                            <div className="flex items-center border-l border-inherit">
                                                <button onClick={() => handleEditStyle(s.name)} className={`px-1.5 hover:text-[#8be9fd] ${isSelected ? 'text-[#50fa7b]' : 'text-[#6272a4]'}`} title="Edit Style"><EditIcon className="w-3 h-3"/></button>
                                                <button onClick={() => handleDeleteStyle(s.name)} className={`px-1.5 hover:text-[#ff5555] ${isSelected ? 'text-[#50fa7b]' : 'text-[#6272a4]'}`} title="Delete Style"><TrashIcon className="w-3 h-3"/></button>
                                            </div>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      {customStyles.length > 0 && (
                         <div className="mb-5 flex items-center justify-center gap-4 py-2 bg-[#44475a]/10 rounded-2xl border border-[#44475a]/30 shadow-sm">
                            <span className="text-[9px] text-[#6272a4] font-black uppercase tracking-tight ml-2">Vaulted Styles:</span>
                            <div className="flex gap-2">
                              <button 
                                  onClick={handleDownloadCustomStyles}
                                  className="flex items-center gap-2 bg-[#44475a]/50 hover:bg-[#6272a4] text-[#F8F8F2] text-[10px] font-black px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95"
                              >
                                  <DownloadIcon className="w-3.5 h-3.5" />
                                  EXPORT
                              </button>
                              <label className="flex items-center gap-2 bg-[#44475a]/50 hover:bg-[#6272a4] text-[#F8F8F2] text-[10px] font-black px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer">
                                  <CodeIcon className="w-3.5 h-3.5" />
                                  IMPORT
                                  <input 
                                    type="file" 
                                    accept=".json" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          try {
                                            const importedStyles = JSON.parse(event.target?.result as string);
                                            if (Array.isArray(importedStyles)) {
                                              setCustomStyles(prev => [...prev, ...importedStyles]);
                                            }
                                          } catch (err) {
                                            console.error("Failed to parse imported styles", err);
                                          }
                                        };
                                        reader.readAsText(file);
                                      }
                                    }}
                                  />
                              </label>
                              <button 
                                  onClick={handleCopyCustomStylesForDev}
                                  className="flex items-center gap-2 bg-[#44475a]/50 hover:bg-[#6272a4] text-[#F8F8F2] text-[10px] font-black px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95"
                              >
                                  <CodeIcon className="w-3.5 h-3.5" />
                                  {copyStylesStatus.toUpperCase()}
                              </button>
                            </div>
                        </div>
                      )}

                      {isAddingCustomStyle && (
                          <div className="mb-5 flex flex-col gap-4 p-5 bg-[#1E1E1E] rounded-3xl border border-[#44475a] shadow-2xl animate-in zoom-in-95 duration-300">
                              <input
                                  type="text"
                                  value={customStyleName}
                                  onChange={(e) => setCustomStyleName(e.target.value)}
                                  placeholder="New Style Title"
                                  className="w-full px-5 py-3 bg-[#181920] border border-[#44475a] rounded-2xl text-xs font-bold focus:ring-1 focus:ring-[#bd93f9] outline-none text-[#F8F8F2] placeholder-[#6272a4]"
                              />
                              <textarea
                                  rows={2}
                                  value={customStyleValue}
                                  onChange={(e) => setCustomStyleValue(e.target.value)}
                                  placeholder="Describe the aesthetic, medium, lighting, and technical focus..."
                                  className="w-full px-5 py-3 bg-[#181920] border border-[#44475a] rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#bd93f9] outline-none text-[#F8F8F2] resize-none placeholder-[#6272a4]"
                              />
                              <div className="flex gap-2">
                                <button
                                    onClick={() => { setIsAddingCustomStyle(false); setEditingStyleName(null); setCustomStyleName(''); setCustomStyleValue(''); }}
                                    className="w-1/3 py-3 bg-[#44475a] text-[#F8F8F2] font-black rounded-2xl hover:brightness-110 text-[10px] uppercase shadow-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveStyle}
                                    disabled={!customStyleName.trim() || !customStyleValue.trim() || isLoading || isGeneratingImage}
                                    className="w-2/3 py-3 bg-[#50fa7b] text-[#282a36] font-black rounded-2xl hover:brightness-110 transition-all disabled:bg-[#44475a] disabled:text-[#6272a4] text-[10px] uppercase tracking-tight shadow-lg"
                                >
                                    {editingStyleName ? 'Update Style' : 'Commit to browser vault'}
                                </button>
                              </div>
                          </div>
                      )}

                      {/* Second Pass Refinement */}
                      <div className="mb-5 border border-[#44475a] rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => setIsSecondPassOpen(!isSecondPassOpen)}
                            className="w-full bg-[#1E1E1E] p-3 flex justify-between items-center hover:bg-[#44475a]/30 transition-colors"
                          >
                              <span className="text-[10px] font-black text-[#f1fa8c] uppercase tracking-tight flex items-center gap-2">
                                  <WandIcon className="w-4 h-4" />
                                  Second Pass Refinement
                              </span>
                              <span className="text-[#6272a4] text-xs">{isSecondPassOpen ? '▲' : '▼'}</span>
                          </button>
                          
                          {isSecondPassOpen && (
                              <div className="p-4 bg-[#282a36] flex flex-col gap-4 border-t border-[#44475a]">
                                  <div className="flex items-center gap-4">
                                      <label className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Format:</label>
                                      <div className="flex bg-[#1E1E1E] p-1 rounded-xl border border-[#44475a]">
                                          {(['json', 'txt', 'toml', 'natural'] as OutputFormat[]).map(fmt => (
                                              <button
                                                  key={fmt}
                                                  onClick={() => setSecondPassFormat(fmt)}
                                                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                                                      secondPassFormat === fmt 
                                                        ? 'bg-[#f1fa8c] text-[#282a36]' 
                                                        : 'text-[#6272a4] hover:text-[#f1fa8c]'
                                                  }`}
                                              >
                                                  {fmt.toUpperCase()}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <textarea
                                      rows={3}
                                      value={secondPassInstructions}
                                      onChange={(e) => setSecondPassInstructions(e.target.value)}
                                      placeholder="Detailed instructions for the second pass (e.g., 'Make it more surreal, focus on the background details, ensure it has a melancholic vibe...')"
                                      className="w-full p-3 bg-[#181920] border border-[#44475a] rounded-xl text-xs text-[#F8F8F2] resize-none focus:outline-none focus:border-[#f1fa8c]"
                                  />
                                  <button
                                      onClick={() => onSecondPass(secondPassFormat, secondPassInstructions)}
                                      disabled={isLoading || isGeneratingImage || !secondPassInstructions.trim()}
                                      className="w-full py-2 bg-[#f1fa8c] text-[#282a36] font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50 text-[10px] uppercase tracking-tight"
                                  >
                                      Execute Second Pass
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 mb-5 px-2">
                    <span className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight mr-1">Aspect:</span>
                    <div className="flex bg-[#1E1E1E] p-1 rounded-2xl border border-[#44475a] overflow-x-auto scrollbar-hide">
                      {aspectRatios.map(ratio => (
                          <button
                              key={ratio.value}
                              onClick={() => setAspectRatio(ratio.value)}
                              disabled={isGeneratingImage}
                              className={`px-4 py-1.5 text-[10px] font-black rounded-xl transition-all whitespace-nowrap active:scale-90 ${
                                  aspectRatio === ratio.value 
                                      ? 'bg-[#ff79c6] text-[#282a36] shadow-md scale-105' 
                                      : 'text-[#6272a4] hover:text-[#ff79c6]'
                              }`}
                          >
                              {ratio.label}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-shrink-0">
                    <button 
                      onClick={onGenerateImage} 
                      disabled={isGeneratingImage} 
                      className="col-span-2 sm:col-span-1 p-4 bg-[#50fa7b] text-[#282a36] font-black hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:grayscale disabled:opacity-30 active:scale-95 shadow-[0_10px_20px_-5px_rgba(80,250,123,0.3)]"
                    >
                      <PhotoIcon className="w-6 h-6"/> 
                      <span className="text-[9px] uppercase tracking-tight">{isGeneratingImage ? 'CONSTRUCTING...' : 'GENERATE'}</span>
                    </button>
                    
                    <button 
                      onClick={handleEnhanceClick} 
                      disabled={isGeneratingImage || isLoading} 
                      className="p-4 bg-[#bd93f9] text-[#282a36] font-black hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:grayscale disabled:opacity-30 active:scale-95 shadow-[0_10px_20px_-5px_rgba(189,147,249,0.3)]"
                    >
                      <SparklesIcon className="w-6 h-6"/> 
                      <span className="text-[9px] uppercase tracking-tight">{isLoading ? 'REFINING...' : 'ENHANCE'}</span>
                    </button>
                    
                    <button 
                      onClick={handleCopy} 
                      className="p-4 bg-[#44475a] text-[#f8f8f2] font-black hover:bg-[#6272a4] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg border border-[#6272a4]/20"
                    >
                      <CopyIcon className="w-6 h-6"/> 
                      <span className="text-[9px] uppercase tracking-tight">{copyStatus.toUpperCase()}</span>
                    </button>

                    {isSpeaking ? (
                        <button onClick={onStop} className="p-4 bg-[#f1fa8c] text-[#282a36] font-black hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg">
                          <StopIcon className="w-6 h-6"/> 
                          <span className="text-[9px] uppercase tracking-tight">STOP VOICE</span>
                        </button>
                      ) : (
                        <button onClick={onSpeak} disabled={!outputText || !isTtsReady} className="p-4 bg-[#44475a] text-[#f8f8f2] font-black hover:bg-[#6272a4] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-30 active:scale-95 shadow-lg border border-[#6272a4]/20">
                          <ReadAloudIcon className="w-6 h-6"/> 
                          <span className="text-[9px] uppercase tracking-tight">VOCALIZE</span>
                        </button>
                    )}
                    
                    <button onClick={onClear} className="p-4 bg-[#ff5555] text-[#282a36] font-black hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_10px_20px_-5px_rgba(255,85,85,0.3)]">
                      <TrashIcon className="w-6 h-6"/> 
                      <span className="text-[9px] uppercase tracking-tight">PURGE</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {(generatedImage || isGeneratingImage) && (
              <div className="mt-8 animate-in zoom-in-95 slide-in-from-top-4 duration-700">
                 <h3 className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-[#50fa7b] rounded-full animate-pulse shadow-[0_0_8px_rgba(80,250,123,1)]"></div>
                   Visonary Synthesis
                 </h3>
                 <div className="w-full aspect-square bg-[#1E1E1E] rounded-3xl p-3 flex justify-center items-center border border-[#44475a]/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group overflow-hidden">
                    {isGeneratingImage ? <Loader/> :
                     generatedImage ? (
                      <>
                        <img src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`} alt="Studio Art" className="w-full h-full object-contain rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-[1.02]"/>
                        <div className="absolute inset-0 bg-[#1E1E1E]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-md">
                          <div className="p-4 rounded-full bg-[#50fa7b]/10 mb-4 border border-[#50fa7b]/20">
                            <PhotoIcon className="w-12 h-12 text-[#50fa7b]"/>
                          </div>
                          <button onClick={handleDownloadImage} className="bg-[#50fa7b] text-[#282a36] font-black py-4 px-8 rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl active:scale-95 uppercase tracking-tight text-xs">
                            <DownloadIcon className="w-5 h-5"/>
                            DOWNLOAD WORK
                          </button>
                        </div>
                      </>
                     ) : null
                    }
                 </div>
              </div>
            )}
        </div>
        
        <div className="mt-8 flex flex-col h-[240px] flex-shrink-0 relative z-10 border-t border-[#44475a]/40 pt-6">
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
                <h2 className="text-[10px] font-black text-[#6272a4] uppercase tracking-tight">Session Archives</h2>
                {history.length > 0 && (
                    <div className="flex items-center gap-2">
                        {showPurgeConfirm ? (
                          <button 
                            onClick={() => {
                              onClearHistory();
                              setShowPurgeConfirm(false);
                            }} 
                            onMouseLeave={() => setShowPurgeConfirm(false)}
                            className="text-[9px] font-black bg-[#ff5555]/30 text-[#ff5555] hover:bg-[#ff5555]/50 px-4 py-1.5 rounded-xl border border-[#ff5555]/50 transition-all active:scale-95 uppercase flex items-center gap-1.5"
                          >
                             <TrashIcon className="w-3 h-3"/> CONFIRM?
                          </button>
                        ) : (
                          <button 
                            onClick={() => setShowPurgeConfirm(true)} 
                            className="text-[9px] font-black bg-[#ff5555]/10 text-[#ff5555] hover:bg-[#ff5555]/20 px-4 py-1.5 rounded-xl border border-[#ff5555]/30 transition-all active:scale-95 uppercase flex items-center gap-1.5"
                          >
                             <TrashIcon className="w-3 h-3"/> Purge
                          </button>
                        )}
                        <button onClick={handleDownloadZip} className="text-[9px] font-black bg-[#ffb86c]/20 text-[#ffb86c] hover:bg-[#ffb86c]/40 px-4 py-1.5 rounded-xl border border-[#ffb86c]/50 transition-all active:scale-95 uppercase flex items-center gap-1.5">
                            <DownloadIcon className="w-3 h-3"/> ZIP ALL
                        </button>
                        <button onClick={handleDownloadJson} className="text-[9px] font-black bg-[#44475a]/30 text-[#f8f8f2] hover:bg-[#6272a4] px-4 py-1.5 rounded-xl border border-[#44475a]/50 transition-all active:scale-95 uppercase">JSON</button>
                        <button onClick={handleDownloadTxt} className="text-[9px] font-black bg-[#44475a]/30 text-[#f8f8f2] hover:bg-[#6272a4] px-4 py-1.5 rounded-xl border border-[#44475a]/50 transition-all active:scale-95 uppercase">TXT</button>
                    </div>
                )}
            </div>
            {history.length > 0 ? (
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-3 min-h-0 custom-scrollbar">
                    {history.map(item => (
                        <div key={item.id} onClick={() => onSelectHistory(item)} className="bg-[#1E1E1E]/40 p-3.5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-[#44475a]/20 transition-all border border-transparent hover:border-[#44475a]/50 group/item relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#bd93f9]/0 group-hover/item:bg-[#bd93f9]/50 transition-all"></div>
                            {item.imagePreviewUrl ? (
                                <div className="relative w-14 h-14 flex-shrink-0">
                                  <img src={item.imagePreviewUrl} alt="" className="w-full h-full rounded-xl object-cover group-hover/item:scale-110 transition-transform duration-500 shadow-md" />
                                  <div className="absolute inset-0 shadow-inner rounded-xl"></div>
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-[#282a36] flex items-center justify-center flex-shrink-0 border border-[#44475a] group-hover/item:border-[#bd93f9]/40 transition-colors shadow-md">
                                    <SparklesIcon className="h-6 w-6 text-[#6272a4]/60" />
                                </div>
                            )}
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                  {item.wasInspired ? (
                                      <span className="text-[8px] px-2 py-0.5 bg-[#50fa7b]/10 text-[#50fa7b] rounded-md border border-[#50fa7b]/20 font-black tracking-tight uppercase shadow-sm">INSPIRED</span>
                                  ) : item.originalIdea ? (
                                      <span className="text-[8px] px-2 py-0.5 bg-[#bd93f9]/10 text-[#bd93f9] rounded-md border border-[#bd93f9]/20 font-black tracking-tight uppercase shadow-sm">IDEA V1</span>
                                  ) : null}
                                  {(() => {
                                      let namesToRender: string[] = [];
                                      if (item.styleNamesUsed && item.styleNamesUsed.length > 0) {
                                          namesToRender = item.styleNamesUsed;
                                      } else if (item.styleUsed) {
                                          const usedContents = Array.isArray(item.styleUsed) ? item.styleUsed : [item.styleUsed];
                                          namesToRender = usedContents.map(content => {
                                              const found = styles.find(s => s.value === content);
                                              return found ? found.name : 'CUSTOM STYLE';
                                          });
                                      }
                                      return namesToRender.map((styleName, idx) => (
                                          <span key={`style-${idx}`} className="text-[8px] px-2 py-0.5 bg-[#50fa7b]/10 text-[#50fa7b] rounded-md border border-[#50fa7b]/20 font-black tracking-tight uppercase shadow-sm max-w-[200px] truncate inline-block align-bottom" title={styleName}>
                                              {styleName}
                                          </span>
                                      ));
                                  })()}
                                  {item.personaUsed && (
                                      <span className="text-[8px] px-2 py-0.5 bg-[#ff79c6]/10 text-[#ff79c6] rounded-md border border-[#ff79c6]/20 font-black tracking-tight uppercase shadow-sm">
                                        {item.personaUsed}
                                      </span>
                                  )}
                                  {item.secondPassFormat && (
                                      <span className="text-[8px] px-2 py-0.5 bg-[#8be9fd]/10 text-[#8be9fd] rounded-md border border-[#8be9fd]/20 font-black tracking-tight uppercase shadow-sm">
                                        {item.secondPassFormat}
                                      </span>
                                  )}
                                  <span className="text-[8px] text-[#6272a4] font-bold ml-auto">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-[11px] text-[#F8F8F2]/60 truncate font-mono tracking-tight group-hover/item:text-[#F8F8F2]/90 transition-colors">{item.prompt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#1E1E1E]/20 rounded-3xl border border-dashed border-[#44475a]/40 p-8">
                    <TrashIcon className="w-8 h-8 text-[#44475a] mb-3 opacity-30"/>
                    <p className="text-[9px] font-black text-[#6272a4] uppercase tracking-tight text-center">No logged studio transmissions.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default OutputPanel;
