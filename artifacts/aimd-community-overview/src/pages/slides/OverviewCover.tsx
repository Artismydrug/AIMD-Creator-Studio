const base = import.meta.env.BASE_URL;

export default function OverviewCover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Art-making workspace with sketchbook, brushes and color swatches" className="absolute inset-0 w-full h-full object-cover" />
      <div className="deck-cover-card deck-paper">
        <div className="relative z-10">
          <div className="flex items-center gap-[1.2vw] mb-[5vh]">
            <img src={`${base}aimd-app-icon.png`} crossOrigin="anonymous" alt="AIMD Creator Studio app icon" className="w-[5.2vw] h-[5.2vw] object-contain shadow-md" />
            <p className="deck-label font-bold">COMMUNITY &amp; PARTNER OVERVIEW</p>
          </div>
          <h1 className="text-[4.3vw] mb-[3vh]">Creator Studio by AIMD</h1>
          <p className="deck-body text-muted">Raw talent deserves a real-world path. Discipline Eats Talent.</p>
          <div className="deck-rule mt-[5vh] pt-[2vh]">
            <p className="deck-label">artismydrug.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
