import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface TextToSpeechButtonProps {
  text: string;
}

export function TextToSpeechButton({ text }: TextToSpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSupported = 'speechSynthesis' in window;

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function speak() {
    if (!isSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = navigator.language || 'en-US';
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
      aria-pressed={isSpeaking}
      aria-label={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
      title={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
      className={`
        p-1.5 rounded-lg transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isSpeaking
          ? 'text-accent-cyan bg-accent-cyan/10 hover:bg-accent-cyan/20'
          : 'text-white/30 hover:text-accent-cyan hover:bg-white/10'
        }
      `}
      whileTap={{ scale: 0.9 }}
    >
      {isSpeaking ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <VolumeX size={14} />
        </motion.div>
      ) : (
        <Volume2 size={14} />
      )}
    </motion.button>
  );
}
