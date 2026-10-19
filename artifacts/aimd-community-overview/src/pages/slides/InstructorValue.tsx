const base = import.meta.env.BASE_URL;

export default function InstructorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Sketchbook and art tools on a creative work surface" className="absolute right-0 top-0 w-[45vw] h-full object-cover object-left" />
      <div className="absolute left-[6vw] top-[8vh] bottom-[8vh] w-[43vw] flex flex-col justify-center deck-compact-rows">
        <h2 className="deck-split-title mb-[4vh]">Teach, Scale, and Earn With Industry Leaders</h2>
        <p className="deck-body deck-row">Help shape practical, craft-focused workshops</p>
        <p className="deck-body deck-row">Discuss production support and lesson development with AIMD</p>
        <p className="deck-body deck-row">Build a connection with an emerging creator community</p>
        <p className="deck-body deck-row">Compensation and participation terms agreed individually</p>
      </div>
    </div>
  );
}
