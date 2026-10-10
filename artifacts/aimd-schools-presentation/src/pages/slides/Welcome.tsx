const base = import.meta.env.BASE_URL;
export default function Welcome() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 right-0 w-[34vw] bg-primary flex flex-col justify-center px-[4vw]">
        <img src={`${base}aimd-logo.jpg`} crossOrigin="anonymous" alt="AIMD — Art Is My Drug" className="w-[26vw] h-auto" />
        <p className="font-display font-bold text-[3.2vw] leading-[1.15] text-bg mt-[6vh]">For schools, educators, students, and creative communities.</p>
      </div>
      <div className="relative w-[66vw] px-[6vw] py-[8vh]">
        <p className="deck-label text-primary">HERO &amp; WELCOME</p>
        <h1 className="font-display font-bold text-[8vw] leading-[0.95] mt-[10vh]">Creator Studio</h1>
        <p className="font-display text-[3vw] text-primary mt-[3vh]">by AIMD</p>
        <p className="deck-body mt-[6vh] max-w-[49vw]">A welcoming bridge between raw artistic talent and professional readiness—for students and teachers.</p>
      </div>
    </div>
  );
}
