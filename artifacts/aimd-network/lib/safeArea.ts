/**
 * Header inset shared by the app's top-level screens. Native Android can
 * briefly report a zero inset during startup, so keep the status bar clear
 * even before the platform inset has arrived.
 */
export function mainHeaderTopPadding(insetTop: number, isWeb: boolean): number {
  return isWeb ? 67 : Math.max(insetTop, 24) + 8;
}
