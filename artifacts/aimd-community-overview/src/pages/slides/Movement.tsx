const base = import.meta.env.BASE_URL;

export default function Movement() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-[39vw] h-full deck-accent">
        <img src={`${base}aimd-logo-transparent.png`} crossOrigin="anonymous" alt="Original white AIMD logo with transparent background" className="absolute left-[6vw] top-[10vh] w-[27vw] object-contain" />
        <div className="absolute left-[6vw] top-[39vh] w-[27vw]">
          <h2 className="text-[2.6vw]">Rooted in Los Angeles</h2>
          <p className="text-[1.75vw] leading-[1.3] mt-[1.8vh]">Founded by Edward “Poncho” Davila, @ponchotheartist</p>
          <p className="text-[1.75vw] leading-[1.3] mt-[1.8vh]">Live art, community gatherings &amp; collaborative pop-ups.</p>
          <div className="grid grid-cols-2 gap-[1.2vw] mt-[1.8vh] pt-[1.5vh] deck-rule">
            <div>
              <p className="font-display font-bold text-[2.8vw] leading-none text-[#fffaf2]">48.6K</p>
              <p className="deck-label mt-[0.6vh]">@ponchotheartist<br />followers</p>
            </div>
            <div>
              <p className="font-display font-bold text-[2.8vw] leading-none text-[#fffaf2]">6,195</p>
              <p className="deck-label mt-[0.6vh]">@artismydrug<br />followers</p>
            </div>
          </div>
          <p className="text-[0.85vw] leading-[1.2] text-muted mt-[1vh]">Instagram profile snapshots · October 18, 2026. Account audiences may overlap; these are not unique-reach figures.</p>
        </div>
      </div>
      <div className="absolute left-[44vw] right-[6vw] top-[8vh] bottom-[8vh]">
        <h2 className="text-[4.5vw]">The independent creator opportunity</h2>
        <p className="text-[2vw] leading-[1.4] mt-[3vh]">Habits, learning &amp; community connect daily practice with real-world opportunity.</p>
        <div className="grid grid-cols-2 gap-[2.4vw] mt-[5vh] pt-[3vh] deck-rule">
          <div>
            <p className="font-display font-bold text-[6.5vw] leading-none text-accent">$37B</p>
            <p className="deck-label mt-[2vh]">U.S. creator advertising spend in 2025.</p>
            <a className="deck-label text-muted underline block mt-[3vh]" href="https://www.iab.com/news/digital-ad-revenue-climbs-to-nearly-300b-as-iab-celebrates-30-year-anniversary/" target="_blank" rel="noopener noreferrer">IAB + PwC · April 2026</a>
          </div>
          <div>
            <p className="font-display font-bold text-[6.5vw] leading-none text-accent">40%+</p>
            <p className="deck-label mt-[2vh]">Work alone; 40% depend on unpaid help.</p>
            <a className="deck-label text-muted underline block mt-[3vh]" href="https://creativeclass.com/reports/The-Creator-Revolution.pdf" target="_blank" rel="noopener noreferrer">Creative Class · 20-country survey · December 2024</a>
          </div>
        </div>
        <p className="deck-label text-muted mt-[3vh]">These industry measures use different scopes; the IAB figure is U.S. creator advertising, not the total creator economy. Neither represents AIMD results.</p>
      </div>
    </div>
  );
}
