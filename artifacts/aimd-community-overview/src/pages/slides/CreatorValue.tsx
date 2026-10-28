export default function CreatorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="text-[5vw]">A creative path for every medium</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Chefs · Athletes · Musicians · Painters · Dancers · Actors · And more</p>
        <div className="grid grid-cols-3 gap-[2.5vw] mt-[7vh]">
          <div className="deck-accent p-[2.5vw] h-[45vh]">
            <h3 className="text-[3vw] font-display font-bold">Practice</h3>
            <p className="text-[2vw] leading-[1.35] mt-[2vh]">Build a habit. Keep making.</p>
          </div>
          <div className="bg-accent/20 p-[2.5vw] h-[45vh]">
            <h3 className="text-[3vw] font-display font-bold">Share</h3>
            <p className="text-[2vw] leading-[1.35] mt-[2vh]">Show your work. Find your people.</p>
          </div>
          <div className="bg-accent p-[2.5vw] h-[45vh]">
            <h3 className="text-[3vw] font-display font-bold">Grow</h3>
            <p className="text-[2vw] leading-[1.35] mt-[2vh]">Explore workshops, mentorship &amp; future retreats.</p>
            <p className="deck-label mt-[2vh]">Programs develop with partners.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
