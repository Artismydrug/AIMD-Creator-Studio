import { useState } from "react";
import { ArrowRight, Check, Flame, Gamepad2, Paintbrush, Shuffle, Zap } from "lucide-react";

const prompts = ["Draw blind", "Color pop", "One shape"];

export function PixelPractice() {
  const [active, setActive] = useState("Draw blind");
  const [complete, setComplete] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#EAE5FF] px-5 pb-7 pt-7 text-[#21182F]" style={{ fontFamily: "DM Mono, monospace" }}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center border-[3px] border-[#21182F] bg-[#FF5C35] shadow-[4px_4px_0_#21182F]"><Gamepad2 size={20} /></div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.13em]">Creator arcade</p>
            <p className="text-[9px] font-bold text-[#81759A]">PRACTICE / 004</p>
          </div>
        </div>
        <button aria-label="View streak" className="flex h-10 items-center gap-1.5 border-[2px] border-[#21182F] bg-[#F7D94B] px-2.5 shadow-[3px_3px_0_#21182F]">
          <Flame size={14} fill="#FF5C35" className="text-[#FF5C35]" />
          <span className="text-[11px] font-black">04</span>
        </button>
      </header>

      <section className="mt-7">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[.17em] text-[#8B5CF6]">Today's mini practice</p>
        <h1 className="text-[30px] font-black leading-[.92] tracking-[-.07em]">MAKE<br /><span className="text-[#FF5C35]">A THING.</span></h1>
      </section>

      <section className="relative mt-6 border-[3px] border-[#21182F] bg-[#FF5C35] p-2 shadow-[6px_6px_0_#21182F]">
        <div className="relative overflow-hidden border-[2px] border-[#21182F] bg-[#D7C7FF]">
          <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="Abstract sketchbook marks ready for a short creative challenge" className="h-[204px] w-full object-cover saturate-[1.15]" />
          <div className="absolute left-2 top-2 bg-[#F7D94B] px-2 py-1 text-[8px] font-black uppercase tracking-[.11em]">Flash prompt</div>
          <div className="absolute bottom-2 left-2 bg-[#21182F] px-2 py-1 text-[9px] font-bold text-white">60 SEC</div>
          <div className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center border-2 border-[#21182F] bg-[#8B5CF6] text-white">
            <Paintbrush size={17} />
          </div>
        </div>
        <button onClick={() => setComplete(!complete)} className="mt-2 flex h-12 w-full items-center justify-between border-[2px] border-[#21182F] bg-[#F7D94B] px-3 text-[11px] font-black uppercase transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none">
          <span className="flex items-center gap-2">{complete ? <Check size={15} /> : <Zap size={15} />} {complete ? "Run cleared" : "Start the run"}</span>
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[.16em]">Choose a mode</h2>
          <Shuffle size={15} className="text-[#8B5CF6]" />
        </div>
        <div className="flex flex-col gap-2">
          {prompts.map((prompt, index) => (
            <button key={prompt} onClick={() => setActive(prompt)} className={`flex h-[47px] items-center justify-between border-[2px] border-[#21182F] px-3 text-left transition-transform active:translate-x-1 ${active === prompt ? "bg-[#8B5CF6] text-white shadow-[3px_3px_0_#21182F]" : "bg-[#FFFDF8]"}`}>
              <span className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center border border-[#21182F] bg-[#F7D94B] text-[8px] font-black text-[#21182F]">0{index + 1}</span><span className="text-[10px] font-bold">{prompt}</span></span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between pt-5 text-[8px] font-black uppercase tracking-[.14em] text-[#7B6E93]">
        <span>Keep your streak</span>
        <span className="flex gap-1"><i className="h-2 w-2 bg-[#FF5C35]" /><i className="h-2 w-2 bg-[#8B5CF6]" /><i className="h-2 w-2 bg-[#F7D94B]" /></span>
      </footer>
    </main>
  );
}
