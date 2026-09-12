import { Eyebrow, PageNo, SlideShell } from '../../components/slide-kit';

export default function Slide03() {
  return (
    <SlideShell dark>
      <PageNo value="03 / 12" light />
      <div className="absolute left-[5.8vw] top-[5.4vw]">
        <Eyebrow light>02 / LAUNCH THESIS</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[67vw] text-[5.8vw] font-black">
          Why building a<br />
          <span className="text-[#FF7B45]">creative habit matters.</span>
        </h2>
      </div>
      <div className="absolute bottom-[6vw] left-[5.8vw] right-[5.8vw] grid grid-cols-[1fr_1fr_1fr] gap-[1vw]">
        <div className="border-t border-[#F8F5EE]/30 pt-[1.25vw]">
          <div className="text-[3vw] font-black tracking-[-0.08em] text-[#FF7B45]">01</div>
          <h3 className="mt-[0.7vw] text-[1.7vw] font-bold">Consistency beats intensity.</h3>
          <p className="mt-[0.8vw] text-[1.15vw] leading-[1.22] text-[#F8F5EE]/65">
            A small creative action repeated becomes a visible identity, not another abandoned goal.
          </p>
        </div>
        <div className="border-t border-[#F8F5EE]/30 pt-[1.25vw]">
          <div className="text-[3vw] font-black tracking-[-0.08em] text-[#FF7B45]">02</div>
          <h3 className="mt-[0.7vw] text-[1.7vw] font-bold">Community makes practice stick.</h3>
          <p className="mt-[0.8vw] text-[1.15vw] leading-[1.22] text-[#F8F5EE]/65">
            Prompts, feedback, workshops, and shared wins turn a private habit into momentum.
          </p>
        </div>
        <div className="border-t border-[#F8F5EE]/30 pt-[1.25vw]">
          <div className="text-[3vw] font-black tracking-[-0.08em] text-[#FF7B45]">03</div>
          <h3 className="mt-[0.7vw] text-[1.7vw] font-bold">Opportunity is the long game.</h3>
          <p className="mt-[0.8vw] text-[1.15vw] leading-[1.22] text-[#F8F5EE]/65">
            Practice creates proof. Proof opens doors to instructors, partners, events, and paid pathways.
          </p>
        </div>
      </div>
      <div className="absolute bottom-[5.5vw] right-[5.8vw] text-[2.2vw] text-[#FF7B45]">↘</div>
    </SlideShell>
  );
}