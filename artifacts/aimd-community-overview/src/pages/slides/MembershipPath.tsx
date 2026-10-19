export default function MembershipPath() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck">
      <div className="deck-content">
        <h2 className="deck-title mb-[5vh]">A Path for Every Stage of the Artist’s Journey</h2>
        <div className="grid grid-cols-[21vw_1fr] gap-x-[4vw] deck-row items-center">
          <p className="text-[2.4vw] font-display font-bold">Discovering Artist:</p>
          <p className="deck-body">free access to start practicing and connecting</p>
        </div>
        <div className="grid grid-cols-[21vw_1fr] gap-x-[4vw] deck-row items-center">
          <p className="text-[2.4vw] font-display font-bold">Dedicated Artist:</p>
          <p className="deck-body">planned structured workshop learning</p>
        </div>
        <div className="grid grid-cols-[21vw_1fr] gap-x-[4vw] deck-row items-center">
          <p className="text-[2.4vw] font-display font-bold">Professional Artist:</p>
          <p className="deck-body">planned advanced support and opportunities</p>
        </div>
        <p className="deck-body mt-[3vh] py-[2.4vh] px-[2.4vw] bg-accent">Paid plans are coming soon; benefits depend on rollout readiness</p>
      </div>
    </div>
  );
}
