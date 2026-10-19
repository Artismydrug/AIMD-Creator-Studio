export default function CreatorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-full h-[28vh] deck-accent" />
      <div className="deck-content">
        <h2 className="text-[5vw]">The creator journey</h2>
        <div className="grid grid-cols-3 gap-[4vw] mt-[16vh]">
          <div className="deck-rule pt-[3vh]">
            <h3 className="deck-name">Daily practice</h3>
            <p className="deck-body mt-[3vh]">Creative routines, shared work &amp; private Learning Portfolio reflections.</p>
            <p className="deck-label text-muted mt-[4vh]">Available in the app</p>
          </div>
          <div className="deck-rule pt-[3vh]">
            <h3 className="deck-name">Future opportunities</h3>
            <p className="deck-body mt-[3vh]">Mentorship, exhibitions &amp; professional growth as programs develop.</p>
            <p className="deck-label text-muted mt-[4vh]">Planned—not current benefits</p>
          </div>
          <div className="deck-rule pt-[3vh]">
            <h3 className="deck-name">Artist resort &amp; retreats</h3>
            <p className="deck-body mt-[3vh]">A larger project for community &amp; professional artists: collaboration, retreats &amp; mentorship.</p>
            <p className="deck-label text-muted mt-[4vh]">Long-term concept—not operating or a guaranteed member benefit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
