/** Prevent repeat taps synchronously, before React can render a disabled button. */
export async function runExclusiveSubmission(
  lock: { current: boolean },
  submit: () => Promise<void>,
): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try {
    await submit();
    return true;
  } finally {
    lock.current = false;
  }
}
