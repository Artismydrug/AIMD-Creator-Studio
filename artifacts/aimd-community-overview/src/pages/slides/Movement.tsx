const base = import.meta.env.BASE_URL;

export default function Movement() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-[44vw] h-full deck-accent flex items-center justify-center p-[6vw]">
        <img src={`${base}aimd-logo.jpg`} crossOrigin="anonymous" alt="AIMD logo" className="w-full object-contain" />
      </div>
      <div className="absolute left-[49vw] right-[6vw] top-[9vh] bottom-[9vh] flex flex-col justify-center">
        <h2 className="deck-split-title mb-[5vh]">More Than an App — A Proven Movement in Los Angeles</h2>
        <p className="deck-body deck-row">Founded by Edward “Poncho” Davila, @ponchotheartist</p>
        <p className="deck-body deck-row">Rooted in live art, community gatherings, and collaborative pop-ups</p>
        <p className="deck-body deck-row">Connecting everyday creative practice with real-world community</p>
      </div>
    </div>
  );
}
