export default function Ecosystem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">The connected ecosystem</h1>
      <div className="grid grid-cols-[0.9fr_1.1fr] gap-[6vw] mt-[8vh]">
        <div className="bg-primary p-[3vw]">
          <h2 className="font-display font-bold text-[4vw] leading-[1.1]">Digital foundation</h2>
          <p className="deck-body mt-[4vh]">Daily practice, craft learning, community feedback, and professional tools.</p>
        </div>
        <div>
          <h2 className="deck-name text-accent">Planned physical expansion</h2>
          <div className="deck-body space-y-[4vh] mt-[4vh]">
            <p>Mobile container studios</p>
            <p>Gallery shows and pop-up markets</p>
            <p>Artist retreats and residencies</p>
          </div>
          <p className="deck-label text-muted mt-[5vh]">Expansion concepts—not operating assets or current member benefits.</p>
        </div>
      </div>
    </div>
  );
}
