/** One source of truth for the bottom bar's order and cold-launch destination. */
export const PRIMARY_TABS = [
  { name: 'challenge-habits', label: 'Habits', icon: 'zap' },
  { name: 'workshops', label: 'Learn', icon: 'play-circle' },
  { name: 'community', label: 'Feed', icon: 'users' },
  { name: 'profile-tab', label: 'Studio', icon: 'user' },
] as const;

export const PRIMARY_LANDING_TAB = PRIMARY_TABS[0].name;
