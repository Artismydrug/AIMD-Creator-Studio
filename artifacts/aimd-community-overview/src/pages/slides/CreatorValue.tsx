const base = import.meta.env.BASE_URL;

export default function CreatorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-full h-[28vh] deck-accent" />
      <div className="deck-content">
        <h2 className="text-[5vw]">The creator journey</h2>
        <div className="grid grid-cols-3 gap-[2.5vw] mt-[10vh]">
          <div className="deck-rule pt-[2vh]">
            <img
              src={`${base}creative-workspace.jpg`}
              crossOrigin="anonymous"
              alt="Sketchbook and artist tools arranged in a creative workspace"
              className="w-full h-[24vh] object-cover"
            />
            <h3 className="deck-name mt-[2vh]">Daily practice</h3>
            <p className="text-[1.65vw] leading-[1.35] mt-[1.2vh]">Creative routines, shared work &amp; private Learning Portfolio reflections.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Available in the app</p>
          </div>
          <div className="deck-rule pt-[2vh]">
            <figure className="relative">
              <img
                src={`${base}artist-mentorship.jpg`}
                crossOrigin="anonymous"
                alt="Artists gathered around a table during a collaborative mentorship session"
                className="w-full h-[24vh] object-cover"
              />
              <figcaption className="absolute right-[0.6vw] bottom-[0.6vh] bg-black/65 px-[0.45vw] py-[0.25vh] text-[0.7vw] text-white">Community photo: ARTogether</figcaption>
            </figure>
            <h3 className="deck-name mt-[2vh]">Future opportunities</h3>
            <p className="text-[1.65vw] leading-[1.35] mt-[1.2vh]">Mentorship, exhibitions &amp; professional growth as programs develop.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Planned—not current benefits</p>
          </div>
          <div className="deck-rule pt-[2vh]">
            <img
              src={`${base}artist-resort-retreats.jpeg`}
              crossOrigin="anonymous"
              alt="Concept image of an artist retreat among the Joshua Tree desert landscape"
              className="w-full h-[24vh] object-cover"
            />
            <h3 className="deck-name mt-[2vh]">Artist resort &amp; retreats</h3>
            <p className="text-[1.65vw] leading-[1.35] mt-[1.2vh]">A larger project for community &amp; professional artists: collaboration, retreats &amp; mentorship.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Long-term concept—not operating or a guaranteed member benefit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
