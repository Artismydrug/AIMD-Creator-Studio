import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ImagePlus,
  Instagram,
  Mail,
  Sparkles,
  X,
} from "lucide-react";

type Attachment = {
  id: string;
  file: File;
  url: string;
};

const commissionOptions = ["Custom tattoo", "Painting", "Something else"];
const timings = ["No rush", "1–2 months", "Within a month"];

export function PonchoCommissionInquiry() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [commission, setCommission] = useState("Custom tattoo");
  const [timing, setTiming] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const available = Math.max(0, 4 - attachments.length);
    const accepted = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, available)
      .map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) }));
    setAttachments((current) => [...current, ...accepted]);
    setAttachmentError(files.some((file) => !file.type.startsWith("image/")) ? "Please choose image files only." : "");
    if (files.length > available) setAttachmentError("You can attach up to four reference photos.");
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="poncho-commission">
      <style>{`
        .poncho-commission {
          --pc-paper:#f9f8f6; --pc-ink:#1a1721; --pc-muted:#736e78; --pc-line:#e4e0dd;
          --pc-yellow:#f8d86a; --pc-mint:#b9f1e4; --pc-coral:#ffb08f; --pc-pink:#df006c;
          min-height:100dvh; background:var(--pc-paper); color:var(--pc-ink);
          font-family:"DM Sans",sans-serif; box-sizing:border-box;
        }
        .poncho-commission *, .poncho-commission *:before, .poncho-commission *:after { box-sizing:border-box; }
        .pc-wrap { width:min(100% - 34px, 1010px); margin:0 auto; }
        .pc-topbar { height:64px; display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid var(--pc-ink); }
        .pc-back { display:inline-flex; align-items:center; gap:8px; padding:8px 0; color:var(--pc-ink); border:0; background:none; font:inherit; font-size:11px; font-weight:700; cursor:pointer; text-decoration:none; }
        .pc-brand { display:flex; align-items:center; gap:9px; font-weight:900; font-size:9px; letter-spacing:.1em; }
        .pc-stamp { width:30px; height:30px; display:grid; place-items:center; border:1.5px solid var(--pc-ink); border-radius:10px; background:var(--pc-coral); box-shadow:2px 2px 0 var(--pc-ink); transform:rotate(-5deg); }
        .pc-brand span span { color:#68636c; font-weight:700; letter-spacing:.02em; }
        .pc-step { display:flex; justify-content:space-between; align-items:center; margin:24px 0 19px; color:var(--pc-muted); font-size:9px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
        .pc-step-mark { display:flex; align-items:center; gap:7px; color:var(--pc-ink); }
        .pc-step-dot { width:20px; height:20px; display:grid; place-items:center; background:var(--pc-yellow); border:1.5px solid var(--pc-ink); border-radius:50%; color:var(--pc-ink); font-size:9px; }
        .pc-layout { display:grid; grid-template-columns:minmax(0,1fr) 270px; gap:28px; align-items:start; padding-bottom:32px; }
        .pc-main { min-width:0; }
        .pc-heading { margin-bottom:22px; }
        .pc-kicker { display:inline-flex; align-items:center; padding:5px 9px; margin:0 0 12px; border:1.5px solid var(--pc-ink); border-radius:99px; background:var(--pc-mint); font-size:8px; font-weight:900; letter-spacing:.13em; }
        .pc-title { margin:0; font-family:"Cormorant Garamond",Georgia,serif; font-size:clamp(42px,8vw,59px); font-weight:700; letter-spacing:-.045em; line-height:.9; }
        .pc-intro { max-width:495px; margin:12px 0 0; color:#605b65; font-size:12px; line-height:1.65; }
        .pc-section { padding:17px 0 18px; border-top:1.5px solid var(--pc-ink); }
        .pc-section-head { display:flex; align-items:baseline; gap:9px; margin-bottom:13px; }
        .pc-number { color:#938d96; font-size:9px; font-weight:800; letter-spacing:.1em; }
        .pc-section-title { margin:0; font-size:13px; font-weight:900; letter-spacing:-.02em; }
        .pc-help { margin:3px 0 12px 25px; color:var(--pc-muted); font-size:10px; line-height:1.5; }
        .pc-choice-list { display:flex; flex-wrap:wrap; gap:8px; }
        .pc-choice { min-height:36px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 12px; border:1.5px solid var(--pc-ink); border-radius:99px; background:#fffaf1; color:var(--pc-ink); font:inherit; font-size:10px; font-weight:700; cursor:pointer; transition:transform .16s,box-shadow .16s,background .16s; }
        .pc-choice:hover { transform:translateY(-1px); }
        .pc-choice.selected { background:var(--pc-yellow); box-shadow:2px 2px 0 var(--pc-ink); }
        .pc-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .pc-field { display:flex; flex-direction:column; gap:6px; }
        .pc-field.full { grid-column:1 / -1; }
        .pc-field label { font-size:9px; font-weight:800; letter-spacing:.04em; }
        .pc-field input, .pc-field select, .pc-field textarea { width:100%; min-height:41px; padding:10px 11px; border:1.5px solid #d9d4d2; border-radius:10px; outline:none; background:#fffdfa; color:var(--pc-ink); font:inherit; font-size:11px; }
        .pc-field textarea { min-height:85px; resize:vertical; line-height:1.55; }
        .pc-field input:focus, .pc-field select:focus, .pc-field textarea:focus { border-color:var(--pc-ink); box-shadow:0 0 0 3px rgba(248,216,106,.45); }
        .pc-field input::placeholder, .pc-field textarea::placeholder { color:#a6a0a4; }
        .pc-upload { min-height:103px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:7px; border:1.5px dashed #bcb6b4; border-radius:14px; background:#fffdfa; text-align:center; cursor:pointer; transition:background .15s,border-color .15s; }
        .pc-upload:hover { background:#fff7d9; border-color:var(--pc-ink); }
        .pc-upload-icon { width:30px; height:30px; display:grid; place-items:center; border:1.5px solid var(--pc-ink); border-radius:10px; background:var(--pc-coral); }
        .pc-upload b { font-size:10px; }
        .pc-upload small { color:var(--pc-muted); font-size:9px; }
        .pc-file-input { position:absolute; width:1px; height:1px; clip:rect(0,0,0,0); overflow:hidden; }
        .pc-attachments { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:9px; }
        .pc-thumb { position:relative; overflow:hidden; aspect-ratio:1; border:1.5px solid var(--pc-ink); border-radius:10px; background:#eee9e3; }
        .pc-thumb img { width:100%; height:100%; display:block; object-fit:cover; }
        .pc-thumb-remove { position:absolute; top:4px; right:4px; width:22px; height:22px; display:grid; place-items:center; border:1px solid var(--pc-ink); border-radius:50%; background:#fffaf1; color:var(--pc-ink); cursor:pointer; }
        .pc-file-name { overflow:hidden; position:absolute; left:0; right:0; bottom:0; padding:14px 5px 5px; background:linear-gradient(transparent,rgba(26,23,33,.75)); color:white; font-size:7px; text-overflow:ellipsis; white-space:nowrap; }
        .pc-error { margin:7px 0 0; color:#b3334f; font-size:9px; }
        .pc-submit { width:100%; min-height:47px; display:flex; align-items:center; justify-content:center; gap:15px; border:2px solid var(--pc-ink); border-radius:13px; background:var(--pc-pink); color:#fffaf1; box-shadow:3px 3px 0 var(--pc-ink); font:inherit; font-size:11px; font-weight:900; cursor:pointer; transition:transform .18s,box-shadow .18s; }
        .pc-submit:hover { transform:translate(-1px,-1px); box-shadow:5px 5px 0 var(--pc-ink); }
        .pc-privacy { margin:11px 0 0; color:var(--pc-muted); text-align:center; font-size:9px; line-height:1.55; }
        .pc-aside { position:sticky; top:18px; margin-top:13px; }
        .pc-note-card { padding:17px; border:2px solid var(--pc-ink); border-radius:18px; background:var(--pc-mint); box-shadow:4px 4px 0 var(--pc-ink); }
        .pc-note-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .pc-note-top span { padding:5px 8px; border:1px solid var(--pc-ink); border-radius:99px; background:var(--pc-yellow); font-size:7px; font-weight:900; letter-spacing:.1em; }
        .pc-artist { display:flex; align-items:center; gap:11px; padding-bottom:13px; border-bottom:1px solid rgba(26,23,33,.2); }
        .pc-avatar { width:48px; height:48px; object-fit:cover; object-position:50% 25%; border:2px solid var(--pc-ink); border-radius:50%; box-shadow:2px 2px 0 var(--pc-coral); }
        .pc-artist h2 { margin:0 0 4px; font-family:"Cormorant Garamond",Georgia,serif; font-size:21px; line-height:.95; }
        .pc-artist p { margin:0; color:#56515a; font-size:8px; }
        .pc-aside-row { display:flex; gap:9px; align-items:flex-start; padding-top:13px; color:var(--pc-ink); font-size:9px; line-height:1.5; }
        .pc-aside-row svg { flex:none; margin-top:1px; }
        .pc-direct { display:flex; align-items:center; gap:7px; margin:14px 0 0; color:var(--pc-ink); font-size:9px; font-weight:800; text-decoration:underline; text-underline-offset:3px; }
        .pc-thanks { padding:30px 23px; margin:50px auto; max-width:510px; border:2px solid var(--pc-ink); border-radius:22px; background:var(--pc-mint); text-align:center; box-shadow:5px 5px 0 var(--pc-ink); }
        .pc-thanks-icon { width:48px; height:48px; display:grid; place-items:center; margin:0 auto 14px; border:2px solid var(--pc-ink); border-radius:50%; background:var(--pc-yellow); }
        .pc-thanks h1 { margin:0; font-family:"Cormorant Garamond",Georgia,serif; font-size:48px; line-height:.95; }
        .pc-thanks p { max-width:360px; margin:12px auto 20px; color:#59545d; font-size:12px; line-height:1.65; }
        .pc-thanks button { display:inline-flex; align-items:center; gap:8px; padding:11px 16px; border:1.5px solid var(--pc-ink); border-radius:99px; background:var(--pc-yellow); color:var(--pc-ink); font:inherit; font-size:10px; font-weight:800; cursor:pointer; }
        @media (min-width:760px) {
          .pc-wrap { width:min(100% - 64px,1010px); }
          .pc-topbar { height:74px; }
          .pc-step { margin:30px 0 22px; }
          .pc-layout { grid-template-columns:minmax(0,1fr) 285px; gap:48px; }
          .pc-section { padding:20px 0 21px; }
        }
        @media (max-width:620px) {
          .pc-wrap { width:calc(100% - 34px); }
          .pc-brand { font-size:8px; }
          .pc-layout { display:flex; flex-direction:column; gap:16px; }
          .pc-aside { position:static; order:-1; width:100%; margin:0; }
          .pc-note-card { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:0 10px; padding:12px; border-radius:15px; box-shadow:3px 3px 0 var(--pc-ink); }
          .pc-note-top { grid-column:1 / -1; margin-bottom:9px; }
          .pc-note-top svg { width:15px; }
          .pc-artist { padding:0; border:0; }
          .pc-avatar { width:40px; height:40px; }
          .pc-artist h2 { font-size:18px; }
          .pc-artist p { font-size:7px; }
          .pc-aside-row { padding-top:0; font-size:8px; }
          .pc-aside-row:nth-of-type(3) { display:none; }
          .pc-direct { grid-column:1 / -1; margin:10px 0 0 51px; }
          .pc-heading { margin-bottom:16px; }
          .pc-title { font-size:48px; }
          .pc-intro { font-size:11px; }
          .pc-section { padding:15px 0 16px; }
        }
        @media (max-width:380px) {
          .pc-choice { padding:0 10px; font-size:9px; }
          .pc-title { font-size:43px; }
          .pc-field-grid { grid-template-columns:1fr; }
          .pc-field.full { grid-column:auto; }
        }
        @media (prefers-reduced-motion:reduce) { .pc-choice,.pc-upload,.pc-submit { transition:none; } }
      `}</style>

      <div className="pc-wrap">
        <header className="pc-topbar">
          <a className="pc-back" href="/__mockup/preview/artist-portfolio/PonchoPortfolio">
            <ArrowLeft size={15} strokeWidth={1.8} />
            <span>Back to portfolio</span>
          </a>
          <div className="pc-brand">
            <span className="pc-stamp"><Sparkles size={15} strokeWidth={2.2} /></span>
            <span>CREATOR STUDIO <span>by AIMD</span></span>
          </div>
        </header>

        <div className="pc-step">
          <span>COMMISSION INQUIRY</span>
          <span className="pc-step-mark"><span className="pc-step-dot">1</span> PROJECT DETAILS</span>
        </div>

        {submitted ? (
          <section className="pc-thanks" aria-live="polite">
            <span className="pc-thanks-icon"><Check size={24} strokeWidth={2.4} /></span>
            <p className="pc-kicker">YOUR IDEA IS IN MOTION</p>
            <h1>Thanks for the details.</h1>
            <p>Your {commission.toLowerCase()} inquiry preview is ready, with {attachments.length} reference {attachments.length === 1 ? "photo" : "photos"}. Nothing has been sent and no one will receive it. Your details and attachments stay in this browser.</p>
            <button type="button" onClick={() => setSubmitted(false)}><ArrowLeft size={14} /> Review your inquiry</button>
          </section>
        ) : (
          <div className="pc-layout">
            <form className="pc-main" onSubmit={handleSubmit}>
              <div className="pc-heading">
                <p className="pc-kicker">PONCHO DAVILA · COMMISSIONS</p>
                <h1 className="pc-title">Let’s make<br />something yours.</h1>
                <p className="pc-intro">Tell me what you’re imagining. A few details and reference photos help me understand the story you want to carry.</p>
              </div>

              <section className="pc-section">
                <div className="pc-section-head"><span className="pc-number">01</span><h2 className="pc-section-title">What are we making?</h2></div>
                <div className="pc-choice-list" role="group" aria-label="Commission type">
                  {commissionOptions.map((option) => (
                    <button key={option} className={`pc-choice ${commission === option ? "selected" : ""}`} type="button" aria-pressed={commission === option} onClick={() => setCommission(option)}>
                      {commission === option && <Check size={13} strokeWidth={2.5} />}{option}
                    </button>
                  ))}
                </div>
              </section>

              <section className="pc-section">
                <div className="pc-section-head"><span className="pc-number">02</span><h2 className="pc-section-title">A little about you</h2></div>
                <div className="pc-field-grid">
                  <div className="pc-field">
                    <label htmlFor="pc-name">Your name *</label>
                    <input id="pc-name" name="name" placeholder="How should I address you?" required />
                  </div>
                  <div className="pc-field">
                    <label htmlFor="pc-email">Email address *</label>
                    <input id="pc-email" name="email" type="email" placeholder="you@example.com" required />
                  </div>
                </div>
              </section>

              <section className="pc-section">
                <div className="pc-section-head"><span className="pc-number">03</span><h2 className="pc-section-title">The good stuff</h2></div>
                <p className="pc-help">What’s the idea, the placement or size, the colors or feeling? Start anywhere.</p>
                <div className="pc-field-grid">
                  <div className="pc-field full">
                    <label htmlFor="pc-idea">Tell me about your project *</label>
                    <textarea id="pc-idea" name="idea" placeholder="I’ve been thinking about…" required />
                  </div>
                  <div className="pc-field">
                    <label htmlFor="pc-budget">Budget range</label>
                    <select id="pc-budget" name="budget" defaultValue="">
                      <option value="" disabled>Select a range</option>
                      <option>Under $500</option>
                      <option>$500–$1,000</option>
                      <option>$1,000–$2,500</option>
                      <option>$2,500+</option>
                      <option>Let’s talk</option>
                    </select>
                  </div>
                  <div className="pc-field">
                    <label htmlFor="pc-timing">Your timing</label>
                    <select id="pc-timing" name="timing" value={timing} onChange={(event) => setTiming(event.target.value)}>
                      <option value="">Choose what fits</option>
                      {timings.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              <section className="pc-section">
                <div className="pc-section-head"><span className="pc-number">04</span><h2 className="pc-section-title">Add a few visual clues</h2></div>
                <p className="pc-help">Inspiration, sketches, a photo of the placement — anything that helps tell the story.</p>
                <input ref={fileInput} className="pc-file-input" type="file" accept="image/*" multiple onChange={addFiles} aria-label="Choose reference photos" />
                <button className="pc-upload" type="button" onClick={() => fileInput.current?.click()} disabled={attachments.length >= 4} aria-label="Add reference photos">
                  <span className="pc-upload-icon"><ImagePlus size={16} /></span>
                  <b>{attachments.length >= 4 ? "Four photos attached" : "Choose reference photos"}</b>
                  <small>JPG, PNG or HEIC · up to 4 images</small>
                </button>
                {attachmentError && <p className="pc-error" role="alert">{attachmentError}</p>}
                {attachments.length > 0 && (
                  <div className="pc-attachments" aria-label={`${attachments.length} attached photos`}>
                    {attachments.map((attachment) => (
                      <div className="pc-thumb" key={attachment.id}>
                        <img src={attachment.url} alt={`Reference: ${attachment.file.name}`} />
                        <span className="pc-file-name">{attachment.file.name}</span>
                        <button type="button" className="pc-thumb-remove" aria-label={`Remove ${attachment.file.name}`} onClick={() => removeAttachment(attachment.id)}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <button className="pc-submit" type="submit">Preview inquiry <ArrowRight size={16} strokeWidth={2} /></button>
              <p className="pc-privacy">Local preview only — nothing is sent and no one will receive your details or attachments.</p>
            </form>

            <aside className="pc-aside">
              <div className="pc-note-card">
                <div className="pc-note-top"><span>A NOTE FROM THE STUDIO</span><Sparkles size={17} /></div>
                <div className="pc-artist">
                  <img className="pc-avatar" src="/__mockup/images/poncho-ponchotheartistpic.jpg" alt="Edward ‘Poncho’ Davila" />
                  <div><h2>Edward ‘Poncho’ Davila</h2><p>Tattoo artist · Painter · Founder</p></div>
                </div>
                <div className="pc-aside-row"><Clock3 size={14} /><span>Take your time — a rough idea is enough to start this preview.</span></div>
                <div className="pc-aside-row"><ImagePlus size={14} /><span>Rough ideas are welcome. We can shape the details together.</span></div>
                <a className="pc-direct" href="https://www.instagram.com/ponchotheartist/" target="_blank" rel="noreferrer"><Instagram size={13} /> Say hello on Instagram</a>
              </div>
              <a className="pc-direct" href="mailto:hello@ponchotheartist.com"><Mail size={13} /> Prefer email? Write directly</a>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
