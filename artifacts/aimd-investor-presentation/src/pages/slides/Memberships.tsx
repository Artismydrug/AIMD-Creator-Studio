export default function Memberships() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Proposed membership model</h1>
      <div className="grid grid-cols-3 gap-[2vw] mt-[6vh]">
        <div className="bg-primary p-[2.4vw] h-[53vh]">
          <h2 className="deck-name">Inspiring Artist</h2>
          <p className="font-display font-bold text-[5vw] mt-[3vh]">$0</p>
          <p className="deck-label">Free entry</p>
          <p className="deck-body mt-[4vh]">Community, habits, challenges, and previews.</p>
        </div>
        <div className="bg-primary/45 p-[2.4vw] h-[53vh]">
          <h2 className="deck-name">Dedicated Artist</h2>
          <p className="font-display font-bold text-[4.3vw] mt-[3vh]">$39.99</p>
          <p className="deck-label">/ month · $399 / year</p>
          <p className="deck-body mt-[4vh]">Full craft modules and workshop feedback.</p>
        </div>
        <div className="bg-primary/45 p-[2.4vw] h-[53vh]">
          <h2 className="deck-name">Professional Artist</h2>
          <p className="font-display font-bold text-[5vw] mt-[3vh]">$99</p>
          <p className="deck-label">/ month · $999 / year</p>
          <p className="deck-body mt-[4vh]">Business modules, client pipelines, planned mentoring.</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[3vh]">Proposed pricing and benefits. Paid checkout is not live; residency access is planned.</p>
    </div>
  );
}
