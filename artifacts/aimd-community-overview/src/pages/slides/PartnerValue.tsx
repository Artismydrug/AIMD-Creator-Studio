export default function PartnerValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="deck-title">Brand &amp; Sponsor Collaboration</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Proposed sponsor funding supports operations and community access.</p>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-[4vw] mt-[5vh]">
          <div>
            <div className="deck-row">
              <h3 className="deck-name">Fund access</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Sponsor Dedicated &amp; Professional memberships when paid plans launch.</p>
            </div>
            <div className="deck-row">
              <h3 className="deck-name">Back emerging talent</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Community grants, workshops &amp; youth programs.</p>
            </div>
            <div className="deck-row">
              <h3 className="deck-name">Supply creative gear</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Stock-limited member drops: all tiers, no points required.</p>
            </div>
          </div>
          <div className="deck-accent p-[2.5vw]">
            <p className="deck-label font-bold">PLANNED REINVESTMENT</p>
            <h3 className="font-display font-bold text-[3vw] leading-[1.15] mt-[3vh]">A share of future proceeds for nonprofit partners.</h3>
            <p className="deck-label mt-[4vh]">Percentage, basis, partners &amp; reporting are not yet set.</p>
            <p className="deck-label mt-[4vh]">Programs and support depend on agreements &amp; resources.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
