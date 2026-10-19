export default function PartnerValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="deck-title">Partnership &amp; community reinvestment</h2>
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-[5vw] mt-[7vh]">
          <div className="pt-[3vh]">
            <h3 className="deck-name">Create with us</h3>
            <p className="deck-body deck-row mt-[3vh]">Events, tools, supplies &amp; creative activations.</p>
            <p className="deck-body deck-row">Community workshops, youth programs, artist sponsorships &amp; grants.</p>
            <p className="deck-label text-muted mt-[4vh]">Programs depend on partners &amp; resources.</p>
          </div>
          <div className="deck-accent p-[3vw]">
            <p className="deck-label font-bold">PROPOSED GIVING MODEL</p>
            <h3 className="font-display font-bold text-[3.3vw] leading-[1.1] mt-[3vh]">A defined share of future proceeds for nonprofit partners.</h3>
            <p className="text-[2vw] leading-[1.4] mt-[3vh]">Supporting retreats, mentorship &amp; emerging artists.</p>
            <p className="deck-label mt-[4vh]">Donation percentage, basis, nonprofit partners &amp; reporting are not yet set.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
