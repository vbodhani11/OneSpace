import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface TextToSpeechButtonProps {
  text: string;
}

export function TextToSpeechButton({ text }: TextToSpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSupported = 'speechSynthesis' in window;

  function speak() {
    if (!isSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  if (!isSupported) return null;

  return (
    <motion.button
      type="button"
      onClick={isSpeaking ? stop : speak}
      disabled={!text.trim()}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isSpeaking
          ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan'
          : 'bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10'
        }
      `}
      whileTap={{ scale: 0.95 }}
    >
      {isSpeaking ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <VolumeX size={15} />
          </motion.div>
          Stop
        </>
      ) : (
        <>
          <Volume2 size={15} />
          Read aloud
        </>
      )}
    </motion.button>
  );
}
