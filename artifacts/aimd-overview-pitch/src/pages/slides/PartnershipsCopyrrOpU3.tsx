export default function PartnershipsCopyrrOpU3() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute bottom-0 right-0 h-[72vh] w-[42vw] border-l border-t border-accent/50" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <header className="flex items-center justify-between border-b border-rule pb-[1.6vh]">
          <p className="font-body text-[1.5vw] font-semibold uppercase tracking-[0.25em] text-muted">An invitation</p>
          <p className="font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">Build with AIMD</p>
        </header>
        <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-[5vw] py-[3vh]">
          <section>
            <h2 className="max-w-[39vw] font-display text-[5.1vw] font-extrabold uppercase leading-[0.91] tracking-[-0.015em] text-primary">Support for schools and teachers</h2>
            <p className="mt-[2.5vh] max-w-[36vw] font-body text-[2vw] leading-[1.4] text-muted">Bring artist-led resources and hands-on creative practice alongside existing school instruction.</p>
            <div className="mt-[4vh] flex items-center gap-[0.8vw] border-t border-rule pt-[1.6vh] font-display text-[2.5vw] font-bold uppercase text-accent">
              <span aria-hidden="true">↗</span>
              <span>Explore a school partnership</span>
            </div>
          </section>
          <section className="grid grid-cols-2 gap-x-[1.4vw] gap-y-[2.3vh]">
            <article className="min-h-[23vh] bg-surface p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[1.8vh] font-display text-[2.4vw] font-bold uppercase text-primary">Teachers</h3>
              <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Use artist-led modules with classroom teaching.</p>
            </article>
            <article className="min-h-[23vh] bg-surface p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[1.8vh] font-display text-[2.4vw] font-bold uppercase text-primary">Students</h3>
              <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Build habits, join challenges, share work.</p>
            </article>
            <article className="min-h-[23vh] bg-surface p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[1.8vh] font-display text-[2.4vw] font-bold uppercase text-primary">Schools</h3>
              <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Explore class and after-school programs.</p>
            </article>
            <article className="min-h-[23vh] bg-surface p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[1.8vh] font-display text-[2.4vw] font-bold uppercase text-primary">Arts partners</h3>
              <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Connect teaching artists and resources.</p>
            </article>
          </section>
        </div>
        <footer className="flex items-center justify-between border-t border-rule pt-[1.6vh] font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">
          <span>The Creator Studio by AIMD</span><span>The art is the starting point</span>
        </footer>
      </div>
    </div>
  );
}