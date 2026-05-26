'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

function CapsulePill() {
  return (
    <div style={{ width: 50, height: 120, borderRadius: 25, boxShadow: '5px 14px 28px rgba(2,44,34,0.55)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 25, overflow: 'hidden' }}>
        {/* Green top half */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'radial-gradient(ellipse at 35% 22%, #bbf7d0 0%, #4ade80 28%, #16a34a 62%, #052e16 100%)',
        }} />
        {/* White bottom half */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
          background: 'radial-gradient(ellipse at 35% 22%, #ffffff 0%, #f1f5f9 45%, #cbd5e1 100%)',
        }} />
        {/* Seam groove */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(50% - 2px)', height: 4, background: 'rgba(0,0,0,0.2)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1.5, background: 'rgba(255,255,255,0.5)' }} />
        {/* Specular glow */}
        <div style={{ position: 'absolute', top: 8, left: 6, width: 22, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', filter: 'blur(6px)' }} />
        {/* Specular soft */}
        <div style={{ position: 'absolute', top: 11, left: 8, width: 10, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', filter: 'blur(2px)' }} />
        {/* Specular hot spot */}
        <div style={{ position: 'absolute', top: 13, left: 9, width: 5, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.95)' }} />
        {/* Rim shadow */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 25, boxShadow: 'inset -3px -6px 14px rgba(0,0,0,0.28), inset 1px 1px 3px rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}

function Sphere3D({ tint }: { tint: 'teal' | 'emerald' | 'amber' }) {
  const cfg = {
    teal:    { bg: 'radial-gradient(ellipse at 34% 28%, #ccfbf1 0%, #2dd4bf 30%, #0f766e 70%, #042f2e 100%)', sh: '4px 10px 22px rgba(4,47,46,0.62)' },
    emerald: { bg: 'radial-gradient(ellipse at 34% 28%, #d1fae5 0%, #34d399 30%, #059669 70%, #022c22 100%)', sh: '4px 10px 22px rgba(2,44,34,0.62)' },
    amber:   { bg: 'radial-gradient(ellipse at 34% 28%, #fef3c7 0%, #fbbf24 30%, #b45309 70%, #431407 100%)', sh: '4px 10px 22px rgba(67,20,7,0.62)' },
  }[tint];

  return (     
    <div style={{ width: 78, height: 78, borderRadius: '50%',boxShadow: cfg.sh, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: cfg.bg }}>
        {/* Specular glow */}
        <div style={{ position: 'absolute', top: 7, left: 9, width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 45%, transparent 72%)', filter: 'blur(1.5px)' }} />
        {/* Hot spot */}
        <div style={{ position: 'absolute', top: 11, left: 14, width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.96)' }} />
        {/* Rim shadow */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset -4px -6px 14px rgba(0,0,0,0.22)' }} />
      </div>
    </div>
  );
}

function RoundTablet() {
  return (
    <div style={{ width: 84, height: 84, borderRadius: '50%', boxShadow: '3px 8px 18px rgba(71,85,105,0.38)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'radial-gradient(ellipse at 30% 24%, #ffffff 0%, #f8fafc 35%, #e2e8f0 72%, #94a3b8 100%)' }}>
        {/* Score groove */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 1px)', width: 2, background: 'rgba(0,0,0,0.18)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% + 1.5px)', width: 1.5, background: 'rgba(255,255,255,0.6)' }} />
        {/* Specular glow */}
        <div style={{ position: 'absolute', top: 7, left: 9, width: 26, height: 30, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.3) 50%, transparent 75%)', filter: 'blur(2px)' }} />
        {/* Hot spot */}
        <div style={{ position: 'absolute', top: 11, left: 13, width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.95)' }} />
        {/* Rim shadow */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset -3px -5px 12px rgba(0,0,0,0.14), inset 2px 2px 5px rgba(255,255,255,0.6)' }} />
      </div>
    </div>
  );
}

const elements: Array<{
  type: 'capsule' | 'sphere-teal' | 'sphere-emerald' | 'sphere-amber' | 'tablet';
  top: string; left: string; scale: number; delay: number; rot: number;
}> = [
  { type: 'capsule',        top: '7%',  left: '10%', scale: 0.82, delay: 0,   rot: -28 },
  { type: 'sphere-teal',    top: '12%', left: '77%', scale: 0.70, delay: 0.7, rot: 0   },
  { type: 'tablet',         top: '55%', left: '5%',  scale: 0.56, delay: 1.4, rot: 18  },
  { type: 'capsule',        top: '48%', left: '80%', scale: 0.64, delay: 0.3, rot: 22  },
  { type: 'sphere-emerald', top: '28%', left: '66%', scale: 0.44, delay: 1.1, rot: 0   },
  { type: 'sphere-amber',   top: '78%', left: '58%', scale: 0.48, delay: 2.1, rot: 0   },
  { type: 'tablet',         top: '40%', left: '20%', scale: 0.46, delay: 2.6, rot: -14 },
];

export default function Floating3DElements() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: el.top, left: el.left, scale: el.scale, rotate: el.rot }}
          animate={{
            y:      [0, -22, 5, 0],
            x:      [0,  7, -3, 0],
            rotate: [el.rot, el.rot + 12, el.rot - 5, el.rot],
          }}
          transition={{
            duration: 9 + (i % 4) * 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: el.delay,
          }}
        >
          {el.type === 'capsule'        && <CapsulePill />}
          {el.type === 'sphere-teal'    && <Sphere3D tint="teal" />}
          {el.type === 'sphere-emerald' && <Sphere3D tint="emerald" />}
          {el.type === 'sphere-amber'   && <Sphere3D tint="amber" />}
          {el.type === 'tablet'         && <RoundTablet />}
        </motion.div>
      ))}

      <motion.div
        className="absolute -top-[10%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-emerald-300/20 blur-[130px]"
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-[10%] -right-[10%] w-[65vw] h-[65vw] rounded-full bg-teal-200/20 blur-[150px]"
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.50, 0.25] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
    </div>
  );
}
