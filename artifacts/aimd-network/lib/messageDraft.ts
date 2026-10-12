/** A successful send must not erase text typed while the request was in flight. */
export function draftAfterConfirmedSend(currentDraft: string, sentDraft: string): string {
  return currentDraft === sentDraft ? '' : currentDraft;
}
