import { useState } from "react";
import { ArrowUpRight, Check, Flame, Sparkles } from "lucide-react";

const workshops = ["Sketching", "Color studies", "Creative reset"];

export function NeonTwilight() {
  const [selected, setSelected] = useState("Sketching");
  const [started, setStarted] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#F9F8F6] px-[23px] pb-7 pt-8 text-[#1A1721]">
      <style>{`
        @keyframes arrive { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .nt-arrive { animation: arrive 600ms cubic-bezier(.2,.8,.2,1) both; }
        .nt-delay-1 { animation-delay: 70ms; }
        .nt-delay-2 { animation-delay: 140ms; }
        .nt-delay-3 { animation-delay: 210ms; }
        .nt-ring { background: conic-gradient(#FF5C35 0deg 288deg, #EAE6E1 288deg 360deg); }
      `}</style>

      <header className="nt-arrive flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#1A1721] text-[#F9F8F6]">
            <Sparkles size={15} strokeWidth={1.8} />
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.04em]">Studio / daily</span>
        </div>
        <button aria-label="Mark today's practice complete" onClick={() => setStarted(!started)} className="grid h-10 w-10 place-items-center rounded-full border border-[#EAE6E1] bg-white/70 transition active:scale-95">
          {started ? <Check size={17} className="text-[#FF5C35]" /> : <ArrowUpRight size={17} />}
        </button>
      </header>

      <section className="nt-arrive nt-delay-1 mt-[27px]">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">A little room to make</p>
            <h1 className="font-['DM_Sans'] text-[29px] font-bold leading-[1.02] tracking-[-0.065em]">Make something<br />today.</h1>
          </div>
          <div className="relative mb-0.5 h-[65px] w-[65px] rounded-full p-[5px] nt-ring">
            <div className="grid h-full w-full place-items-center rounded-full bg-[#F9F8F6]">
              <div className="text-center leading-none">
                <div className="font-['DM_Sans'] text-[21px] font-bold tracking-[-0.07em]">4</div>
                <div className="mt-1 text-[8px] font-semibold uppercase tracking-[.14em] text-[#7C7681]">days</div>
              </div>
            </div>
            <span className="absolute -right-0.5 top-0 grid h-[21px] w-[21px] place-items-center rounded-full bg-[#FF5C35] text-white ring-[3px] ring-[#F9F8F6]"><Flame size={11} fill="currentColor" /></span>
          </div>
        </div>
        <div className="mt-[20px] flex items-center gap-2">
          <span className="h-px w-7 bg-[#FF5C35]" />
          <p className="text-[11px] font-medium tracking-[-0.01em] text-[#6F6974]">Your 4-day streak is glowing</p>
        </div>
      </section>

      <section className="nt-arrive nt-delay-2 relative mt-[22px]">
        <div className="absolute -right-3 -top-3 z-10 grid h-[42px] w-[42px] place-items-center rounded-[15px] bg-[#8B5CF6] text-white shadow-[0_7px_18px_rgba(139,92,246,.22)]">
          <Sparkles size={17} />
        </div>
        <button onClick={() => setStarted(!started)} aria-label="Open today's creative session" className="group relative block h-[290px] w-full overflow-hidden rounded-[26px] text-left shadow-[0_14px_32px_rgba(26,23,33,.10)]">
          <img src="/__mockup/images/canvas-board-creative-session.jpg" alt="An artist sketching in a canvas book with vivid violet and orange marks" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1721]/75 via-[#1A1721]/5 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-[19px] pb-[18px] text-white">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.14em] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5C35]" /> Today’s canvas
              </span>
              <p className="text-[17px] font-semibold tracking-[-0.04em]">Start with one mark</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FF5C35] text-white"><ArrowUpRight size={18} /></span>
          </div>
        </button>
      </section>

      <section className="nt-arrive nt-delay-3 mt-[25px]">
        <div className="mb-[13px] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold tracking-[-0.035em]">Workshops</h2>
          <span className="text-[10px] font-medium text-[#8B5CF6]">Pick a path</span>
        </div>
        <div className="flex flex-col gap-2">
          {workshops.map((workshop, index) => (
            <button key={workshop} onClick={() => setSelected(workshop)} className={`flex h-[48px] items-center justify-between rounded-[16px] border px-[14px] text-left transition-all active:scale-[.985] ${selected === workshop ? "border-[#1A1721] bg-[#1A1721] text-[#F9F8F6]" : "border-[#EAE6E1] bg-white/65 text-[#1A1721] hover:border-[#8B5CF6]/50"}`}>
              <span className="flex items-center gap-3">
                <span className={`grid h-[25px] w-[25px] place-items-center rounded-[9px] text-[10px] font-bold ${selected === workshop ? "bg-[#FF5C35] text-white" : "bg-[#F0ECF7] text-[#8B5CF6]"}`}>0{index + 1}</span>
                <span className="text-[12px] font-semibold tracking-[-0.02em]">{workshop}</span>
              </span>
              <ArrowUpRight size={15} className={selected === workshop ? "text-[#FF5C35]" : "text-[#8B5CF6]"} />
            </button>
          ))}
        </div>
      </section>
      <div className="mt-auto flex justify-center pt-5">
        <div className="h-[4px] w-[104px] rounded-full bg-[#1A1721]/15" />
      </div>
    </main>
  );
}
