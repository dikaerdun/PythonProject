
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathPhase } from '../types';

interface BreathingCircleProps {
  phase: BreathPhase;
  progress: number;
  phaseTimeRemaining: number;
  lotusImage?: string | null;
}

const BreathingCircle: React.FC<BreathingCircleProps> = ({ phase, progress, phaseTimeRemaining, lotusImage }) => {
  const p = Math.min(1, Math.max(0, progress));
  
  let scale = 1;
  let opacity = 0.4;
  let glowIntensity = 0.5;
  let easeProgress = 0;

  if (phase === BreathPhase.INHALE) {
    // 使用 Cosine Ease-In-Out 曲线，确保起始和结束速度均为 0，实现丝滑衔接
    easeProgress = 0.5 - 0.5 * Math.cos(p * Math.PI);
    scale = 1 + easeProgress * 1.2; 
    opacity = 0.3 + easeProgress * 0.6;
    glowIntensity = easeProgress;
  } else if (phase === BreathPhase.EXHALE) {
    // 呼气时曲线反转，同样确保衔接处速度平滑
    easeProgress = 0.5 + 0.5 * Math.cos(p * Math.PI);
    scale = 1 + easeProgress * 1.2;
    opacity = 0.9 - (1 - easeProgress) * 0.6;
    glowIntensity = easeProgress;
  }

  // 计算荷花相对于球体的动态比例：从 1/4 (0.25) 增长到 2/3 (0.66)
  const lotusRatio = 0.25 + (0.66 - 0.25) * easeProgress;

  return (
    <div className="relative flex items-center justify-center h-72 w-72 sm:h-[480px] sm:w-[480px]">
      {/* 氛围扩散光晕层 */}
      <motion.div 
        animate={{ 
          scale: scale * 1.8,
          opacity: opacity * 0.15,
          filter: `blur(${60 + glowIntensity * 60}px)`
        }}
        transition={{ duration: 0 }}
        className="absolute inset-0 rounded-full bg-cyan-400/10 pointer-events-none"
      />
      
      {/* 核心球体 */}
      <motion.div 
        animate={{ 
          scale: scale,
          boxShadow: `0 0 ${100 * glowIntensity}px rgba(34,211,238,0.3), inset 0 0 60px rgba(255,255,255,0.05)`
        }}
        transition={{ duration: 0 }}
        className="relative flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 via-blue-700/90 to-slate-950 z-20 shadow-2xl border border-white/10 w-full h-full"
      >
        {/* 动态渐变流光层 - 变大时外发，收缩时向内 */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-25">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-[-100%] rounded-full"
              style={{
                background: `radial-gradient(circle, transparent 30%, rgba(34, 211, 238, 0.15) 50%, transparent 70%)`,
              }}
              animate={{
                scale: phase === BreathPhase.INHALE 
                  ? [0.3, 1.8] 
                  : phase === BreathPhase.EXHALE 
                    ? [1.8, 0.3]
                    : 1,
                opacity: phase === BreathPhase.IDLE ? 0 : [0, 0.4, 0]
              }}
              transition={{
                duration: phase === BreathPhase.INHALE ? 4 : 4, // 保持流动的韵律感
                repeat: Infinity,
                delay: i * 1.2,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-white text-[10px] font-serif italic tracking-[0.4em] mb-4 z-30"
          >
            {phase === BreathPhase.INHALE && 'Inhale · 纳气'}
            {phase === BreathPhase.EXHALE && 'Exhale · 散气'}
            {phase === BreathPhase.IDLE && 'Stillness · 调息'}
          </motion.div>
        </AnimatePresence>

        {/* 荷花 - 优先使用生成的图片，否则回退到精美的 SVG */}
        <motion.div
          animate={{
            scale: lotusRatio,
            opacity: phase === BreathPhase.IDLE ? 0.3 : 1,
          }}
          transition={{ duration: 0 }}
          className="z-30 flex items-center justify-center w-full h-full absolute inset-0"
        >
          <div className="w-full h-full rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)]">
            <motion.div 
              animate={{ scale: 1 + easeProgress * 0.15 }}
              transition={{ duration: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              {lotusImage ? (
                <img 
                  src={lotusImage} 
                  alt="Lotus" 
                  className="w-full h-full object-cover mix-blend-screen"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full p-8 flex items-center justify-center text-pink-200/90 drop-shadow-[0_0_30px_rgba(251,207,232,0.7)]">
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity="0.1" />
                    <path d="M12 2c0 0-4 4-4 8s4 8 4 8 4-4 4-8-4-8-4-8z" fill="currentColor" fillOpacity="0.3" />
                    <path d="M12 18c0 0-6-2-6-8s4-8 6-8 6 2 6 8-6 8-6 8z" strokeOpacity="0.6" />
                    <path d="M12 18c0 0 6-2 6-8s-4-8-6-8-6 2-6 8 6 8 6 8z" strokeOpacity="0.6" />
                    <path d="M6 12c0 0 2-4 6-4s6 4 6 4-2 4-6 4-6-4-6-4z" strokeOpacity="0.4" />
                    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        <div className="mt-6 flex gap-2 z-30 opacity-30">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                delay: i * 0.5 
              }}
              className="w-1 h-1 rounded-full bg-white"
            />
          ))}
        </div>
      </motion.div>

      {/* 倒计时移至球体更下方，避免被放大的球挡住 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== BreathPhase.IDLE ? 0.6 : 0 }}
        className="absolute -bottom-56 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <div className="text-white text-4xl font-mono font-extralight tabular-nums tracking-widest">
          {phase !== BreathPhase.IDLE ? Math.ceil(phaseTimeRemaining) : '0'}
        </div>
        <div className="text-[8px] text-cyan-400/40 font-serif italic tracking-[0.2em] mt-1">
          Seconds
        </div>
      </motion.div>
    </div>
  );
};

export default BreathingCircle;
