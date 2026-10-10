const base = import.meta.env.BASE_URL;

export default function ProductExperience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Inside Creator Studio</h1>
      <div className="grid grid-cols-4 gap-[1.5vw] mt-[4vh]">
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/dashboard.png`}
            crossOrigin="anonymous"
            alt="Creator Studio dashboard screen"
            className="h-[54vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Daily dashboard</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/habits-challenges.png`}
            crossOrigin="anonymous"
            alt="Creator Studio habits and challenges screen"
            className="h-[54vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Habits &amp; challenges</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/workshops.png`}
            crossOrigin="anonymous"
            alt="Creator Studio workshop catalog screen"
            className="h-[54vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Workshop catalog</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/community-events.png`}
            crossOrigin="anonymous"
            alt="Creator Studio community events screen"
            className="h-[54vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Community events</h2>
        </div>
      </div>
      <p className="deck-label text-muted mt-[2vh] text-center">Interface samples only—not live participation, performance data, or current event listings. Workshop tiles shown as coming soon.</p>
    </div>
  );
}
