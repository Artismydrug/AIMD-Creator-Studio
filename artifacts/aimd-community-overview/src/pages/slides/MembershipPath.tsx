export default function MembershipPath() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="deck-title mb-[5vh]">Proposed membership model</h2>
        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-accent p-[2.4vw] h-[53vh]">
            <h3 className="deck-name">Discovering Artist</h3>
            <p className="font-display font-bold text-[5vw] mt-[3vh]">$0</p>
            <p className="deck-label">Free entry</p>
            <p className="deck-body mt-[4vh]">Community, habits, challenges, and previews.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[53vh]">
            <h3 className="deck-name">Dedicated Artist</h3>
            <p className="font-display font-bold text-[4.3vw] mt-[3vh]">$39.99</p>
            <p className="deck-label">/ month · $399 / year</p>
            <p className="deck-body mt-[4vh]">Full craft modules and workshop feedback.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[53vh]">
            <h3 className="deck-name">Professional Artist</h3>
            <p className="font-display font-bold text-[5vw] mt-[3vh]">$99</p>
            <p className="deck-label">/ month · $999 / year</p>
            <p className="deck-body mt-[4vh]">Business modules, client pipelines, planned mentoring.</p>
          </div>
        </div>
        <p className="deck-label mt-[3vh] text-muted">Proposed pricing and benefits. Paid checkout is not live; residency access is planned.</p>
      </div>
    </div>
  );
}
