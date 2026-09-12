import { Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide12() {
  return (
    <SlideShell className="paper-grid">
      <PageNo value="12 / 12" />
      <div className="px-[5.8vw] pt-[5.2vw]">
        <Eyebrow>11 / OPERATING RULES</Eyebrow>
        <div className="mt-[1.3vw] grid grid-cols-[1fr_0.8fr] gap-[8vw]">
          <h2 className="display-tight text-[5vw] font-black">
            Keep the promise<br />
            <span className="text-[#FF4D00]">ahead of the pitch.</span>
          </h2>
          <div className="pt-[0.5vw] text-[1.25vw] leading-[1.2] text-[#5D5752]">
            <p>Launch free-first. Keep private testing active. Avoid major feature additions during the final week.</p>
            <p className="mt-[1.3vw]">Do not move to paid membership until filmed lessons and career pathways are ready.</p>
            <p className="mt-[1.3vw]">Do not promise Tier 3 opportunities until instructors and partners have committed.</p>
          </div>
        </div>
        <div className="mt-[5.2vw] grid grid-cols-[1fr_1fr] gap-[1.1vw]">
          <div className="rounded-[1.2vw] bg-[#191715] p-[2.5vw] text-[#F8F5EE]">
            <div className="eyebrow text-[0.9vw] text-[#FF7B45]">NEXT DECISION</div>
            <h3 className="mt-[1.1vw] text-[2.45vw] font-extrabold leading-[0.98] tracking-[-0.05em]">Confirm the October 24 launch party.</h3>
            <p className="mt-[1.4vw] max-w-[28vw] text-[1.15vw] leading-[1.2] text-[#F8F5EE]/65">Then assign one owner each for content, workshops, testing, event production, and launch-day support.</p>
          </div>
          <div className="rounded-[1.2vw] bg-[#FF4D00] p-[2.5vw]">
            <div className="eyebrow text-[0.9vw] text-[#191715]/65">THE ASK</div>
            <h3 className="mt-[1.1vw] text-[2.45vw] font-extrabold leading-[0.98] tracking-[-0.05em]">Build the first proof together.</h3>
            <p className="mt-[1.4vw] max-w-[28vw] text-[1.15vw] leading-[1.2] text-[#191715]/75">AIMD becomes bigger in phases—but it starts with one person completing one creative habit.</p>
          </div>
        </div>
        <div className="mt-[4.4vw] flex items-center justify-between text-[1vw] font-bold uppercase tracking-[0.14em] text-[#7E766F]">
          <span>AIMD / CREATOR STUDIO</span>
          <span>Thank you</span>
        </div>
      </div>
    </SlideShell>
  );
}