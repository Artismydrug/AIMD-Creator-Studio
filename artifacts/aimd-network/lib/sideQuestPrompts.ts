export const SIDE_QUEST_MEDIA = [
  {
    id: 'visual_art',
    label: 'Visual art · Tattoo',
    shortLabel: 'Art',
    icon: 'edit-3',
    input: 'canvas',
    prompts: [
      'Turn two simple shapes into a tiny tattoo-flash idea.',
      'Draw an object near you without lifting your pen.',
      'Make a quick portrait using only five lines.',
      'Build a repeat pattern from one mark.',
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion',
    shortLabel: 'Fashion',
    icon: 'tag',
    input: 'photo',
    prompts: [
      'Style one bold piece with one unexpected detail.',
      'Find a wearable object and give it a new purpose.',
      'Build a three-piece color story from what is around you.',
      'Redesign a pocket, cuff, or collar in your imagination.',
    ],
  },
  {
    id: 'music',
    label: 'Music · Sound',
    shortLabel: 'Music',
    icon: 'music',
    input: 'audio',
    prompts: [
      'Record a four-beat motif with your voice or an instrument.',
      'Make a tiny soundscape using safe sounds nearby.',
      'Hum a two-line chorus about this moment.',
      'Create a steady rhythm, then add one surprise.',
    ],
  },
  {
    id: 'poetry',
    label: 'Poetry · Writing',
    shortLabel: 'Writing',
    icon: 'type',
    input: 'text',
    prompts: [
      'Write six lines that begin with “Today, I…”.',
      'Describe a familiar room as if it were a planet.',
      'Leave a four-line note for your future self.',
      'List five things that are almost, but not quite, the same.',
    ],
  },
  {
    id: 'movement',
    label: 'Fitness · Movement',
    shortLabel: 'Movement',
    icon: 'activity',
    input: 'photo',
    prompts: [
      'Create a gentle four-move sequence you can repeat.',
      'Move like a line being drawn across the room.',
      'Try a balance pose near a stable support.',
      'Make three gestures: open, gather, release.',
    ],
  },
] as const;

export type SideQuestMedium = (typeof SIDE_QUEST_MEDIA)[number]['id'];
export type SideQuestPrompt = {
  id: string;
  medium: SideQuestMedium;
  mediumLabel: string;
  input: (typeof SIDE_QUEST_MEDIA)[number]['input'];
  prompt: string;
};

export type SideQuestFilter = 'mixed' | SideQuestMedium;

const promptPool: SideQuestPrompt[] = SIDE_QUEST_MEDIA.flatMap((medium) =>
  medium.prompts.map((prompt, index) => ({
    id: `${medium.id}-${index}`,
    medium: medium.id,
    mediumLabel: medium.label,
    input: medium.input,
    prompt,
  })),
);

export function pickSideQuestPrompt(
  filter: SideQuestFilter = 'mixed',
  previousId?: string,
): SideQuestPrompt {
  const pool = filter === 'mixed'
    ? promptPool
    : promptPool.filter((item) => item.medium === filter);
  const available = pool.length > 1 && previousId
    ? pool.filter((item) => item.id !== previousId)
    : pool;
  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? promptPool[0]!;
}
