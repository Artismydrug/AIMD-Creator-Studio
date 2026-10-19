const base = import.meta.env.BASE_URL;

export default function ProductExperience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck text-text font-body px-[6vw] py-[6vh]">
      <h1 className="deck-title">Inside Creator Studio</h1>
      <p className="text-[2vw] leading-[1.35] mt-[1.5vh]">Practice daily. Share your work. Explore workshops &amp; community events.</p>
      <div className="grid grid-cols-5 gap-[1.2vw] mt-[3.5vh]">
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/dashboard.png`} crossOrigin="anonymous" alt="Current Creator Studio dashboard screen" className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Dashboard</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/studio-feed.png`} crossOrigin="anonymous" alt="Current Studio Feed screen showing a creator's artwork post" className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Studio Feed</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/community-events.png`} crossOrigin="anonymous" alt="Community events screen showing the Los Feliz Flea weekly residency" className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Community events</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/workshops.png`} crossOrigin="anonymous" alt="Workshop catalog screen showing preview access details" className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Workshop previews</h2>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <img src={`${base}product-screens/habits-challenges.png`} crossOrigin="anonymous" alt="Habits screen showing daily practice tracking" className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain" />
          <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">Habits &amp; challenges</h2>
        </div>
      </div>
      <p className="deck-label text-muted mt-[2.5vh] text-center">Current app screen captures; counts and event details reflect this build and may change.</p>
    </div>
  );
}
