import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * A more robust implementation of the Text-to-Speech hook.
 *
 * This version includes several layers of workarounds for a long-standing and
 * notorious bug in WebKit/Chromium browsers where the speech synthesis engine
 * can silently fail or "go mute". The core fix here is holding a reference
 * to the utterance object to prevent it from being prematurely garbage collected.
 */
const useTextToSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    // A ref to hold the current utterance. This is CRITICAL to prevent the utterance
    // from being garbage-collected prematurely in some browsers, which is a
    // common cause of the "silent" bug.
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    
    useEffect(() => {
        const synthesis = window.speechSynthesis;
        if (!synthesis) {
            console.error("Speech Synthesis not supported by this browser.");
            return;
        }

        const loadVoices = () => {
            const loadedVoices = synthesis.getVoices();
            if (loadedVoices.length > 0) {
                setVoices(loadedVoices);
                setIsReady(true);
                // No longer need to listen once we have voices.
                if (synthesis.onvoiceschanged !== undefined) {
                    synthesis.onvoiceschanged = null;
                }
            }
        };

        // Voices may load asynchronously. We need to listen for the `voiceschanged` event.
        loadVoices(); 
        if (synthesis.onvoiceschanged !== undefined) {
            synthesis.onvoiceschanged = loadVoices;
        }

        // Keep-alive timer: the speech synthesis service can go idle.
        // Periodically "pinging" it prevents this.
        const keepAliveInterval = setInterval(() => {
            synthesis.resume();
        }, 8000);

        return () => {
            clearInterval(keepAliveInterval);
            if (synthesis) {
                synthesis.onvoiceschanged = null;
                synthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback((text: string) => {
        const synthesis = window.speechSynthesis;
        if (!text || !synthesis || !isReady) {
            return;
        }

        // Always cancel any previous speech. This helps reset the engine's state.
        synthesis.cancel();

        // A short timeout gives the `cancel` command time to process.
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance; // ** THE FIX: Hold a reference **

            if (voices.length > 0) {
                const preferredVoice = voices.find(voice => voice.lang.startsWith('en-US') && voice.name.includes('Google'));
                const fallbackVoice = voices.find(voice => voice.lang.startsWith('en-US'));
                utterance.voice = preferredVoice || fallbackVoice || voices[0];
            }
            
            utterance.onend = () => {
                // Check if this is still the current utterance before updating state.
                if (utteranceRef.current === utterance) {
                    setIsSpeaking(false);
                    utteranceRef.current = null;
                }
            };
            
            utterance.onerror = (event) => {
                const errorEvent = event as SpeechSynthesisErrorEvent;
                if (errorEvent.error !== 'canceled' && errorEvent.error !== 'interrupted') {
                    console.error("Speech synthesis error:", errorEvent.error);
                }
                // Check if this is still the current utterance before updating state.
                if (utteranceRef.current === utterance) {
                    setIsSpeaking(false);
                    utteranceRef.current = null;
                }
            };
            
            // Set state to 'speaking' immediately for responsive UI
            setIsSpeaking(true);
            synthesis.speak(utterance);
        }, 100);
    }, [voices, isReady]);

    const cancel = useCallback(() => {
        const synthesis = window.speechSynthesis;
        if (!synthesis) return;
        
        synthesis.cancel();
        setIsSpeaking(false);
        utteranceRef.current = null; // Clear the ref on cancel
    }, []);
    
    return { speak, cancel, isSpeaking, isReady };
};

export default useTextToSpeech;