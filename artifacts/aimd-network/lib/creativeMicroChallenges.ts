export const CREATIVE_MEDIUMS = ['visual', 'music', 'fashion', 'poetry', 'movement'] as const;

export type CreativeMedium = (typeof CREATIVE_MEDIUMS)[number];
export type NonVisualMedium = Exclude<CreativeMedium, 'visual'>;
export type CreativeMediumIcon = 'edit-3' | 'music' | 'tag' | 'type' | 'activity';

export type CreativeMediumConfig = {
  label: string;
  title: string;
  description: string;
  icon: CreativeMediumIcon;
  nextLabel: string;
  prompts: readonly string[];
};

export const CREATIVE_MEDIUM_CONFIG: Record<CreativeMedium, CreativeMediumConfig> = {
  visual: {
    label: 'Sketch',
    title: 'Flash Sketch',
    description: 'One prompt, one minute. Keep it loose, stay curious, and let the marks add up.',
    icon: 'edit-3',
    nextLabel: 'Next sketch idea',
    prompts: [
      'Sketch an object within arm’s reach.',
      'Draw a tiny creature with a big personality.',
      'Make a one-line portrait of someone you admire.',
      'Design a small tattoo inspired by your neighborhood.',
      'Sketch a sneaker with a story to tell.',
      'Draw a plant growing somewhere unexpected.',
      'Create a quick symbol for how today feels.',
    ],
  },
  music: {
    label: 'Music',
    title: 'Beat Builder',
    description: 'Build an 8-step rhythm. Hear each drum as you tap, then play your loop.',
    icon: 'music',
    nextLabel: 'Next beat idea',
    prompts: [
      'Build a rhythm that sounds like a walk through your neighborhood.',
      'Make a beat with a quiet opening and a bold finish.',
      'Create a loop that matches your energy right now.',
    ],
  },
  fashion: {
    label: 'Fashion',
    title: 'Style Stack',
    description: 'Choose a look, pick a palette, and give your idea a point of view.',
    icon: 'tag',
    nextLabel: 'Next style idea',
    prompts: [
      'Style a look inspired by your favorite place.',
      'Build an outfit around one unexpected color.',
      'Design a look that feels like your future self.',
    ],
  },
  poetry: {
    label: 'Poetry',
    title: 'Word Spark',
    description: 'Choose three words and turn them into a small, surprising line.',
    icon: 'type',
    nextLabel: 'Next word idea',
    prompts: [
      'Pick three words and make a line that feels like a beginning.',
      'Build a tiny poem from a color, a place, and a feeling.',
      'Choose three words that do not usually belong together.',
    ],
  },
  movement: {
    label: 'Movement',
    title: 'Move Mix',
    description: 'Build a short movement break with comfortable, low-impact options.',
    icon: 'activity',
    nextLabel: 'Next move idea',
    prompts: [
      'Make a three-move reset for the space around you.',
      'Build a short sequence that changes your pace.',
      'Create a movement loop inspired by a favorite song.',
    ],
  },
};

export const FASHION_SILHOUETTES = ['Tee', 'Jacket', 'Full look'] as const;

export const FASHION_PALETTE = [
  { id: 'coral', label: 'Coral', color: '#F87559' },
  { id: 'violet', label: 'Violet', color: '#8B5CF6' },
  { id: 'sun', label: 'Sun', color: '#F2C94C' },
  { id: 'teal', label: 'Teal', color: '#55B7A5' },
  { id: 'ink', label: 'Ink', color: '#282330' },
  { id: 'cream', label: 'Cream', color: '#F3EBDD' },
] as const;

export const POETRY_WORD_BANK = [
  'ember', 'window', 'wild', 'soft', 'home', 'afterglow',
  'weather', 'echo', 'bright', 'almost', 'blue', 'begin',
] as const;

export const MOVEMENT_SEQUENCE = [
  { id: 'reach', label: 'Reach & release', detail: 'A gentle reach, seated or standing.' },
  { id: 'circles', label: 'Shoulder circles', detail: 'Small, easy circles at your own pace.' },
  { id: 'reset', label: 'Choose your reset', detail: 'Add a comfortable movement of your choice.' },
] as const;

export function nextCreativePrompt(medium: CreativeMedium, previous = ''): string {
  const prompts = CREATIVE_MEDIUM_CONFIG[medium].prompts;
  if (prompts.length < 2) return prompts[0] ?? 'Try a new creative idea.';
  const currentIndex = prompts.indexOf(previous);
  if (currentIndex < 0) return prompts[Math.floor(Math.random() * prompts.length)] ?? prompts[0];
  const offset = 1 + Math.floor(Math.random() * (prompts.length - 1));
  return prompts[(currentIndex + offset) % prompts.length] ?? prompts[0];
}
