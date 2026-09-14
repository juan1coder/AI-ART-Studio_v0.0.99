
import React, { useState, useCallback, useRef } from 'react';
import { HistoryItem, ChatMessage, GeneratedImage, AspectRatio, EnhancementLevel } from './types';
import { generatePromptFromImage, enhancePrompt, createChatSession, fileToGenerativePart, generatePromptFromText, generateImageFromPrompt, editImage, generateInspirationalPrompt, secondPassRefinement } from './services/geminiService';
import useLocalStorage from './hooks/useLocalStorage';
import useTextToSpeech from './hooks/useTextToSpeech';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import OutputPanel from './components/OutputPanel';
import { Chat } from '@google/genai';

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('API_KEY')) {
      return 'There seems to be an issue with the API configuration. Please contact the administrator.';
    }
    if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('failed to fetch') || error.message.includes('xhr error')) {
      return 'A network error occurred. Please check your connection and try again. The AI service may also be temporarily unavailable.';
    }
    if (error.message.includes('429')) { // Too many requests
        return 'The service is experiencing high traffic. Please wait a moment and try again.';
    }
    if (error.message.includes('Rpc failed')) {
      return 'The AI service failed to process the request. This might be a temporary issue. Please try again.';
    }
    return error.message;
  }
  return 'An unknown error occurred. Please check the console for details and try again.';
};


const createImageThumbnail = (file: File, maxSize: number = 128): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("FileReader did not return a result."));
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get canvas 2D context."));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imageInstructions, setImageInstructions] = useState<string>('');
  const [promptIdea, setPromptIdea] = useLocalStorage<string>('prompt-idea', '');
  const [currentImagePreviewUrl, setCurrentImagePreviewUrl] = useState<string | null>(null);
  const [outputText, setOutputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('prompt-history', []);
  const { speak, cancel, isSpeaking, isReady: isTtsReady } = useTextToSpeech();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isImageEditingMode, setIsImageEditingMode] = useState<boolean>(false);
  const [baseModel, setBaseModel] = useLocalStorage<string>('base-model', 'gemini-3.8-flash');
  const [useGoogleSearch, setUseGoogleSearch] = useLocalStorage<boolean>('use-google-search', true);
  const [useDeepThink, setUseDeepThink] = useLocalStorage<boolean>('use-deep-think', false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const currentRequestIdRef = useRef<number>(0);

  const handleCancelGeneration = useCallback(() => {
    currentRequestIdRef.current += 1;
    setIsLoading(false);
    setIsGeneratingImage(false);
    setIsChatLoading(false);
  }, []);

  const clearOutputs = () => {
    setOutputText('');
    setError(null);
    setGeneratedImage(null);
    setIsImageEditingMode(false);
  };
  
  const handleClearWorkspace = () => {
    clearOutputs();
    setUploadedImageFile(null);
    setImageInstructions('');
    setCurrentImagePreviewUrl(null);
    setPromptIdea('');
  }

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDescribeImage = useCallback(async () => {
    if (!uploadedImageFile) {
      setError('Please upload an image to describe.');
      return;
    }
    clearOutputs();
    setIsLoading(true);
    const requestId = ++currentRequestIdRef.current;

    try {
      const { prompt: generatedPrompt, modelUsed } = await generatePromptFromImage(uploadedImageFile, baseModel, imageInstructions, useDeepThink);
      if (requestId !== currentRequestIdRef.current) return;

      const imageUrl = await createImageThumbnail(uploadedImageFile);
      if (requestId !== currentRequestIdRef.current) return;

      setCurrentImagePreviewUrl(imageUrl);
      setOutputText(generatedPrompt);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        prompt: generatedPrompt,
        imagePreviewUrl: imageUrl,
        timestamp: Date.now(),
        modelUsed: modelUsed,
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20)); // Keep last 20
    } catch (e) {
      if (requestId !== currentRequestIdRef.current) return;
      console.error(e);
      setError(getFriendlyErrorMessage(e));
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [uploadedImageFile, baseModel, imageInstructions, useDeepThink, setHistory]);
  
  const handleGenerateFromText = useCallback(async () => {
    if (!promptIdea.trim()) {
      setError('Please enter an idea to generate a prompt.');
      return;
    }
    clearOutputs();
    setUploadedImageFile(null);
    setCurrentImagePreviewUrl(null);
    setIsLoading(true);
    const requestId = ++currentRequestIdRef.current;

    try {
      const { prompt: generatedPrompt, modelUsed } = await generatePromptFromText(promptIdea, baseModel, useGoogleSearch, useDeepThink);
      if (requestId !== currentRequestIdRef.current) return;

      setOutputText(generatedPrompt);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        prompt: generatedPrompt,
        originalIdea: promptIdea,
        imagePreviewUrl: '', // No image preview
        timestamp: Date.now(),
        modelUsed: modelUsed,
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    } catch (e) {
      if (requestId !== currentRequestIdRef.current) return;
      console.error(e);
      setError(getFriendlyErrorMessage(e));
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [promptIdea, baseModel, useGoogleSearch, useDeepThink, setHistory]);

  const handleEnhancePrompt = useCallback(async (styles: string[], level: EnhancementLevel, persona?: any, styleNames?: string[]) => {
    if (!outputText) {
      setError('There is no prompt to enhance.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setGeneratedImage(null); // The generated image is now out of sync
    setIsImageEditingMode(false); // Turn off image editing mode
    const requestId = ++currentRequestIdRef.current;

    try {
        const preEnhancementPrompt = outputText;
        const { prompt: enhanced, modelUsed } = await enhancePrompt(preEnhancementPrompt, styles, level, persona, baseModel, useGoogleSearch, useDeepThink);
        if (requestId !== currentRequestIdRef.current) return;

        setOutputText(enhanced);

        // Find the original idea if it exists in a previous history item for this prompt
        const parentHistoryItem = history.find(item => item.prompt === preEnhancementPrompt);

        // Log enhanced prompt to history
        const newHistoryItem: HistoryItem = {
            id: new Date().toISOString(),
            prompt: enhanced,
            preEnhancementPrompt: preEnhancementPrompt,
            originalIdea: parentHistoryItem?.originalIdea,
            styleUsed: styles,
            styleNamesUsed: styleNames,
            personaUsed: persona?.name,
            enhancementLevel: level,
            imagePreviewUrl: currentImagePreviewUrl || '',
            timestamp: Date.now(),
            modelUsed: modelUsed,
        };
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));

    } catch(e) {
        if (requestId !== currentRequestIdRef.current) return;
        console.error(e);
        setError(getFriendlyErrorMessage(e));
    } finally {
        if (requestId === currentRequestIdRef.current) {
            setIsLoading(false);
        }
    }
  }, [outputText, currentImagePreviewUrl, history, baseModel, useGoogleSearch, useDeepThink, setHistory]);

  const handleSecondPass = useCallback(async (format: any, instructions: string) => {
    if (!outputText) {
      setError('There is no prompt to refine.');
      return;
    }
    setError(null);
    setIsLoading(true);
    const requestId = ++currentRequestIdRef.current;

    try {
        const preRefinementPrompt = outputText;
        const { prompt: refined, modelUsed } = await secondPassRefinement(preRefinementPrompt, format, instructions, useGoogleSearch, useDeepThink);
        if (requestId !== currentRequestIdRef.current) return;

        setOutputText(refined);

        const newHistoryItem: HistoryItem = {
            id: new Date().toISOString(),
            prompt: refined,
            preEnhancementPrompt: preRefinementPrompt,
            secondPassFormat: format,
            imagePreviewUrl: currentImagePreviewUrl || '',
            timestamp: Date.now(),
            modelUsed: modelUsed,
        };
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    } catch(e) {
        if (requestId !== currentRequestIdRef.current) return;
        console.error(e);
        setError(getFriendlyErrorMessage(e));
    } finally {
        if (requestId === currentRequestIdRef.current) {
            setIsLoading(false);
        }
    }
  }, [outputText, currentImagePreviewUrl, useGoogleSearch, useDeepThink, setHistory]);
  
  const handleInspireMe = useCallback(async () => {
    clearOutputs();
    setUploadedImageFile(null);
    setCurrentImagePreviewUrl(null);
    setPromptIdea('');
    setIsLoading(true);
    const requestId = ++currentRequestIdRef.current;

    try {
        const { prompt: inspiredPrompt, modelUsed } = await generateInspirationalPrompt(baseModel);
        if (requestId !== currentRequestIdRef.current) return;

        setOutputText(inspiredPrompt);

        const newHistoryItem: HistoryItem = {
            id: new Date().toISOString(),
            prompt: inspiredPrompt,
            imagePreviewUrl: '',
            timestamp: Date.now(),
            wasInspired: true,
            modelUsed: modelUsed,
        };
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    } catch (e) {
        if (requestId !== currentRequestIdRef.current) return;
        console.error(e);
        setError(getFriendlyErrorMessage(e));
    } finally {
        if (requestId === currentRequestIdRef.current) {
            setIsLoading(false);
        }
    }
}, [baseModel, setHistory]);

  const handleGenerateImage = useCallback(async () => {
    if (!outputText) {
      setError('There is no prompt to generate an image from.');
      return;
    }
    setError(null);
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setIsImageEditingMode(false);
    const requestId = ++currentRequestIdRef.current;

    try {
      const imageBase64 = await generateImageFromPrompt(outputText, aspectRatio);
      if (requestId !== currentRequestIdRef.current) return;

      setGeneratedImage({ base64: imageBase64, mimeType: 'image/png' });
      setIsImageEditingMode(true);
    } catch (e) {
      if (requestId !== currentRequestIdRef.current) return;
      console.error(e);
      setError(getFriendlyErrorMessage(e));
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsGeneratingImage(false);
      }
    }
  }, [outputText, aspectRatio]);

  const handleSendMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = { 
        id: `user-${Date.now()}`, 
        role: 'user', 
        text: message, 
        timestamp: Date.now(),
        basePromptContext: isImageEditingMode ? undefined : outputText
    };
    const modelMessageId = `model-${Date.now()}`;
    const newModelMessage: ChatMessage = { id: modelMessageId, role: 'model', text: '', timestamp: Date.now() };
    
    setChatMessages(prev => [...prev, userMessage, newModelMessage]);
    setIsChatLoading(true);
    const requestId = ++currentRequestIdRef.current;

    if (isImageEditingMode && generatedImage) {
      // Image Editing Mode
      try {
        const { newImageBase64, textResponse } = await editImage(generatedImage.base64, generatedImage.mimeType, message);
        if (requestId !== currentRequestIdRef.current) return;

        if (newImageBase64) {
          setGeneratedImage({ base64: newImageBase64, mimeType: generatedImage.mimeType });
        }
        if (textResponse) {
            setOutputText(textResponse);
        }
        const responseText = textResponse || "Image updated. Here's the new prompt.";
        setChatMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: responseText } : m));
      } catch (e) {
        if (requestId !== currentRequestIdRef.current) return;
        console.error(e);
        const friendlyMessage = getFriendlyErrorMessage(e);
        setChatMessages(prev => prev.map(m => 
            m.id === modelMessageId ? { ...m, text: `Error: ${friendlyMessage}` } : m
        ));
      } finally {
        if (requestId === currentRequestIdRef.current) {
            setIsChatLoading(false);
        }
      }
    } else {
      // Prompt Refining Mode
      let currentChat = chat;
      if (!currentChat) {
        currentChat = createChatSession();
        setChat(currentChat);
      }
      try {
          const parts = [];
          if (uploadedImageFile) {
              parts.push(await fileToGenerativePart(uploadedImageFile));
          }
          parts.push({ text: `This is the main prompt to refine:\n"""\n${outputText || "There is no prompt yet. Generate a new one based on my request."}\n"""` });
          parts.push({ text: `My request is: "${message}"` });

          const stream = await currentChat.sendMessageStream({ message: parts });
          
          let modelResponse = '';
          for await (const chunk of stream) {
              if (requestId !== currentRequestIdRef.current) return;
              modelResponse += chunk.text;
              setChatMessages(prev => prev.map(m => 
                  m.id === modelMessageId ? { ...m, text: modelResponse } : m
              ));
          }

          if (modelResponse.trim() === '') {
               setChatMessages(prev => prev.map(m => 
                  m.id === modelMessageId ? { ...m, text: "I'm not sure how to change the prompt with that. Could you try rephrasing?" } : m
              ));
          }
      } catch (e) {
          if (requestId !== currentRequestIdRef.current) return;
          console.error(e);
          const friendlyMessage = getFriendlyErrorMessage(e);
          setChatMessages(prev => prev.map(m => 
              m.id === modelMessageId ? { ...m, text: `Error: ${friendlyMessage}` } : m
          ));
      } finally {
          if (requestId === currentRequestIdRef.current) {
              setIsChatLoading(false);
          }
      }
    }
  }, [chat, uploadedImageFile, outputText, generatedImage, isImageEditingMode]);
  
  const handleClearChat = useCallback(() => {
    setChatMessages([]);
    setChat(null); // Reset the session to start fresh
  }, []);

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    handleClearWorkspace();
    setOutputText(item.prompt);
    setCurrentImagePreviewUrl(item.imagePreviewUrl);
  }, []);

  const handleApplyPrompt = useCallback((prompt: string) => {
    setOutputText(prompt);
    const newHistoryItem: HistoryItem = {
      id: new Date().toISOString(),
      prompt: prompt,
      imagePreviewUrl: currentImagePreviewUrl || '',
      timestamp: Date.now(),
      modelUsed: 'Manual Edit',
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
  }, [currentImagePreviewUrl, setHistory]);

  return (
    <div className="min-h-screen bg-transparent font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
        <Header baseModel={baseModel} setBaseModel={setBaseModel} useGoogleSearch={useGoogleSearch} setUseGoogleSearch={setUseGoogleSearch} useDeepThink={useDeepThink} setUseDeepThink={setUseDeepThink} />
        <main className="mt-8 flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          <div className="w-full lg:w-2/5 flex flex-col min-h-0">
            <ControlPanel
                uploadedImageFile={uploadedImageFile}
                setUploadedImageFile={setUploadedImageFile}
                imageInstructions={imageInstructions}
                setImageInstructions={setImageInstructions}
                onDescribe={handleDescribeImage}
                isDescribing={isLoading}
                promptIdea={promptIdea}
                setPromptIdea={setPromptIdea}
                onGenerateFromText={handleGenerateFromText}
                onInspireMe={handleInspireMe}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                isChatLoading={isChatLoading}
                onApplyPrompt={handleApplyPrompt}
                onClearChat={handleClearChat}
                generatedImage={generatedImage}
                isImageEditingMode={isImageEditingMode}
                setIsImageEditingMode={setIsImageEditingMode}
            />
          </div>
          <div className="w-full lg:w-3/5 flex flex-col min-h-0">
             <OutputPanel
                isLoading={isLoading}
                error={error}
                outputText={outputText}
                onEnhance={handleEnhancePrompt}
                onSecondPass={handleSecondPass}
                onSpeak={() => outputText && speak(outputText)}
                onStop={cancel}
                isSpeaking={isSpeaking}
                isTtsReady={isTtsReady}
                onClear={handleClearWorkspace}
                history={history}
                onSelectHistory={handleSelectHistoryItem}
                onGenerateImage={handleGenerateImage}
                isGeneratingImage={isGeneratingImage}
                generatedImage={generatedImage}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                onCancelGeneration={handleCancelGeneration}
                onClearHistory={handleClearHistory}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
