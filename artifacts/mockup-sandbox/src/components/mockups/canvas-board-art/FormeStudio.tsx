import { useState } from "react";
import { ArrowUpRight, Check, Circle, Flame, MoveUpRight, Palette, Sparkles, Wind } from "lucide-react";

const practices = [
  { label: "Shape", icon: Circle, color: "#F3D580" },
  { label: "Color", icon: Palette, color: "#F5A28D" },
  { label: "Move", icon: Wind, color: "#ADA4F3" },
];

export function FormeStudio() {
  const [selected, setSelected] = useState("Shape");
  const [done, setDone] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#DCE9E1] px-5 pb-7 pt-7 text-[#203B34]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="pointer-events-none absolute -right-20 top-[160px] h-[230px] w-[230px] rounded-full bg-[#ADC8B8]/65" />
      <div className="pointer-events-none absolute -left-24 top-[430px] h-[195px] w-[195px] rounded-full bg-[#F3D580]/65" />

      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-[15px_15px_4px_15px] bg-[#203B34] text-[#DCE9E1]"><Sparkles size={18} /></div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.17em]">Forme / AIMD</p>
            <p className="text-[9px] text-[#668075]">A daily studio ritual</p>
          </div>
        </div>
        <button onClick={() => setDone(!done)} aria-label="Toggle completed practice" className="grid h-10 w-10 place-items-center rounded-full border border-[#203B34]/25 bg-[#F6F2E8] transition-transform active:scale-90">
          {done ? <Check size={17} /> : <MoveUpRight size={17} />}
        </button>
      </header>

      <section className="relative mt-7 flex items-center justify-between">
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[.2em] text-[#8B5CF6]">A place to begin</p>
          <h1 className="font-['Fraunces'] text-[35px] leading-[.95] tracking-[-.055em]">Practice<br />has a shape.</h1>
        </div>
        <div className="relative mr-1 grid h-[78px] w-[78px] place-items-center rounded-[42%_58%_52%_48%] bg-[#F3D580]">
          <div className="grid h-[58px] w-[58px] place-items-center rounded-full border-[2px] border-dashed border-[#203B34]/60">
            <div className="text-center">
              <div className="text-[22px] font-semibold leading-none">04</div>
              <div className="mt-1 text-[7px] font-bold uppercase tracking-[.13em]">days</div>
            </div>
          </div>
          <Flame className="absolute -right-1 top-0 text-[#FF5C35]" size={16} fill="#FF5C35" />
        </div>
      </section>

      <section className="relative mt-6">
        <div className="absolute -right-2 -top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-[#F5A28D] text-[#203B34]"><Sparkles size={15} /></div>
        <div className="overflow-hidden rounded-[52%_16%_32%_18%/21%_18%_12%_11%] border border-[#203B34]/15 bg-[#E9D1C3] p-1.5">
          <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="An open sketchbook with loose violet and coral color studies" className="h-[234px] w-full rounded-[50%_15%_30%_16%/19%_17%_10%_10%] object-cover" />
        </div>
        <button onClick={() => setDone(!done)} className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-[#203B34] px-4 py-2.5 text-[11px] font-semibold text-[#F6F2E8] shadow-[0_7px_18px_rgba(32,59,52,.18)] transition-transform active:scale-95">
          {done ? "Practice saved" : "Begin gently"} <ArrowUpRight size={14} />
        </button>
      </section>

      <section className="relative mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-['Fraunces'] text-[19px] tracking-[-.04em]">Choose a material</h2>
          <span className="text-[8px] font-semibold uppercase tracking-[.17em] text-[#668075]">01 / 03</span>
        </div>
        <div className="flex gap-2">
          {practices.map(({ label, icon: Icon, color }) => (
            <button key={label} onClick={() => setSelected(label)} className={`flex h-[78px] flex-1 flex-col items-center justify-center gap-2 rounded-[24px] border transition-all active:scale-[.96] ${selected === label ? "border-[#203B34] bg-[#203B34] text-[#F6F2E8] shadow-[0_7px_16px_rgba(32,59,52,.15)]" : "border-[#203B34]/15 bg-[#F6F2E8]/80 text-[#203B34]"}`}>
              <span className="grid h-8 w-8 place-items-center rounded-[48%_52%_43%_57%]" style={{ backgroundColor: color }}><Icon size={16} /></span>
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="relative mt-auto flex items-center justify-between pt-5">
        <span className="text-[9px] font-medium text-[#668075]">Small acts, lasting form</span>
        <button onClick={() => setSelected("Color")} aria-label="Open more studio prompts" className="grid h-9 w-9 place-items-center rounded-full bg-[#FF5C35] text-white"><ArrowUpRight size={17} /></button>
      </footer>
    </main>
  );
}
