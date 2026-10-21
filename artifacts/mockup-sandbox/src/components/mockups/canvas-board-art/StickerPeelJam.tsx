import { useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Heart, RotateCcw, Scissors, Send, Sparkles, Star, Sun } from "lucide-react";
import "./stickerpeeljam.css";

const stickerData = [
  { id: "sun", label: "SUN DAY", kind: "sun", color: "#f9cf4a" },
  { id: "love", label: "BIG FEELINGS", kind: "heart", color: "#ff795d" },
  { id: "star", label: "GOOD IDEA", kind: "star", color: "#ad8dff" },
  { id: "flower", label: "GROW WILD", kind: "flower", color: "#f49ac2" },
  { id: "speech", label: "HEY YOU", kind: "speech", color: "#9bd8c4" },
  { id: "spark", label: "MAKE A MESS", kind: "spark", color: "#ff9d54" },
];

function StickerArt({ kind }: { kind: string }) {
  if (kind === "sun") return <><Sun size={39} strokeWidth={2.7} /><span className="jam-sun-face">·ᴗ·</span></>;
  if (kind === "heart") return <><Heart size={48} strokeWidth={2.4} fill="currentColor" /><span className="jam-heart-mark">!</span></>;
  if (kind === "star") return <><Star size={48} strokeWidth={2.1} fill="currentColor" /><span className="jam-star-dot">✦</span></>;
  if (kind === "flower") return <span className="jam-flower"><i /><i /><i /><i /><i /><b /></span>;
  if (kind === "speech") return <span className="jam-speech-art">HEY<br />YOU</span>;
  return <><Sparkles size={43} strokeWidth={2.4} /><span className="jam-spark-lines">✳</span></>;
}

export function StickerPeelJam() {
  const [peeled, setPeeled] = useState<string[]>(["sun"]);
  const [view, setView] = useState<"sheet" | "pile">("sheet");
  const [shared, setShared] = useState(false);

  const toggleSticker = (id: string) => {
    setPeeled((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setShared(false);
  };

  const reset = () => {
    setPeeled([]);
    setView("sheet");
    setShared(false);
  };

  const visibleStickers = view === "sheet"
    ? stickerData
    : stickerData.filter((sticker) => peeled.includes(sticker.id));

  return (
    <main className="peel-jam">
      <header className="pj-header">
        <div className="pj-brand">
          <div className="pj-brand-mark"><Sparkles size={19} strokeWidth={2.8} /></div>
          <div><strong>STICKER JAM</strong><span>DAILY ART CLUB · DAY 04</span></div>
        </div>
        <button className="pj-avatar" aria-label="Your artist profile" onClick={() => setView("pile")}>M</button>
      </header>

      <section className="pj-intro">
        <div className="pj-kicker"><span /> TODAY'S LITTLE PROMPT</div>
        <h1>Make a little<br /><em>noise.</em></h1>
        <p>Peel a feeling. Stick it somewhere it doesn’t belong.</p>
        <div className="pj-streak"><span className="pj-flame">✹</span><b>4 day</b><small>making streak</small></div>
      </section>

      <section className="pj-collection">
        <div className="pj-collection-heading">
          <div>
            <h2>{view === "sheet" ? "Today's sticker sheet" : "Your little pile"}</h2>
            <p>{peeled.length} of 6 peeled <span className="pj-progress"><i style={{ width: `${(peeled.length / 6) * 100}%` }} /></span></p>
          </div>
          <button className="pj-reset" aria-label="Reset sticker sheet" onClick={reset}><RotateCcw size={16} /></button>
        </div>

        <div className="pj-sheet">
          <div className="pj-sheet-top"><span>PEEL HERE</span><span>NO. 004 — GOOD VIBRATIONS</span></div>
          {visibleStickers.length > 0 ? (
            <div className="pj-sticker-grid">
              {visibleStickers.map((sticker, index) => {
                const isPeeled = peeled.includes(sticker.id);
                return (
                  <button
                    key={sticker.id}
                    className={`pj-sticker ${isPeeled ? "is-peeled" : ""} ${sticker.kind}`}
                    style={{ "--sticker-color": sticker.color, "--tilt": `${index % 2 ? 4 : -4}deg` } as CSSProperties}
                    onClick={() => toggleSticker(sticker.id)}
                    aria-label={`${isPeeled ? "Put back" : "Peel"} ${sticker.label}`}
                  >
                    <span className="pj-sticker-art"><StickerArt kind={sticker.kind} /></span>
                    <span className="pj-sticker-label">{sticker.label}</span>
                    {isPeeled && <span className="pj-peeled-check"><Check size={11} strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="pj-empty"><Scissors size={24} /><b>Your pile is waiting.</b><span>Peel a sticker to start the collection.</span><button onClick={() => setView("sheet")}>Back to the sheet</button></div>
          )}
          <div className="pj-sheet-foot"><span>✦</span> PRESS · PEEL · PLAY <span>✦</span></div>
        </div>
        <div className="pj-sheet-shadow" />
        <div className="pj-tape pj-tape-left" /><div className="pj-tape pj-tape-right" />
      </section>

      <div className="pj-view-toggle" role="tablist" aria-label="Sticker views">
        <button role="tab" aria-selected={view === "sheet"} className={view === "sheet" ? "active" : ""} onClick={() => setView("sheet")}><Scissors size={15} /> Sticker sheet</button>
        <button role="tab" aria-selected={view === "pile"} className={view === "pile" ? "active" : ""} onClick={() => setView("pile")}><Heart size={15} /> My pile <span>{peeled.length}</span></button>
      </div>

      <footer className="pj-footer">
        <span>{shared ? "Your pile is ready to show off." : peeled.length ? "A tiny collection, made by you." : "Pick a sticker. Make it yours."}</span>
        <button onClick={() => setShared(true)} disabled={!peeled.length}>
          {shared ? <><Check size={16} /> Saved</> : <>Show it off <Send size={15} /></>}
        </button>
      </footer>
      <div className="pj-bottom-note"><span>STICKER JAM</span><span>MAKE A MARK, THEN MAKE ANOTHER.</span><ArrowUpRight size={12} /></div>
    </main>
  );
}
