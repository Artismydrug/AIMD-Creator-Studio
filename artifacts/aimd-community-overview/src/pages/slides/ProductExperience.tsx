const base = import.meta.env.BASE_URL;

export default function ProductExperience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck text-text font-body px-[6vw] py-[6vh]">
      <h1 className="deck-title">Inside Creator Studio</h1>
      <p className="text-[2vw] leading-[1.35] mt-[1.5vh]">Practice. Share. Learn. Connect.</p>
      <div className="grid grid-cols-4 gap-[1.4vw] mt-[3.5vh]">
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/dashboard.jpg`} crossOrigin="anonymous" alt="Creator Studio dashboard with daily practice and quick links" className="h-[58vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Dashboard</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/feed.jpg`} crossOrigin="anonymous" alt="Creator Studio Feed with artwork and community navigation" className="h-[58vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Feed</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/habits.jpg`} crossOrigin="anonymous" alt="Habits screen with daily creative practice and progress" className="h-[58vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Habits</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/workshops.jpg`} crossOrigin="anonymous" alt="Workshops screen with creative course previews" className="h-[58vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Workshops</h2>
        </div>
      </div>
    </div>
  );
}
