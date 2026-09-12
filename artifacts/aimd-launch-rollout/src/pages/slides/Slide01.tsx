import { CornerMark, Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide01() {
  return (
    <SlideShell>
      <PageNo value="01 / 12" />
      <div className="absolute left-[5.8vw] top-[4.1vw] text-[1.05vw] font-extrabold tracking-[-0.04em]">
        AIMD / CREATOR STUDIO
      </div>
      <div className="grid h-full grid-cols-[50%_50%]">
        <div className="flex flex-col justify-center px-[5.8vw] pb-[1vw]">
          <Eyebrow>THE BRIEF</Eyebrow>
          <h1 className="display-tight mt-[1.5vw] max-w-[38vw] text-[6.3vw] font-black">
            Launch<br />rollout
          </h1>
          <p className="mt-[2.1vw] max-w-[31vw] text-[1.55vw] font-medium leading-[1.18] text-[#5D5752]">
            Make the creative habit visible, useful, and ready to scale.
          </p>
          <div className="mt-[5.4vw] flex gap-[2.8vw] text-[0.9vw] font-bold uppercase tracking-[0.15em] text-[#7E766F]">
            <span>INTERNAL</span>
            <span>OCTOBER 2026</span>
            <span>CONFIDENTIAL</span>
          </div>
        </div>
        <div className="relative m-[3.6vw] ml-0 overflow-hidden rounded-[2vw] bg-[#FF4D00]">
          <img
            src={`${import.meta.env.BASE_URL}creative-practice-hero.jpg`}
            alt="Creative studio table with sketchbook and workshop notes"
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#191715]/50 via-transparent to-[#FF4D00]/20" />
          <CornerMark light />
          <div className="absolute bottom-[3vw] left-[3vw] max-w-[20vw] text-[1.2vw] font-bold leading-[1.1] text-[#F8F5EE]">
            WHY BUILDING A CREATIVE HABIT MATTERS
          </div>
          <div className="vertical-label absolute bottom-[2.2vw] right-[1.8vw] text-[0.85vw] font-bold tracking-[0.18em] text-[#F8F5EE]">
            CREATOR STUDIO / LAUNCH ROLLOUT
          </div>
        </div>
      </div>
    </SlideShell>
  );
}