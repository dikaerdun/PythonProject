
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Settings as SettingsIcon, Play, Square, Sparkles, Info } from 'lucide-react';
import { BreathPhase, Settings, MindfulnessTip, BreathPattern } from './types';
import { getMindfulnessTip } from './services/geminiService';
import { generateLotusImage } from './services/imageService';
import BreathingCircle from './components/BreathingCircle';
import SettingsPanel from './components/SettingsPanel';
import './index.css';

const STORAGE_KEY = 'zenbreath_v13_storage';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    inhaleTime: 5,
    exhaleTime: 5,
    sessionDuration: 5
  });
  const [presets, setPresets] = useState<BreathPattern[]>([]);
  const [isActive, setIsActive] = useState(false);
  
  const [breathState, setBreathState] = useState({
    phase: BreathPhase.IDLE,
    progress: 0,
    phaseRemaining: 0,
    totalRemaining: 0
  });

  const [tip, setTip] = useState<MindfulnessTip | null>(null);
  const [lotusImage, setLotusImage] = useState<string | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ 
    masterGain: GainNode;
    sources: (OscillatorNode | AudioBufferSourceNode)[];
    breathGains: GainNode[]; 
    breathFilters: BiquadFilterNode[];
    binauralBus: GainNode;
    shimmerGain: GainNode;
  } | null>(null);
  
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const stopSession = useCallback(() => {
    setIsActive(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    if (audioCtxRef.current) {
      const nodes = audioNodesRef.current;
      const now = audioCtxRef.current.currentTime;
      if (nodes) {
        nodes.masterGain.gain.cancelScheduledValues(now);
        nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, now);
        nodes.masterGain.gain.linearRampToValueAtTime(0, now + 2.0);
        nodes.sources.forEach(s => { try { s.stop(now + 2.1); } catch(e) {} });
      }

      setTimeout(() => {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
          audioNodesRef.current = null;
        }
      }, 2200);
    }
    
    setBreathState({
      phase: BreathPhase.IDLE,
      progress: 0,
      phaseRemaining: 0,
      totalRemaining: 0
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
        } else { loadDefaultPresets(); }
      } catch (e) { loadDefaultPresets(); }
    } else { loadDefaultPresets(); }
    getMindfulnessTip().then(setTip);
    generateLotusImage().then(image => { console.log('Lotus Image:', image); setLotusImage(image); });
    return () => stopSession();
  }, [stopSession]);

  const loadDefaultPresets = () => {
    const defaults: BreathPattern[] = [
      { id: 'p1', name: '4-6 平衡', inhaleTime: 4, exhaleTime: 6, sessionDuration: 5 },
      { id: 'p2', name: '5-5 相干', inhaleTime: 5, exhaleTime: 5, sessionDuration: 10 },
      { id: 'p3', name: '4-8 助眠', inhaleTime: 4, exhaleTime: 8, sessionDuration: 15 },
    ];
    setPresets(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  };

  const createPurePinkNoiseBuffer = (ctx: AudioContext, duration: number) => {
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Paul Kellet's refined Pink Noise algorithm
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    let sum = 0;

    for (let i = 0; i < totalSamples; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // 补偿增益使其接近 0dB
      b6 = white * 0.115926;
      sum += data[i];
    }

    // 移除直流偏移
    const avg = sum / totalSamples;
    for (let i = 0; i < totalSamples; i++) {
      data[i] -= avg;
    }

    // 超长交叉淡化边界 (0.5s)
    const fadeLen = Math.floor(sampleRate * 0.5);
    for(let i=0; i<fadeLen; i++) {
      const fade = Math.sin((i / fadeLen) * (Math.PI / 2));
      data[i] *= fade;
      data[totalSamples - 1 - i] *= fade;
    }
    return buffer;
  };

  const scheduleNextBreathPhase = (phase: BreathPhase, duration: number) => {
    const nodes = audioNodesRef.current;
    if (!nodes || !audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const transitionTime = 0.05; // 50ms 的极小斜坡过渡，消除切换瞬间的瞬态

    nodes.breathGains.forEach(g => {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
    });
    nodes.breathFilters.forEach(f => {
      f.frequency.cancelScheduledValues(now);
      f.frequency.setValueAtTime(f.frequency.value, now);
    });

    const targetGain = phase === BreathPhase.INHALE ? 0.30 : 0.08;
    const targetFreq = phase === BreathPhase.INHALE ? 600 : 150;

    // 先调度一个微小的平滑衔接，再执行主体调度
    nodes.breathGains.forEach(g => {
      g.gain.linearRampToValueAtTime(g.gain.value, now + transitionTime);
      g.gain.linearRampToValueAtTime(targetGain, now + duration);
    });
    nodes.breathFilters.forEach(f => {
      f.frequency.linearRampToValueAtTime(f.frequency.value, now + transitionTime);
      f.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
    });

    // 为脑波增加极微弱的呼吸同步起伏，增强沉浸感
    const binauralTarget = phase === BreathPhase.INHALE ? 0.24 : 0.18;
    nodes.binauralBus.gain.cancelScheduledValues(now);
    nodes.binauralBus.gain.setValueAtTime(nodes.binauralBus.gain.value, now);
    nodes.binauralBus.gain.linearRampToValueAtTime(binauralTarget, now + duration);

    // 为高频闪烁层增加同步
    const shimmerTarget = phase === BreathPhase.INHALE ? 0.015 : 0.008;
    nodes.shimmerGain.gain.cancelScheduledValues(now);
    nodes.shimmerGain.gain.setValueAtTime(nodes.shimmerGain.gain.value, now);
    nodes.shimmerGain.gain.linearRampToValueAtTime(shimmerTarget, now + duration);
  };

  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const delta = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setBreathState(prev => {
      let { phase, phaseRemaining, totalRemaining } = prev;
      const lastPhase = phase;
      totalRemaining -= delta;
      phaseRemaining -= delta;

      if (totalRemaining <= 0) {
        stopSession();
        return prev;
      }

      if (phaseRemaining <= 0) {
        if (phase === BreathPhase.INHALE) {
          phase = BreathPhase.EXHALE;
          phaseRemaining = settings.exhaleTime;
        } else {
          phase = BreathPhase.INHALE;
          phaseRemaining = settings.inhaleTime;
        }
      }

      if (lastPhase !== phase || prev.phase === BreathPhase.IDLE) {
        scheduleNextBreathPhase(phase, phaseRemaining);
      }

      const currentPhaseDuration = phase === BreathPhase.INHALE ? settings.inhaleTime : settings.exhaleTime;
      const progress = Math.max(0, Math.min(1, 1 - (phaseRemaining / currentPhaseDuration)));
      
      return { ...prev, phase, phaseRemaining, totalRemaining, progress };
    });
    requestRef.current = requestAnimationFrame(animate);
  }, [settings, stopSession]);

  const initAudio = async () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      const ctx = audioCtxRef.current!;
      if (ctx.state === 'suspended') await ctx.resume();

      const now = ctx.currentTime;
      const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
      const breathGains: GainNode[] = [];
      const breathFilters: BiquadFilterNode[] = [];

      // 1. 发烧级主输出链
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-15, now);
      limiter.knee.setValueAtTime(30, now);
      limiter.connect(ctx.destination);

      // 模拟物理散射的延迟网络 (Diffusion)
      const delay = ctx.createDelay(0.1);
      delay.delayTime.setValueAtTime(0.015, now); // 15ms 延迟，用于抹平数字尖刺
      const delayGain = ctx.createGain();
      delayGain.gain.setValueAtTime(0.3, now);
      delay.connect(delayGain);
      delayGain.connect(limiter);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.8, now + 1.5); // 缩短淡入时间，提高主音量
      masterGain.connect(limiter);
      masterGain.connect(delay); // 同时并行发送到延迟网络

      // 2. 三重互质长度粉红噪声“云”系统 - 增加动态呼吸感
      [13.7, 19.3, 29.1].forEach((len, idx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createPurePinkNoiseBuffer(ctx, len);
        noise.loop = true;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(idx === 0 ? 150 : (idx === 1 ? 250 : 350), now);
        filter.Q.setValueAtTime(0.2, now);
        
        // 为噪声增加极缓慢的随机起伏
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.05 + Math.random() * 0.05, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(30, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        sources.push(lfo);
        
        const dcBlocker = ctx.createBiquadFilter(); // 二级直流阻断
        dcBlocker.type = 'highpass';
        dcBlocker.frequency.setValueAtTime(20, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);

        noise.connect(filter);
        filter.connect(dcBlocker);
        dcBlocker.connect(gain);
        gain.connect(masterGain);
        
        noise.start();
        sources.push(noise);
        breathGains.push(gain);
        breathFilters.push(filter);
      });

      // 3. 超低频 Theta 脉冲 (4Hz) - 优化空间声场
      const binauralBus = ctx.createGain();
      binauralBus.gain.setValueAtTime(0.22, now); 
      binauralBus.connect(masterGain);
      
      const pannerL = ctx.createStereoPanner();
      pannerL.pan.setValueAtTime(-0.7, now);
      pannerL.connect(binauralBus);
      
      const pannerR = ctx.createStereoPanner();
      pannerR.pan.setValueAtTime(0.7, now);
      pannerR.connect(binauralBus);

      const oscL = ctx.createOscillator();
      oscL.frequency.setValueAtTime(256, now); // 左耳 256Hz
      oscL.connect(pannerL);
      
      const oscR = ctx.createOscillator();
      oscR.frequency.setValueAtTime(260, now); // 右耳 260Hz -> 4Hz 差频
      oscR.connect(pannerR);
      [oscL, oscR].forEach(o => { o.start(); sources.push(o); });

      // 4. Crystalline Texture (高频通透感)
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.012, now);
      shimmerGain.connect(masterGain);
      const shimmerFilter = ctx.createBiquadFilter();
      shimmerFilter.type = 'highpass';
      shimmerFilter.frequency.setValueAtTime(2500, now);
      shimmerFilter.connect(shimmerGain);
      
      const shimmerOsc = ctx.createOscillator();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(3200, now);
      shimmerOsc.connect(shimmerFilter);
      shimmerOsc.start();
      sources.push(shimmerOsc);

      audioNodesRef.current = { 
        masterGain, 
        sources, 
        breathGains, 
        breathFilters, 
        binauralBus, 
        shimmerGain 
      };
    } catch (e) { console.error(e); }
  };

  const startSession = async () => {
    await initAudio();
    setIsActive(true);
    lastTimeRef.current = performance.now();
    
    const initialInhaleTime = settings.inhaleTime;
    setBreathState({
      phase: BreathPhase.INHALE,
      progress: 0,
      phaseRemaining: initialInhaleTime,
      totalRemaining: settings.sessionDuration * 60
    });
    
    // 立即启动第一个呼吸相位的音频调度
    scheduleNextBreathPhase(BreathPhase.INHALE, initialInhaleTime);
    
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#020617] text-slate-100 overflow-hidden relative font-sans">
      <header className="flex-none h-[15dvh] flex flex-col items-center justify-end pb-4 z-50 px-6">
        {!isActive ? (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Wind className="text-cyan-400/80 w-5 h-5" />
              <h1 className="text-3xl font-serif font-light tracking-[0.2em] text-white/90">禅息 · 4Hz</h1>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.6em] italic ml-2">纯净海洋音场</p>
            
            <AnimatePresence mode="wait">
              {tip && (
                <motion.div 
                  key={tip.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 max-w-xs mx-auto"
                >
                  <div className="flex items-center justify-center gap-1 text-cyan-400/40 mb-2">
                    <div className="h-px w-4 bg-cyan-400/20" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em]">{tip.title}</span>
                    <div className="h-px w-4 bg-cyan-400/20" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-serif italic px-4">{tip.content}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-5xl font-mono font-light tracking-widest text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {Math.floor(breathState.totalRemaining / 60)}:{String(Math.floor(breathState.totalRemaining % 60)).padStart(2, '0')}
            </div>
            <div className="mt-2 text-[10px] text-cyan-400/60 font-bold tracking-[0.4em] uppercase">
              深度禅修中
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-20">
        <BreathingCircle 
          phase={breathState.phase} 
          progress={breathState.progress} 
          phaseTimeRemaining={breathState.phaseRemaining}
          lotusImage={lotusImage}
        />
      </main>

      <footer className="flex-none w-full max-w-md mx-auto z-40 px-6 pb-12">
        <div className="transition-all duration-1000">
          {!isActive ? (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col space-y-2"
            >
              <div className="flex-none overflow-y-auto no-scrollbar max-h-[40dvh]">
                <SettingsPanel 
                  settings={settings} presets={presets}
                  onUpdate={s => setSettings(p => ({ ...p, ...s }))}
                  onSavePreset={n => {
                    const updated = [...presets, { ...settings, id: Date.now().toString(), name: n }];
                    setPresets(updated);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                  }}
                  onDeletePreset={id => {
                    const updated = presets.filter(p => p.id !== id);
                    setPresets(updated);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                  }}
                  onLoadPreset={p => setSettings({ ...p })}
                />
              </div>
              <button 
                onClick={startSession} 
                className="flex-none group relative w-full bg-white text-slate-950 h-12 rounded-3xl text-xs font-black tracking-widest active:scale-95 transition-all shadow-[0_0_30px_rgba(251,207,232,0.2)] overflow-hidden mt-2"
              >
                <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10" />
                <div className="relative flex items-center justify-center gap-2">
                  <Play size={14} fill="currentColor" />
                  开启禅修
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={stopSession} 
              className="w-full bg-slate-900/40 border border-white/5 text-white h-12 rounded-3xl text-xs font-black tracking-widest transition-all backdrop-blur-md active:scale-95 flex items-center justify-center gap-2 hover:bg-slate-800/60"
            >
              <Square size={14} fill="currentColor" />
              止念 · 结束
            </motion.button>
          )}
        </div>
      </footer>

      {/* 视觉颗粒感与氛围光晕 */}
      <div className="absolute inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617]" />
      
      {/* 动态氛围光斑 */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
          x: [0, 50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full -z-10"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.05, 0.1, 0.05],
          x: [0, -40, 0],
          y: [0, 40, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full -z-10"
      />
    </div>
  );
};

export default App;
