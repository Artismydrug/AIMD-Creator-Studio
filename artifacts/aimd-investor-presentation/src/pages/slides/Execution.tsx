export default function Execution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">The operating system</h1>
      <div className="grid grid-cols-2 gap-[6vw] mt-[8vh]">
        <div>
          <h2 className="deck-name text-accent">Modular content production</h2>
          <p className="font-display font-bold text-[5vw] leading-[1.1] mt-[5vh]">$500–$1,000</p>
          <p className="deck-label text-muted mt-[2vh]">Target cost per modular video block</p>
          <p className="deck-body mt-[5vh]">Anthony Davila leads multi-camera instruction shoots and reusable technical learning blocks.</p>
        </div>
        <div className="border-t border-muted/30 pt-[3vh]">
          <h2 className="deck-name text-accent">Cloud-first foundation</h2>
          <p className="deck-body mt-[6vh]">Replit cloud infrastructure</p>
          <p className="deck-body mt-[4vh]">Stripe and in-app payment routing</p>
          <p className="deck-label text-muted mt-[6vh]">Technology foundation, not a claim of live paid checkout.</p>
        </div>
      </div>
    </div>
  );
}
