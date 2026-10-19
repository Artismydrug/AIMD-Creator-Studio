export default function PartnerValue() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="absolute left-0 top-0 w-full h-[40vh] deck-accent" />
      <div className="deck-content flex flex-col justify-between">
        <h2 className="text-[4.8vw] max-w-[83vw]">Brand Alignment With the Next Wave of Creatives</h2>
        <div className="grid grid-cols-2 gap-x-[6.4vw] gap-y-[3vh]">
          <p className="deck-body deck-row">Collaborate on events, tools, supplies, and creative activations</p>
          <p className="deck-body deck-row">Explore community workshops, mentorship, and youth programming</p>
          <p className="deck-body deck-row">Discuss artist sponsorships and creative-grant support</p>
          <p className="deck-body deck-row">Program availability depends on partners and resources</p>
        </div>
      </div>
    </div>
  );
}
