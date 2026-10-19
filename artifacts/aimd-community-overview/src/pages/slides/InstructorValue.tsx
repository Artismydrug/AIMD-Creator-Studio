const base = import.meta.env.BASE_URL;

export default function InstructorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Sketchbook and art tools on a creative work surface" className="absolute right-0 top-0 w-[45vw] h-full object-cover object-left" />
      <div className="absolute left-[6vw] top-[8vh] bottom-[8vh] w-[46vw] flex flex-col justify-center deck-compact-rows">
        <h2 className="text-[4.8vw] mb-[3vh]">Instructor partnerships</h2>
        <p className="text-[2vw] leading-[1.2] font-bold mb-[2vh]">5+ years of experience in your specific medium.</p>
        <p className="text-[2vw] leading-[1.4] mb-[2vh]">Music · Fitness · Painting · Fashion design · And more</p>
        <p className="text-[2vw] leading-[1.3] font-bold deck-row"><span className="block">Bring your community.</span><span className="block">Let’s build this together.</span></p>
        <p className="text-[2vw] leading-[1.35] deck-row">Practical workshops, lesson development &amp; production support with AIMD.</p>
        <p className="deck-body deck-row font-bold text-accent">Planned percentage-based royalties.</p>
        <p className="deck-label text-muted mt-[2vh]">Percentage, revenue basis &amp; payment terms agreed individually before launch.</p>
      </div>
    </div>
  );
}
