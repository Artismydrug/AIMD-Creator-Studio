const base = import.meta.env.BASE_URL;

export default function Movement() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-[39vw] h-full deck-accent">
        <img src={`${base}aimd-logo-transparent.png`} crossOrigin="anonymous" alt="Original white AIMD logo with transparent background" className="absolute left-[6vw] top-[10vh] w-[27vw] object-contain" />
        <div className="absolute left-[6vw] top-[46vh] w-[27vw]">
          <h2 className="text-[2.6vw]">Rooted in Los Angeles</h2>
          <p className="text-[2.05vw] leading-[1.4] mt-[3vh]">Founded by Edward “Poncho” Davila, @ponchotheartist</p>
          <p className="text-[2.05vw] leading-[1.4] mt-[3vh]">Live art, community gatherings &amp; collaborative pop-ups.</p>
        </div>
      </div>
      <div className="absolute left-[44vw] right-[6vw] top-[8vh] bottom-[8vh]">
        <h2 className="text-[4.5vw]">The independent creator opportunity</h2>
        <p className="text-[2vw] leading-[1.4] mt-[3vh]">Habits, learning &amp; community connect daily practice with real-world opportunity.</p>
        <div className="grid grid-cols-2 gap-[2.4vw] mt-[5vh] pt-[3vh] deck-rule">
          <div>
            <p className="font-display font-bold text-[6.5vw] leading-none text-accent">$250B</p>
            <p className="deck-label mt-[2vh]">2023 creator-economy estimate; $480B projected by 2027.</p>
            <a className="deck-label text-muted underline block mt-[3vh]" href="https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027" target="_blank" rel="noopener noreferrer">Goldman Sachs · April 2023</a>
          </div>
          <div>
            <p className="font-display font-bold text-[6.5vw] leading-none text-accent">40%+</p>
            <p className="deck-label mt-[2vh]">Work alone; 40% depend on unpaid help.</p>
            <a className="deck-label text-muted underline block mt-[3vh]" href="https://creativeclass.com/reports/The-Creator-Revolution.pdf" target="_blank" rel="noopener noreferrer">Creative Class · 20-country survey · December 2024</a>
          </div>
        </div>
        <p className="deck-label text-muted mt-[3vh]">Historical research—not current market sizing or AIMD results.</p>
      </div>
    </div>
  );
}
