import { useState } from "react";
import { ArrowUpRight, BookOpen, Brush, Check, ChevronRight, Circle, Compass, Flame, Scissors } from "lucide-react";

const workshops = [
  { name: "Color studies", icon: Brush, tint: "bg-[#FFF0E9]", color: "text-[#F05B35]" },
  { name: "Tiny collages", icon: Scissors, tint: "bg-[#F0EAFE]", color: "text-[#7951D9]" },
  { name: "Find a prompt", icon: Compass, tint: "bg-[#F4F0EB]", color: "text-[#514B59]" },
];

export function OpenSketchbook() {
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#F9F8F6] px-[25px] pb-7 pt-8 text-[#1A1721]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="pointer-events-none absolute -right-10 top-[88px] h-40 w-40 rounded-full bg-[#FF5C35]/[0.045]" />
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#1A1721] text-[#F9F8F6]"><BookOpen size={17} strokeWidth={1.8} /></div>
          <span className="text-[11px] font-semibold uppercase tracking-[.19em]">Fieldnotes <span className="ml-1 text-[#FF5C35]">/ 04</span></span>
        </div>
        <button aria-label="Open sketchbook" onClick={() => setStarted(!started)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAE6E1] bg-[#FDFCFA] transition-transform active:scale-95"><ArrowUpRight size={17} /></button>
      </header>

      <section className="relative mt-8">
        <div className="relative -rotate-[1.1deg] rounded-[22px] bg-white p-[7px] shadow-[0_14px_36px_rgba(49,39,32,.10)]">
          <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="An artist filling a sketchbook with loose charcoal, orange, and violet marks" className="h-[296px] w-full rounded-[17px] object-cover object-center" />
          <span className="absolute -left-2 top-8 h-[2px] w-10 rotate-[31deg] bg-[#FF5C35]" />
          <span className="absolute -right-3 bottom-10 h-3 w-3 rounded-full border-2 border-[#8B5CF6]" />
        </div>
        <div className="absolute -right-1 -top-4 rotate-[4deg] rounded-[4px] border border-[#EAE6E1] bg-[#F9F8F6] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#786F79] shadow-sm">Today’s page</div>
      </section>

      <section className="mt-7 flex items-start justify-between gap-3">
        <div className="max-w-[220px]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8A828C]">A little room to make</p>
          <h1 className="font-['Fraunces'] text-[35px] leading-[.99] tracking-[-.045em]">Make something<br />today.</h1>
          <button onClick={() => setStarted(!started)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1A1721] px-4 py-2.5 text-[12px] font-semibold text-white transition-transform active:scale-[.97]">
            {started ? <><Check size={14} /> Session started</> : <>Open a session <ArrowUpRight size={14} /></>}
          </button>
        </div>
        <button onClick={() => setSelected(selected === 3 ? null : 3)} aria-label="Daily streak details" className="relative mt-1 flex h-[91px] w-[91px] shrink-0 rotate-[5deg] flex-col items-center justify-center rounded-[18px] border border-[#E7D5C9] bg-[#FFF9F4] shadow-[2px_4px_0_#E9DCD3]">
          <span className="absolute -top-2 left-1/2 h-3 w-[1px] -translate-x-1/2 bg-[#C6B6AB]" />
          <svg className="absolute inset-[8px] -rotate-90" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="31" fill="none" stroke="#F0E6DF" strokeWidth="2.5" /><circle cx="37" cy="37" r="31" fill="none" stroke="#FF5C35" strokeWidth="2.5" strokeDasharray="194.8" strokeDashoffset="40" strokeLinecap="round" /></svg>
          <span className="relative flex items-center gap-1 text-[24px] font-semibold leading-none tracking-[-.05em]">4 <Flame size={14} className="text-[#FF5C35]" fill="#FF5C35" /></span>
          <span className="relative mt-1 text-[8px] font-bold uppercase tracking-[.13em] text-[#786F79]">day streak</span>
        </button>
      </section>

      <div className="mt-auto pt-7">
        <div className="mb-3 flex items-center justify-between border-t border-[#EAE6E1] pt-4">
          <div className="flex items-center gap-2"><span className="h-[1px] w-5 bg-[#FF5C35]" /><h2 className="text-[10px] font-semibold uppercase tracking-[.2em]">Workshops</h2></div>
          <span className="text-[9px] tracking-[.11em] text-[#918993]">PICK A TOOL</span>
        </div>
        <nav aria-label="Workshops" className="space-y-2">
          {workshops.map(({ name, icon: Icon, tint, color }, index) => (
            <button key={name} onClick={() => setSelected(selected === index ? null : index)} className={`group flex min-h-[54px] w-full items-center gap-3 rounded-[16px] border px-3 transition-all active:scale-[.99] ${selected === index ? "border-[#FF5C35]/50 bg-white shadow-sm" : "border-transparent bg-[#FDFCFA] hover:border-[#EAE6E1]"}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${tint} ${color}`}><Icon size={16} strokeWidth={1.8} /></span>
              <span className="flex-1 text-left text-[13px] font-medium">{name}</span>
              {selected === index ? <Check size={15} className="text-[#FF5C35]" /> : <ChevronRight size={16} className="text-[#A49DA5] transition-transform group-hover:translate-x-0.5" />}
            </button>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between px-1 text-[9px] uppercase tracking-[.14em] text-[#A39CA3]"><span>One page at a time</span><Circle size={7} className="fill-[#8B5CF6] text-[#8B5CF6]" /></div>
      </div>
    </main>
  );
}
