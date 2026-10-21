import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Instagram, X } from "lucide-react";
import "./_group.css";
import { Linking } from "./_shared/Linking";

type Category = "Tattoo Work" | "Paintings";

type Artwork = {
  src: string;
  alt: string;
  position?: string;
  fit?: "cover" | "contain";
};

const artwork: Record<Category, Artwork[]> = {
  "Tattoo Work": [
    {
      src: "poncho-tats18.jpg",
      alt: "Black and grey full-back tattoo with a city scene and detailed illustrative figures",
      position: "center 43%",
    },
    {
      src: "poncho-tats1.jpg",
      alt: "Color tattoo across a back, combining a portrait, a leopard, and ornamental pattern",
      position: "center 48%",
    },
    {
      src: "poncho-tats2.jpg",
      alt: "Flowing floral tattoo composition spanning a shoulder and back",
      position: "center 48%",
    },
  ],
  Paintings: [
    {
      src: "poncho-art9.jpg",
      alt: "Graphic zebra portrait against a vivid orange and yellow landscape",
      fit: "contain",
    },
    {
      src: "poncho-art4.jpg",
      alt: "Expressive painted portrait in violet and yellow with geometric black pattern",
      fit: "contain",
    },
    {
      src: "poncho-art2.jpg",
      alt: "Playful, expressive face painted with yellow, violet, and black marks",
      fit: "contain",
    },
  ],
};

const imagePath = (filename: string) => `/__mockup/images/${filename}`;

export function PonchoPortfolio() {
  const [category, setCategory] = useState<Category>("Tattoo Work");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [inquiryScreen, setInquiryScreen] = useState(false);
  const pieces = artwork[category];

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected]);

  if (inquiryScreen) {
    return (
      <main className="poncho-inquiry min-h-[100dvh]">
        <div className="pp-inquiry-shell">
          <button
            className="pp-back"
            type="button"
            onClick={() => setInquiryScreen(false)}
          >
            <ArrowLeft size={16} strokeWidth={1.6} />
            <span>Back to portfolio</span>
          </button>
          <div className="pp-inquiry-content">
            <p className="pp-eyebrow">PONCHO DAVILA · COMMISSIONS</p>
            <h1 className="pp-serif">Start a commission inquiry</h1>
            <div className="pp-rule" />
            <p className="pp-reserved">
              This inquiry screen is reserved for the next preview step.
            </p>
            <p className="pp-small-note">
              No request has been sent. For now, you can reach Poncho directly
              through his booking page.
            </p>
            <button
              type="button"
              className="pp-inline-link"
              onClick={() => Linking.openURL("https://ponchotheartist.com/booking/")}
            >
              Visit booking page <ArrowUpRight size={15} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="poncho-portfolio min-h-[100dvh]">
      <div className="pp-page">
        <header className="pp-header">
          <a className="pp-wordmark" href="https://ponchotheartist.com" target="_blank" rel="noreferrer">
            PONCHO DAVILA
          </a>
          <span className="pp-header-caption">ARTIST PORTFOLIO</span>
        </header>

        <section className="pp-profile" aria-labelledby="pp-name">
          <img
            className="pp-avatar"
            src={imagePath("poncho-ponchotheartistpic.jpg")}
            alt="Portrait of artist Edward 'Poncho' Davila"
          />
          <div className="pp-profile-copy">
            <p className="pp-eyebrow">TATTOO · PAINTING · COMMISSIONS</p>
            <h1 id="pp-name" className="pp-serif">Edward ‘Poncho’ Davila</h1>
            <p className="pp-bio">
              Lead Artist &amp; Founder of AIMD. Specializing in Custom Tattooing
              &amp; Fine Art Commissions.
            </p>
            <nav className="pp-links" aria-label="Artist links">
              <a href="https://ponchotheartist.com" target="_blank" rel="noreferrer">
                Website <ArrowUpRight size={14} strokeWidth={1.6} />
              </a>
              <a href="https://www.instagram.com/ponchotheartist/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={15} strokeWidth={1.6} />
                Instagram
              </a>
            </nav>
          </div>
        </section>

        <section className="pp-work" aria-labelledby="pp-work-title">
          <div className="pp-work-heading">
            <div>
              <p className="pp-eyebrow">SELECTED WORK</p>
              <h2 id="pp-work-title" className="pp-serif">Made to stay with you.</h2>
            </div>
            <div className="pp-tabs" role="tablist" aria-label="Artwork category">
              {(["Tattoo Work", "Paintings"] as Category[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? "pp-tab is-active" : "pp-tab"}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className={`pp-gallery ${category === "Paintings" ? "is-paintings" : ""}`}>
            {pieces.map((piece, index) => (
              <button
                className={`pp-artwork pp-artwork-${index + 1}`}
                key={piece.src}
                type="button"
                onClick={() => setSelected(piece)}
                aria-label={`View larger: ${piece.alt}`}
              >
                <img
                  src={imagePath(piece.src)}
                  alt={piece.alt}
                  loading="lazy"
                  style={{ objectFit: piece.fit ?? "cover", objectPosition: piece.position }}
                />
                <span className="pp-view-label">View image <ArrowUpRight size={13} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="pp-contact" aria-label="Commission inquiry">
          <div className="pp-contact-copy">
            <p className="pp-eyebrow">HAVE SOMETHING IN MIND?</p>
            <h2 className="pp-serif">Let’s make it personal.</h2>
          </div>
          <button
            className="pp-primary"
            type="button"
            onClick={() => setInquiryScreen(true)}
          >
            Start a Commission Inquiry <ArrowUpRight size={16} strokeWidth={1.6} />
          </button>
          <button
            className="pp-book-direct"
            type="button"
            onClick={() => Linking.openURL("https://ponchotheartist.com/booking/")}
          >
            Prefer to book a slot directly? Visit ponchotheartist.com/booking/.
          </button>
        </section>

        <footer className="pp-footer">
          <span>© Edward ‘Poncho’ Davila</span>
        </footer>
      </div>

      {selected && (
        <div
          className="pp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Artwork preview"
          onClick={() => setSelected(null)}
        >
          <button
            className="pp-lightbox-close"
            type="button"
            aria-label="Close image preview"
            onClick={() => setSelected(null)}
          >
            <X size={21} strokeWidth={1.5} />
          </button>
          <img
            src={imagePath(selected.src)}
            alt={selected.alt}
            onClick={(event) => event.stopPropagation()}
          />
          <p>{selected.alt}</p>
        </div>
      )}

      <style>{`
        .poncho-portfolio { min-height:100dvh; }
        .pp-page { width:min(100% - 44px, 1120px); margin:0 auto; }
        .pp-header { height:74px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--pp-line); }
        .pp-wordmark { color:var(--pp-ink); font-size:10px; font-weight:600; letter-spacing:.18em; text-decoration:none; }
        .pp-header-caption,.pp-eyebrow { font-size:9px; font-weight:500; letter-spacing:.17em; color:var(--pp-muted); }
        .pp-header-caption { font-size:8px; }
        .pp-profile { display:flex; align-items:center; gap:30px; padding:48px 0 42px; }
        .pp-avatar { width:104px; height:104px; border-radius:50%; object-fit:cover; object-position:50% 25%; flex:none; border:1px solid rgba(26,23,33,.08); }
        .pp-profile-copy { min-width:0; }
        .pp-profile-copy .pp-eyebrow { margin:0 0 8px; }
        .pp-profile h1 { font-size:clamp(30px,5vw,45px); font-weight:400; letter-spacing:-.035em; line-height:1.04; margin:0; }
        .pp-bio { max-width:465px; margin:11px 0 14px; font-size:13px; line-height:1.7; color:#55515a; }
        .pp-links { display:flex; gap:19px; align-items:center; }
        .pp-links a { display:inline-flex; gap:6px; align-items:center; color:var(--pp-ink); font-size:11px; text-decoration:none; border-bottom:1px solid #aaa5a9; padding-bottom:3px; }
        .pp-links a:hover,.pp-footer button:hover { color:var(--pp-accent); }
        .pp-work { border-top:1px solid var(--pp-line); padding-top:25px; }
        .pp-work-heading { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:18px; gap:20px; }
        .pp-work-heading .pp-eyebrow { margin:0 0 6px; }
        .pp-work-heading h2 { font-weight:400; font-size:clamp(23px,3vw,31px); line-height:1; letter-spacing:-.02em; margin:0; }
        .pp-tabs { display:flex; border-bottom:1px solid var(--pp-line); gap:21px; }
        .pp-tab { padding:9px 0 10px; border:0; border-bottom:1px solid transparent; margin-bottom:-1px; background:transparent; color:#827d85; font:inherit; font-size:11px; cursor:pointer; }
        .pp-tab.is-active { color:var(--pp-ink); border-color:var(--pp-ink); }
        .pp-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:13px; }
        .pp-artwork { position:relative; display:block; overflow:hidden; padding:0; border:0; background:#ece9e6; aspect-ratio:4/5; cursor:zoom-in; text-align:left; }
        .pp-artwork img { display:block; width:100%; height:100%; transition:transform .55s cubic-bezier(.2,.65,.25,1); }
        .pp-artwork:hover img { transform:scale(1.035); }
        .pp-gallery.is-paintings .pp-artwork { background:#efedeb; }
        .pp-view-label { position:absolute; display:flex; gap:5px; align-items:center; right:10px; bottom:10px; color:#fff; font-size:9px; letter-spacing:.04em; opacity:0; transform:translateY(4px); transition:opacity .2s,transform .2s; text-shadow:0 1px 4px rgba(0,0,0,.6); }
        .pp-artwork:hover .pp-view-label,.pp-artwork:focus-visible .pp-view-label { opacity:1; transform:translateY(0); }
        .pp-contact { margin-top:45px; padding:26px 0; border-top:1px solid var(--pp-line); border-bottom:1px solid var(--pp-line); display:flex; justify-content:space-between; align-items:center; gap:20px; }
        .pp-contact .pp-eyebrow { margin:0 0 7px; }
        .pp-contact h2 { margin:0; font-size:29px; line-height:1; font-weight:400; letter-spacing:-.02em; }
        .pp-primary { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:18px; padding:0 17px; color:#f9f8f6; background:var(--pp-ink); border:1px solid var(--pp-ink); font:inherit; font-size:11px; cursor:pointer; transition:background .2s,color .2s; }
        .pp-primary:hover { color:var(--pp-ink); background:transparent; }
        .pp-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:17px 0 24px; color:#817c84; font-size:9px; letter-spacing:.02em; }
        .pp-footer button { padding:0; border:0; background:none; color:inherit; font:inherit; text-align:right; cursor:pointer; }
        .pp-book-direct { display:block; width:100%; margin-top:16px; padding:8px 0; border:0; background:none; color:var(--pp-ink); text-align:left; text-decoration:underline; text-decoration-color:#aaa5a9; text-underline-offset:4px; font:inherit; font-size:11px; line-height:1.5; cursor:pointer; }
        .pp-book-direct:hover { color:var(--pp-accent); }
        .pp-lightbox { position:fixed; z-index:50; inset:0; padding:52px 22px 25px; background:rgba(20,18,23,.96); display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .pp-lightbox img { max-width:min(100%,1000px); max-height:calc(100dvh - 115px); object-fit:contain; }
        .pp-lightbox p { color:#e7e4e5; max-width:680px; text-align:center; font-size:11px; line-height:1.5; margin:13px 0 0; }
        .pp-lightbox-close { position:absolute; top:17px; right:19px; width:38px; height:38px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.26); border-radius:50%; background:transparent; color:#fff; cursor:pointer; }
        .pp-inquiry { min-height:100dvh; }
        .pp-inquiry-shell { width:min(100% - 44px,1120px); margin:0 auto; min-height:100dvh; }
        .pp-back { display:flex; align-items:center; gap:9px; border:0; padding:25px 0; background:none; color:var(--pp-ink); font:inherit; font-size:11px; cursor:pointer; }
        .pp-inquiry-content { max-width:570px; margin:clamp(80px,16vh,170px) auto 0; }
        .pp-inquiry-content .pp-eyebrow { margin:0 0 15px; }
        .pp-inquiry-content h1 { font-size:clamp(38px,7vw,64px); line-height:.98; font-weight:400; letter-spacing:-.04em; margin:0 0 27px; }
        .pp-rule { height:1px; background:var(--pp-line); }
        .pp-reserved { margin:24px 0 7px; font-size:15px; }
        .pp-small-note { max-width:430px; color:var(--pp-muted); font-size:12px; line-height:1.7; }
        .pp-inline-link { margin-top:18px; display:inline-flex; gap:8px; align-items:center; padding:0 0 5px; border:0; border-bottom:1px solid #aaa5a9; color:var(--pp-ink); background:none; font:inherit; font-size:11px; cursor:pointer; }
        @media (min-width:900px) {
          .pp-page { width:min(100% - 96px, 1120px); }
          .pp-header { height:84px; }
          .pp-profile { padding:56px 0 49px; gap:34px; }
          .pp-avatar { width:120px; height:120px; }
          .pp-gallery { gap:18px; }
          .pp-contact { margin-top:57px; }
        }
        @media (max-width:600px) {
          .pp-page { width:calc(100% - 36px); }
          .pp-header { height:60px; }
          .pp-profile { align-items:flex-start; gap:16px; padding:31px 0 28px; }
          .pp-avatar { width:96px; height:96px; }
          .pp-profile-copy .pp-eyebrow { font-size:7px; letter-spacing:.13em; margin:3px 0 7px; }
          .pp-profile h1 { font-size:30px; letter-spacing:-.045em; }
          .pp-bio { font-size:11px; line-height:1.55; margin:8px 0 10px; }
          .pp-links { gap:14px; }
          .pp-links a { font-size:10px; }
          .pp-work { padding-top:20px; }
          .pp-work-heading { display:block; margin-bottom:13px; }
          .pp-work-heading h2 { font-size:26px; }
          .pp-tabs { margin-top:14px; gap:20px; width:max-content; }
          .pp-tab { font-size:10px; padding:7px 0 8px; }
          .pp-gallery { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
          .pp-artwork { aspect-ratio:4/5; }
          .pp-artwork-3 { grid-column:span 2; aspect-ratio:4/3; }
          .pp-contact { margin-top:30px; padding:21px 0; display:block; }
          .pp-contact h2 { font-size:26px; }
          .pp-primary { width:100%; margin-top:17px; }
          .pp-footer { align-items:flex-start; flex-direction:column; gap:9px; padding:15px 0 22px; line-height:1.5; }
          .pp-footer button { text-align:left; }
          .pp-inquiry-shell { width:calc(100% - 36px); }
          .pp-back { padding:21px 0; }
          .pp-inquiry-content { margin-top:18vh; }
        }
        @media (prefers-reduced-motion:reduce) {
          .pp-artwork img,.pp-view-label,.pp-primary { transition:none; }
        }
      `}</style>
    </main>
  );
}
