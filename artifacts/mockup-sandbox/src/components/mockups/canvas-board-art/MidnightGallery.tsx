import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Flame, Play, Sparkles } from "lucide-react";

export function MidnightGallery() {
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState("Draw");

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#17151D] px-5 pb-7 pt-7 text-[#F7F0E7]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[#F7F0E7]/20 bg-[#25212C] text-[#FF805F]"><Sparkles size={17} /></div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[#B6ABB9]">After hours</p>
            <p className="text-[13px] font-semibold tracking-[-.02em]">Artist in residence</p>
          </div>
        </div>
        <button onClick={() => setPlaying(!playing)} aria-label="Toggle practice status" className="grid h-10 w-10 place-items-center rounded-full bg-[#8B5CF6] text-white transition-transform active:scale-90">
          {playing ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
        </button>
      </header>

      <section className="mt-8 flex items-start justify-between">
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[.25em] text-[#FF805F]">Tonight's study</p>
          <h1 className="font-['Fraunces'] text-[36px] leading-[.96] tracking-[-.055em]">Find the<br />next line.</h1>
        </div>
        <div className="mt-1 flex flex-col items-center gap-1.5 rounded-full border border-[#8B5CF6]/50 px-3 py-2.5">
          <Flame size={14} className="text-[#FF805F]" fill="#FF805F" />
          <span className="font-['DM_Mono'] text-[16px] font-medium">04</span>
          <span className="text-[7px] uppercase tracking-[.17em] text-[#B6ABB9]">days</span>
        </div>
      </section>

      <section className="relative mt-6">
        <div className="absolute -left-1 top-4 z-10 bg-[#17151D] px-2 text-[8px] uppercase tracking-[.25em] text-[#C7B9D2]">Plate 004 / Studies</div>
        <div className="overflow-hidden rounded-[4px] border border-[#F7F0E7]/20 p-1.5">
          <div className="relative overflow-hidden">
            <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="Sketchbook study with loose charcoal, orange and violet marks" className="h-[280px] w-full object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17151D]/80 via-transparent to-[#17151D]/5" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-[.2em] text-[#E6B7FF]">12 minutes</p>
                <p className="mt-1 font-['Fraunces'] text-[22px] leading-none">Untitled study</p>
              </div>
              <button onClick={() => setPlaying(!playing)} aria-label="Start art practice" className="grid h-11 w-11 place-items-center rounded-full bg-[#FF5C35] text-[#17151D] transition-transform active:scale-90">
                <Play size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[.24em] text-[#B6ABB9]">Open studio</span>
          <span className="text-[9px] font-['DM_Mono'] text-[#8B5CF6]">01—03</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Draw", "Color", "Shape"].map((label, index) => (
            <button key={label} onClick={() => setSelected(label)} className={`group relative flex h-[67px] items-end justify-between overflow-hidden border px-3 pb-2.5 text-left transition-colors ${selected === label ? "border-[#8B5CF6] bg-[#8B5CF6]/15" : "border-[#F7F0E7]/15 bg-[#211E28]"}`}>
              <span className="absolute right-2 top-2 text-[8px] font-['DM_Mono'] text-[#8F8495]">0{index + 1}</span>
              <span className="text-[11px] font-semibold">{label}</span>
              <ArrowUpRight size={12} className={selected === label ? "text-[#FF805F]" : "text-[#8F8495]"} />
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-[#F7F0E7]/15 pt-4">
        <span className="text-[9px] uppercase tracking-[.2em] text-[#B6ABB9]">Make the night yours</span>
        <span className="h-[3px] w-[78px] rounded-full bg-[#F7F0E7]/35" />
      </footer>
    </main>
  );
}
