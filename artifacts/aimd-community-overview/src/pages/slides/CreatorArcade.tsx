export default function CreatorArcade() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="text-[5vw]">Creator Arcade</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Small creative starts. A path toward lasting practice.</p>
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-[4vw] mt-[3vh]">
          <div className="deck-accent p-[2.5vw] h-[56vh]">
            <p className="deck-label font-bold">WHY IT EXISTS</p>
            <h3 className="text-[3.6vw] leading-[1.1] font-display font-bold mt-[2vh]">Discipline Eats Talent.</h3>
            <p className="text-[2vw] leading-[1.35] mt-[3vh]">Designed to warm up creative thinking, spark motivation, and make starting easier.</p>
            <p className="text-[2vw] leading-[1.35] font-semibold mt-[3vh]">Start small. Return often.</p>
          </div>
          <div className="pt-[1vh]">
            <h3 className="deck-name">Available: Flash Sketch</h3>
            <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">60-second drawing prompts. Save privately on your device.</p>
            <div className="deck-rule mt-[2.5vh] pt-[2vh]">
              <h3 className="deck-name">Planned: Legend Quizzes</h3>
              <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">Explore Kobe Bryant and master artists through the daily practice behind exceptional work.</p>
            </div>
            <div className="deck-rule mt-[2.5vh] pt-[2vh]">
              <h3 className="deck-name">Planned across disciplines</h3>
              <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">Poetry, color, music, movement &amp; fashion—all creative expression, built through practice.</p>
            </div>
          </div>
        </div>
        <p className="deck-label text-muted mt-[2vh]">Flash Sketch saves are device-local. No bonus points or habit-streak changes.</p>
      </div>
    </div>
  );
}
