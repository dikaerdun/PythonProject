
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wind, Save, Trash2, ChevronRight, History } from 'lucide-react';
import { Settings, BreathPattern } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  presets: BreathPattern[];
  onUpdate: (newSettings: Partial<Settings>) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onLoadPreset: (preset: BreathPattern) => void;
  disabled?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  settings, 
  presets, 
  onUpdate, 
  onSavePreset, 
  onDeletePreset,
  onLoadPreset,
  disabled 
}) => {
  const [newPresetName, setNewPresetName] = useState('');

  const handleSave = () => {
    const trimmed = newPresetName.trim();
    if (trimmed) {
      onSavePreset(trimmed);
      setNewPresetName('');
    }
  };

  return (
    <div className={`w-full p-3 bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl space-y-2.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      
      {/* 核心滑动条组 */}
      <div className="space-y-2.5">
        
        {/* 总训练时长 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-cyan-400/60">
              <Clock size={14} />
              <label className="text-[10px] font-serif italic tracking-widest">Session Duration</label>
            </div>
            <span className="text-xl font-mono font-light text-white">{settings.sessionDuration}<span className="text-[10px] ml-1 opacity-30">min</span></span>
          </div>
          <input 
            type="range" min="1" max="60" step="1"
            value={settings.sessionDuration}
            onChange={(e) => onUpdate({ sessionDuration: Number(e.target.value) })}
            className="w-full h-1 bg-slate-800/50 rounded-full appearance-none cursor-pointer accent-cyan-500/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 吸气 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5 text-cyan-400/40">
                <Wind size={12} className="rotate-180" />
                <label className="text-[9px] font-serif italic tracking-wider">Inhale</label>
              </div>
              <span className="text-sm font-mono font-light text-white">{settings.inhaleTime}s</span>
            </div>
            <input 
              type="range" min="2" max="15" step="0.5"
              value={settings.inhaleTime}
              onChange={(e) => onUpdate({ inhaleTime: Number(e.target.value) })}
              className="w-full h-1 bg-slate-800/50 rounded-full appearance-none cursor-pointer accent-cyan-500/30"
            />
          </div>

          {/* 呼气 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5 text-cyan-400/40">
                <Wind size={12} />
                <label className="text-[9px] font-serif italic tracking-wider">Exhale</label>
              </div>
              <span className="text-sm font-mono font-light text-white">{settings.exhaleTime}s</span>
            </div>
            <input 
              type="range" min="2" max="15" step="0.5"
              value={settings.exhaleTime}
              onChange={(e) => onUpdate({ exhaleTime: Number(e.target.value) })}
              className="w-full h-1 bg-slate-800/50 rounded-full appearance-none cursor-pointer accent-cyan-500/30"
            />
          </div>
        </div>
      </div>

      {/* 快捷模式 */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 mb-2 text-slate-600 px-1">
          <History size={12} />
          <span className="text-[9px] font-serif italic tracking-widest">Presets</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onLoadPreset(p)}
              className={`flex-none px-4 py-2 rounded-xl text-[10px] font-serif italic transition-all border flex items-center gap-2 ${
                settings.inhaleTime === p.inhaleTime && settings.exhaleTime === p.exhaleTime && settings.sessionDuration === p.sessionDuration ? 
                'bg-cyan-500/20 border-cyan-400/40 text-cyan-100 shadow-lg shadow-cyan-500/10' : 
                'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:border-slate-600'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 保存自定义 */}
      <div className="pt-2 border-t border-white/5 flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Save current as preset..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="w-full bg-slate-950/30 border border-slate-800/50 rounded-xl pl-3 pr-8 py-2 text-[10px] text-white font-serif italic focus:outline-none focus:border-cyan-500/30 transition-colors placeholder:text-slate-700"
          />
          <Save size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700" />
        </div>
        <button 
          onClick={handleSave}
          disabled={!newPresetName.trim()}
          className="bg-white/90 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-serif font-bold hover:bg-white transition-colors active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
