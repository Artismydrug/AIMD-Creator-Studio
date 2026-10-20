import { useState } from "react";
import { ArrowUpRight, Check, Flame, Play, Sparkles } from "lucide-react";

const stations = [
  { name: "Sketch", mark: "01", tone: "#F1E8DD" },
  { name: "Color", mark: "02", tone: "#EEE7F8" },
  { name: "Print", mark: "03", tone: "#FCE9E1" },
  { name: "Shape", mark: "04", tone: "#E7EAE4" },
];

export function WorkshopAtelier() {
  const [activeStation, setActiveStation] = useState("Sketch");
  const [isReady, setIsReady] = useState(false);

  return (
    <main className="min-h-[844px] w-[390px] overflow-hidden bg-[#F9F8F6] px-[22px] pt-[26px] text-[#1A1721] [font-family:ui-sans-serif,system-ui,sans-serif]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[11px] bg-[#1A1721] text-[#F9F8F6]">
            <Sparkles size={15} strokeWidth={1.8} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6F6A70]">AIMD · DAILY STUDIO</span>
        </div>
        <button
          aria-label="Your daily streak"
          className="flex items-center gap-[7px] rounded-full border border-[#EAE6E1] bg-white/70 py-[5px] pl-[6px] pr-[11px] transition-transform active:scale-95"
          onClick={() => setIsReady((value) => !value)}
        >
          <span className="relative grid h-[28px] w-[28px] place-items-center rounded-full" style={{ background: "conic-gradient(#FF5C35 0deg 290deg, #F0EAE5 290deg 360deg)" }}>
            <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-[#F9F8F6]">
              <Flame size={12} className="text-[#FF5C35]" fill="#FF5C35" strokeWidth={1.5} />
            </span>
          </span>
          <span className="text-[11px] font-semibold">4-day streak</span>
        </button>
      </header>

      <section className="mt-[27px]">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-['Playfair_Display',Georgia,serif] text-[36px] leading-[1.03] tracking-[-.045em]">Studio</p>
            <p className="mt-[7px] text-[13px] text-[#77717A]">Make something today</p>
          </div>
          <div className="mb-[4px] flex items-center gap-[5px] text-[10px] font-medium uppercase tracking-[.13em] text-[#8A838B]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#FF5C35]" />
            A little time, just for you
          </div>
        </div>
      </section>

      <section className="relative mt-[22px] h-[370px] overflow-hidden rounded-[28px] bg-[#DDD5CE] shadow-[0_16px_36px_rgba(44,30,35,.12)]">
        <img
          src="/__mockup/images/canvas-board-creative-session.jpg"
          alt="Artist making a bold charcoal and orange sketch in a canvas notebook"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#17131B]/85 via-[#17131B]/10 to-transparent" />
        <div className="absolute left-[18px] top-[17px] flex items-center gap-[7px] rounded-full border border-white/40 bg-[#F9F8F6]/90 px-[11px] py-[7px] backdrop-blur-sm">
          <span className="h-[6px] w-[6px] rounded-full bg-[#FF5C35]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.12em]">Featured workshop</span>
        </div>
        <div className="absolute inset-x-[20px] bottom-[19px] text-white">
          <div className="mb-[11px] flex items-center gap-[7px] text-[10px] font-medium uppercase tracking-[.16em] text-white/75">
            <span className="h-px w-[20px] bg-[#FF5C35]" /> 12 min · all levels
          </div>
          <h2 className="max-w-[290px] font-['Playfair_Display',Georgia,serif] text-[31px] leading-[1.05] tracking-[-.035em]">Sketch with<br />bold shapes</h2>
          <div className="mt-[16px] flex items-center justify-between">
            <button
              onClick={() => setIsReady((value) => !value)}
              className="flex h-[45px] items-center gap-[10px] rounded-full bg-[#FF5C35] pl-[17px] pr-[16px] text-[12px] font-semibold text-white transition-transform active:scale-[.97]"
            >
              {isReady ? <Check size={15} /> : <Play size={14} fill="currentColor" />}
              {isReady ? "Ready to begin" : "Start workshop"}
            </button>
            <button aria-label="Open workshop details" onClick={() => setActiveStation("Sketch")} className="grid h-[42px] w-[42px] place-items-center rounded-full border border-white/45 bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-95">
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-[21px]">
        <div className="mb-[11px] flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#827B83]">Choose a studio station</span>
          <span className="text-[10px] text-[#A19AA1]">01 — 04</span>
        </div>
        <nav aria-label="Workshop stations" className="grid grid-cols-4 gap-[8px]">
          {stations.map((station) => {
            const selected = activeStation === station.name;
            return (
              <button
                key={station.name}
                aria-pressed={selected}
                onClick={() => {
                  setActiveStation(station.name);
                  setIsReady(false);
                }}
                className={`relative flex h-[88px] flex-col justify-between overflow-hidden rounded-[18px] border p-[11px] text-left transition-all active:scale-[.97] ${selected ? "border-[#1A1721] shadow-[0_5px_12px_rgba(26,23,33,.08)]" : "border-[#EAE6E1]"}`}
                style={{ backgroundColor: station.tone }}
              >
                <span className="text-[9px] font-medium tracking-[.1em] text-[#817A82]">{station.mark}</span>
                <span className="text-[12px] font-semibold">{station.name}</span>
                {selected && <span className="absolute right-[9px] top-[9px] h-[6px] w-[6px] rounded-full bg-[#FF5C35]" />}
              </button>
            );
          })}
        </nav>
      </section>

      <footer className="mt-[19px] flex items-center justify-between border-t border-[#EAE6E1] pt-[13px]">
        <div className="flex items-center gap-[8px]">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#EFE9F7] text-[#8B5CF6]">
            <Sparkles size={13} />
          </span>
          <span className="text-[11px] text-[#6F6971]">Your canvas is waiting</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[.12em] text-[#A49DA4]">Today · 01</span>
      </footer>
    </main>
  );
}
