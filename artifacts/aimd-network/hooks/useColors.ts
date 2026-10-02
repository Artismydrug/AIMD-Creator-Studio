import colors from '@/constants/colors';
import { useAppearance } from '@/lib/appearance';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Uses the saved app preference, or the device setting in System mode.
 */
export function useColors() {
  const { scheme } = useAppearance();
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
