import { Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide07() {
  return (
    <SlideShell dark>
      <PageNo value="07 / 12" light />
      <div className="px-[5.8vw] pt-[5.3vw]">
        <Eyebrow light>06 / TIMELINE</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[56vw] text-[4.95vw] font-black">
          Build confidence<br />
          <span className="text-[#FF7B45]">before the room fills.</span>
        </h2>
        <div className="mt-[7vw] grid grid-cols-4 gap-[1vw]">
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[1vw] font-bold uppercase tracking-[0.14em] text-[#FF7B45]">NOW → OCT 10</div>
            <h3 className="mt-[1vw] text-[1.8vw] font-bold">Tighten</h3>
            <p className="mt-[0.8vw] text-[1.15vw] leading-[1.2] text-[#F8F5EE]/65">Final content, App Store readiness, instructor alignment, and private testing.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[1vw] font-bold uppercase tracking-[0.14em] text-[#FF7B45]">OCT 11 → 21</div>
            <h3 className="mt-[1vw] text-[1.8vw] font-bold">Warm up</h3>
            <p className="mt-[0.8vw] text-[1.15vw] leading-[1.2] text-[#F8F5EE]/65">Preview the promise, confirm workshops, and prepare launch-party production.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[1vw] font-bold uppercase tracking-[0.14em] text-[#FF7B45]">OCT 22</div>
            <h3 className="mt-[1vw] text-[1.8vw] font-bold">Release</h3>
            <p className="mt-[0.8vw] text-[1.15vw] leading-[1.2] text-[#F8F5EE]/65">Release the approved iOS version with a 48-hour buffer before the public moment.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[1vw] font-bold uppercase tracking-[0.14em] text-[#FF7B45]">OCT 24</div>
            <h3 className="mt-[1vw] text-[1.8vw] font-bold">Gather</h3>
            <p className="mt-[0.8vw] text-[1.15vw] leading-[1.2] text-[#F8F5EE]/65">Launch party, first-habit activation, workshop signups, and live support.</p>
          </div>
        </div>
        <div className="absolute bottom-[4.8vw] left-[5.8vw] right-[5.8vw] border-t border-[#F8F5EE]/25 pt-[1.4vw] text-[1.1vw] text-[#F8F5EE]/55">
          Recommended public launch target: <span className="font-bold text-[#F8F5EE]">October 24, 2026</span>
        </div>
      </div>
    </SlideShell>
  );
}