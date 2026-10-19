export default function MissionVision() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-[6vw] top-[8vh] w-[55vw]">
        <p className="deck-label font-bold text-accent tracking-[0.15em]">MISSION &amp; VISION</p>
        <h2 className="text-[4.8vw] mt-[2vh]">From passion<br />to purpose.</h2>
        <div className="deck-rule mt-[5vh] pt-[2vh]">
          <h3 className="text-[1.5vw] font-bold text-accent">OUR MISSION</h3>
          <p className="font-display font-bold text-[2.8vw] leading-[1.15] mt-[1.5vh]">Bridge the gap between raw artistic talent and sustainable professional independence.</p>
          <p className="text-[1.8vw] leading-[1.4] mt-[2vh]">Through daily practice, worldwide connection, and a physical + digital creative ecosystem.</p>
        </div>
        <div className="deck-rule mt-[3vh] pt-[2vh]">
          <h3 className="text-[1.5vw] font-bold text-accent">OUR VISION</h3>
          <p className="text-[1.9vw] leading-[1.35] mt-[1.5vh]">Build a lasting backbone for independent art—beyond a one-off event or workshop.</p>
        </div>
      </div>
      <div className="absolute right-[6vw] top-[8vh] bottom-[8vh] w-[28vw] deck-accent px-[2.5vw] py-[3vh] flex flex-col justify-between gap-[3vh]">
        <div>
          <p className="deck-label font-bold">THE FOUNDER’S JOURNEY</p>
          <h3 className="text-[2.3vw] font-display font-bold leading-[1.1] mt-[2vh]">Edward “Poncho” Davila</h3>
          <p className="deck-label mt-[1vh]">@ponchotheartist</p>
          <p className="text-[1.45vw] leading-[1.35] mt-[2vh]">A decade-plus of tattooing, muralism &amp; Los Angeles cultural events—built through daily dedication, habit and discipline.</p>
        </div>
        <div className="deck-rule pt-[2.5vh]">
          <h3 className="text-[1.9vw] font-display font-bold leading-[1.15]">Talent—not capital—should shape an artist’s path.</h3>
          <p className="text-[1.35vw] leading-[1.4] mt-[1.5vh]">We aim to expand access through brand sponsorships &amp; endorsements.</p>
          <p className="text-[1.1vw] leading-[1.3] mt-[1.5vh]">Accessibility is a goal; programs depend on partners &amp; resources.</p>
        </div>
      </div>
    </div>
  );
}
