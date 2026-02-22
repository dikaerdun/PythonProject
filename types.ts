
export enum BreathPhase {
  INHALE = 'INHALE',
  EXHALE = 'EXHALE',
  IDLE = 'IDLE'
}

export interface Settings {
  inhaleTime: number; // seconds
  exhaleTime: number; // seconds
  sessionDuration: number; // minutes
}

export interface BreathPattern extends Settings {
  id: string;
  name: string;
}

export interface MindfulnessTip {
  title: string;
  content: string;
}
