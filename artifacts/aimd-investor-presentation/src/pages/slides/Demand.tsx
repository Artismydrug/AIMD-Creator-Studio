export default function Demand() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Investor questions: demand</h1>
      <div className="mt-[8vh] space-y-[7vh]">
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-[6vw] border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name text-accent">What could improve retention?</h2>
          <p className="deck-body">Daily practice connects to learning, feedback, and professional growth. Retention remains a thesis to test.</p>
        </div>
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-[6vw] border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name text-accent">How will acquisition work?</h2>
          <p className="deck-body">Artist content, previews, challenges, workshops, and events are proposed channels. CAC is not established.</p>
        </div>
      </div>
    </div>
  );
}
