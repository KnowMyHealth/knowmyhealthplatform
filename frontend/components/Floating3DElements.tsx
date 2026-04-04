'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function Floating3DElements() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const elements = [
    { type: 'pill-two-tone', top: '10%', left: '15%', scale: 0.7, delay: 0 },
    { type: 'tablet', top: '20%', left: '80%', scale: 0.6, delay: 1 },
    { type: 'capsule', top: '60%', left: '8%', scale: 0.8, delay: 2 },
    { type: 'tablet', top: '75%', left: '85%', scale: 0.7, delay: 0.5 },
    { type: 'pill-two-tone', top: '35%', left: '65%', scale: 0.6, delay: 1.5 },
    { type: 'capsule', top: '85%', left: '40%', scale: 0.5, delay: 2.5 },
    { type: 'tablet', top: '45%', left: '25%', scale: 0.5, delay: 3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 [perspective:1000px]">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute [transform-style:preserve-3d]"
          style={{ top: el.top, left: el.left, scale: el.scale }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, 0],
            rotate: [0, 15, -5, 0],
            rotateX: [0, 10, -10, 0],
            rotateY: [0, 15, -15, 0],
          }}
          transition={{
            duration: 8 + (i % 3) * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: el.delay,
          }}
        >
          {el.type === 'pill-two-tone' && (
            <div className="relative w-12 h-28 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.3),_0_0_20px_rgba(16,185,129,0.4)] overflow-hidden">
              {/* Top Half */}
              <div className="absolute top-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_30%_30%,_#6ee7b7,_#10b981,_#047857)] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.5),_inset_5px_5px_15px_rgba(255,255,255,0.9)]" />
              {/* Bottom Half */}
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_30%_70%,_#ffffff,_#e5e7eb,_#9ca3af)] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.3),_inset_5px_5px_15px_rgba(255,255,255,1)]" />
              {/* Center Line */}
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-emerald-900/40 shadow-[0_1px_2px_rgba(255,255,255,0.9)] z-10" />
              {/* Specular Highlight */}
              <div className="absolute top-3 left-2 w-4 h-20 bg-white/70 blur-[4px] rounded-full transform -rotate-6 z-20" />
              <div className="absolute bottom-3 right-2 w-3 h-10 bg-black/20 blur-[3px] rounded-full transform -rotate-6 z-20" />
            </div>
          )}

          {el.type === 'capsule' && (
            <div className="relative w-14 h-14 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#5eead4,_#14b8a6,_#0f766e)] shadow-[0_15px_30px_rgba(0,0,0,0.3),_inset_-6px_-6px_15px_rgba(0,0,0,0.5),_inset_6px_6px_15px_rgba(255,255,255,0.9)] overflow-hidden">
              {/* Specular Highlight */}
              <div className="absolute top-2 left-2 w-5 h-5 bg-white/90 blur-[3px] rounded-full z-20" />
              <div className="absolute bottom-2 right-2 w-7 h-7 bg-black/30 blur-[5px] rounded-full z-20" />
            </div>
          )}

          {el.type === 'tablet' && (
            <div className="relative w-20 h-20 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#ffffff,_#f3f4f6,_#d1d5db)] shadow-[0_15px_35px_rgba(0,0,0,0.2),_inset_-5px_-5px_15px_rgba(0,0,0,0.2),_inset_5px_5px_15px_rgba(255,255,255,1)] overflow-hidden">
               {/* Score Line */}
               <div className="absolute top-0 left-1/2 w-[2px] h-full bg-gray-400/60 shadow-[1px_0_2px_rgba(255,255,255,1),_inset_1px_0_2px_rgba(0,0,0,0.2)] z-10 transform -translate-x-1/2" />
               {/* Specular Highlight */}
               <div className="absolute top-3 left-3 w-8 h-5 bg-white/90 blur-[3px] rounded-full transform -rotate-12 z-20" />
               <div className="absolute bottom-3 right-3 w-10 h-10 bg-black/10 blur-[5px] rounded-full z-20" />
            </div>
          )}
        </motion.div>
      ))}
      {/* Soft radial gradients */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-300/20 blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-200/20 blur-[140px]"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
