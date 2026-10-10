export default function CurriculumFit() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Curriculum alignment</h1>
      <p className="deck-body text-muted mt-[4vh]">A school partnership can start with the learning already in place.</p>
      <div className="grid grid-cols-3 gap-[4vw] mt-[9vh]">
        <div>
          <h2 className="font-display font-bold text-[3.3vw] text-primary">Video reflection</h2>
          <p className="deck-body mt-[3vh]">Future workshops could add quick questions and reflection prompts.</p>
        </div>
        <div>
          <h2 className="font-display font-bold text-[3.3vw] text-primary">Canvas workflows</h2>
          <p className="deck-body mt-[3vh]">Explore assignment handoff and teacher review with school partners.</p>
        </div>
        <div>
          <h2 className="font-display font-bold text-[3.3vw] text-primary">Local CTE fit</h2>
          <p className="deck-body mt-[3vh]">Map projects to current courses; validate local standards and funding rules.</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[8vh]">Roadmap topics—not current Canvas integration, graded assignment transfer, or guaranteed funding outcomes.</p>
    </div>
  );
}
