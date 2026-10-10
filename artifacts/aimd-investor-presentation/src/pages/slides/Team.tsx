export default function Team() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">The team</h1>
      <div className="grid grid-cols-2 gap-x-[6vw] gap-y-[4vh] mt-[7vh]">
        <div><h2 className="deck-name text-accent">Edward Davila</h2><p className="deck-label mt-[1vh]">Founder, CEO &amp; Creative Director</p></div>
        <div><h2 className="deck-name">Bri &amp; Ashley Rae</h2><p className="deck-label mt-[1vh]">Artist Relations &amp; Events</p></div>
        <div><h2 className="deck-name">Anthony Davila</h2><p className="deck-label mt-[1vh]">Project Director</p></div>
        <div><h2 className="deck-name">Dwayne</h2><p className="deck-label mt-[1vh]">Institutional Outreach</p></div>
        <div><h2 className="deck-name">Nay</h2><p className="deck-label mt-[1vh]">Operations</p></div>
        <div><h2 className="deck-name">Nancy</h2><p className="deck-label mt-[1vh]">Marketing</p></div>
        <div><h2 className="deck-name">Temo</h2><p className="deck-label mt-[1vh]">Physical Logistical Production</p></div>
      </div>
    </div>
  );
}
