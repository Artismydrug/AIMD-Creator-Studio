import { Eyebrow, PageNo, SlideShell } from '../../components/slide-kit';

export default function Slide08() {
  return (
    <SlideShell>
      <PageNo value="08 / 12" />
      <div className="px-[5.8vw] pt-[5.2vw]">
        <Eyebrow>07 / CONTENT CAMPAIGN</Eyebrow>
        <div className="mt-[1.4vw] grid grid-cols-[1fr_0.9fr] gap-[8vw]">
          <h2 className="display-tight text-[5vw] font-black">
            Make the habit<br />
            <span className="text-[#FF4D00]">feel possible.</span>
          </h2>
          <p className="pt-[0.7vw] text-[1.45vw] font-medium leading-[1.13]">
            The campaign should show the emotional and practical value of returning to creative work—not explain every feature.
          </p>
        </div>
        <div className="mt-[5vw] grid grid-cols-[1.05fr_0.95fr] gap-[1.2vw]">
          <div className="rounded-[1.2vw] bg-[#191715] p-[2.5vw] text-[#F8F5EE]">
            <div className="eyebrow text-[0.9vw] text-[#FF7B45]">HERO STORY</div>
            <h3 className="mt-[1.3vw] text-[3.2vw] font-black leading-[0.95] tracking-[-0.065em]">Why building a creative habit matters.</h3>
            <p className="mt-[1.8vw] max-w-[32vw] text-[1.25vw] leading-[1.22] text-[#F8F5EE]/65">
              A creator-led story about small practice, visible progress, and the shift from “I should make something” to “I make something.”
            </p>
          </div>
          <div className="grid grid-rows-2 gap-[1.2vw]">
            <div className="rounded-[1.2vw] bg-[#FF4D00] p-[2.1vw]">
              <div className="eyebrow text-[0.9vw] text-[#191715]/65">PROOF POSTS</div>
              <p className="mt-[1vw] text-[1.85vw] font-extrabold leading-[1.02] tracking-[-0.045em]">First habits, first shares, first community wins.</p>
            </div>
            <div className="rounded-[1.2vw] border border-[#191715]/25 p-[2.1vw]">
              <div className="eyebrow text-[0.9vw] text-[#FF4D00]">CTA</div>
              <p className="mt-[1vw] text-[1.85vw] font-extrabold leading-[1.02] tracking-[-0.045em]">Download Creator Studio and complete your first creative habit.</p>
            </div>
          </div>
        </div>
        <div className="mt-[3vw] text-[1vw] font-bold uppercase tracking-[0.12em] text-[#7E766F]">Formats: short video / creator stories / workshop clips / weekly challenge recap</div>
      </div>
    </SlideShell>
  );
}