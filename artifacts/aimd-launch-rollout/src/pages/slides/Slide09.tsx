import { ArrowMark, Eyebrow, PageNo, SlideShell } from '../../components/slide-kit';

export default function Slide09() {
  return (
    <SlideShell className="paper-grid">
      <PageNo value="09 / 12" />
      <div className="px-[5.8vw] pt-[5.2vw]">
        <Eyebrow>08 / PEOPLE + PIPELINE</Eyebrow>
        <div className="mt-[1.4vw] flex items-end justify-between">
          <h2 className="display-tight max-w-[53vw] text-[4.8vw] font-black">
            Anthony sets the<br />
            <span className="text-[#FF4D00]">creative standard.</span>
          </h2>
          <ArrowMark />
        </div>
        <div className="mt-[5.3vw] grid grid-cols-2 gap-[6vw]">
          <div>
            <div className="eyebrow text-[0.9vw] text-[#FF4D00]">ANTHONY’S ROLE</div>
            <ul className="mt-[1.3vw] space-y-[1.15vw] text-[1.45vw] font-medium leading-[1.12]">
              <li className="border-b border-[#191715]/20 pb-[1.1vw]">Set content direction and production standards.</li>
              <li className="border-b border-[#191715]/20 pb-[1.1vw]">Shape the shoot plan and workshop point of view.</li>
              <li className="border-b border-[#191715]/20 pb-[1.1vw]">Give final creative review before public release.</li>
            </ul>
          </div>
          <div>
            <div className="eyebrow text-[0.9vw] text-[#FF4D00]">WORKSHOP PIPELINE</div>
            <div className="mt-[1.3vw] grid grid-cols-2 gap-[0.9vw]">
              <div className="rounded-[1vw] bg-[#FF4D00] p-[1.4vw]">
                <div className="text-[2.4vw] font-black tracking-[-0.08em]">02–03</div>
                <p className="mt-[0.5vw] text-[1.05vw] font-bold leading-[1.1]">strong workshops at launch</p>
              </div>
              <div className="rounded-[1vw] bg-[#191715] p-[1.4vw] text-[#F8F5EE]">
                <div className="text-[2.4vw] font-black tracking-[-0.08em] text-[#FF7B45]">04</div>
                <p className="mt-[0.5vw] text-[1.05vw] font-bold leading-[1.1]">ready for Phase 2</p>
              </div>
              <div className="col-span-2 rounded-[1vw] border border-[#191715]/25 p-[1.4vw]">
                <div className="flex items-center justify-between">
                  <div className="text-[2.4vw] font-black tracking-[-0.08em]">06</div>
                  <div className="text-[1vw] font-bold uppercase tracking-[0.12em] text-[#7E766F]">preferred target</div>
                </div>
                <p className="mt-[0.5vw] text-[1.05vw] font-bold leading-[1.1]">workshops ready across the first season</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}