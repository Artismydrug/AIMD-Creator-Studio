import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  CirclePlay,
  Flame,
  Headphones,
  Palette,
  Sparkles,
} from "lucide-react";

const stations = [
  { label: "Draw", icon: Palette, tint: "#FF7057" },
  { label: "Sound", icon: AudioLines, tint: "#C7E36A" },
  { label: "Move", icon: Sparkles, tint: "#A9B8FF" },
];

export function StudioFrequency() {
  const [station, setStation] = useState("Draw");
  const [isTunedIn, setIsTunedIn] = useState(false);

  return (
    <main
      className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#F2EFE6] px-5 pb-7 pt-7 text-[#202A3A]"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[15px] bg-[#FF7057] text-[#202A3A]">
            <AudioLines size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em]">AIMD Studio</p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[.14em] text-[#77808B]">Frequency 04</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsTunedIn((current) => !current)}
          aria-label={isTunedIn ? "Pause daily practice" : "Start daily practice"}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#202A3A]/15 bg-[#E5E1D7] transition-transform hover:bg-[#E0DACE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7057] active:scale-90"
        >
          {isTunedIn ? <Check size={17} /> : <Headphones size={17} />}
        </button>
      </header>

      <section className="mt-8">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#526B9E]">Your daily signal</p>
        <div className="flex items-end justify-between">
          <h1 className="font-['Fraunces'] text-[38px] leading-[.9] tracking-[-.055em]">
            Tune<br />in.
          </h1>
          <div className="mb-1 flex items-center gap-1.5 rounded-full bg-[#202A3A] px-3 py-2 text-[#F2EFE6]">
            <Flame size={13} fill="#FF7057" className="text-[#FF7057]" />
            <span className="text-[9px] font-bold uppercase tracking-[.1em]">04 day streak</span>
          </div>
        </div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-[30px] bg-[#202A3A] p-4 text-[#F2EFE6] shadow-[0_12px_28px_rgba(32,42,58,.15)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[.2em] text-[#B7C0D2]">On air · today</span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#C7E36A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7E36A]" />
            Studio open
          </span>
        </div>

        <div className="grid grid-cols-[1fr_126px] items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTunedIn((current) => !current)}
            aria-label={isTunedIn ? "Practice streak: 4 days, pause session" : "Practice streak: 4 days, start session"}
            className="group flex min-h-[153px] flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#2A3549] transition-transform hover:bg-[#303C52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7E36A] active:scale-[.97]"
          >
            <div className="relative grid h-[104px] w-[104px] place-items-center rounded-full" style={{ background: "conic-gradient(#C7E36A 0deg 235deg, rgba(242,239,230,.14) 235deg 360deg)" }}>
              <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#2A3549]">
                <div className="text-center">
                  <div className="font-['DM_Mono'] text-[28px] font-medium leading-none">04</div>
                  <div className="mt-1.5 text-[8px] font-bold uppercase tracking-[.16em] text-[#B7C0D2]">days</div>
                </div>
              </div>
            </div>
            <span className="mt-2 text-[8px] font-bold uppercase tracking-[.14em] text-[#C7E36A]">Streak dial</span>
          </button>

          <div className="relative h-[153px] overflow-hidden rounded-[22px] bg-[#4A5270]">
            <img
              src="/__mockup/images/canvas-board-creative-session.jpg"
              alt="Creative hands making a sketchbook study"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#202A3A]/80 via-transparent to-transparent" />
            <div className="absolute left-2.5 top-2.5 rounded-full bg-[#F2EFE6] px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-[#202A3A]">
              Your canvas
            </div>
            <button
              type="button"
              onClick={() => setIsTunedIn((current) => !current)}
              aria-label="Open today's creative practice"
              className="absolute bottom-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full bg-[#FF7057] text-[#202A3A] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-90"
            >
              {isTunedIn ? <Check size={16} /> : <CirclePlay size={17} />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[.16em] text-[#B7C0D2]">Live session</p>
            <p className="mt-1 text-[13px] font-semibold">{isTunedIn ? "You're in the flow" : "One mark at a time"}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsTunedIn((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-full bg-[#C7E36A] px-4 text-[10px] font-black text-[#202A3A] transition-transform hover:bg-[#D3ED83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
          >
            {isTunedIn ? "Done" : "Begin"} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-[.17em]">Pick a station</h2>
          <span className="text-[9px] font-medium text-[#77808B]">Quick access</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stations.map(({ label, icon: Icon, tint }, index) => (
            <button
              type="button"
              key={label}
              onClick={() => setStation(label)}
              aria-pressed={station === label}
              className={`flex h-[91px] flex-col items-start justify-between rounded-[20px] border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#526B9E] active:scale-[.96] ${
                station === label
                  ? "border-[#202A3A] bg-white shadow-[0_4px_0_#202A3A]"
                  : "border-[#202A3A]/10 bg-[#E7E3D9] hover:bg-white"
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-[12px]" style={{ backgroundColor: tint }}>
                <Icon size={16} className="text-[#202A3A]" />
              </span>
              <span className="flex w-full items-center justify-between">
                <span className="text-[10px] font-bold">{label}</span>
                <span className="text-[8px] font-medium text-[#77808B]">0{index + 1}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between pt-5">
        <span className="text-[9px] font-bold uppercase tracking-[.16em] text-[#77808B]">Discipline eats talent</span>
        <div className="flex items-center gap-1.5" aria-label="Practice progress">
          <span className="h-1.5 w-6 rounded-full bg-[#FF7057]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#B9BFBE]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#B9BFBE]" />
        </div>
      </footer>
    </main>
  );
}
