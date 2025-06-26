import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  onLoadComplete: () => void;
}

export default function Preloader({ onLoadComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showRec, setShowRec] = useState(false);

  useEffect(() => {
    // Ensure DOM is ready before starting preloader
    const startPreloader = () => {
      const duration = 2200; // Reduced duration for faster loading
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min(elapsed / duration, 1);
        
        // Smoother easing function
        const easedProgress = progressPercent < 0.5 
          ? 2 * progressPercent * progressPercent 
          : 1 - Math.pow(-2 * progressPercent + 2, 3) / 2;
        
        setProgress(easedProgress * 100);
        
        // Show REC text at 35% progress
        if (easedProgress > 0.35 && !showRec) {
          setShowRec(true);
        }
        
        if (progressPercent < 1) {
          requestAnimationFrame(updateProgress);
        } else {
          // Complete loading with shorter delays
          setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => onLoadComplete(), 500);
          }, 200);
        }
      };
      
      requestAnimationFrame(updateProgress);
    };

    // Start immediately when component mounts
    const timer = setTimeout(startPreloader, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [onLoadComplete, showRec]);

  return (
    <AnimatePresence mode="wait">
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999]"
          style={{ 
            cursor: 'none',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a0a 50%, #0f0f0f 100%)'
          }}
        >
          {/* Perfect center container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.2
              }}
            >
              {/* Main loading circle - optimized for all screen sizes */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32">
                {/* Background circle */}
                <div className="w-full h-full rounded-full border-2 border-red-900/30 relative">
                  {/* Clockwise progress fill */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, #dc2626 0%, #dc2626 ${progress * 3.6}deg, transparent ${progress * 3.6}deg, transparent 360deg)`,
                      mask: 'radial-gradient(circle, transparent 60%, black 65%)'
                    }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                  
                  {/* Inner solid circle */}
                  <div 
                    className="absolute inset-3 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: progress > 20 ? '#dc2626' : '#7f1d1d',
                      opacity: Math.min(progress / 100 * 1.2, 1)
                    }}
                  />
                  
                  {/* REC text centered inside */}
                  <AnimatePresence>
                    {showRec && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span 
                          className="text-white text-xs sm:text-sm md:text-base font-bold tracking-[0.2em] select-none"
                          style={{ 
                            fontFamily: 'Oswald, sans-serif'
                          }}
                        >
                          REC
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Completion effect */}
                {progress >= 100 && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-600"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ 
                      scale: [1, 1.5, 2],
                      opacity: [1, 0.6, 0]
                    }}
                    transition={{ 
                      duration: 0.8,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}