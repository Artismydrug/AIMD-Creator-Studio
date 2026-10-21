import { useState } from "react";
import {
  Award,
  Check,
  ChevronRight,
  CircleDot,
  Flame,
  Flower2,
  Heart,
  Layers,
  LockKeyhole,
  Paintbrush,
  Scissors,
  Sparkles,
  Star,
  X,
} from "lucide-react";

const badges = [
  { id: "first-mark", title: "First mark", subtitle: "Showed up & made", icon: Paintbrush, color: "#f2684b", wash: "#ffe2d8", earned: true, date: "TODAY" },
  { id: "color-mixer", title: "Color mixer", subtitle: "Built a bold palette", icon: CircleDot, color: "#7458dc", wash: "#e9e2ff", earned: true, date: "TODAY" },
  { id: "paper-play", title: "Paper play", subtitle: "Cut, layer, repeat", icon: Scissors, color: "#159c87", wash: "#d8f4e9", earned: true, date: "YESTERDAY" },
  { id: "good-energy", title: "Good energy", subtitle: "Cheered on a maker", icon: Heart, color: "#e24979", wash: "#ffe0eb", earned: false, date: "1 KIND WORD" },
  { id: "shape-shifter", title: "Shape shifter", subtitle: "Find a new form", icon: Flower2, color: "#d89115", wash: "#fff0c9", earned: false, date: "NEXT UP" },
  { id: "layer-cake", title: "Layer cake", subtitle: "Make 3 things yours", icon: Layers, color: "#386dbb", wash: "#dceaff", earned: false, date: "2 / 3 LAYERS" },
];

export function WorkshopBadges() {
  const [filter, setFilter] = useState<"all" | "earned">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [cheered, setCheered] = useState(false);
  const visibleBadges = filter === "earned" ? badges.filter((badge) => badge.earned) : badges;
  const activeBadge = badges.find((badge) => badge.id === selected);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-[#fff4e7] px-[19px] pb-6 pt-6 text-[#292038]" style={{ fontFamily: "DM Sans, ui-sans-serif, sans-serif" }}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-[13px] border-2 border-[#292038] bg-[#7759df] text-white shadow-[2px_2px_0_#292038]">
            <Sparkles size={17} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]">AIMD / Studio</p>
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#8d8191]">Workshop keepsakes</p>
          </div>
        </div>
        <button onClick={() => setSelected("collection")} aria-label="View collection details" className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#292038] bg-[#f5d757] transition-transform active:scale-90">
          <Award size={18} />
        </button>
      </header>

      <section className="relative mt-6 rounded-[25px] border-[2.5px] border-[#292038] bg-[#dff1df] px-4 pb-4 pt-[17px] shadow-[4px_5px_0_#292038]">
        <div className="absolute -right-1 -top-3 rotate-[8deg] rounded-full border-2 border-[#292038] bg-[#f36a4d] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white shadow-[2px_2px_0_#292038]">Week 02</div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#587658]">Little proof of big making</p>
        <h1 className="mt-1 max-w-[250px] text-[31px] font-black leading-[.96] tracking-[-.065em]">Your maker<br /><span className="text-[#ed6047]">patches.</span></h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex -space-x-1.5" aria-hidden="true">
            {badges.slice(0, 3).map(({ id, icon: Icon, color, wash }) => (
              <span key={id} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#292038]" style={{ backgroundColor: wash, color }}>
                <Icon size={15} strokeWidth={2.6} />
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[10px] font-black">
              <span>3 of 6 collected</span><span className="text-[#627e61]">HALFWAY</span>
            </div>
            <div className="mt-1.5 h-[7px] overflow-hidden rounded-full border border-[#292038] bg-[#fff8ec]">
              <div className="h-full w-1/2 rounded-full bg-[#7759df]" />
            </div>
          </div>
        </div>
        <div className="absolute right-[17px] top-[65px] -rotate-[12deg] text-[#ed6047]"><Star size={22} fill="currentColor" /></div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#918494]">A collection in progress</p>
            <h2 className="mt-0.5 text-[18px] font-black tracking-[-.045em]">Workshop badges</h2>
          </div>
          <div className="flex rounded-full border-2 border-[#292038] bg-[#f9ead8] p-0.5">
            <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1.5 text-[9px] font-black transition-colors ${filter === "all" ? "bg-[#292038] text-[#fff4e7]" : "text-[#766a7b]"}`}>ALL 6</button>
            <button onClick={() => setFilter("earned")} className={`rounded-full px-3 py-1.5 text-[9px] font-black transition-colors ${filter === "earned" ? "bg-[#292038] text-[#fff4e7]" : "text-[#766a7b]"}`}>GOT 3</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {visibleBadges.map(({ id, title, subtitle, icon: Icon, color, wash, earned, date }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="relative flex min-h-[126px] flex-col items-start overflow-hidden rounded-[20px] border-2 border-[#292038] p-3 text-left transition-transform active:translate-y-0.5 active:scale-[.98]"
              style={{ backgroundColor: earned ? wash : "#fffaf2", boxShadow: earned ? "3px 3px 0 #292038" : "2px 2px 0 #b7aab6" }}
            >
              <div className="flex w-full items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-[14px] border-2 border-[#292038]" style={{ backgroundColor: earned ? color : wash, color: earned ? "#fffaf2" : color }}>
                  <Icon size={20} strokeWidth={2.4} />
                </span>
                {earned
                  ? <span className="grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-[#292038] bg-[#f5d757]"><Check size={13} strokeWidth={3} /></span>
                  : <LockKeyhole size={15} className="mt-1 text-[#a99dac]" />}
              </div>
              <span className="mt-2.5 text-[13px] font-black leading-none tracking-[-.03em]">{title}</span>
              <span className="mt-1 text-[9px] font-semibold leading-tight text-[#766a7b]">{subtitle}</span>
              <span className="mt-auto pt-2 text-[8px] font-black uppercase tracking-[.12em]" style={{ color: earned ? color : "#9a8b9a" }}>{date}</span>
              <span className="absolute -bottom-4 -right-3 h-14 w-14 rounded-full border-[7px] opacity-[.12]" style={{ borderColor: color }} />
            </button>
          ))}
        </div>
      </section>

      <button onClick={() => setSelected("next")} className="mt-4 flex min-h-[53px] items-center gap-3 rounded-[17px] border-2 border-[#292038] bg-[#292038] px-3.5 text-left text-[#fff4e7] shadow-[3px_3px_0_#ed6047] transition-transform active:translate-y-0.5 active:shadow-none">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f5d757] text-[#292038]"><Flame size={17} /></span>
        <span className="flex-1">
          <span className="block text-[11px] font-black">One kind word unlocks the next</span>
          <span className="mt-0.5 block text-[9px] font-semibold text-[#d7cbd7]">Visit the community table</span>
        </span>
        <ChevronRight size={17} />
      </button>

      <footer className="mt-auto flex items-center justify-between pt-4">
        <span className="text-[9px] font-black uppercase tracking-[.16em] text-[#8c7e8e]">Keep making, keep collecting</span>
        <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f2684b]" /><span className="h-2 w-2 rounded-full bg-[#7759df]" /><span className="h-2 w-2 rounded-full bg-[#f5d757]" /></div>
      </footer>

      {activeBadge && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#292038]/25 p-3" onClick={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" aria-label={`${activeBadge.title} badge`} onClick={(event) => event.stopPropagation()} className="w-full rounded-[25px] border-[2.5px] border-[#292038] bg-[#fff8ee] p-5 shadow-[5px_5px_0_#292038]">
            <div className="flex items-start justify-between">
              <span className="grid h-[54px] w-[54px] place-items-center rounded-[18px] border-2 border-[#292038]" style={{ backgroundColor: activeBadge.wash, color: activeBadge.color }}><activeBadge.icon size={26} strokeWidth={2.4} /></span>
              <button onClick={() => setSelected(null)} aria-label="Close badge details" className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#292038] bg-[#f4e6d8]"><X size={17} /></button>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[.16em] text-[#918494]">{activeBadge.earned ? "A patch you earned" : "Your next little quest"}</p>
            <h3 className="mt-1 text-[25px] font-black tracking-[-.06em]">{activeBadge.title}</h3>
            <p className="mt-1 text-[12px] font-semibold text-[#746779]">{activeBadge.earned ? `${activeBadge.subtitle}. Made in the workshop, kept for good.` : `Try this at the next workshop: ${activeBadge.subtitle.toLowerCase()}.`}</p>
            {activeBadge.id === "good-energy" && (
              <button onClick={() => setCheered(true)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#292038] bg-[#e24979] text-[11px] font-black text-white shadow-[3px_3px_0_#292038] active:translate-y-0.5 active:shadow-none">
                {cheered ? <><Check size={15} /> Kind word sent</> : <><Heart size={15} /> Send a little cheer</>}
              </button>
            )}
            {selected === "collection" && <p className="mt-3 rounded-xl bg-[#e9e2ff] px-3 py-2 text-[10px] font-bold text-[#55428f]">Every patch marks a moment you made, shared, or helped someone else make.</p>}
            {selected === "next" && <p className="mt-3 rounded-xl bg-[#dff1df] px-3 py-2 text-[10px] font-bold text-[#466847]">Next up: leave a kind note on a maker’s work to earn Good energy.</p>}
          </section>
        </div>
      )}
    </main>
  );
}
