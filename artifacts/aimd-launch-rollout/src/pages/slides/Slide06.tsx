import { ArrowMark, Eyebrow, PageNo, SlideShell } from './slide-kit';

export default function Slide06() {
  return (
    <SlideShell>
      <PageNo value="06 / 12" />
      <div className="grid h-full grid-cols-[42%_58%]">
        <div className="flex flex-col justify-between bg-[#FF4D00] p-[5.8vw]">
          <div>
            <Eyebrow>05 / ROLLOUT MODEL</Eyebrow>
            <h2 className="display-tight mt-[1.5vw] text-[5vw] font-black">
              One launch.<br />Three loops.
            </h2>
          </div>
          <div className="text-[1.3vw] font-bold leading-[1.15]">
            <ArrowMark />
            <p className="mt-[1vw] max-w-[22vw]">Observe what creators repeat, then build the next layer around the behavior that is already working.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-[2.7vw] px-[6vw]">
          <div className="grid grid-cols-[4vw_1fr] gap-[1.5vw]">
            <div className="text-[3.8vw] font-black leading-none tracking-[-0.08em]">01</div>
            <div>
              <h3 className="text-[2.25vw] font-extrabold tracking-[-0.05em]">Invite → activate</h3>
              <p className="mt-[0.7vw] max-w-[31vw] text-[1.3vw] leading-[1.2] text-[#5D5752]">
                Drive a focused public launch around one promise: complete your first creative habit.
              </p>
            </div>
          </div>
          <div className="ml-[5vw] grid grid-cols-[4vw_1fr] gap-[1.5vw] border-t border-[#191715]/20 pt-[2vw]">
            <div className="text-[3.8vw] font-black leading-none tracking-[-0.08em] text-[#FF4D00]">02</div>
            <div>
              <h3 className="text-[2.25vw] font-extrabold tracking-[-0.05em]">Practice → belong</h3>
              <p className="mt-[0.7vw] max-w-[31vw] text-[1.3vw] leading-[1.2] text-[#5D5752]">
                Turn workshops, challenges, and feedback into reasons to return and reasons to invite someone else.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-[4vw_1fr] gap-[1.5vw] border-t border-[#191715]/20 pt-[2vw]">
            <div className="text-[3.8vw] font-black leading-none tracking-[-0.08em] text-[#FF4D00]">03</div>
            <div>
              <h3 className="text-[2.25vw] font-extrabold tracking-[-0.05em]">Belong → opportunity</h3>
              <p className="mt-[0.7vw] max-w-[31vw] text-[1.3vw] leading-[1.2] text-[#5D5752]">
                Use demand and partner commitments to shape paid membership and higher-touch benefits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}