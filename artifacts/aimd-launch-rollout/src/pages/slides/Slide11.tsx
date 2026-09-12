import { Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide11() {
  return (
    <SlideShell>
      <PageNo value="11 / 12" />
      <div className="px-[5.8vw] pt-[5.2vw]">
        <Eyebrow>10 / GOALS + SUCCESS MEASURES</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[62vw] text-[4.9vw] font-black">
          Measure the behavior<br />
          <span className="text-[#FF4D00]">before the revenue.</span>
        </h2>
        <div className="mt-[5vw] grid grid-cols-3 gap-[1.1vw]">
          <div className="rounded-[1.1vw] bg-[#191715] p-[2vw] text-[#F8F5EE]">
            <div className="eyebrow text-[0.85vw] text-[#FF7B45]">ACTIVATION</div>
            <div className="mt-[1.5vw] text-[4.1vw] font-black tracking-[-0.08em]">01</div>
            <h3 className="mt-[0.6vw] text-[1.9vw] font-extrabold">First habit completed</h3>
            <p className="mt-[0.9vw] text-[1.1vw] leading-[1.2] text-[#F8F5EE]/65">People do the thing the launch promises.</p>
          </div>
          <div className="rounded-[1.1vw] bg-[#FF4D00] p-[2vw]">
            <div className="eyebrow text-[0.85vw] text-[#191715]/65">RETENTION</div>
            <div className="mt-[1.5vw] text-[4.1vw] font-black tracking-[-0.08em]">02</div>
            <h3 className="mt-[0.6vw] text-[1.9vw] font-extrabold">Return + share</h3>
            <p className="mt-[0.9vw] text-[1.1vw] leading-[1.2] text-[#191715]/75">People come back, post again, and invite their people.</p>
          </div>
          <div className="rounded-[1.1vw] border border-[#191715]/25 p-[2vw]">
            <div className="eyebrow text-[0.85vw] text-[#FF4D00]">READINESS</div>
            <div className="mt-[1.5vw] text-[4.1vw] font-black tracking-[-0.08em]">03</div>
            <h3 className="mt-[0.6vw] text-[1.9vw] font-extrabold">Commitments grow</h3>
            <p className="mt-[0.9vw] text-[1.1vw] leading-[1.2] text-[#5D5752]">Instructors and partners are ready for the next value layer.</p>
          </div>
        </div>
        <div className="mt-[3.6vw] flex items-center gap-[1.4vw] border-t border-[#191715]/20 pt-[1.5vw] text-[1.25vw] font-bold">
          <span className="text-[#FF4D00]">Success looks like:</span>
          a useful habit, a living network, and enough proof to earn Phase 2.
        </div>
      </div>
    </SlideShell>
  );
}