const base = import.meta.env.BASE_URL;
export default function Close() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 right-0 w-[34vw] bg-primary flex flex-col justify-center px-[4vw]">
        <img src={`${base}aimd-logo.jpg`} crossOrigin="anonymous" alt="AIMD — Art Is My Drug" className="w-[26vw] h-auto" />
        <p className="deck-body mt-[6vh]">Practice. Learning. Community. Professional independence.</p>
      </div>
      <div className="relative w-[66vw] px-[6vw] py-[8vh] flex flex-col h-full justify-center">
        <h1 className="font-display font-bold text-[6.7vw] leading-[1.03]">Raw talent deserves a real-world path.</h1>
        <p className="deck-body text-accent mt-[6vh]">Creator Studio by AIMD</p>
        <p className="deck-label text-muted mt-[4vh]">Investor conversation · Product thesis and illustrative scenarios</p>
      </div>
    </div>
  );
}
