export default function Learning() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <p className="deck-label text-primary">WHAT EDUCATORS &amp; STUDENTS GET</p>
      <h1 className="deck-title mt-[3vh]">Creative learning</h1>
      <div className="grid grid-cols-2 gap-[6vw] mt-[8vh]">
        <div className="border-t border-primary/30 pt-[4vh]">
          <h2 className="deck-name text-primary">Multi-medium video workshops</h2>
          <p className="deck-body mt-[5vh]">Visual art, tattoo artistry, music, movement, and more.</p>
          <p className="deck-label text-muted mt-[5vh]">Workshop videos are in production—not a completed lesson library.</p>
        </div>
        <div className="border-t border-primary/30 pt-[4vh]">
          <h2 className="deck-name text-primary">Interactive feedback channels</h2>
          <p className="deck-body mt-[5vh]">Share work, ask questions, and learn through community posts and thoughtful responses.</p>
          <p className="deck-label text-muted mt-[5vh]">Instruction and participation depend on the program.</p>
        </div>
      </div>
    </div>
  );
}
