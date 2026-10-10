export default function YearOne() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Illustrative Year 1 model</h1>
      <p className="deck-label text-accent mt-[3vh]">Founder-provided projections—not actual results, audited guidance, or a guarantee.</p>
      <div className="grid grid-cols-3 gap-x-[4vw] gap-y-[5vh] mt-[6vh]">
        <div><p className="font-display font-bold text-[5vw]">500</p><p className="deck-label">Year-end paid subscribers</p></div>
        <div><p className="font-display font-bold text-[5vw]">~$45</p><p className="deck-label">Blended monthly ARPU</p></div>
        <div><p className="font-display font-bold text-[5vw] text-accent">$22.5k</p><p className="deck-label">Year-end MRR</p><p className="deck-label text-muted">$270k annualized run rate</p></div>
        <div><p className="font-display font-bold text-[5vw]">$157.5k</p><p className="deck-label">Cumulative gross revenue</p></div>
        <div><p className="font-display font-bold text-[5vw]">~$47k</p><p className="deck-label">Lean operating expenses</p></div>
        <div><p className="font-display font-bold text-[5vw] text-accent">+$110.5k</p><p className="deck-label">Modeled operating profit / EBITDA</p><p className="deck-label text-muted">Approximately 70% margin</p></div>
      </div>
      <p className="deck-label text-muted mt-[4vh]">Annualized run rate is not recognized revenue. Costs and margins require validation.</p>
    </div>
  );
}
