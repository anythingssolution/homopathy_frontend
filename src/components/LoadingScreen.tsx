import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const words = ["Healing", "Care", "Trust"];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const duration = 4500;
    
    const wordIntervalTime = duration / words.length; 
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => {
        if (prev < words.length - 1) return prev + 1;
        clearInterval(wordInterval);
        return prev;
      });
    }, wordIntervalTime);

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          onCompleteRef.current();
        }, 800);
      }
    };

    requestAnimationFrame(animate);

    return () => clearInterval(wordInterval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-[#549E9E] flex flex-col justify-between"
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      {/* Element 1: Clinic Label */}
      <motion.div
        className="absolute top-8 left-8 md:top-12 md:left-12 text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-[0.4em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Dr. Trivedi's Homeopathy
      </motion.div>

      {/* Element 2: Rotating Words (Center) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={wordIndex}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
          >
            <span className="text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tighter italic">
              {words[wordIndex]}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Element 4: Progress Bar (Bottom Edge) */}
      <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-black/5">
        <motion.div
          className="h-full origin-left bg-white"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
