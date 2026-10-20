import { useState } from "react";
import { ArrowUpRight, Check, Flame, Heart, Paintbrush, Scissors, Sparkles } from "lucide-react";

const tools = [
  { name: "Sketch", icon: Paintbrush },
  { name: "Collage", icon: Scissors },
  { name: "Color", icon: Heart },
];

export function StickerJam() {
  const [activeTool, setActiveTool] = useState("Sketch");
  const [started, setStarted] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#FFF5E8] px-5 pb-7 pt-7 text-[#21162C]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#8B5CF6] text-white shadow-[3px_3px_0_#21162C]">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em]">AIMD / Studio</p>
            <p className="text-[9px] font-semibold text-[#877789]">MAKE SOMETHING</p>
          </div>
        </div>
        <button onClick={() => setStarted(!started)} aria-label="Complete today's practice" className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#21162C] bg-[#FF5C35] text-white transition-transform active:scale-90">
          {started ? <Check size={18} /> : <ArrowUpRight size={18} />}
        </button>
      </header>

      <section className="relative mt-7">
        <span className="absolute -right-1 -top-3 z-10 rotate-[9deg] rounded-full border-2 border-[#21162C] bg-[#F3D44F] px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] shadow-[2px_2px_0_#21162C]">Day 04</span>
        <h1 className="max-w-[250px] text-[34px] font-black leading-[.91] tracking-[-.07em]">Make a<br /><span className="text-[#FF5C35]">little noise.</span></h1>
        <div className="absolute right-3 top-12 grid h-[69px] w-[69px] -rotate-[10deg] place-items-center rounded-[24px] border-2 border-[#21162C] bg-[#DCCBFF] shadow-[4px_4px_0_#21162C]">
          <div className="text-center">
            <div className="text-[23px] font-black leading-none">4</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.1em]">streak</div>
          </div>
          <Flame className="absolute -right-2 -top-2 rounded-full bg-[#FF5C35] p-1 text-white" size={23} />
        </div>
      </section>

      <section className="relative mt-6">
        <div className="absolute -left-2 top-4 z-10 -rotate-[12deg] rounded-[11px] border-2 border-[#21162C] bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] shadow-[3px_3px_0_#21162C]">Your canvas</div>
        <div className="overflow-hidden rounded-[27px] border-[3px] border-[#21162C] bg-[#E9DEFF] shadow-[6px_7px_0_#21162C]">
          <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="Artist's hand making orange and violet marks in a sketchbook" className="h-[238px] w-full object-cover" />
        </div>
        <button onClick={() => setStarted(!started)} className="absolute -bottom-3 right-3 inline-flex items-center gap-2 rounded-full border-2 border-[#21162C] bg-[#FF5C35] px-4 py-3 text-[12px] font-black text-white shadow-[3px_3px_0_#21162C] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          {started ? "Done for today" : "Start a mark"} <ArrowUpRight size={15} />
        </button>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-[-.03em]">Pick your tool</h2>
          <Sparkles size={17} className="text-[#8B5CF6]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tools.map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => setActiveTool(name)} className={`flex h-[83px] flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-[#21162C] font-bold transition-transform active:scale-95 ${activeTool === name ? "bg-[#8B5CF6] text-white shadow-[3px_3px_0_#21162C]" : "bg-white text-[#21162C]"}`}>
              <Icon size={21} strokeWidth={2.2} />
              <span className="text-[10px]">{name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-auto flex items-center justify-between pt-6">
        <span className="text-[9px] font-black uppercase tracking-[.17em] text-[#8C7B8E]">Keep making</span>
        <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF5C35]" /><span className="h-2 w-2 rounded-full bg-[#8B5CF6]" /><span className="h-2 w-2 rounded-full bg-[#F3D44F]" /></div>
      </div>
    </main>
  );
}
