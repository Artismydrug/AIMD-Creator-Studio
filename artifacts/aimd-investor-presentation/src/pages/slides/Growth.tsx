export default function Growth() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Illustrative growth assumptions</h1>
      <p className="deck-label text-accent mt-[3vh]">Founder-provided projections—not actual results or a guarantee.</p>
      <div className="grid grid-cols-2 gap-[6vw] mt-[7vh]">
        <div className="border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name">Year 2</h2>
          <p className="font-display font-bold text-[7.8vw] text-accent leading-none mt-[4vh]">&gt; $1.1M</p>
          <p className="deck-body mt-[4vh]">Gross revenue</p>
          <p className="deck-label text-muted mt-[2vh]">Assumed margins of 75%+</p>
        </div>
        <div className="border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name">Year 3</h2>
          <p className="font-display font-bold text-[7.8vw] text-accent leading-none mt-[4vh]">&gt; $2.86M</p>
          <p className="deck-body mt-[4vh]">Gross revenue</p>
          <p className="deck-label text-muted mt-[2vh]">Technology overhead assumed to flatten</p>
        </div>
      </div>
      <p className="deck-body text-muted mt-[7vh]">Support, payments, infrastructure, and physical programs still carry variable costs.</p>
    </div>
  );
}
