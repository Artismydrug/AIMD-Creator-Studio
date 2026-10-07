export default function Learning() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute left-0 top-0 h-full w-[30vw] bg-surface" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <header className="flex items-center justify-between border-b border-rule pb-[1.6vh]">
          <p className="font-body text-[1.5vw] font-semibold uppercase tracking-[0.25em] text-muted">Resources for schools</p>
          <p className="font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">Teach · Practice · Share</p>
        </header>
        <div className="py-[3.5vh]">
          <h2 className="font-display text-[5vw] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] text-primary">Resources for creative teaching</h2>
          <p className="mt-[1.5vh] max-w-[76vw] font-body text-[2vw] text-muted">Artist-led workshops can complement hands-on instruction.</p>
          <div className="mt-[4.8vh] grid grid-cols-2 gap-x-[2vw] gap-y-[1.8vh]">
            <article className="flex min-h-[18vh] items-center gap-[1.7vw] border-y border-rule px-[1.8vw] py-[2vh]">
              <span aria-hidden="true" className="h-[3vw] w-[0.3vw] shrink-0 bg-accent" />
              <div>
                <h3 className="font-display text-[2.6vw] font-bold uppercase text-primary">Teacher resources</h3>
                <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Artist-led modules and guided practice.</p>
              </div>
            </article>
            <article className="flex min-h-[18vh] items-center gap-[1.7vw] border-y border-rule px-[1.8vw] py-[2vh]">
              <span aria-hidden="true" className="h-[3vw] w-[0.3vw] shrink-0 bg-accent" />
              <div>
                <h3 className="font-display text-[2.6vw] font-bold uppercase text-primary">Free previews</h3>
                <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Review lesson style before a workshop.</p>
              </div>
            </article>
            <article className="flex min-h-[18vh] items-center gap-[1.7vw] border-y border-rule px-[1.8vw] py-[2vh]">
              <span aria-hidden="true" className="h-[3vw] w-[0.3vw] shrink-0 bg-accent" />
              <div>
                <h3 className="font-display text-[2.6vw] font-bold uppercase text-primary">Visual and craft arts</h3>
                <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Fine art, tattooing, and leather craft.</p>
              </div>
            </article>
            <article className="flex min-h-[18vh] items-center gap-[1.7vw] border-y border-rule px-[1.8vw] py-[2vh]">
              <span aria-hidden="true" className="h-[3vw] w-[0.3vw] shrink-0 bg-accent" />
              <div>
                <h3 className="font-display text-[2.6vw] font-bold uppercase text-primary">Music and voice</h3>
                <p className="mt-[0.6vh] font-body text-[2vw] leading-[1.35] text-muted">Vocal practice and audio sharing.</p>
              </div>
            </article>
          </div>
          <p className="mt-[2.6vh] text-right font-body text-[2vw] tracking-[0.02em] text-muted">Full lessons require an eligible active subscription or workshop enrollment.</p>
        </div>
        <footer className="flex items-center justify-between border-t border-rule pt-[1.6vh] font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">
          <span>Creator Studio by AIMD</span><span>Learn the craft</span>
        </footer>
      </div>
    </div>
  );
}