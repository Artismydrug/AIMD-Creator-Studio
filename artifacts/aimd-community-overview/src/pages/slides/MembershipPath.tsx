export default function MembershipPath() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="text-[4.8vw]">Start with your practice</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">A free starting point, with more learning to come.</p>
        <div className="grid grid-cols-3 gap-[2vw] mt-[4vh]">
          <div className="bg-accent p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Start free</h3>
            <p className="font-display font-bold text-[3.5vw] leading-[1.1] mt-[5vh]">Make a little progress.</p>
            <p className="deck-body mt-[4vh]">Habits, community, Your Canvas &amp; workshop previews.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Build your craft</h3>
            <p className="font-display font-bold text-[3.5vw] leading-[1.1] mt-[5vh]">Learn together.</p>
            <p className="deck-body mt-[4vh]">Workshop previews now. Full lessons are in development.</p>
          </div>
          <div className="bg-accent/20 p-[2.4vw] h-[50vh]">
            <h3 className="deck-name">Grow over time</h3>
            <p className="font-display font-bold text-[3.5vw] leading-[1.1] mt-[5vh]">More support ahead.</p>
            <p className="deck-body mt-[4vh]">Mentorship and career pathways are in development.</p>
          </div>
        </div>
        <p className="deck-label mt-[3vh] text-muted">Future offerings depend on programs and partners.</p>
      </div>
    </div>
  );
}
