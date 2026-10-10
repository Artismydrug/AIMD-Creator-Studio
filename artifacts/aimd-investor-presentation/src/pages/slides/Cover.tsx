const base = import.meta.env.BASE_URL;
export default function Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 right-0 w-[34vw] bg-primary flex items-center justify-center">
        <img src={`${base}aimd-logo.jpg`} crossOrigin="anonymous" alt="AIMD — Art Is My Drug" className="w-[28vw] h-auto" />
      </div>
      <div className="relative w-[66vw] px-[6vw] py-[8vh]">
        <p className="deck-label text-accent uppercase">Investor presentation</p>
        <h1 className="font-display font-bold text-[8vw] leading-[0.95] mt-[12vh]">Creator Studio</h1>
        <p className="font-display text-[3vw] mt-[3vh] text-accent">by AIMD</p>
        <p className="deck-body mt-[6vh] max-w-[49vw]">Bridging raw artistic talent and professional independence through discipline, learning, and community.</p>
      </div>
    </div>
  );
}
