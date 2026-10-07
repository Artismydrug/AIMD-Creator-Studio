export default function Practice() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute bottom-0 right-0 h-[48vh] w-[26vw] border-l border-t border-rule" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <header className="flex items-center justify-between border-b border-rule pb-[1.6vh]">
          <p className="font-body text-[1.5vw] font-semibold uppercase tracking-[0.25em] text-muted">Daily creative practice</p>
          <p className="font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">Discipline eats talent</p>
        </header>
        <div className="py-[4vh]">
          <h2 className="font-display text-[5vw] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] text-primary">Practice with purpose</h2>
          <p className="mt-[1.7vh] font-body text-[2vw] text-muted">Build the habit. Meet the challenge. Keep the progress.</p>
          <div className="mt-[6vh] grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-[1.2vw]">
            <article className="min-h-[25vh] bg-surface p-[2vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.9vw] font-bold uppercase text-primary">Choose a habit</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.4] text-muted">Set a repeatable creative routine.</p>
            </article>
            <span aria-hidden="true" className="font-body text-[2.5vw] text-accent">→</span>
            <article className="min-h-[25vh] bg-surface p-[2vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.9vw] font-bold uppercase text-primary">Log the work</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.4] text-muted">Save a practice session and its proof.</p>
            </article>
            <span aria-hidden="true" className="font-body text-[2.5vw] text-accent">→</span>
            <article className="min-h-[25vh] bg-surface p-[2vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.9vw] font-bold uppercase text-primary">See progress</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.4] text-muted">Track practice, challenges, and milestones.</p>
            </article>
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-rule pt-[1.6vh] font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">
          <span>Creative work, made visible</span><span>Built for practice</span>
        </footer>
      </div>
    </div>
  );
}