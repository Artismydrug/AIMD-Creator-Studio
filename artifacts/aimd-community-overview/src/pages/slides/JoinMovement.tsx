const base = import.meta.env.BASE_URL;

export default function JoinMovement() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <img src={`${base}creative-workspace.jpg`} crossOrigin="anonymous" alt="Creative workspace with artist tools" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-y-[8vh] right-[7vw] w-[68vw] deck-paper px-[4vw] py-[5vh] rotate-[1deg] flex flex-col justify-center deck-compact-rows">
        <div className="flex items-center gap-[1.5vw] mb-[4vh]">
          <img src={`${base}aimd-app-icon.png`} crossOrigin="anonymous" alt="AIMD Creator Studio app icon" className="w-[5.5vw] h-[5.5vw] object-contain shadow-md shrink-0" />
          <h2 className="text-[3.8vw]">Let’s Build the Future of Independent Art Together</h2>
        </div>
        <p className="deck-body deck-row">Join the testing community and start your daily habit streak</p>
        <p className="deck-body deck-row">Collaborate as a creator, instructor, or community partner</p>
        <p className="deck-body deck-row">Connect: @artismydrug · @ponchotheartist</p>
        <p className="deck-body deck-row">Explore AIMD: <a href="https://www.artismydrug.com" target="_blank" rel="noopener noreferrer" className="underline">www.artismydrug.com</a></p>
      </div>
    </div>
  );
}
