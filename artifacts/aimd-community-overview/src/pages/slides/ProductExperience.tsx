const base = import.meta.env.BASE_URL;

export default function ProductExperience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Inside Creator Studio</h1>
      <p className="text-[2vw] leading-[1.4] mt-[2vh]">Studio Feed: photos, video, audio &amp; writing. Connect through direct messages.</p>
      <div className="grid grid-cols-4 gap-[1.5vw] mt-[4vh]">
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/dashboard.png`}
            crossOrigin="anonymous"
            alt="Creator Studio dashboard screen"
            className="h-[46vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Daily check-ins</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/habits-challenges.png`}
            crossOrigin="anonymous"
            alt="Creator Studio habits and challenges screen"
            className="h-[46vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Habits, streaks &amp; challenges</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/workshops.png`}
            crossOrigin="anonymous"
            alt="Creator Studio workshop catalog screen"
            className="h-[46vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Workshop previews</h2>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={`${base}product-screens/community-events.png`}
            crossOrigin="anonymous"
            alt="Creator Studio community events screen"
            className="h-[46vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
          />
          <h2 className="font-display font-bold text-[2.1vw] mt-[2vh] text-center">Community events</h2>
        </div>
      </div>
      <p className="deck-label text-muted mt-[4vh] text-center">Illustrative interface samples—not live metrics or current event listings.</p>
    </div>
  );
}
