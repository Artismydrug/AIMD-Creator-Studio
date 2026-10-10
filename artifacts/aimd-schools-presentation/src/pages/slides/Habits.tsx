export default function Habits() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 left-0 w-[49vw] bg-primary text-bg px-[6vw] py-[8vh] flex flex-col justify-center">
        <p className="deck-label text-accent mb-[5vh]">THE POWER OF HABITS</p>
        <h1 className="font-display font-bold text-[7.7vw] leading-[1]">Discipline Eats Talent.</h1>
      </div>
      <div className="absolute left-[55vw] top-[12vh] right-[6vw]">
        <h2 className="deck-name text-primary">Small actions. Steady growth.</h2>
        <div className="mt-[5vh] space-y-[5vh]">
          <p className="deck-body"><strong>Daily check-in streaks</strong> celebrate consistency.</p>
          <p className="deck-body"><strong>Structured challenges</strong> build resilience through practice.</p>
          <p className="deck-body"><strong>Habit tracking</strong> encourages reflection and accountability.</p>
        </div>
        <p className="deck-label text-muted mt-[6vh]">Support for creative practice—not a promise of specific outcomes.</p>
      </div>
    </div>
  );
}
