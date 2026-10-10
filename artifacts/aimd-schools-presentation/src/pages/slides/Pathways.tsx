export default function Pathways() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Creative work in view</h1>
      <div className="mt-[9vh] space-y-[7vh]">
        <div className="grid grid-cols-[0.85fr_1.15fr] gap-[6vw] border-t border-primary/30 pt-[4vh]">
          <h2 className="deck-name text-primary">Digital portfolios</h2>
          <p className="deck-body">Profiles and Studio posts create a portfolio-style record of creative work and progress.</p>
        </div>
        <div className="grid grid-cols-[0.85fr_1.15fr] gap-[6vw] border-t border-primary/30 pt-[4vh]">
          <h2 className="deck-name text-primary">Real-world creative pathways</h2>
          <p className="deck-body">Explore creative disciplines, professional habits, and community connections beyond a single assignment.</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[6vh]">A space for exploration—not a guarantee of placements, jobs, or career outcomes.</p>
    </div>
  );
}
