export default function PartnerValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="deck-title">Brand &amp; Sponsor Collaboration</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Sponsors can help expand creative access.</p>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-[4vw] mt-[5vh]">
          <div>
            <div className="deck-row">
              <h3 className="deck-name">Open doors</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Support future learning and memberships.</p>
            </div>
            <div className="deck-row">
              <h3 className="deck-name">Back creators</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Support workshops, youth programs &amp; grants.</p>
            </div>
            <div className="deck-row">
              <h3 className="deck-name">Share creative tools</h3>
              <p className="text-[2vw] leading-[1.35] mt-[1vh]">Offer gear drops across every membership tier.</p>
            </div>
          </div>
          <div className="deck-accent p-[2.5vw]">
            <p className="deck-label font-bold">PLANNED REINVESTMENT</p>
            <h3 className="font-display font-bold text-[3vw] leading-[1.15] mt-[3vh]">Future proceeds can support nonprofit partners.</h3>
            <p className="deck-label mt-[4vh]">Details and partners are still being developed.</p>
            <p className="deck-label mt-[4vh]">Support depends on agreements and resources.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
