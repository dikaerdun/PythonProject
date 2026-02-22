
import React from 'react';

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

  // 计算荷花相对于球体的动态比例：从 35% 增长到 75%
  const lotusRatio = 0.35 + (0.75 - 0.35) * easeProgress;

  return (
    <div className="relative flex items-center justify-center h-72 w-72 sm:h-[480px] sm:w-[480px] border-4 border-dashed border-red-500">
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
        className="relative flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 via-blue-700/90 to-slate-950 z-20 shadow-2xl border border-white/10 w-full h-full will-change-transform transform-gpu"
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

      </motion.div>

      {/* 佛光效果 - 位于荷花后上方 */}
      <motion.div 
        animate={{ 
          opacity: phase === BreathPhase.INHALE ? [0.1, 0.4, 0.1] : 0.1,
          scale: scale * 1.2
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-gradient-to-t from-transparent via-cyan-400/20 to-transparent blur-3xl rounded-full z-25 pointer-events-none will-change-transform"
      />

      {/* 呼吸状态文字 - 位于球体顶部 */}
      <div className="flex flex-col items-center z-40 pointer-events-none absolute top-1/2 -translate-y-[140px] sm:-translate-y-[220px] left-1/2 -translate-x-1/2">
        <AnimatePresence mode="wait">
          <motion.div 
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-white text-[10px] font-serif italic tracking-[0.4em]"
          >
            {phase === BreathPhase.INHALE && '吸气 · 纳气'}
            {phase === BreathPhase.EXHALE && '呼气 · 散气'}
            {phase === BreathPhase.IDLE && '静止 · 调息'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 荷花图层 - 确保在最上层且大小适中 */}
      <div
        className="z-50 absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {/* 荷花核心容器 */}
        <div className="w-2/3 h-2/3 flex items-center justify-center rounded-full">
          <div className="w-full h-full rounded-full bg-black/10 border border-white/5 flex items-center justify-center">
            {lotusImage ? (
              <img 
                src={lotusImage} 
                alt="Lotus" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full p-12 flex items-center justify-center text-pink-300/80 drop-shadow-[0_0_20px_rgba(251,207,232,0.5)]">
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity="0.1" />
                  <path d="M12 2c0 0-4 4-4 8s4 8 4 8 4-4 4-8-4-8-4-8z" fill="currentColor" fillOpacity="0.3" />
                  <path d="M12 18c0 0-6-2-6-8s4-8 6-8 6 2 6 8-6 8-6 8z" strokeOpacity="0.6" />
                  <path d="M12 18c0 0 6-2 6-8s-4-8-6-8-6 2-6 8 6 8 6 8z" strokeOpacity="0.6" />
                  <path d="M6 12c0 0 2-4 6-4s6 4 6 4-2 4-6 4-6-4-6-4z" strokeOpacity="0.4" />
                  <circle cx="12" cy="10" r="1.5" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreathingCircle;
