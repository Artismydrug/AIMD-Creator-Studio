export default function Market() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Market context</h1>
      <div className="grid grid-cols-[1.1fr_1fr] gap-[6vw] mt-[6vh]">
        <div>
          <p className="font-display font-bold text-[12vw] leading-none text-accent">$250B</p>
          <p className="deck-body mt-[3vh]">2023 creator-economy estimate.</p>
          <p className="deck-body mt-[2vh]">$480B projected by 2027.</p>
          <a className="deck-label text-muted underline block mt-[4vh]" href="https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027" target="_blank" rel="noopener noreferrer">Goldman Sachs Research · April 2023</a>
        </div>
        <div className="pt-[3vh] border-t border-muted/30">
          <p className="font-display font-bold text-[7vw] leading-none text-accent">40%+</p>
          <p className="deck-body mt-[3vh]">of creators work alone.</p>
          <p className="deck-body mt-[3vh]">40% depend on unpaid help.</p>
          <a className="deck-label text-muted underline block mt-[4vh]" href="https://creativeclass.com/reports/The-Creator-Revolution.pdf" target="_blank" rel="noopener noreferrer">Creative Class · 20-country survey · December 2024</a>
        </div>
      </div>
      <p className="deck-label text-muted mt-[5vh]">Historical research—not current market sizing or AIMD results.</p>
    </div>
  );
}
