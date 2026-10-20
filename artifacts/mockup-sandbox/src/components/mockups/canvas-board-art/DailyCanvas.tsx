import { useState } from "react";
import { ArrowUpRight, Check, ChevronRight, CirclePlay } from "lucide-react";

const workshops = [
  { name: "Sketch", icon: "01" },
  { name: "Color", icon: "02" },
  { name: "Prompt", icon: "03" },
];

export function DailyCanvas() {
  const [activeWorkshop, setActiveWorkshop] = useState<string | null>(null);

  return (
    <main className="daily-canvas">
      <div className="canvas-topline">
        <span className="canvas-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <h1>Daily Canvas</h1>
        <button
          className="streak-status"
          type="button"
          aria-label="4-day streak"
          onClick={() => setActiveWorkshop(activeWorkshop === "streak" ? null : "streak")}
        >
          <span className="streak-copy">4-day streak</span>
          <span className="streak-ring">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" />
              <circle className="streak-progress" cx="22" cy="22" r="18" />
            </svg>
            <span>4</span>
          </span>
        </button>
      </div>

      <p className="daily-prompt">Make something today</p>

      <section className="artwork-wrap" aria-label="Today's artwork">
        <img
          className="artwork-image"
          src="/__mockup/images/canvas-board-creative-session.jpg"
          alt="An artist drawing an abstract charcoal, violet, and orange composition in a sketchbook"
        />
        <div className="artwork-wash" />
        <button
          className={`artwork-action ${activeWorkshop === "streak" ? "is-complete" : ""}`}
          type="button"
          aria-label={activeWorkshop === "streak" ? "Practice marked" : "Mark today's practice"}
          onClick={() => setActiveWorkshop(activeWorkshop === "streak" ? null : "streak")}
        >
          {activeWorkshop === "streak" ? <Check size={19} /> : <ArrowUpRight size={19} />}
        </button>
      </section>

      <nav className="workshop-dock" aria-label="Workshops">
        <div className="dock-heading">
          <span className="dock-rule" />
          <span className="dock-label">Workshops</span>
          <span className="dock-rule" />
        </div>
        <div className="workshop-list">
          {workshops.map((workshop, index) => {
            const selected = activeWorkshop === workshop.name;
            return (
              <button
                className={`workshop-tile ${selected ? "selected" : ""} ${index === 0 ? "first" : ""}`}
                key={workshop.name}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveWorkshop(selected ? null : workshop.name)}
              >
                <span className="workshop-number">{workshop.icon}</span>
                <span className="workshop-name">{workshop.name}</span>
                <span className="workshop-arrow">
                  {selected ? <Check size={16} /> : index === 0 ? <CirclePlay size={17} /> : <ChevronRight size={16} />}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        .daily-canvas {
          --canvas: #F9F8F6;
          --ink: #1A1721;
          --orange: #FF5C35;
          --purple: #8B5CF6;
          --divider: #EAE6E1;
          position: relative;
          box-sizing: border-box;
          width: min(100%, 390px);
          height: 844px;
          min-height: 844px;
          margin: 0 auto;
          overflow: hidden;
          padding: 27px 22px 20px;
          background: var(--canvas);
          color: var(--ink);
          font-family: "DM Sans", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .canvas-topline {
          display: flex;
          align-items: center;
          height: 42px;
          position: relative;
        }
        .canvas-mark {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border: 1px solid #ded9d2;
          border-radius: 8px;
          transform: rotate(-7deg);
        }
        .canvas-mark span {
          width: 3px;
          height: 10px;
          border-radius: 4px;
          background: var(--orange);
        }
        .canvas-mark span:nth-child(2) { height: 14px; background: var(--purple); }
        .canvas-mark span:nth-child(3) { height: 7px; background: var(--ink); }
        .canvas-topline h1 {
          margin: 0 0 0 10px;
          font-family: "DM Sans", sans-serif;
          font-size: 16px;
          font-weight: 650;
          letter-spacing: -0.045em;
        }
        .streak-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          color: var(--ink);
          background: transparent;
          cursor: pointer;
          transition: transform 180ms ease;
        }
        .streak-status:active { transform: scale(.96); }
        .streak-copy { color: #817d84; font-size: 10px; font-weight: 600; letter-spacing: -.01em; }
        .streak-ring {
          position: relative;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: none;
          border-radius: 50%;
        }
        .streak-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .streak-ring circle { fill: none; stroke: #e6e1dc; stroke-width: 2.2; }
        .streak-ring circle.streak-progress {
          stroke: var(--orange);
          stroke-linecap: round;
          stroke-dasharray: 90 113;
          stroke-width: 3;
        }
        .streak-ring span { font-size: 13px; font-weight: 700; letter-spacing: -.03em; }
        .daily-prompt {
          margin: 13px 0 17px;
          color: #807b84;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.015em;
        }
        .artwork-wrap {
          height: 526px;
          position: relative;
          overflow: hidden;
          border-radius: 24px 24px 22px 22px;
          background: #d8cabe;
          box-shadow: 0 12px 28px rgba(44, 35, 30, .11), 0 2px 5px rgba(44, 35, 30, .08);
        }
        .artwork-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: 51% center;
          transform: scale(1.025);
        }
        .artwork-wash {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(26,23,33,.14) 0%, transparent 22%, transparent 69%, rgba(26,23,33,.28) 100%);
          pointer-events: none;
        }
        .artwork-action {
          position: absolute;
          right: 15px;
          bottom: 15px;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.55);
          border-radius: 50%;
          color: var(--ink);
          background: rgba(249,248,246,.94);
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease;
        }
        .artwork-action:active { transform: scale(.91); }
        .artwork-action.is-complete { color: white; background: var(--orange); }
        .workshop-dock { margin-top: 19px; }
        .dock-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 11px;
        }
        .dock-rule { flex: 1; height: 1px; background: var(--divider); }
        .dock-label {
          color: #817d84;
          font-size: 10px;
          font-weight: 650;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .workshop-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .workshop-tile {
          min-width: 0;
          height: 66px;
          padding: 9px 9px 8px;
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: 16px 1fr;
          align-items: center;
          text-align: left;
          border: 1px solid var(--divider);
          border-radius: 14px;
          color: var(--ink);
          background: rgba(255,255,255,.65);
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
        }
        .workshop-tile:active { transform: translateY(2px); }
        .workshop-tile.selected, .workshop-tile.first {
          border-color: rgba(255,92,53,.34);
          background: #fff4ef;
        }
        .workshop-number {
          color: #aaa4a0;
          font-family: "DM Mono", monospace;
          font-size: 9px;
          letter-spacing: .04em;
        }
        .workshop-name {
          align-self: end;
          font-size: 12px;
          font-weight: 650;
          letter-spacing: -.03em;
        }
        .workshop-arrow {
          grid-column: 2;
          grid-row: 1 / span 2;
          color: var(--orange);
          align-self: center;
          display: grid;
          place-items: center;
        }
        @media (max-width: 390px) {
          .daily-canvas { width: 100%; padding-right: 18px; padding-left: 18px; }
          .artwork-wrap { height: min(526px, calc(100dvh - 298px)); min-height: 400px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .daily-canvas *, .daily-canvas *::before, .daily-canvas *::after { transition-duration: .01ms !important; }
        }
      `}</style>
    </main>
  );
}
