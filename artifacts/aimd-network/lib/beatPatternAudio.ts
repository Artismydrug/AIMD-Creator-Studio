export const BEAT_STEP_COUNT = 8;
export const BEAT_STEP_INTERVAL_MS = Math.round(60_000 / 110 / 2);

export type BeatVoice = 'kick' | 'snare' | 'hat';

export function beatVoiceForStep(stepIndex: number): BeatVoice {
  const step = ((Math.trunc(stepIndex) % 4) + 4) % 4;
  if (step === 0) return 'kick';
  if (step === 2) return 'snare';
  return 'hat';
}

export function beatVoiceLabel(voice: BeatVoice): string {
  return voice === 'hat' ? 'hi-hat' : voice;
}
