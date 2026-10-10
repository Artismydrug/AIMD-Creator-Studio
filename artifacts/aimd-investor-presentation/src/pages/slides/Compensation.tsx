export default function Compensation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">The compensation roadmap</h1>
      <div className="flex gap-[2vw] items-stretch mt-[9vh]">
        <div className="w-[27vw] bg-primary p-[2.4vw]">
          <p className="deck-label text-accent">PHASE A</p>
          <h2 className="deck-name mt-[5vh]">Sweat equity / trade</h2>
          <p className="deck-body mt-[4vh]">Soft launch</p>
        </div>
        <div className="w-[27vw] border-t border-muted/40 p-[2.4vw]">
          <p className="deck-label text-accent">PHASE B</p>
          <h2 className="deck-name mt-[5vh]">Hourly / retainers</h2>
          <p className="deck-body mt-[4vh]">Growth supports pay through Gusto.</p>
        </div>
        <div className="w-[27vw] border-t border-muted/40 p-[2.4vw]">
          <p className="deck-label text-accent">PHASE C</p>
          <h2 className="deck-name mt-[5vh]">Salaries + bonus pool</h2>
          <p className="deck-body mt-[4vh]">Quarterly bonuses after 500 subscribers.</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[7vh]">Illustrative compensation phases and trigger—not a current pay commitment.</p>
    </div>
  );
}
