import { useState } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronRight, Compass, Scissors, Sparkles } from "lucide-react";

const workshops = [
  { name: "Sketch", note: "loose lines", icon: "01" },
  { name: "Color", note: "play with hue", icon: "02" },
  { name: "Prompt", note: "follow a thread", icon: "03" },
];

export function OpenCanvas() {
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);

  return (
    <main className="open-canvas">
      <header className="oc-header">
        <div className="oc-brand">
          <span className="oc-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>AIMD <i>Creator Studio</i></span>
        </div>
        <div className="oc-streak" aria-label="Four-day practice streak">
          <span className="oc-streak-label">4 days<br />in a row</span>
          <span className="oc-ring" aria-hidden="true">
            <svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="17" /><circle className="oc-progress" cx="21" cy="21" r="17" /></svg>
            <b>4</b>
          </span>
        </div>
      </header>

      <section className="oc-intro">
        <div>
          <p className="oc-eyebrow"><span /> YOUR DAILY PAGE</p>
          <h1>Make a little<br /><em>room to make.</em></h1>
        </div>
        <span className="oc-spark" aria-hidden="true"><Sparkles size={16} strokeWidth={1.6} /></span>
      </section>

      <section className="oc-art-panel" aria-label="Today's creative session">
        <div className="oc-page-label"><BookOpen size={11} /> TODAY’S PAGE <span>04</span></div>
        <div className="oc-art-frame">
          <img
            src="/__mockup/images/canvas-board-creative-session.jpg"
            alt="An artist filling a sketchbook with expressive charcoal, orange, and violet marks"
          />
          <div className="oc-image-shade" />
          <div className="oc-art-caption">
            <span className="oc-caption-kicker">A moment for you</span>
            <span className="oc-caption-text">Start anywhere.</span>
          </div>
          <span className="oc-photo-index">FIELD NOTE <b>NO. 04</b></span>
        </div>
        <span className="oc-paper-pin" aria-hidden="true" />
      </section>

      <section className="oc-practice-row">
        <div className="oc-practice-copy">
          <span className="oc-practice-dot" />
          <span>{practiceStarted ? "Your page is open." : "No plan needed. Just begin."}</span>
        </div>
        <button
          className={`oc-practice-button${practiceStarted ? " is-started" : ""}`}
          type="button"
          aria-pressed={practiceStarted}
          onClick={() => setPracticeStarted((value) => !value)}
        >
          {practiceStarted ? <>In practice <Check size={15} /></> : <>Begin today <ArrowUpRight size={15} /> </>}
        </button>
      </section>

      <nav className="oc-workshops" aria-label="Quick workshops">
        <div className="oc-workshop-heading">
          <div><span className="oc-heading-rule" /><h2>Follow a thread</h2></div>
          <span>QUICK WORKSHOPS</span>
        </div>
        <div className="oc-workshop-list">
          {workshops.map((workshop, index) => {
            const selected = selectedWorkshop === workshop.name;
            const Icon = index === 0 ? BookOpen : index === 1 ? Scissors : Compass;
            return (
              <button
                className={`oc-workshop${selected ? " is-selected" : ""}`}
                type="button"
                key={workshop.name}
                aria-pressed={selected}
                onClick={() => setSelectedWorkshop(selected ? null : workshop.name)}
              >
                <span className="oc-workshop-icon"><Icon size={15} strokeWidth={1.7} /></span>
                <span className="oc-workshop-copy">
                  <b>{workshop.name}</b><small>{selected ? "Selected for today" : workshop.note}</small>
                </span>
                <span className="oc-workshop-end">{selected ? <Check size={15} /> : <ChevronRight size={15} />}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="oc-footer"><span>ONE PAGE AT A TIME</span><span className="oc-footer-mark">A<span>.</span></span></footer>

      <style>{`
        .open-canvas {
          --paper: #f7f4ef;
          --sheet: #fffdf9;
          --ink: #28252c;
          --muted: #817b7d;
          --line: #e8e1d9;
          --orange: #db6546;
          --violet: #7864a4;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          width: min(100%, 390px);
          min-height: 844px;
          margin: 0 auto;
          overflow: hidden;
          padding: 24px 23px 15px;
          color: var(--ink);
          background:
            radial-gradient(ellipse at 91% 21%, rgba(225, 161, 130, .12), transparent 26%),
            var(--paper);
          font-family: "DM Sans", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .open-canvas *, .open-canvas *::before, .open-canvas *::after { box-sizing: border-box; }
        .oc-header { height: 42px; display: flex; align-items: center; justify-content: space-between; }
        .oc-brand { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 750; letter-spacing: .07em; }
        .oc-brand i { margin-left: 3px; color: #777078; font-size: 10px; font-style: normal; font-weight: 500; letter-spacing: .015em; }
        .oc-mark { width: 27px; height: 27px; display: flex; align-items: center; justify-content: center; gap: 2px; border: 1px solid #ddd4ca; border-radius: 9px; transform: rotate(-5deg); }
        .oc-mark span { width: 3px; height: 9px; border-radius: 3px; background: var(--orange); }
        .oc-mark span:nth-child(2) { height: 14px; background: var(--violet); }
        .oc-mark span:nth-child(3) { height: 7px; background: #45404a; }
        .oc-streak { display: flex; align-items: center; gap: 8px; }
        .oc-streak-label { color: #817a7d; text-align: right; font-size: 9px; line-height: 1.2; font-weight: 600; }
        .oc-ring { position: relative; display: grid; place-items: center; width: 36px; height: 36px; }
        .oc-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .oc-ring circle { fill: none; stroke: #e6ded6; stroke-width: 2; }
        .oc-ring .oc-progress { stroke: var(--orange); stroke-width: 2.8; stroke-linecap: round; stroke-dasharray: 86 107; }
        .oc-ring b { font-size: 13px; font-weight: 700; }
        .oc-intro { display: flex; justify-content: space-between; align-items: end; margin: 23px 1px 15px; }
        .oc-eyebrow { display: flex; align-items: center; gap: 7px; margin: 0 0 7px; color: #827b7d; font-size: 8px; font-weight: 750; letter-spacing: .19em; }
        .oc-eyebrow span { width: 14px; height: 1px; background: var(--orange); }
        .oc-intro h1 { margin: 0; font-family: "Fraunces", Georgia, serif; font-size: 31px; font-weight: 450; line-height: .99; letter-spacing: -.045em; }
        .oc-intro h1 em { color: var(--violet); font-weight: 400; }
        .oc-spark { display: grid; place-items: center; width: 34px; height: 34px; margin: 0 2px 2px 0; border: 1px solid #e8ddd5; border-radius: 50%; color: var(--orange); transform: rotate(-9deg); }
        .oc-art-panel { position: relative; padding: 12px 12px 11px; border: 1px solid #e8e0d7; border-radius: 17px 17px 12px 12px; background: rgba(255,253,249,.78); box-shadow: 0 10px 28px rgba(73, 57, 45, .055); transform: rotate(-.35deg); }
        .oc-page-label { display: flex; align-items: center; gap: 6px; height: 19px; margin-bottom: 8px; color: #827a7b; font-size: 8px; font-weight: 700; letter-spacing: .15em; }
        .oc-page-label svg { color: var(--orange); }
        .oc-page-label span { margin-left: auto; color: #a49a95; font-family: "DM Mono", monospace; font-weight: 500; letter-spacing: .1em; }
        .oc-art-frame { position: relative; height: clamp(330px, calc(100dvh - 500px), 386px); min-height: 318px; overflow: hidden; border-radius: 10px; background: #d5c9bd; }
        .oc-art-frame img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 51% center; }
        .oc-image-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(25,22,27,.02) 40%, rgba(25,22,27,.46) 100%); }
        .oc-art-caption { position: absolute; left: 16px; bottom: 18px; display: flex; flex-direction: column; color: white; text-shadow: 0 1px 8px rgba(0,0,0,.18); }
        .oc-caption-kicker { margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: .13em; text-transform: uppercase; opacity: .82; }
        .oc-caption-text { font-family: "Fraunces", Georgia, serif; font-size: 25px; line-height: 1.08; letter-spacing: -.025em; }
        .oc-photo-index { position: absolute; right: 13px; bottom: 21px; color: rgba(255,255,255,.8); font-family: "DM Mono", monospace; font-size: 7px; letter-spacing: .1em; writing-mode: vertical-rl; transform: rotate(180deg); }
        .oc-photo-index b { font-weight: 500; }
        .oc-paper-pin { position: absolute; top: -4px; right: 30px; width: 42px; height: 7px; border-radius: 5px; background: #d9a589; opacity: .72; transform: rotate(3deg); }
        .oc-practice-row { min-height: 57px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 1px 7px; }
        .oc-practice-copy { display: flex; align-items: center; gap: 7px; color: #777175; font-size: 10px; font-weight: 500; letter-spacing: -.015em; }
        .oc-practice-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--violet); }
        .oc-practice-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 38px; padding: 0 14px; border: 0; border-radius: 999px; color: #fffaf6; background: var(--ink); font: 650 10px "DM Sans", sans-serif; letter-spacing: .01em; cursor: pointer; transition: transform 180ms ease, background 180ms ease; }
        .oc-practice-button:active { transform: scale(.96); }
        .oc-practice-button.is-started { background: var(--violet); }
        .oc-workshops { margin-top: 3px; }
        .oc-workshop-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 1px 9px; }
        .oc-workshop-heading > div { display: flex; align-items: center; gap: 8px; }
        .oc-heading-rule { width: 15px; height: 1px; background: var(--orange); }
        .oc-workshop-heading h2 { margin: 0; font-family: "Fraunces", Georgia, serif; font-size: 17px; font-weight: 500; letter-spacing: -.02em; }
        .oc-workshop-heading > span { color: #9b9290; font-size: 7px; font-weight: 700; letter-spacing: .14em; }
        .oc-workshop-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
        .oc-workshop { display: flex; min-width: 0; height: 69px; align-items: center; gap: 7px; padding: 8px 7px; border: 1px solid #e8e0d9; border-radius: 12px; color: var(--ink); background: rgba(255,253,249,.72); text-align: left; cursor: pointer; transition: transform 170ms ease, border-color 170ms ease, background 170ms ease; }
        .oc-workshop:active { transform: translateY(1px); }
        .oc-workshop.is-selected { border-color: rgba(219,101,70,.55); background: #fff3ec; }
        .oc-workshop-icon { display: grid; width: 25px; height: 25px; flex: 0 0 25px; place-items: center; border-radius: 8px; color: var(--orange); background: #f8e9df; }
        .oc-workshop:nth-child(2) .oc-workshop-icon { color: var(--violet); background: #eee9f5; }
        .oc-workshop:nth-child(3) .oc-workshop-icon { color: #69615d; background: #eeebe5; }
        .oc-workshop-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
        .oc-workshop-copy b { overflow: hidden; font-size: 10px; font-weight: 700; letter-spacing: -.025em; text-overflow: ellipsis; white-space: nowrap; }
        .oc-workshop-copy small { overflow: hidden; color: #8a8282; font-size: 7px; letter-spacing: -.01em; text-overflow: ellipsis; white-space: nowrap; }
        .oc-workshop-end { display: grid; flex: 0 0 13px; place-items: center; color: var(--orange); }
        .oc-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding: 12px 2px 0; color: #a49b99; font-size: 7px; font-weight: 700; letter-spacing: .18em; }
        .oc-footer-mark { color: #6f6870; font-family: "Fraunces", Georgia, serif; font-size: 13px; font-weight: 600; letter-spacing: -.08em; }
        .oc-footer-mark span { color: var(--orange); }
        .open-canvas button:focus-visible { outline: 2px solid var(--violet); outline-offset: 3px; }
        @media (max-width: 370px) {
          .open-canvas { padding-right: 18px; padding-left: 18px; }
          .oc-intro { margin-top: 19px; }
          .oc-intro h1 { font-size: 29px; }
          .oc-art-frame { height: clamp(310px, calc(100dvh - 492px), 370px); min-height: 300px; }
          .oc-workshop-list { gap: 5px; }
          .oc-workshop { gap: 5px; padding-right: 5px; padding-left: 6px; }
          .oc-workshop-icon { width: 23px; height: 23px; flex-basis: 23px; }
          .oc-workshop-copy b { font-size: 9px; }
        }
        @media (max-height: 760px) {
          .open-canvas { min-height: 760px; padding-top: 18px; }
          .oc-intro { margin-top: 15px; margin-bottom: 11px; }
          .oc-art-frame { height: 315px; min-height: 300px; }
          .oc-footer { padding-top: 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .open-canvas *, .open-canvas *::before, .open-canvas *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
        }
      `}</style>
    </main>
  );
}
