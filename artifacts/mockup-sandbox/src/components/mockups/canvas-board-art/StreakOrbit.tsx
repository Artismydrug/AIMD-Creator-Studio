import { useState } from "react";
import { ArrowUpRight, Check, Compass, Play, Sparkles } from "lucide-react";

const ORANGE = "#FF5C35";

export function StreakOrbit() {
  const [selected, setSelected] = useState("Open studio");
  const [started, setStarted] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#F9F8F6] px-[25px] pb-6 pt-[26px] text-[#1A1721]">
      <div className="pointer-events-none absolute -right-20 top-[128px] h-[240px] w-[240px] rounded-full border border-[#EAE6E1]" />
      <div className="pointer-events-none absolute -right-11 top-[166px] h-[164px] w-[164px] rounded-full border border-[#EAE6E1]/80" />

      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#1A1721] text-white">
            <Sparkles size={17} strokeWidth={1.8} />
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.02em]">Studio practice</span>
        </div>
        <button
          aria-label="Explore workshops"
          onClick={() => setSelected("Workshop map")}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#EAE6E1] bg-white/70 transition-transform active:scale-95"
        >
          <Compass size={18} strokeWidth={1.7} />
        </button>
      </header>

      <section className="relative z-10 mt-[42px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#827B85]">A little time for you</p>
        <h1 className="mt-2 font-['DM_Sans'] text-[31px] font-semibold leading-[1.05] tracking-[-0.055em]">
          Make something
          <br /> today.
        </h1>
      </section>

      <section className="relative mt-[26px] flex h-[235px] items-center justify-center" aria-label="Daily streak progress">
        <div className="absolute left-[15px] top-[4px] h-[226px] w-[226px] rounded-full border border-dashed border-[#DCD5CE]" />
        <div className="absolute left-[35px] top-[24px] h-[186px] w-[186px] rounded-full border border-[#EAE6E1]" />
        <span className="absolute left-[28px] top-[51px] h-2 w-2 rounded-full bg-[#8B5CF6]" />
        <span className="absolute right-[54px] top-[13px] h-[7px] w-[7px] rounded-full bg-[#FF5C35]" />
        <span className="absolute bottom-[24px] right-[36px] h-1.5 w-1.5 rounded-full bg-[#C7B9E8]" />
        <div className="relative grid h-[158px] w-[158px] place-items-center rounded-full bg-[#fffdfb] shadow-[0_10px_34px_rgba(36,25,48,0.06)]">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 158 158" aria-hidden="true">
            <circle cx="79" cy="79" r="69" fill="none" stroke="#EEEAE5" strokeWidth="5" />
            <circle
              cx="79" cy="79" r="69" fill="none" stroke={ORANGE} strokeWidth="5"
              strokeLinecap="round" strokeDasharray="433.54" strokeDashoffset="184"
            />
          </svg>
          <div className="relative -mt-1 text-center">
            <div className="font-['DM_Sans'] text-[46px] font-semibold leading-none tracking-[-0.08em]">4</div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#827B85]">day streak</div>
          </div>
          <span className="absolute bottom-[18px] right-[22px] grid h-[25px] w-[25px] place-items-center rounded-full bg-[#FF5C35] text-white">
            <Check size={13} strokeWidth={2.5} />
          </span>
        </div>
        <span className="absolute bottom-[1px] left-[9px] rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-[#6E6871] shadow-[0_3px_12px_rgba(36,25,48,0.05)]">
          Your rhythm, growing
        </span>
      </section>

      <button
        onClick={() => setStarted(!started)}
        className="group relative mt-[27px] flex h-[151px] w-full overflow-hidden rounded-[24px] bg-[#E9E2D8] text-left shadow-[0_8px_24px_rgba(36,25,48,0.07)] transition-transform active:scale-[0.985]"
        aria-label={started ? "Session started" : "Start a creative session"}
      >
        <img
          src="/__mockup/images/canvas-board-creative-session.jpg"
          alt="Artist making a charcoal and color study in a sketchbook"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1721]/70 via-[#1A1721]/28 to-transparent" />
        <div className="relative flex w-full flex-col justify-between p-[17px] text-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Today’s practice</span>
          <span className="flex items-end justify-between">
            <span className="max-w-[180px] text-[18px] font-semibold leading-[1.08] tracking-[-0.035em]">
              {started ? "Your page is waiting." : "Follow the first mark."}
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FF5C35] text-white transition-transform group-active:scale-90">
              {started ? <Check size={17} /> : <Play size={16} fill="currentColor" />}
            </span>
          </span>
        </div>
      </button>

      <section className="mt-[26px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold tracking-[-0.025em]">Workshops</h2>
          <button onClick={() => setSelected("All workshops")} className="flex items-center gap-1 text-[11px] font-medium text-[#827B85]">
            Explore <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Open studio", mark: "01", tone: "bg-[#EEE8F8]", dot: "#8B5CF6" },
            { name: "Daily drawing", mark: "02", tone: "bg-[#FCE9E2]", dot: "#FF5C35" },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setSelected(item.name)}
              className={`flex h-[78px] items-center gap-3 rounded-[19px] border px-3.5 text-left transition-all active:scale-[0.97] ${
                selected === item.name ? "border-[#1A1721]/15 bg-white shadow-[0_5px_18px_rgba(36,25,48,0.06)]" : "border-transparent bg-white/55"
              }`}
            >
              <span className={`grid h-[41px] w-[41px] shrink-0 place-items-center rounded-[14px] ${item.tone}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: item.dot }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold leading-tight">{item.name}</span>
                <span className="mt-1 block text-[9px] tracking-[0.1em] text-[#928B94]">SESSION {item.mark}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-auto flex items-center justify-center gap-2 pt-5">
        <span className="h-px w-8 bg-[#EAE6E1]" />
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#A29AA2]">Keep your orbit</span>
        <span className="h-px w-8 bg-[#EAE6E1]" />
      </div>
    </main>
  );
}
