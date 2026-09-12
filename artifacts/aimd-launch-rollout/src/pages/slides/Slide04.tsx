import { Eyebrow, NumberedPoint, PageNo, SlideShell } from './slide-kit';

export default function Slide04() {
  return (
    <SlideShell>
      <PageNo value="04 / 12" />
      <div className="px-[5.8vw] pt-[5.3vw]">
        <Eyebrow>03 / PUBLIC LAUNCH</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[72vw] text-[4.85vw] font-black">
          The first launch must prove<br />
          <span className="text-[#FF4D00]">the habit is worth returning to.</span>
        </h2>
        <div className="mt-[4.6vw] grid grid-cols-2 gap-x-[7vw] gap-y-[2.2vw]">
          <NumberedPoint number="01" title="People can start in minutes">
            Onboarding, the first prompt, and the first post should feel clear, warm, and low-friction.
          </NumberedPoint>
          <NumberedPoint number="02" title="The network feels alive">
            Creator posts, workshop energy, weekly challenges, and visible wins make participation social.
          </NumberedPoint>
          <NumberedPoint number="03" title="Workshops create depth">
            Two to three strong launch workshops are enough to prove the model; four more can follow in Phase 2.
          </NumberedPoint>
          <NumberedPoint number="04" title="The promise is truthful">
            Public launch stays free-first. We do not sell access to value that has not been filmed, tested, and scheduled.
          </NumberedPoint>
        </div>
        <div className="mt-[5vw] flex items-center gap-[1.3vw] text-[1.15vw] font-bold uppercase tracking-[0.12em] text-[#5D5752]">
          <span className="h-[0.6vw] w-[0.6vw] rounded-full bg-[#FF4D00]" />
          Launch message: <span className="text-[#191715]">Why building a creative habit matters.</span>
        </div>
      </div>
    </SlideShell>
  );
}