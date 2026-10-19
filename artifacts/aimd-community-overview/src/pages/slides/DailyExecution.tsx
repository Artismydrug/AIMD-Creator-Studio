export default function DailyExecution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute inset-y-0 left-0 w-[37vw] deck-accent" />
      <div className="deck-content grid grid-cols-[31vw_1fr] gap-[6.4vw] items-center">
        <h2 className="text-[5vw]">Built for Daily Execution &amp; Growth</h2>
        <div>
          <p className="deck-body deck-row">Track habits, check-ins, streaks, and practice history</p>
          <p className="deck-body deck-row">Share images, videos, audio, and writing in Studio Feed</p>
          <p className="deck-body deck-row">Connect through direct messages and community events</p>
          <p className="deck-body deck-row">Explore workshop previews and learning reflections</p>
        </div>
      </div>
    </div>
  );
}
