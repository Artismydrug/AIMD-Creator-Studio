/** Let the outer feed handle swipes unless the writing actually overflows. */
export function shouldScrollTextPost(contentHeight: number, viewportHeight: number): boolean {
  return viewportHeight > 0 && contentHeight > viewportHeight + 1;
}
