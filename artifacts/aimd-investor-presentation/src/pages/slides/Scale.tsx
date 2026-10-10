export default function Scale() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Investor questions: scale</h1>
      <div className="grid grid-cols-2 gap-[6vw] mt-[9vh]">
        <div className="border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name text-accent">Can margins hold?</h2>
          <p className="deck-body mt-[5vh]">Reusable lessons may support scale. Infrastructure, support, payments, and physical programming still add costs.</p>
        </div>
        <div className="border-t border-muted/30 pt-[4vh]">
          <h2 className="deck-name text-accent">How does digital support physical?</h2>
          <p className="deck-body mt-[5vh]">Membership could inform and fund phased expansion. Studios, markets, retreats, and residencies remain planned concepts.</p>
        </div>
      </div>
    </div>
  );
}
