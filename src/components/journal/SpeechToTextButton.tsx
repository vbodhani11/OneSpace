import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface SpeechToTextButtonProps {
  onResult: (text: string) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function SpeechToTextButton({ onResult }: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() =>
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function startListening() {
    if (!isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResult(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  if (!isSupported) {
    return (
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/30 border border-white/10 text-sm cursor-not-allowed"
        title="Speech recognition not supported in this browser"
      >
        <AlertCircle size={15} />
        <span className="text-xs">Not supported</span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
        ${isListening
          ? 'bg-red-500/20 border border-red-500/40 text-red-400'
          : 'bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10'
        }
      `}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.span key="listening" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <MicOff size={15} />
            </motion.div>
            Stop
          </motion.span>
        ) : (
          <motion.span key="idle" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Mic size={15} />
            Speak
          </motion.span>
        )}
      </AnimatePresence>
      {isListening && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      )}
    </motion.button>
  );
}
