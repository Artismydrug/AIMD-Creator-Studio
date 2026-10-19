const base = import.meta.env.BASE_URL;

export default function JoinMovement() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Creative workspace with artist tools" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-y-[8vh] right-[7vw] w-[68vw] deck-paper px-[4vw] py-[5vh] rotate-[1deg] flex flex-col justify-center deck-compact-rows">
        <div className="flex items-center gap-[1.5vw] mb-[4vh]">
          <img src={`${base}aimd-app-icon.png`} crossOrigin="anonymous" alt="AIMD Creator Studio app icon" className="w-[5.5vw] h-[5.5vw] object-contain shadow-md shrink-0" />
          <h2 className="text-[5vw]">Build with AIMD</h2>
        </div>
        <p className="deck-body mb-[3vh]">A working app shaped through hands-on testing.</p>
        <p className="deck-body deck-row">Soft launch: reliable access &amp; daily creative practice.</p>
        <p className="deck-body deck-row">Learn from feedback before expanding paid offerings.</p>
        <p className="deck-body deck-row">Join as a creator, instructor or community partner.</p>
        <div className="mt-[4vh]">
          <p className="text-[2vw] leading-[1.4] font-bold">@artismydrug · @ponchotheartist</p>
          <a href="https://www.artismydrug.com" target="_blank" rel="noopener noreferrer" className="text-[2vw] leading-[1.4] underline">www.artismydrug.com</a>
        </div>
      </div>
    </div>
  );
}
