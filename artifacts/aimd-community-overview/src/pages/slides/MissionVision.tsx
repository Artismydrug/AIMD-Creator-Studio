export default function MissionVision() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-[6vw] top-[8vh] w-[55vw]">
        <p className="deck-label font-bold text-accent tracking-[0.15em]">MISSION &amp; VISION</p>
        <h2 className="text-[4.8vw] mt-[2vh]">From passion<br />to purpose.</h2>
        <div className="deck-rule mt-[5vh] pt-[2vh]">
          <h3 className="text-[1.5vw] font-bold text-accent">OUR MISSION</h3>
          <p className="font-display font-bold text-[2.8vw] leading-[1.15] mt-[1.5vh]">Bridge the gap between raw artistic talent and sustainable professional independence.</p>
          <p className="text-[1.8vw] leading-[1.4] mt-[2vh]">Through daily practice, worldwide connection, and a physical + digital creative ecosystem.</p>
        </div>
        <div className="deck-rule mt-[3vh] pt-[2vh]">
          <h3 className="text-[1.5vw] font-bold text-accent">OUR VISION</h3>
          <p className="text-[1.9vw] leading-[1.35] mt-[1.5vh]">Build a lasting backbone for independent art—beyond a one-off event or workshop.</p>
        </div>
      </div>
      <div className="absolute right-[6vw] top-[8vh] bottom-[8vh] w-[30vw] deck-accent px-[2.5vw] py-[3vh] flex flex-col justify-between gap-[3vh]">
        <div>
          <p className="deck-label font-bold">THE FOUNDER’S JOURNEY</p>
          <figure className="relative mt-[1.4vh]">
            <img
              src={`${import.meta.env.BASE_URL}founder-teaching.jpg`}
              crossOrigin="anonymous"
              alt="Edward “Poncho” Davila teaching a young artist during a community art session"
              className="w-full h-[24vh] object-cover object-[center_42%]"
            />
            <figcaption className="absolute left-[0.6vw] bottom-[0.6vh] bg-black/65 px-[0.45vw] py-[0.25vh] text-[0.8vw] text-white">Teaching art in the community</figcaption>
          </figure>
          <h3 className="text-[2vw] font-display font-bold leading-[1.1] mt-[1.5vh]">Edward “Poncho” Davila</h3>
          <p className="deck-label mt-[0.7vh]">@ponchotheartist</p>
          <p className="text-[1.3vw] leading-[1.35] mt-[1.2vh]">More than a decade of tattooing, muralism &amp; Los Angeles community events—built through daily dedication and discipline.</p>
        </div>
        <div className="deck-rule pt-[2.5vh]">
          <h3 className="text-[1.8vw] font-display font-bold leading-[1.15]">Talent—not capital—should shape an artist’s path.</h3>
          <p className="text-[1.3vw] leading-[1.35] mt-[1.2vh]">We aim to expand access through brand sponsorships &amp; endorsements.</p>
          <p className="text-[1.05vw] leading-[1.3] mt-[1.2vh]">Accessibility is a goal; programs depend on partners &amp; resources.</p>
        </div>
      </div>
    </div>
  );
}
