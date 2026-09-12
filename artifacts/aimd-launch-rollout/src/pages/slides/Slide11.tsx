import { Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide11() {
  return (
    <SlideShell>
      <PageNo value="11 / 12" />
      <div className="px-[5.8vw] pt-[5.2vw]">
        <Eyebrow>10 / GOALS + SUCCESS MEASURES</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[62vw] text-[4.9vw] font-black">
          Measure the behavior.<br />
          <span className="text-[#FF4D00]">Then measure the ladder.</span>
        </h2>
        <div className="mt-[4.6vw] grid grid-cols-4 gap-[1vw]">
          <div className="rounded-[1.1vw] bg-[#191715] p-[1.65vw] text-[#F8F5EE]">
            <div className="eyebrow text-[0.78vw] text-[#FF7B45]">ACTIVATION</div>
            <div className="mt-[1.35vw] text-[3.35vw] font-black tracking-[-0.08em]">01</div>
            <h3 className="mt-[0.5vw] text-[1.55vw] font-extrabold leading-[1]">First habit completed</h3>
            <p className="mt-[0.8vw] text-[1vw] leading-[1.18] text-[#F8F5EE]/65">People do the thing the launch promises.</p>
          </div>
          <div className="rounded-[1.1vw] bg-[#FF4D00] p-[1.65vw]">
            <div className="eyebrow text-[0.78vw] text-[#191715]/65">PAID / 90 DAYS</div>
            <div className="mt-[1.35vw] text-[3.35vw] font-black tracking-[-0.08em]">100</div>
            <h3 className="mt-[0.5vw] text-[1.55vw] font-extrabold leading-[1]">Paid subscribers</h3>
            <p className="mt-[0.8vw] text-[1vw] leading-[1.18] text-[#191715]/75">First proof that structured membership has repeat value.</p>
          </div>
          <div className="rounded-[1.1vw] border border-[#191715]/25 p-[1.65vw]">
            <div className="eyebrow text-[0.78vw] text-[#FF4D00]">PAID / YEAR ONE</div>
            <div className="mt-[1.35vw] text-[3.35vw] font-black tracking-[-0.08em]">300</div>
            <h3 className="mt-[0.5vw] text-[1.55vw] font-extrabold leading-[1]">Paid subscribers</h3>
            <p className="mt-[0.8vw] text-[1vw] leading-[1.18] text-[#5D5752]">A sustainable base for lessons, pathways, and instructor economics.</p>
          </div>
          <div className="rounded-[1.1vw] border border-[#191715]/25 bg-[#F3E8DC] p-[1.65vw]">
            <div className="eyebrow text-[0.78vw] text-[#FF4D00]">PHASE 3</div>
            <div className="mt-[1.35vw] text-[3.35vw] font-black tracking-[-0.08em]">25</div>
            <h3 className="mt-[0.5vw] text-[1.55vw] font-extrabold leading-[1]">Tier 3 founders</h3>
            <p className="mt-[0.8vw] text-[1vw] leading-[1.18] text-[#5D5752]">Enough committed members to justify partner benefits and higher-touch access.</p>
          </div>
        </div>
        <div className="mt-[3.3vw] flex items-center gap-[1.4vw] border-t border-[#191715]/20 pt-[1.5vw] text-[1.15vw] font-bold">
          <span className="text-[#FF4D00]">Success looks like:</span>
          a useful habit, a living network, 100 paid in 90 days, 300 in year one, and enough committed partners to earn Phase 3.
        </div>
      </div>
    </SlideShell>
  );
}