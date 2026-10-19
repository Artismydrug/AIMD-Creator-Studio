const base = import.meta.env.BASE_URL;

export default function InstructorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Sketchbook and art tools on a creative work surface" className="absolute right-0 top-0 w-[45vw] h-full object-cover object-left" />
      <div className="absolute left-[6vw] top-[8vh] bottom-[8vh] w-[43vw] flex flex-col justify-center deck-compact-rows">
        <h2 className="text-[4.8vw] mb-[3vh]">Instructor partnerships</h2>
        <p className="deck-name mb-[4vh]">We’re looking for instructors.</p>
        <p className="deck-body deck-row">Teach practical, craft-focused workshops.</p>
        <p className="deck-body deck-row">Discuss lesson development &amp; production support with AIMD.</p>
        <p className="deck-body deck-row font-bold text-accent">Planned percentage-based royalties.</p>
        <p className="deck-label text-muted mt-[4vh]">Percentage, revenue basis &amp; payment terms agreed individually before launch.</p>
      </div>
    </div>
  );
}
