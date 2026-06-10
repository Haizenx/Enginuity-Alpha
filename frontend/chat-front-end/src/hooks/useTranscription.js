import { useState, useEffect, useRef } from 'react';

export const useTranscription = (isActive) => {
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    if (isActive) {
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          // We only append final results to avoid duplicating the same sentence while they speak
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
             setTranscript(prev => prev + finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
        };

        // Auto restart if it stops unexpectedly while still active
        recognition.onend = () => {
          if (isActive && isTranscribing) {
             try {
                 recognition.start();
             } catch (e) {
                 console.log("Recognition restart error", e);
             }
          }
        };

        recognitionRef.current = recognition;
      }
      
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
      
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsTranscribing(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [isActive]);

  const clearTranscript = () => setTranscript('');

  return { transcript, isTranscribing, clearTranscript };
};
