const base = import.meta.env.BASE_URL;

export default function InstructorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Sketchbook and art tools on a creative work surface" className="absolute right-0 top-0 w-[45vw] h-full object-cover object-left" />
      <div className="absolute left-[6vw] top-[8vh] bottom-[8vh] w-[43vw] flex flex-col justify-center deck-compact-rows">
        <h2 className="deck-split-title mb-[4vh]">We’re looking for instructors</h2>
        <p className="deck-body deck-row">Teach practical, craft-focused workshops with AIMD</p>
        <p className="deck-body deck-row">Discuss production support and lesson development with AIMD</p>
        <p className="deck-body deck-row">Planned percentage-based royalties for participating instructors</p>
        <p className="deck-body deck-row">Royalty percentage, revenue basis, and payment terms agreed individually before launch</p>
      </div>
    </div>
  );
}
