import { describe, expect, it } from 'vitest';
import { LAUNCH_CHALLENGES, getDisplayedChallenge, getChallengeStatus } from './challengeSchedule';

describe('the first challenge launch window', () => {
  const first = LAUNCH_CHALLENGES[0];
  it('opens November 9 at midnight Pacific and closes after November 13', () => {
    expect(getChallengeStatus(first, new Date('2026-11-09T07:59:59.999Z'))).toBe('upcoming');
    expect(getChallengeStatus(first, new Date('2026-11-09T08:00:00.000Z'))).toBe('active');
    expect(getChallengeStatus(first, new Date('2026-11-14T07:59:59.999Z'))).toBe('active');
    expect(getChallengeStatus(first, new Date('2026-11-14T08:00:00.000Z'))).toBe('closed');
  });
  it('shows the first challenge before launch', () => {
    expect(getDisplayedChallenge(new Date('2026-10-10T20:00:00Z')).challenge.id).toBe(first.id);
  });
  it('keeps every later challenge after the first and prevents overlap', () => {
    for (let i = 1; i < LAUNCH_CHALLENGES.length; i++) {
      expect(new Date(LAUNCH_CHALLENGES[i].startsAt).getTime())
        .toBeGreaterThan(new Date(LAUNCH_CHALLENGES[i - 1].deadline).getTime());
    }
  });
});
