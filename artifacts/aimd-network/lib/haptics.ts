import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function safeImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics are enhancement-only and must never block the action.
  }
}