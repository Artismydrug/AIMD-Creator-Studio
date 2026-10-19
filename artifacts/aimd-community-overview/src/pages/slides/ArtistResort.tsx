export default function ArtistResort() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute inset-y-0 left-0 w-[39vw] deck-accent" />
      <div className="deck-content grid grid-cols-[32vw_1fr] gap-[6.4vw] items-center">
        <div>
          <p className="deck-label font-bold mb-[3vh]">LONG-TERM COMMUNITY VISION</p>
          <h2 className="text-[5vw]">An artist resort for our community</h2>
        </div>
        <div>
          <p className="deck-body deck-row">A larger project we aim to build for community and professional artists</p>
          <p className="deck-body deck-row">Creative retreats, shared practice, and mentorship</p>
          <p className="deck-body deck-row">Space to connect, collaborate, and develop your craft</p>
          <p className="deck-body deck-row">Concept stage—not an operating resort or a guaranteed membership benefit</p>
        </div>
      </div>
    </div>
  );
}
