export default function IndependentCreator() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content flex flex-col justify-between">
        <h2 className="text-[5.6vw] max-w-[76vw]">Empowering the Independent Creator</h2>
        <div className="grid grid-cols-2 gap-x-[6.4vw] gap-y-[4vh]">
          <p className="deck-body deck-row">Creative growth takes more than raw talent</p>
          <p className="deck-body deck-row">Daily habits bring structure to independent practice</p>
          <p className="deck-body deck-row">Learning and community help creators keep moving</p>
          <p className="deck-body deck-row">Real-world opportunities remain the long-term goal</p>
        </div>
      </div>
    </div>
  );
}
