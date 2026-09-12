import { Eyebrow, PageNo, SlideShell } from '../../components/slide-kit';

export default function Slide10() {
  return (
    <SlideShell dark>
      <PageNo value="10 / 12" light />
      <div className="absolute left-[5.8vw] top-[5.2vw]">
        <Eyebrow light>09 / LAUNCH-PARTY EXPERIENCE</Eyebrow>
        <h2 className="display-tight mt-[1.4vw] max-w-[66vw] text-[5vw] font-black">
          The room should make<br />
          <span className="text-[#FF7B45]">starting feel easy.</span>
        </h2>
      </div>
      <div className="absolute bottom-[5.8vw] left-[5.8vw] right-[5.8vw] grid grid-cols-4 gap-[1vw]">
        <div className="bg-[#F8F5EE] p-[1.7vw] text-[#191715]">
          <div className="eyebrow text-[0.85vw] text-[#FF4D00]">01</div>
          <h3 className="mt-[1vw] text-[1.55vw] font-extrabold leading-[1]">Arrive</h3>
          <p className="mt-[0.8vw] text-[1.05vw] leading-[1.18] text-[#5D5752]">Make the app and the first prompt visible before guests need to ask.</p>
        </div>
        <div className="bg-[#FF4D00] p-[1.7vw] text-[#191715]">
          <div className="eyebrow text-[0.85vw] text-[#191715]/65">02</div>
          <h3 className="mt-[1vw] text-[1.55vw] font-extrabold leading-[1]">Make</h3>
          <p className="mt-[0.8vw] text-[1.05vw] leading-[1.18] text-[#191715]/75">Guide each person to complete one small creative action.</p>
        </div>
        <div className="bg-[#F8F5EE] p-[1.7vw] text-[#191715]">
          <div className="eyebrow text-[0.85vw] text-[#FF4D00]">03</div>
          <h3 className="mt-[1vw] text-[1.55vw] font-extrabold leading-[1]">Capture</h3>
          <p className="mt-[0.8vw] text-[1.05vw] leading-[1.18] text-[#5D5752]">Film creator reasons, first-habit moments, instructor guidance, and honest reactions.</p>
        </div>
        <div className="bg-[#F8F5EE] p-[1.7vw] text-[#191715]">
          <div className="eyebrow text-[0.85vw] text-[#FF4D00]">04</div>
          <h3 className="mt-[1vw] text-[1.55vw] font-extrabold leading-[1]">Return</h3>
          <p className="mt-[0.8vw] text-[1.05vw] leading-[1.18] text-[#5D5752]">Celebrate first posts and leave with a clear next prompt, workshop, or reason to return.</p>
        </div>
      </div>
    </SlideShell>
  );
}