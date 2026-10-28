export default function CreatorArcade() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="text-[5vw]">Your Canvas</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Quick prompts. A simple way to start.</p>
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-[4vw] mt-[3vh]">
          <div className="deck-accent p-[2.5vw] h-[56vh]">
            <p className="deck-label font-bold">THE IDEA</p>
            <h3 className="text-[3.6vw] leading-[1.1] font-display font-bold mt-[2vh]">Discipline Eats Talent.</h3>
            <p className="text-[2vw] leading-[1.35] mt-[3vh]">Make something small. Keep showing up.</p>
          </div>
          <div className="pt-[1vh]">
            <h3 className="deck-name">Flash Sketch</h3>
            <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">One-minute drawing prompts, saved on your device.</p>
            <div className="deck-rule mt-[2.5vh] pt-[2vh]">
              <h3 className="deck-name">Prompts across mediums</h3>
              <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">Visual art · Music · Fashion · Poetry · Movement</p>
            </div>
            <div className="deck-rule mt-[2.5vh] pt-[2vh]">
              <h3 className="deck-name">Made for your own pace</h3>
              <p className="text-[2vw] leading-[1.3] mt-[1.2vh]">Private sketches. No streak or points pressure.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
