export default function Practice() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body">
      <div className="absolute inset-y-0 left-0 w-[49vw] bg-primary px-[6vw] py-[8vh] flex flex-col justify-center">
        <h1 className="font-display font-bold text-[7.7vw] leading-[1]">Discipline Eats Talent.</h1>
      </div>
      <div className="absolute left-[55vw] top-[14vh] right-[6vw]">
        <h2 className="deck-name text-accent">The creative-practice thesis</h2>
        <div className="mt-[6vh] space-y-[6vh]">
          <p className="deck-body"><strong>Show up.</strong> Daily practice and check-in streaks.</p>
          <p className="deck-body"><strong>Build skill.</strong> Structured craft learning and feedback.</p>
          <p className="deck-body"><strong>Work toward independence.</strong> Creative and professional capability.</p>
        </div>
        <p className="deck-label text-muted mt-[6vh]">A product thesis—not a proven retention outcome.</p>
      </div>
    </div>
  );
}
