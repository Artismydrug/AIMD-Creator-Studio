import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  ImagePlus,
  Mic,
  Music2,
  PenLine,
  Play,
  RefreshCw,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";

type Medium = "Visual Art / Tattoo" | "Fashion" | "Music / Sound" | "Poetry / Writing" | "Fitness / Movement";
type Category = "Mixed" | Medium;
type Prompt = { medium: Medium; instruction: string };

const PROMPTS: Record<Medium, string[]> = {
  "Visual Art / Tattoo": [
    "Draw a tiny doorway that opens into a place you wish existed. Add one detail that makes it feel lived in.",
    "Design a two-shape tattoo flash: one natural shape, one geometric shape. Let them overlap once.",
    "Make a 60-second portrait using only five confident lines. Give the subject a feeling, not a likeness.",
    "Fill a small square with a pattern inspired by something you saw on your way here.",
  ],
  Fashion: [
    "Sketch a look built around one oversized shape and one tiny detail. Name the occasion it belongs to.",
    "Invent a wearable object from a familiar household item. Draw its silhouette and add one material note.",
    "Make a three-piece color story for a rainy afternoon using colors already in your wardrobe.",
    "Redesign a pocket so it carries one oddly specific thing comfortably. Draw the front and side.",
  ],
  "Music / Sound": [
    "Hum or tap a four-beat motif that sounds like arriving somewhere new. Repeat it twice, changing the ending.",
    "Build a tiny soundscape with three safe sounds nearby: a soft one, a sharp one, and a pause.",
    "Make up a two-line chorus about a small win. Speak it once, then find a rhythm for it.",
    "Tap a rhythm that alternates between steady and surprising. Leave one beat completely quiet.",
  ],
  "Poetry / Writing": [
    "Write a six-line poem where every line begins with “Today, I…” Keep the last line unexpected.",
    "Describe a familiar room as if it were a tiny planet. Include one sound and one color.",
    "Write a note to your future self that begins “Keep this small…” and ends with a concrete image.",
    "Make a list of five things that are almost, but not quite, the same. Turn the last two into a line.",
  ],
  "Fitness / Movement": [
    "Create a gentle 4-move sequence using only comfortable range of motion. Repeat it once at your own pace.",
    "Move like a line being drawn: start small, grow wider, then return to stillness. Stay in your comfort zone.",
    "Try a one-minute balance exploration near a stable support. Notice how your body makes tiny adjustments.",
    "Invent three seated or standing gestures for “open, gather, release.” Link them into one easy loop.",
  ],
};

const MEDIUMS: { name: Medium; icon: typeof Sparkles; tint: string }[] = [
  { name: "Visual Art / Tattoo", icon: Sparkles, tint: "#E3D5FF" },
  { name: "Fashion", icon: Shirt, tint: "#FFD7C9" },
  { name: "Music / Sound", icon: Music2, tint: "#D5E5C4" },
  { name: "Poetry / Writing", icon: PenLine, tint: "#FFE39A" },
  { name: "Fitness / Movement", icon: Dumbbell, tint: "#D7E6F0" },
];

export function FlashChallenge() {
  const [category, setCategory] = useState<Category>("Mixed");
  const [challenge, setChallenge] = useState<Prompt>(() => {
    const mediums = Object.keys(PROMPTS) as Medium[];
    const medium = mediums[Math.floor(Math.random() * mediums.length)];
    const prompts = PROMPTS[medium];
    return { medium, instruction: prompts[Math.floor(Math.random() * prompts.length)] };
  });
  const [round, setRound] = useState(1);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [writing, setWriting] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const isWriting = challenge.medium === "Poetry / Writing";
  const isMusic = challenge.medium === "Music / Sound";
  const title = useMemo(() => {
    if (completed) return "That’s a good little start.";
    if (started) return "Stay with the small thing.";
    return "Make a little something.";
  }, [completed, started]);

  useEffect(() => {
    if (!started || completed || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started, completed, seconds]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (seconds === 0 && started) setCompleted(true);
  }, [seconds, started]);

  function nextChallenge() {
    const pool: Medium[] = category === "Mixed" ? Object.keys(PROMPTS) as Medium[] : [category];
    const options = pool.flatMap((medium) => PROMPTS[medium].map((instruction) => ({ medium, instruction })));
    let next = options[Math.floor(Math.random() * options.length)];
    if (options.length > 1 && next.instruction === challenge.instruction) {
      next = options[(options.findIndex((option) => option.instruction === challenge.instruction) + 1) % options.length];
    }
    setChallenge(next);
    setRound((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(60);
    setWriting("");
    setRecording(false);
    setRecorded(false);
    clearPhoto();
  }

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    const pool: Medium[] = nextCategory === "Mixed" ? Object.keys(PROMPTS) as Medium[] : [nextCategory];
    const medium = pool[Math.floor(Math.random() * pool.length)];
    const choices = PROMPTS[medium];
    setChallenge({ medium, instruction: choices[Math.floor(Math.random() * choices.length)] });
    setRound((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(60);
    setWriting("");
    setRecording(false);
    setRecorded(false);
    clearPhoto();
  }

  function clearPhoto() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPhotoUrl(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setPhotoUrl(url);
  }

  function startChallenge() {
    if (completed) {
      nextChallenge();
      return;
    }
    setStarted(true);
  }

  function finishChallenge() {
    setCompleted(true);
    setStarted(false);
    setRecording(false);
  }

  const currentMedium = MEDIUMS.find((item) => item.name === challenge.medium)!;
  const Icon = currentMedium.icon;

  return (
    <main className="fc-shell">
      <style>{`
        .fc-shell {
          --ink: #28202f; --paper: #fff4e6; --coral: #f25e43; --violet: #8960dc;
          box-sizing: border-box; position: relative; isolation: isolate; display: flex; flex-direction: column;
          width: min(100%, 430px); min-height: 100dvh; margin: 0 auto; overflow: hidden;
          padding: 22px 20px 20px; color: var(--ink);
          background: radial-gradient(ellipse at 100% 25%, rgba(255,225,106,.26), transparent 29%), var(--paper);
          font-family: "DM Sans", sans-serif;
        }
        .fc-shell::after { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.09;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.2'/%3E%3C/svg%3E"); }
        .fc-shell button, .fc-shell input, .fc-shell textarea { font: inherit; }
        .fc-shell button { cursor:pointer; }
        .fc-focus:focus-visible { outline:3px solid #6651a2; outline-offset:3px; }
        .fc-press { transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease; }
        .fc-press:active { transform:translate(2px,2px) scale(.99); }
        .fc-reveal { animation: fc-in 320ms cubic-bezier(.2,.75,.25,1) both; }
        @keyframes fc-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 360px) { .fc-shell { padding-left:15px; padding-right:15px; } }
        @media (prefers-reduced-motion: reduce) { .fc-shell *, .fc-shell *::before, .fc-shell *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
      `}</style>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] border-2 border-[#28202f] bg-[#8960dc] text-white shadow-[3px_3px_0_#28202f]">
            <Sparkles size={19} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.17em]">AIMD / Side Quest</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#8e7e8f]">A tiny creative warm-up</p>
          </div>
        </div>
        <div className="flex -rotate-3 items-center gap-1.5 rounded-full border-2 border-[#28202f] bg-[#ffe16a] px-3 py-2 shadow-[2px_2px_0_#28202f]">
          <Clock3 size={13} />
          <span className="text-[9px] font-black uppercase tracking-[.06em]">60 sec</span>
        </div>
      </header>

      <section className="relative mt-6">
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-[.19em] text-[#7251b9]">Flash challenge · round {String(round).padStart(2, "0")}</p>
          <h1 className="max-w-[245px] text-[33px] font-black leading-[.94] tracking-[-.065em]">{title}</h1>
        <span className="absolute right-0 top-4 -rotate-[8deg] rounded-[9px] border-2 border-[#28202f] bg-[#d9c8ff] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] shadow-[2px_2px_0_#28202f]">No pressure</span>
        <p className="mt-2 max-w-[320px] text-[11px] font-semibold leading-relaxed text-[#817486]">One minute to follow a creative thread. Nothing to prove.</p>
      </section>

      <section className="mt-5">
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-black tracking-[-.035em]">Pick a lane</h2>
            <p className="mt-0.5 text-[9px] font-semibold text-[#8e7e8f]">Or let the worktable surprise you.</p>
          </div>
          <span className="flex items-center gap-0.5 pb-0.5 text-[8px] font-black uppercase tracking-[.12em] text-[#8e7e8f]">Swipe for more <ChevronRight size={11} /></span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Choose a creative medium">
          <button type="button" aria-pressed={category === "Mixed"} onClick={() => selectCategory("Mixed")} className={`fc-press fc-focus flex h-[62px] min-w-[73px] flex-col items-center justify-center gap-1.5 rounded-[16px] border-2 border-[#28202f] px-2 ${category === "Mixed" ? "bg-[#28202f] text-[#fff4e6] shadow-[3px_3px_0_#8960dc]" : "bg-[#fffaf2] text-[#28202f]"}`}>
            <RefreshCw size={17} /><span className="text-[9px] font-extrabold">Mixed</span>
          </button>
          {MEDIUMS.map(({ name, icon: MediumIcon, tint }) => {
            const selected = category === name;
            return (
              <button key={name} type="button" aria-pressed={selected} onClick={() => selectCategory(name)} className={`fc-press fc-focus flex h-[62px] min-w-[83px] flex-col items-center justify-center gap-1.5 rounded-[16px] border-2 border-[#28202f] px-2 ${selected ? "bg-[#8960dc] text-white shadow-[3px_3px_0_#28202f]" : "bg-[#fffaf2] text-[#28202f]"}`}>
                <span className="grid h-[25px] w-[25px] place-items-center rounded-[9px]" style={{ backgroundColor: tint }}><MediumIcon size={14} strokeWidth={2.4} className="text-[#28202f]" /></span>
                <span className="max-w-[82px] truncate text-[8px] font-extrabold">{name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="fc-reveal relative mt-3" key={challenge.instruction} aria-live="polite">
        <div className="absolute -left-1 top-3 z-10 -rotate-[7deg] rounded-[9px] border-2 border-[#28202f] bg-[#ffe16a] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] shadow-[2px_2px_0_#28202f]">On your worktable</div>
        <div className="rounded-[23px] border-[3px] border-[#28202f] bg-[#fffaf2] px-4 pb-4 pt-7 shadow-[5px_6px_0_#28202f]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[11px] border-2 border-[#28202f]" style={{ backgroundColor: currentMedium.tint }}><Icon size={16} /></span>
            <span className="text-[9px] font-black uppercase tracking-[.11em] text-[#7251b9]">{challenge.medium}</span>
          </div>
          <p className="mt-3 text-[15px] font-extrabold leading-[1.38] tracking-[-.025em]">{challenge.instruction}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[8px] font-bold uppercase tracking-[.12em] text-[#9a8e9e]">Small is enough</span>
            <button type="button" onClick={nextChallenge} className="fc-focus inline-flex items-center gap-1.5 rounded-full border-2 border-[#28202f] bg-[#d9c8ff] px-3 py-2 text-[9px] font-black shadow-[2px_2px_0_#28202f] hover:bg-[#ccb8fa]" aria-label="Shuffle to another challenge">
              <RefreshCw size={12} /> Shuffle
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5" aria-label="Challenge proof input">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-black tracking-[-.035em]">Leave a little trace</h2>
          <span className="text-[8px] font-black uppercase tracking-[.13em] text-[#9a8e9e]">Just for this moment</span>
        </div>
        {isWriting ? (
          <div className="rounded-[18px] border-2 border-[#28202f] bg-[#fffaf2] p-3 shadow-[3px_3px_0_rgba(40,32,47,.15)]">
            <label htmlFor="flash-writing" className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-[#7251b9]">Your lines</label>
            <textarea id="flash-writing" value={writing} onChange={(event) => setWriting(event.target.value)} maxLength={500} placeholder="Start anywhere…" className="fc-focus min-h-[84px] w-full resize-y rounded-[11px] border border-[#dfd2c4] bg-[#fff7ec] p-3 text-[12px] font-medium leading-relaxed text-[#28202f] placeholder:text-[#a99ba8]" />
            <p className="mt-1 text-right text-[8px] font-bold text-[#9a8e9e]">{writing.length}/500</p>
          </div>
        ) : isMusic ? (
          <div className="rounded-[18px] border-2 border-[#28202f] bg-[#eaf0e2] p-3 shadow-[3px_3px_0_rgba(40,32,47,.15)]">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { if (recording) { setRecording(false); setRecorded(true); } else { setRecorded(false); setRecording(true); } }} aria-pressed={recording} className={`fc-focus grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border-2 border-[#28202f] shadow-[2px_2px_0_#28202f] ${recording ? "bg-[#f25e43] text-white" : "bg-[#d5e5c4]"}`} aria-label={recording ? "Stop demo recording" : "Start demo recording"}>
                {recording ? <span className="h-4 w-4 rounded-[3px] bg-white" /> : <Mic size={20} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black">{recording ? "Recording demo…" : recorded ? "Your sound sketch" : "Try a sound sketch"}</p>
                <p className="mt-0.5 text-[9px] font-semibold text-[#817486]">{recording ? "Tap the square when you’re done." : recorded ? "A sandbox-only preview state." : "A pretend mic, no setup needed."}</p>
              </div>
              {recorded && !recording && <button type="button" onClick={() => setRecorded(false)} className="fc-focus grid h-9 w-9 place-items-center rounded-full border border-[#28202f] bg-[#fffaf2]" aria-label="Clear demo recording"><X size={15} /></button>}
              {recorded && !recording && <Play size={16} className="mr-1 text-[#7251b9]" aria-hidden="true" />}
            </div>
            <div className="mt-3 rounded-[9px] border border-dashed border-[#8e7e8f] bg-[#fffaf2]/70 px-2.5 py-2 text-[8px] font-bold leading-relaxed text-[#817486]">
              Sandbox demo only — this does not access your microphone, record audio, upload, or save anything.
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border-2 border-[#28202f] bg-[#f4edff] p-3 shadow-[3px_3px_0_rgba(40,32,47,.15)]">
            <input ref={fileInput} type="file" accept="image/*" onChange={handlePhoto} className="sr-only" aria-label="Choose a local photo for your challenge" />
            {photoUrl ? (
              <div className="relative overflow-hidden rounded-[13px] border-2 border-[#28202f] bg-[#fffaf2]">
                <img src={photoUrl} alt="Local challenge photo preview" className="block max-h-[180px] w-full object-cover" />
                <button type="button" onClick={clearPhoto} className="fc-focus absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border-2 border-[#28202f] bg-[#fff4e6] shadow-[2px_2px_0_#28202f]" aria-label="Remove selected photo"><X size={17} /></button>
                <span className="absolute bottom-2 left-2 rounded-full border border-[#28202f] bg-[#fff4e6]/95 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em]">Local preview only</span>
              </div>
            ) : (
              <button type="button" onClick={() => fileInput.current?.click()} className="fc-focus flex min-h-[76px] w-full items-center gap-3 rounded-[13px] border-2 border-dashed border-[#9c8eaa] bg-[#fffaf2]/70 px-3 text-left hover:bg-[#fffaf2]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border-2 border-[#28202f] bg-[#ffe16a]"><ImagePlus size={19} /></span>
                <span><span className="block text-[10px] font-black">Add a photo</span><span className="mt-0.5 block text-[8px] font-semibold text-[#817486]">Choose from this device for a preview</span></span>
                <ChevronRight size={16} className="ml-auto text-[#817486]" />
              </button>
            )}
            <p className="mt-2 text-[8px] font-semibold leading-relaxed text-[#817486]">Your photo stays in this browser preview only. It is never uploaded or persisted.</p>
          </div>
        )}
      </section>

      <section className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border-2 border-[#28202f] bg-[#f5e9d8] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#8e7e8f]">{completed ? "A good mark made" : started ? "Time left" : "Ready when you are"}</p>
          <p className="mt-0.5 text-[12px] font-extrabold tracking-[-.03em]">{completed ? "You showed up for a minute." : started ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} · keep it loose` : "One minute. Your rules."}</p>
        </div>
        <button type="button" onClick={completed ? nextChallenge : started ? finishChallenge : startChallenge} className="fc-press fc-focus flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-[#28202f] bg-[#f25e43] px-4 text-[10px] font-black text-white shadow-[3px_3px_0_#28202f] hover:bg-[#e75138]">
          {completed ? "Next one" : started ? "Done early" : "Start"} {completed ? <ChevronRight size={15} /> : started ? <Check size={15} /> : <Play size={14} fill="currentColor" />}
        </button>
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <span className="text-[8px] font-black uppercase tracking-[.15em] text-[#8e7e8f]">No points · no streaks · just practice</span>
        <span className="flex items-center gap-1.5 text-[8px] font-bold text-[#9a8e9e]"><span className="h-2 w-2 rounded-full bg-[#f25e43]" /><span className="h-2 w-2 rounded-full bg-[#8960dc]" /><span className="h-2 w-2 rounded-full bg-[#ffe16a]" /> Keep making</span>
      </footer>
    </main>
  );
}
