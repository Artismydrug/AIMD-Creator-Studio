export default function Platform() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute right-0 top-0 h-full w-[32vw] bg-surface" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <header className="flex items-center justify-between border-b border-rule pb-[1.6vh]">
          <p className="font-body text-[1.5vw] font-semibold uppercase tracking-[0.25em] text-muted">Inside the app</p>
          <p className="font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">The everyday studio</p>
        </header>
        <div className="py-[3.8vh]">
          <h2 className="font-display text-[5vw] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] text-primary">One creative ecosystem</h2>
          <p className="mt-[1.7vh] max-w-[62vw] font-body text-[2vw] leading-[1.4] text-muted">Tools for sharing the work, finding community, and bringing artists together.</p>
          <div className="mt-[5vh] grid grid-cols-4 gap-[1.5vw]">
            <article className="min-h-[28vh] border-t-[0.3vw] border-accent bg-surface/80 p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.7vw] font-bold uppercase text-primary">Share</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.35] text-muted">Photo and video posts</p>
            </article>
            <article className="min-h-[28vh] border-t-[0.3vw] border-accent bg-surface/80 p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.7vw] font-bold uppercase text-primary">Make sound</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.35] text-muted">Audio tracks in the studio feed</p>
            </article>
            <article className="min-h-[28vh] border-t-[0.3vw] border-accent bg-surface/80 p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.7vw] font-bold uppercase text-primary">Find artists</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.35] text-muted">Profiles, portfolios, and a creator directory</p>
            </article>
            <article className="min-h-[28vh] border-t-[0.3vw] border-accent bg-surface/80 p-[1.7vw]">
              <div aria-hidden="true" className="h-[0.3vw] w-[3vw] bg-accent" />
              <h3 className="mt-[3vh] font-display text-[2.7vw] font-bold uppercase text-primary">Connect</h3>
              <p className="mt-[1vh] font-body text-[2vw] leading-[1.35] text-muted">Direct messages, groups, and events</p>
            </article>
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-rule pt-[1.6vh] font-body text-[1.5vw] uppercase tracking-[0.2em] text-muted">
          <span>Creator Studio by AIMD</span><span>Make · Share · Connect</span>
        </footer>
      </div>
    </div>
  );
}