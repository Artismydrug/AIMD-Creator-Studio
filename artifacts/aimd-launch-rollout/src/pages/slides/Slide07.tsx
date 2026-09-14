import { Eyebrow, PageNo, SlideShell } from '../../components/slide-kit';

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
        <div className="mt-[5.8vw] grid grid-cols-5 gap-[0.8vw]">
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[0.82vw] font-bold uppercase tracking-[0.1em] text-[#FF7B45]">SEP 14 → 27</div>
            <h3 className="mt-[0.85vw] text-[1.5vw] font-bold">Test + improve</h3>
            <p className="mt-[0.7vw] text-[0.98vw] leading-[1.2] text-[#F8F5EE]/65">Keep build 10 in TestFlight, collect feedback, fix launch blockers, and improve the app.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[0.82vw] font-bold uppercase tracking-[0.1em] text-[#FF7B45]">SEP 28 → OCT 10</div>
            <h3 className="mt-[0.85vw] text-[1.5vw] font-bold">Finalize</h3>
            <p className="mt-[0.7vw] text-[0.98vw] leading-[1.2] text-[#F8F5EE]/65">Lock launch scope, finish workshops and content, create the next iOS build, and run final QA.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[0.82vw] font-bold uppercase tracking-[0.1em] text-[#FF7B45]">OCT 11 → 21</div>
            <h3 className="mt-[0.85vw] text-[1.5vw] font-bold">Submit + warm up</h3>
            <p className="mt-[0.7vw] text-[0.98vw] leading-[1.2] text-[#F8F5EE]/65">Test the final build, submit it for App Review, preview the promise, and prepare launch-party production.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[0.82vw] font-bold uppercase tracking-[0.1em] text-[#FF7B45]">OCT 22</div>
            <h3 className="mt-[0.85vw] text-[1.5vw] font-bold">Release</h3>
            <p className="mt-[0.7vw] text-[0.98vw] leading-[1.2] text-[#F8F5EE]/65">Release the approved iOS version with a 48-hour buffer before the public moment.</p>
          </div>
          <div className="border-t border-[#F8F5EE]/35 pt-[1.25vw]">
            <div className="text-[0.82vw] font-bold uppercase tracking-[0.1em] text-[#FF7B45]">OCT 24</div>
            <h3 className="mt-[0.85vw] text-[1.5vw] font-bold">Gather</h3>
            <p className="mt-[0.7vw] text-[0.98vw] leading-[1.2] text-[#F8F5EE]/65">Launch party, first-habit activation, workshop signups, and live support.</p>
          </div>
        </div>
        <div className="absolute bottom-[4.8vw] left-[5.8vw] right-[5.8vw] border-t border-[#F8F5EE]/25 pt-[1.4vw] text-[1.1vw] text-[#F8F5EE]/55">
          Recommended public launch target: <span className="font-bold text-[#F8F5EE]">October 24, 2026</span>
        </div>
      </div>
    </SlideShell>
  );
}