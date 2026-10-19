export default function MembershipPath() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="text-[4.8vw]">Membership for every stage</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Practice daily → deepen your craft → grow professionally.</p>
        <div className="grid grid-cols-3 gap-[2vw] mt-[4vh]">
          <div className="bg-accent p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Discovering Artist</h3>
            <p className="font-display font-bold text-[5vw] leading-none mt-[3vh]">$0</p>
            <p className="deck-label">Free entry</p>
            <p className="deck-body mt-[4vh]">Community, habits, Creator Arcade &amp; workshop previews.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Dedicated Artist</h3>
            <p className="font-display font-bold text-[4.3vw] leading-none mt-[3vh]">$39.99</p>
            <p className="deck-label">/ month · $399 / year</p>
            <p className="deck-body mt-[4vh]">Planned craft modules &amp; workshop feedback.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Professional Artist</h3>
            <p className="font-display font-bold text-[5vw] leading-none mt-[3vh]">$99</p>
            <p className="deck-label">/ month · $999 / year</p>
            <p className="deck-body mt-[4vh]">Planned business learning, mentoring &amp; career pathways.</p>
          </div>
        </div>
        <p className="deck-label mt-[3vh] text-muted">Free access is available. Paid pricing and benefits are proposed; paid checkout is not live.</p>
      </div>
    </div>
  );
}
