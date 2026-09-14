export const CHALLENGE_SUBMISSION_POINTS = 20;

export type ScheduledChallenge = {
  id: string;
  label: string;
  theme: string;
  prompt: string;
  startsAt: string;
  deadline: string;
};

export type ChallengeStatus = "upcoming" | "active" | "closed";

export const LAUNCH_CHALLENGES: readonly ScheduledChallenge[] = [
  {
    id: "2026-launch-01-where-im-from",
    label: "Challenge 1 of 4",
    theme: "Where I’m From",
    prompt:
      "Create an original piece that symbolizes the place you’re from. Respond in your own medium—a drawing, poem, painting, sketch, song, dance, photograph, outfit, recipe, sculpture, video, workout, movement piece, or another form of creative expression.",
    startsAt: "2026-10-24T07:00:00.000Z",
    deadline: "2026-11-07T07:59:59.999Z",
  },
  {
    id: "2026-launch-02-my-creative-ritual",
    label: "Challenge 2 of 4",
    theme: "My Creative Ritual",
    prompt:
      "Create an original response that represents a habit, ritual, or routine that helps you keep creating. Show it through any medium that fits your practice.",
    startsAt: "2026-11-07T08:00:00.000Z",
    deadline: "2026-11-21T07:59:59.999Z",
  },
  {
    id: "2026-launch-03-everyday",
    label: "Challenge 3 of 4",
    theme: "Make Something From the Everyday",
    prompt:
      "Choose an everyday object, place, sound, movement, or moment and turn it into an original creative response using any medium.",
    startsAt: "2026-11-21T08:00:00.000Z",
    deadline: "2026-12-05T07:59:59.999Z",
  },
  {
    id: "2026-launch-04-future-self",
    label: "Challenge 4 of 4",
    theme: "A Message to My Future Self",
    prompt:
      "Create an original piece your future self can look back on. Use any medium to capture what you hope to remember about this moment.",
    startsAt: "2026-12-05T08:00:00.000Z",
    deadline: "2026-12-19T07:59:59.999Z",
  },
] as const;

export function getChallengeStatus(
  challenge: ScheduledChallenge,
  now: Date,
): ChallengeStatus {
  const timestamp = now.getTime();
  if (timestamp < new Date(challenge.startsAt).getTime()) return "upcoming";
  if (timestamp <= new Date(challenge.deadline).getTime()) return "active";
  return "closed";
}

/**
 * During the launch season, return the active challenge. Before launch, return
 * the next challenge as a preview. After the season, keep the final challenge
 * visible as a closed brief rather than presenting a broken empty state.
 */
export function getDisplayedChallenge(now: Date): {
  challenge: ScheduledChallenge;
  status: ChallengeStatus;
} {
  const active = LAUNCH_CHALLENGES.find(
    (challenge) => getChallengeStatus(challenge, now) === "active",
  );
  if (active) return { challenge: active, status: "active" };

  const upcoming = LAUNCH_CHALLENGES.find(
    (challenge) => getChallengeStatus(challenge, now) === "upcoming",
  );
  if (upcoming) return { challenge: upcoming, status: "upcoming" };

  return {
    challenge: LAUNCH_CHALLENGES[LAUNCH_CHALLENGES.length - 1],
    status: "closed",
  };
}