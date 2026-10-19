export default function CommunityReinvestment() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Planned nonprofit reinvestment</h1>
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-[5vw] mt-[6vh] items-center">
        <div className="bg-accent h-[44vh] p-[3vw] flex flex-col justify-center">
          <p className="deck-label">PLANNED GIVING MODEL</p>
          <h2 className="font-display font-bold text-[4.1vw] leading-[1.08] mt-[2vh]">A defined share of future proceeds for nonprofit partners.</h2>
        </div>
        <div className="space-y-[3.5vh]">
          <p className="deck-body">Designed to help fund:</p>
          <p className="deck-name">Community workshops &amp; youth programs</p>
          <p className="deck-name">Artist retreats &amp; mentorship</p>
          <p className="deck-name">Sponsorships for emerging artists</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[5vh]">Proposed model; donation percentage, calculation basis, nonprofit partners, and reporting are not yet set.</p>
    </div>
  );
}
