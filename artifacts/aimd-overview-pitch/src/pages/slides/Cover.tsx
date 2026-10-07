const publicBase = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="deck-slide w-screen h-screen overflow-hidden relative bg-bg text-text">
      <img src={publicBase + 'creator-studio-cover.jpg'} crossOrigin="anonymous" alt="A working artist's studio with creative tools and work in progress" className="absolute inset-0 h-full w-full object-cover object-[center_48%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141311]/95 via-[#141311]/65 to-[#141311]/15" />
      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-[#141311]/70 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-between px-[7vw] py-[6vh]">
        <div className="flex items-center gap-[1.2vw] border-b border-white/25 pb-[2vh]">
          <span className="font-display text-[2.5vw] font-extrabold tracking-[0.12em] text-accent">AIMD</span>
          <span className="h-[2.4vh] w-px bg-white/45" />
          <span className="font-body text-[1.55vw] font-semibold uppercase tracking-[0.26em] text-white/90">Creator Studio</span>
        </div>
        <div className="max-w-[62vw] pb-[3vh]">
          <p className="font-display text-[4vw] font-semibold italic leading-none text-accent">The Art Is My Drug.</p>
          <h1 className="mt-[2vh] max-w-[60vw] font-display text-[7vw] font-extrabold uppercase leading-[0.84] tracking-[-0.02em] text-white">The Creator Studio</h1>
          <p className="mt-[1.5vh] font-display text-[3.8vw] font-semibold uppercase tracking-[0.1em] text-white/90">by AIMD</p>
          <p className="mt-[2.4vh] max-w-[49vw] font-body text-[2vw] leading-[1.35] text-white/90">A creative home to learn, practice, share, and grow.</p>
          <div className="mt-[5vh] flex items-center gap-[1vw] border-t border-white/30 pt-[1.6vh] text-[1.5vw] uppercase tracking-[0.12em] text-white/75">
            <span>Founded by Edward “Poncho the Artist” Davila</span>
          </div>
        </div>
        <div className="flex items-center justify-between font-body text-[1.5vw] uppercase tracking-[0.2em] text-white/60">
          <span>Artist-led. Community-rooted.</span>
          <span>Learn · Practice · Share</span>
        </div>
      </div>
    </div>
  );
}