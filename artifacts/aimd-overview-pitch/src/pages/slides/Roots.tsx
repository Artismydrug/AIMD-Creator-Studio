export default function Roots() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute left-0 top-0 h-full w-[0.6vw] bg-accent" />
      <div className="flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <header className="flex items-center justify-between border-b border-rule pb-[1.6vh]">
          <p className="font-body text-[1.5vw] font-semibold uppercase tracking-[0.25em] text-muted">The AIMD foundation</p>
          <p className="font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">Built from the work</p>
        </header>
        <div className="grid grid-cols-[1.05fr_0.95fr] items-center gap-[6vw] py-[4vh]">
          <section>
            <h2 className="max-w-[48vw] font-display text-[5.2vw] font-extrabold uppercase leading-[0.91] tracking-[-0.01em] text-primary">An artist-led foundation</h2>
            <p className="mt-[3vh] max-w-[43vw] font-body text-[2.2vw] leading-[1.4] text-primary/90">AIMD grew from hands-on fine art, tattooing, leather craft, and community building in Downtown Los Angeles.</p>
            <p className="mt-[2.4vh] max-w-[42vw] border-l-[0.25vw] border-accent pl-[1.4vw] font-body text-[2vw] leading-[1.45] text-muted">The vision: bring craft, mindset, and meaningful connection into one creative community.</p>
          </section>
          <section className="grid grid-rows-3 border-y border-rule">
            <div className="flex items-center gap-[1.5vw] border-b border-rule py-[2.3vh]">
              <span aria-hidden="true" className="h-[0.3vw] w-[2.7vw] bg-accent" />
              <p className="font-display text-[3.1vw] font-bold uppercase tracking-[0.04em] text-primary">Craft</p>
            </div>
            <div className="flex items-center gap-[1.5vw] border-b border-rule py-[2.3vh]">
              <span aria-hidden="true" className="h-[0.3vw] w-[2.7vw] bg-accent" />
              <p className="font-display text-[3.1vw] font-bold uppercase tracking-[0.04em] text-primary">Creative mindset</p>
            </div>
            <div className="flex items-center gap-[1.5vw] py-[2.3vh]">
              <span aria-hidden="true" className="h-[0.3vw] w-[2.7vw] bg-accent" />
              <p className="font-display text-[3.1vw] font-bold uppercase tracking-[0.04em] text-primary">Community</p>
            </div>
          </section>
        </div>
        <footer className="flex items-center justify-between border-t border-rule pt-[1.6vh] font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">
          <span>Creator Studio by AIMD</span><span>Our roots</span>
        </footer>
      </div>
    </div>
  );
}