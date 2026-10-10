const base = import.meta.env.BASE_URL;
export default function Invitation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 right-0 w-[34vw] bg-primary flex flex-col justify-center px-[4vw]">
        <img src={`${base}aimd-logo.jpg`} crossOrigin="anonymous" alt="AIMD — Art Is My Drug" className="w-[26vw] h-auto" />
        <p className="deck-body text-bg mt-[6vh]">Students. Teachers. Creators. Schools. Community partners.</p>
      </div>
      <div className="relative w-[66vw] px-[6vw] py-[8vh] flex flex-col h-full justify-center">
        <p className="deck-label text-primary mb-[5vh]">CALL TO ACTION</p>
        <h1 className="font-display font-bold text-[6.7vw] leading-[1.03]">Your next idea belongs in the room.</h1>
        <p className="deck-body mt-[6vh]">Join the community and explore Creator Studio by AIMD.</p>
        <p className="deck-label text-muted mt-[4vh]">Bring your creativity. Build your practice. Learn alongside others.</p>
      </div>
    </div>
  );
}
