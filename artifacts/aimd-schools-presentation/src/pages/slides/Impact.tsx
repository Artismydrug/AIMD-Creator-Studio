export default function Impact() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <p className="deck-label text-primary">COMMUNITY IMPACT</p>
      <h1 className="deck-title mt-[3vh]">Room to learn and belong</h1>
      <p className="deck-body mt-[4vh]">AIMD connects creative development with a community-support mission.</p>
      <div className="grid grid-cols-3 gap-[2vw] mt-[7vh]">
        <div className="bg-primary text-bg p-[2.4vw]">
          <h2 className="deck-name">Non-profit youth workshops</h2>
          <p className="deck-body mt-[4vh]">More opportunities to make, practice, and share.</p>
        </div>
        <div className="bg-primary text-bg p-[2.4vw]">
          <h2 className="deck-name">Creative mentorship</h2>
          <p className="deck-body mt-[4vh]">Relationships that support artistic development.</p>
        </div>
        <div className="bg-primary text-bg p-[2.4vw]">
          <h2 className="deck-name">Creative grants</h2>
          <p className="deck-body mt-[4vh]">Support for projects and creative exploration.</p>
        </div>
      </div>
      <p className="deck-label text-muted mt-[4vh]">Programs, mentorship, and grants depend on availability and community partnerships.</p>
    </div>
  );
}
