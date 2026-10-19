const base = import.meta.env.BASE_URL;

const screens = [
  {
    src: "dashboard.png",
    label: "Dashboard",
    alt: "Current Creator Studio dashboard screen",
  },
  {
    src: "studio-feed.png",
    label: "Studio Feed",
    alt: "Current Studio Feed screen showing a creator's artwork post",
  },
  {
    src: "community-events.png",
    label: "Community events",
    alt: "Community events screen showing the Los Feliz Flea weekly residency",
  },
  {
    src: "workshops.png",
    label: "Workshop previews",
    alt: "Workshop catalog screen showing preview access details",
  },
  {
    src: "habits-challenges.png",
    label: "Habits & challenges",
    alt: "Habits screen showing daily practice tracking",
  },
];

export default function ProductExperience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck text-text font-body px-[6vw] py-[6vh]">
      <h1 className="deck-title">Inside Creator Studio</h1>
      <p className="text-[1.65vw] leading-[1.35] mt-[1.5vh]">Practice daily. Share your work. Explore workshops &amp; community events.</p>
      <div className="grid grid-cols-5 gap-[1.2vw] mt-[3.5vh]">
        {screens.map((screen) => (
          <div className="flex min-w-0 flex-col items-center" key={screen.src}>
            <img
              src={`${base}product-screens/${screen.src}`}
              crossOrigin="anonymous"
              alt={screen.alt}
              className="h-[52vh] w-full rounded-[1vw] bg-[#fbf7ef] p-[0.35vw] object-contain"
            />
            <h2 className="font-display font-bold text-[1.5vw] leading-[1.15] mt-[1.5vh] text-center">{screen.label}</h2>
          </div>
        ))}
      </div>
      <p className="deck-label text-muted mt-[2.5vh] text-center">Current app screen captures; counts and event details reflect this build and may change.</p>
    </div>
  );
}
