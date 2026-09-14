

import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import ImageIcon from './icons/ImageIcon';
import { ChatMessage, GeneratedImage } from '../types';
import SendIcon from './icons/SendIcon';
import Loader from './Loader';
import ApplyIcon from './icons/ApplyIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import LightbulbIcon from './icons/LightbulbIcon';

interface ControlPanelProps {
  uploadedImageFile: File | null;
  setUploadedImageFile: (file: File | null) => void;
  imageInstructions: string;
  setImageInstructions: (instructions: string) => void;
  onDescribe: () => void;
  isDescribing: boolean;
  promptIdea: string;
  setPromptIdea: (idea: string) => void;
  onGenerateFromText: () => void;
  onInspireMe: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isChatLoading: boolean;
  onApplyPrompt: (prompt: string) => void;
  onClearChat: () => void;
  generatedImage: GeneratedImage | null;
  isImageEditingMode: boolean;
  setIsImageEditingMode: (value: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  uploadedImageFile,
  setUploadedImageFile,
  imageInstructions,
  setImageInstructions,
  onDescribe,
  isDescribing,
  promptIdea,
  setPromptIdea,
  onGenerateFromText,
  onInspireMe,
  chatMessages,
  onSendMessage,
  isChatLoading,
  onApplyPrompt,
  onClearChat,
  generatedImage,
  isImageEditingMode,
  setIsImageEditingMode,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleDownloadChatTxt = () => {
    if (chatMessages.length === 0) return;
    
    let textContent = '';
    let interactionIndex = 0;

    while (interactionIndex < chatMessages.length) {
        const userMsg = chatMessages[interactionIndex];
        if (userMsg.role !== 'user') {
            interactionIndex++;
            continue;
        }

        const modelMsg = (interactionIndex + 1 < chatMessages.length) ? chatMessages[interactionIndex + 1] : null;

        textContent += `Timestamp: ${userMsg.timestamp ? new Date(userMsg.timestamp).toLocaleString() : 'N/A'}\n`;
        if (userMsg.basePromptContext) {
            textContent += `idea: ${userMsg.basePromptContext}\n`;
        } else if (isImageEditingMode) {
             textContent += `idea: Editing generated image\n`;
        }
        textContent += `suggestion: ${userMsg.text}\n`;

        if (modelMsg && modelMsg.role === 'model') {
            textContent += `output: ${modelMsg.text}\n`;
            interactionIndex += 2; // Move to the next pair
        } else {
            textContent += `output: [No response from AI]\n`;
            interactionIndex += 1; // Move to the next message
        }
        textContent += '\n---\n\n';
    }

    const blob = new Blob([textContent.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chat-history.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadChatJson = () => {
      if (chatMessages.length === 0) return;

      const interactions: any[] = [];
      let interactionIndex = 0;

      while (interactionIndex < chatMessages.length) {
        const userMsg = chatMessages[interactionIndex];
        if (userMsg.role !== 'user') {
            interactionIndex++;
            continue;
        }

        const modelMsg = (interactionIndex + 1 < chatMessages.length) ? chatMessages[interactionIndex + 1] : null;

        const interaction = {
            timestamp: userMsg.timestamp ? new Date(userMsg.timestamp).toISOString() : 'N/A',
            idea: userMsg.basePromptContext || (isImageEditingMode ? "Editing generated image" : null),
            suggestion: userMsg.text,
            output: (modelMsg && modelMsg.role === 'model') ? modelMsg.text : '[No response from AI]'
        };
        interactions.push(interaction);
        
        interactionIndex += (modelMsg && modelMsg.role === 'model') ? 2 : 1;
      }
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify({ chatHistory: interactions }, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "chat-history.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="bg-[#282a36] p-4 sm:p-6 rounded-xl shadow-lg flex flex-col gap-6 h-full border border-[#44475a]">
      {/* Initial Prompt Section */}
      <div className="flex flex-col flex-shrink-0">
        <h2 className="text-xl font-semibold text-[#F8F8F2] mb-4">1. Create Initial Prompt</h2>
        
        <label className="text-sm font-medium text-[#F8F8F2] mb-2">From an image</label>
        <div className="flex-grow">
            <ImageUploader
              onFileSelect={(file) => { 
                setUploadedImageFile(file); 
                if (file) setPromptIdea(''); 
                if (!file) setImageInstructions('');
              }}
              file={uploadedImageFile}
              disabled={isDescribing || isChatLoading}
            />
        </div>
        
        {uploadedImageFile && (
          <div className="mt-3 relative w-full animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                  rows={2}
                  value={imageInstructions}
                  onChange={(e) => setImageInstructions(e.target.value)}
                  placeholder="Add specific instructions or edits (e.g., 'make it cyberpunk', 'add a red hat')"
                  className="w-full p-3 bg-[#44475a] border border-[#6272a4] rounded-md focus:ring-2 focus:ring-[#bd93f9] focus:border-[#bd93f9] transition-colors text-[#F8F8F2] resize-y text-sm"
                  disabled={isDescribing || isChatLoading}
              />
          </div>
        )}

        <button
          onClick={onDescribe}
          disabled={isDescribing || isChatLoading || !uploadedImageFile}
          className="mt-4 w-full bg-[#bd93f9] text-[#282a36] font-bold py-3 px-4 rounded-lg hover:bg-[#ff79c6] transition-all duration-200 disabled:bg-[#44475a] disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDescribing ? 'Describing...' : 'Create Prompt'}
          <ImageIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center my-4">
            <hr className="flex-grow border-t-[#44475a]" />
            <span className="px-2 text-sm text-[#6272a4] font-semibold">OR</span>
            <hr className="flex-grow border-t-[#44475a]" />
        </div>

        <div className="flex flex-col">
            <label htmlFor="idea-input" className="text-sm font-medium text-[#F8F8F2] mb-2">From an idea</label>
            <div className="relative w-full">
                <textarea
                    id="idea-input"
                    rows={3}
                    value={promptIdea}
                    onChange={(e) => { setPromptIdea(e.target.value); if (e.target.value) setUploadedImageFile(null); }}
                    placeholder="A majestic cat astronaut discovering a new galaxy"
                    className="w-full p-3 bg-[#44475a] border border-[#6272a4] rounded-md focus:ring-2 focus:ring-[#bd93f9] focus:border-[#bd93f9] transition-colors text-[#F8F8F2] resize-y pr-10"
                    disabled={isDescribing || isChatLoading}
                    maxLength={4600}
                />
                {promptIdea && (
                    <button
                      onClick={() => setPromptIdea('')}
                      className="absolute top-3 right-3 text-[#bd93f9] hover:text-[#ff79c6] transition-colors disabled:opacity-50"
                      aria-label="Clear idea text"
                      disabled={isDescribing || isChatLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                )}
            </div>
            <div className={`text-right text-xs mt-1 ${promptIdea.length > 4600 ? 'text-[#ff5555]' : 'text-[#6272a4]'}`}>
                {promptIdea.length} / 4600
            </div>
            <button
              onClick={onGenerateFromText}
              disabled={isDescribing || isChatLoading || !promptIdea.trim() || promptIdea.length > 4600}
              className="mt-2 w-full bg-[#bd93f9] text-[#282a36] font-bold py-3 px-4 rounded-lg hover:bg-[#ff79c6] transition-all duration-200 disabled:bg-[#44475a] disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDescribing ? 'Generating...' : 'Generate from Idea'}
              <SparklesIcon className="w-5 h-5" /> 
            </button>
            <div className="flex items-center my-4">
              <hr className="flex-grow border-t-[#44475a]" />
              <span className="px-2 text-sm text-[#6272a4] font-semibold">OR</span>
              <hr className="flex-grow border-t-[#44475a]" />
            </div>
            <button
              onClick={onInspireMe}
              disabled={isDescribing || isChatLoading}
              className="w-full bg-[#50fa7b] text-[#282a36] font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition-all duration-200 disabled:bg-[#44475a] disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Inspire Me
              <LightbulbIcon className="w-5 h-5" /> 
            </button>
        </div>

      </div>

      <hr className="border-t-[#44475a]"/>
      
      <div className="flex flex-col flex-1 min-h-0">
         <div className="flex justify-between items-center mb-4 flex-shrink-0 flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-[#F8F8F2]">2. Refine with AI</h2>
             {generatedImage && (
                <div className="flex items-center gap-2" title="Toggle Image Edit Mode">
                    <span className={`text-sm font-medium ${isImageEditingMode ? 'text-[#50fa7b]' : 'text-[#6272a4]'}`}>
                    Edit Mode
                    </span>
                    <button
                    role="switch"
                    aria-checked={isImageEditingMode}
                    onClick={() => setIsImageEditingMode(!isImageEditingMode)}
                    className={`${isImageEditingMode ? 'bg-[#50fa7b]' : 'bg-[#44475a]'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#282a36] focus:ring-[#ff79c6]`}
                    >
                    <span className={`${isImageEditingMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
            )}
            {chatMessages.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={handleDownloadChatJson} className="text-xs font-medium bg-[#44475a] text-[#F8F8F2] hover:bg-[#6272a4] px-3 py-1.5 rounded-md transition-colors">JSON</button>
                    <button onClick={handleDownloadChatTxt} className="text-xs font-medium bg-[#44475a] text-[#F8F8F2] hover:bg-[#6272a4] px-3 py-1.5 rounded-md transition-colors">TXT</button>
                    <button onClick={onClearChat} className="p-2 bg-[#44475a] text-[#F8F8F2] hover:bg-[#ff5555] rounded-md transition-colors" aria-label="Purge chat history">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        <div className="bg-[#1E1E1E]/60 rounded-lg p-4 flex flex-col flex-1 min-h-0">
            <div ref={chatContainerRef} className="flex-1 overflow-y-scroll space-y-4 pr-2">
                {chatMessages.length === 0 && <div className="text-[#6272a4] text-center text-sm pt-4">Use the chat to make changes to your prompt{generatedImage && ' or edit your image'}!</div>}
                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-xs xl:max-w-md rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-[#bd93f9] text-[#282a36]' : 'bg-[#44475a] text-[#F8F8F2]'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                         {msg.role === 'model' && msg.text.trim() && (
                            <button
                                onClick={() => onApplyPrompt(msg.text)}
                                disabled={isChatLoading}
                                className="mt-2 text-xs font-semibold text-[#50fa7b] bg-[#44475a]/70 px-3 py-1.5 rounded-lg hover:bg-[#50fa7b] hover:text-[#282a36] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                aria-label="Apply this prompt to the editor"
                            >
                                <ApplyIcon className="w-4 h-4"/>
                                Apply to Editor
                            </button>
                        )}
                    </div>
                ))}
                {isChatLoading && chatMessages[chatMessages.length - 1]?.role === 'model' && !chatMessages[chatMessages.length-1]?.text && (
                  <div className="flex justify-start">
                    <div className="bg-[#44475a] rounded-lg p-2">
                      <Loader/>
                    </div>
                  </div>
                )}
            </div>
            <div className="flex gap-2 flex-shrink-0 pt-4">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && handleSendMessage()}
                    placeholder={isImageEditingMode ? "e.g., add a red hat to the subject" : "e.g., make it a watercolor painting"}
                    className="w-full p-3 bg-[#44475a] border border-[#6272a4] rounded-md focus:ring-2 focus:ring-[#bd93f9] focus:border-[#bd93f9] transition-colors text-[#F8F8F2]"
                    disabled={isChatLoading || isDescribing}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isChatLoading || isDescribing || !chatInput}
                    className="bg-[#bd93f9] text-[#282a36] font-bold p-3 rounded-lg hover:bg-[#ff79c6] transition-all duration-200 disabled:bg-[#44475a] disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Send message"
                >
                  <SendIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
