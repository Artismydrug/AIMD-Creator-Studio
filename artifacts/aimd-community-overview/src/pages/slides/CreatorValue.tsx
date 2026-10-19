const base = import.meta.env.BASE_URL;

export default function CreatorValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-full h-[28vh] deck-accent" />
      <div className="deck-content">
        <h2 className="text-[5vw]">The creator journey</h2>
        <p className="text-[2vw] leading-[1.35] mt-[2vh]">Build a routine → deepen your craft → explore future opportunities.</p>
        <div className="grid grid-cols-3 gap-[2.5vw] mt-[5vh]">
          <div className="deck-rule pt-[2vh]">
            <img
              src={`${base}daily-sketching.jpg`}
              crossOrigin="anonymous"
              alt="Illustrative image of an artist actively practicing pencil sketching"
              className="w-full h-[22vh] object-cover object-[center_62%]"
            />
            <h3 className="deck-name mt-[2vh]">Daily practice</h3>
            <p className="text-[2vw] leading-[1.35] mt-[1.2vh]">Habits, Creator Arcade, shared work &amp; private learning reflections.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Available in the app</p>
          </div>
          <div className="deck-rule pt-[2vh]">
            <figure className="relative">
              <img
                src={`${base}online-art-teaching.jpg`}
                crossOrigin="anonymous"
                alt="Illustrative image of an art teacher demonstrating painting to students over a group video call"
                className="w-full h-[22vh] object-cover"
              />
              <figcaption className="absolute right-[0.6vw] bottom-[0.6vh] bg-black/65 px-[0.6vw] py-[0.3vh] text-[1.5vw] text-white">Illustrative lesson</figcaption>
            </figure>
            <h3 className="deck-name mt-[2vh]">Future opportunities</h3>
            <p className="text-[2vw] leading-[1.35] mt-[1.2vh]">Mentorship, exhibitions &amp; professional pathways as programs develop.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Planned—not current benefits</p>
          </div>
          <div className="deck-rule pt-[2vh]">
            <img
              src={`${base}artist-resort-retreats.jpeg`}
              crossOrigin="anonymous"
              alt="Concept image of an artist retreat among the Joshua Tree desert landscape"
              className="w-full h-[22vh] object-cover"
            />
            <h3 className="deck-name mt-[2vh]">Artist resort &amp; retreats</h3>
            <p className="text-[2vw] leading-[1.35] mt-[1.2vh]">Long-term spaces for community, collaboration &amp; professional artist retreats.</p>
            <p className="deck-label text-muted mt-[1.6vh]">Concept only—not operating or a guaranteed member benefit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
