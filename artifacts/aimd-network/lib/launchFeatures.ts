import type { Href } from 'expo-router';

/** Reversible v1 scope. These switches never delete data or change point awards. */
export const LAUNCH_FEATURES = {
  challenges: false,
  sideQuest: false,
  dashboard: false,
  memberDrops: false,
};

export type LaunchFeature = keyof typeof LAUNCH_FEATURES;

/** Existing bookmarks must resolve to a core screen, not a dead end. */
export const DEFERRED_FEATURE_DESTINATIONS: Record<LaunchFeature, Href> = {
  challenges: '/(tabs)/challenge-habits',
  sideQuest: '/(tabs)/challenge-habits',
  dashboard: '/(tabs)/profile-tab',
  memberDrops: '/(tabs)/profile-tab',
};
