/**
 * Browser-only adapter for this isolated preview. Production React Native
 * would use Linking from react-native instead.
 */
export const Linking = {
  openURL(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
