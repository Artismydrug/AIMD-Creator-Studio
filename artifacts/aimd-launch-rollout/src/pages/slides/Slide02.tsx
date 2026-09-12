import { ArrowMark, Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide02() {
  return (
    <SlideShell className="paper-grid">
      <PageNo value="02 / 12" />
      <div className="px-[5.8vw] pt-[5.6vw]">
        <Eyebrow>01 / NORTH STAR</Eyebrow>
        <div className="mt-[1.5vw] grid grid-cols-[1.15fr_0.85fr] gap-[8vw]">
          <h2 className="display-tight max-w-[55vw] text-[5vw] font-black">
            Make a creative life<br />
            <span className="text-[#FF4D00]">easier to start.</span>
          </h2>
          <div className="pt-[1vw]">
            <ArrowMark />
            <p className="mt-[1.2vw] text-[1.6vw] font-medium leading-[1.1]">
              AIMD gives creators a repeatable way to practice, learn, share, and find their people.
            </p>
            <p className="mt-[1.6vw] text-[1.15vw] leading-[1.25] text-[#5D5752]">
              The rollout is not only an app launch. It is the first public proof that creative consistency can become a community system.
            </p>
          </div>
        </div>
        <div className="mt-[7vw] grid grid-cols-2 gap-[1.2vw]">
          <div className="rounded-[1.2vw] bg-[#191715] p-[2.2vw] text-[#F8F5EE]">
            <div className="eyebrow text-[0.9vw] text-[#FF7B45]">MISSION</div>
            <p className="mt-[1.3vw] max-w-[31vw] text-[2.15vw] font-bold leading-[1.03] tracking-[-0.045em]">
              Help people build a creative habit that survives busy life.
            </p>
          </div>
          <div className="rounded-[1.2vw] bg-[#FF4D00] p-[2.2vw]">
            <div className="eyebrow text-[0.9vw] text-[#191715]/70">VISION</div>
            <p className="mt-[1.3vw] max-w-[31vw] text-[2.15vw] font-bold leading-[1.03] tracking-[-0.045em]">
              A connected network where practice leads to opportunity.
            </p>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}