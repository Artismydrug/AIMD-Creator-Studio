import { useState } from "react";
import {
  ArrowUpRight,
  AudioLines,
  Check,
  Flame,
  Heart,
  Paintbrush,
  Scissors,
  Sparkles,
} from "lucide-react";

const channels = [
  { label: "Sketch", icon: Paintbrush, color: "#D9C8FF", number: "01" },
  { label: "Collage", icon: Scissors, color: "#FFE16A", number: "02" },
  { label: "Sound", icon: AudioLines, color: "#B6DF83", number: "03" },
  { label: "Move", icon: Heart, color: "#FFA88F", number: "04" },
];

export function StickerFrequency() {
  const [channel, setChannel] = useState("Sketch");
  const [sessionDone, setSessionDone] = useState(false);

  return (
    <main className="sf-shell">
      <style>{`
        .sf-shell {
          --sf-ink: #28202f;
          --sf-paper: #fff4e6;
          --sf-coral: #f25e43;
          box-sizing: border-box;
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          width: min(100%, 390px);
          min-height: 100dvh;
          margin: 0 auto;
          overflow: hidden;
          padding: 25px 20px 21px;
          color: var(--sf-ink);
          background:
            radial-gradient(ellipse at 100% 45%, rgba(255, 223, 106, .22), transparent 28%),
            var(--sf-paper);
          font-family: "DM Sans", sans-serif;
        }
        .sf-shell::after {
          content: "";
          position: fixed;
          z-index: -1;
          pointer-events: none;
          inset: 0;
          opacity: .12;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
        }
        .sf-press { transition: transform 150ms cubic-bezier(.2,.8,.2,1), box-shadow 150ms ease, background-color 150ms ease; }
        .sf-press:active { transform: translate(2px, 2px) scale(.985); }
        .sf-press:focus-visible { outline: 3px solid #526b9e; outline-offset: 3px; }
        @media (max-height: 760px) {
          .sf-shell { padding-top: 18px; padding-bottom: 16px; }
          .sf-art-image { height: 205px !important; }
          .sf-intro { margin-top: 19px !important; }
          .sf-artwork { margin-top: 17px !important; }
          .sf-channels { margin-top: 21px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-shell *, .sf-shell *::before, .sf-shell *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
        }
      `}</style>

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] border-2 border-[#28202f] bg-[#8960dc] text-white shadow-[3px_3px_0_#28202f]">
            <Sparkles size={19} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.17em]">AIMD / Studio</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#8e7e8f]">Your creative practice</p>
          </div>
        </div>
        <div className="flex -rotate-3 items-center gap-1.5 rounded-full border-2 border-[#28202f] bg-[#ffe16a] px-3 py-2 shadow-[2px_2px_0_#28202f]" aria-label="Practice streak: 4 days">
          <Flame size={14} fill="#f25e43" className="text-[#f25e43]" />
          <span className="text-[9px] font-black uppercase tracking-[.06em]">4 day streak</span>
        </div>
      </header>

      <section className="sf-intro relative mt-6">
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-[.19em] text-[#7251b9]">Your daily frequency · 04</p>
        <h1 className="max-w-[290px] text-[34px] font-black leading-[.92] tracking-[-.065em]">
          Make a little <span className="text-[#f25e43]">noise.</span>
        </h1>
        <span className="absolute right-0 top-3 rotate-[9deg] rounded-[9px] border-2 border-[#28202f] bg-[#c8b6f5] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] shadow-[2px_2px_0_#28202f]">Tune in</span>
      </section>

      <section className="sf-artwork relative mt-5" aria-label="Today's creative session">
        <div className="absolute -left-1 top-3 z-10 -rotate-[8deg] rounded-[9px] border-2 border-[#28202f] bg-[#ffe16a] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] shadow-[2px_2px_0_#28202f]">
          On your worktable
        </div>
        <div className="overflow-hidden rounded-[25px] border-[3px] border-[#28202f] bg-[#d9c8ff] shadow-[5px_6px_0_#28202f]">
          <img
            src="/__mockup/images/canvas-board-creative-session.jpg"
            alt="Artist's hand making orange and violet marks in a sketchbook"
            className="sf-art-image block h-[238px] w-full object-cover"
          />
        </div>
        <span className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-[#28202f]/85 px-3 py-1.5 text-[9px] font-bold text-[#fff4e6] backdrop-blur-sm">
          {channel} session
        </span>
        <span className="absolute -bottom-3 right-3 grid h-11 w-11 rotate-6 place-items-center rounded-[15px] border-2 border-[#28202f] bg-[#f25e43] text-white shadow-[3px_3px_0_#28202f]" aria-hidden="true">
          {sessionDone ? <Check size={20} strokeWidth={3} /> : <AudioLines size={20} strokeWidth={2.5} />}
        </span>
      </section>

      <section className="sf-channels mt-7">
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <h2 className="text-[14px] font-black tracking-[-.035em]">Choose your channel</h2>
            <p className="mt-0.5 text-[9px] font-semibold text-[#8e7e8f]">Pick a way in. The rest can wait.</p>
          </div>
          <span className="pb-0.5 text-[8px] font-black uppercase tracking-[.14em] text-[#8e7e8f]">Studio dial</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {channels.map(({ label, icon: Icon, color, number }) => {
            const selected = channel === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setChannel(label)}
                aria-label={`Select ${label} practice channel`}
                aria-pressed={selected}
                className={`sf-press flex h-[76px] min-w-0 flex-col items-start justify-between rounded-[17px] border-2 border-[#28202f] p-2.5 text-left ${selected ? "bg-[#8960dc] text-white shadow-[3px_3px_0_#28202f]" : "bg-[#fffaf2] text-[#28202f] shadow-[2px_2px_0_rgba(40,32,47,.16)] hover:-translate-y-0.5"}`}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="grid h-[25px] w-[25px] place-items-center rounded-[9px]" style={{ backgroundColor: color }}>
                    <Icon size={14} strokeWidth={2.3} className="text-[#28202f]" />
                  </span>
                  <span className={`text-[7px] font-black tracking-[.1em] ${selected ? "text-white/70" : "text-[#9d91a1]"}`}>{number}</span>
                </span>
                <span className="text-[9px] font-extrabold tracking-[-.02em]">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 flex items-center justify-between rounded-[18px] border-2 border-[#28202f] bg-[#f5e9d8] px-3.5 py-2.5">
        <div className="min-w-0 pr-2">
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#8e7e8f]">{sessionDone ? "A good mark made" : "A little time for you"}</p>
          <p className="mt-0.5 truncate text-[12px] font-extrabold tracking-[-.03em]">{sessionDone ? "Your practice is complete." : `Ready to ${channel.toLowerCase()}?`}</p>
        </div>
        <button
          type="button"
          onClick={() => setSessionDone((done) => !done)}
          aria-label={sessionDone ? "Mark another practice session" : `Begin ${channel} practice session`}
          className="sf-press flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-[#28202f] bg-[#f25e43] px-4 text-[10px] font-black text-white shadow-[3px_3px_0_#28202f] hover:bg-[#e75138]"
        >
          {sessionDone ? "Again" : "Begin"} {sessionDone ? <Sparkles size={14} /> : <ArrowUpRight size={15} />}
        </button>
      </section>

      <footer className="mt-auto flex items-center justify-between pt-5">
        <span className="text-[8px] font-black uppercase tracking-[.17em] text-[#8e7e8f]">Make room to make</span>
        <div className="flex items-center gap-1.5" aria-label="Creative practice">
          <span className="h-2 w-2 rounded-full bg-[#f25e43]" />
          <span className="h-2 w-2 rounded-full bg-[#8960dc]" />
          <span className="h-2 w-2 rounded-full bg-[#ffe16a]" />
        </div>
      </footer>
    </main>
  );
}
