import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Mail,
  Phone,
  X,
} from "lucide-react";
import {
  useSandboxInquiries,
  SANDBOX_CREATOR_ID,
  markSandboxInquiryRead,
  inquiryNotificationText,
  sandboxPaths,
  type SandboxInquiry,
} from "./_shared/inquiryPreviewStore";

function inquiryFromLocation() {
  return new URLSearchParams(window.location.search).get("inquiry");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function CreatorInquiryNotifications() {
  const { inquiries, unreadCount, loading, error } = useSandboxInquiries(SANDBOX_CREATOR_ID);
  const [selectedId, setSelectedId] = useState(inquiryFromLocation);
  const [readError, setReadError] = useState("");
  const [largeImage, setLargeImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    const syncLocation = () => {
      setSelectedId(inquiryFromLocation());
      setLargeImage(null);
    };
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  const selected = useMemo(
    () => inquiries.find((item) => item.id === selectedId && item.creatorId === SANDBOX_CREATOR_ID),
    [inquiries, selectedId],
  );

  useEffect(() => {
    if (!selected || selected.readAt) return;
    void markSandboxInquiryRead(selected.id, SANDBOX_CREATOR_ID)
      .then(() => setReadError(""))
      .catch(() => setReadError("This inquiry is open, but its read status could not be saved."));
  }, [selected]);

  const referenceUrls = useMemo(() => {
    if (!selected) return [];
    return selected.references.map((reference) => ({
      id: reference.id,
      name: reference.name,
      url: URL.createObjectURL(reference.blob),
    }));
  }, [selected]);

  useEffect(() => {
    return () => referenceUrls.forEach((reference) => URL.revokeObjectURL(reference.url));
  }, [referenceUrls]);

  useEffect(() => {
    if (!largeImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLargeImage(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [largeImage]);

  const openInquiry = (inquiry: SandboxInquiry) => {
    setReadError("");
    const url = new URL(window.location.href);
    url.searchParams.set("inquiry", inquiry.id);
    window.history.pushState({ inquiry: inquiry.id }, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedId(inquiry.id);
  };

  const backToList = () => {
    setReadError("");
    const url = new URL(window.location.href);
    url.searchParams.delete("inquiry");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedId(null);
    setLargeImage(null);
  };

  const retry = () => window.dispatchEvent(new Event("focus"));

  return (
    <main className="cin-page">
      <style>{`
        .cin-page {
          --cin-paper:#f9f8f6; --cin-ink:#1a1721; --cin-muted:#736e78; --cin-line:#d8d2cf;
          --cin-yellow:#f8d86a; --cin-mint:#b9f1e4; --cin-coral:#ffb08f; --cin-pink:#df006c;
          min-height:100dvh; background:var(--cin-paper); color:var(--cin-ink);
          font-family:"DM Sans",sans-serif; box-sizing:border-box;
        }
        .cin-page *, .cin-page *::before, .cin-page *::after { box-sizing:border-box; }
        .cin-wrap { width:min(100% - 34px, 1040px); margin:0 auto; padding-bottom:32px; }
        .cin-topbar { min-height:65px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:2px solid var(--cin-ink); }
        .cin-brand { display:flex; align-items:center; gap:9px; font-size:9px; font-weight:900; letter-spacing:.1em; }
        .cin-brand-mark { width:30px; height:30px; display:grid; place-items:center; border:1.5px solid var(--cin-ink); border-radius:10px; background:var(--cin-coral); box-shadow:2px 2px 0 var(--cin-ink); transform:rotate(-5deg); }
        .cin-brand small { color:#68636c; font-size:9px; font-weight:700; letter-spacing:.02em; }
        .cin-back, .cin-nav-link { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:38px; padding:0 10px; border:1.5px solid var(--cin-ink); border-radius:999px; background:#fffaf1; color:var(--cin-ink); font:inherit; font-size:10px; font-weight:800; text-decoration:none; cursor:pointer; }
        .cin-back { border:0; padding-left:0; background:transparent; }
        .cin-nav { display:flex; gap:7px; align-items:center; }
        .cin-notification-nav { display:inline-flex; align-items:center; gap:6px; }
        .cin-nav-link.active { background:var(--cin-yellow); box-shadow:2px 2px 0 var(--cin-ink); }
        .cin-count { min-width:17px; height:17px; display:grid; place-items:center; padding:0 4px; border:1px solid var(--cin-ink); border-radius:99px; background:var(--cin-pink); color:#fffaf1; font-size:8px; }
        .cin-demo { display:flex; align-items:center; gap:9px; margin:18px 0 20px; padding:9px 12px; border:1.5px solid var(--cin-ink); border-radius:12px; background:#fff2c5; font-size:9px; line-height:1.5; }
        .cin-demo strong { font-size:9px; letter-spacing:.04em; text-transform:uppercase; }
        .cin-demo p { margin:0; color:#625b51; }
        .cin-heading { display:flex; justify-content:space-between; align-items:end; gap:15px; margin:0 0 18px; }
        .cin-kicker { display:inline-flex; padding:5px 9px; margin:0 0 10px; border:1.5px solid var(--cin-ink); border-radius:99px; background:var(--cin-mint); font-size:8px; font-weight:900; letter-spacing:.12em; }
        .cin-title { margin:0; font-family:"Cormorant Garamond",Georgia,serif; font-size:clamp(39px,8vw,55px); letter-spacing:-.045em; line-height:.9; }
        .cin-subtitle { margin:9px 0 0; max-width:560px; color:#625d66; font-size:11px; line-height:1.55; }
        .cin-unread { display:flex; flex:none; align-items:center; gap:7px; padding:8px 11px; border:1.5px solid var(--cin-ink); border-radius:99px; background:var(--cin-yellow); box-shadow:2px 2px 0 var(--cin-ink); font-size:9px; font-weight:900; }
        .cin-list { border-top:2px solid var(--cin-ink); }
        .cin-row { width:100%; display:grid; grid-template-columns:38px minmax(0,1fr) auto 18px; gap:12px; align-items:center; padding:15px 10px; border:0; border-bottom:1.5px solid var(--cin-line); background:transparent; color:inherit; text-align:left; font:inherit; cursor:pointer; transition:background .16s, transform .16s; }
        .cin-row:hover { background:#fff2c5; }
        .cin-row:active { transform:translateY(1px); }
        .cin-row.unread { background:#edf8f3; }
        .cin-row.unread:hover { background:#ddf4eb; }
        .cin-bell { width:36px; height:36px; display:grid; place-items:center; border:1.5px solid var(--cin-ink); border-radius:12px; background:var(--cin-coral); box-shadow:2px 2px 0 var(--cin-ink); }
        .cin-row.unread .cin-bell { background:var(--cin-yellow); }
        .cin-row-copy { min-width:0; }
        .cin-row-title { display:block; margin:0 0 5px; font-size:11px; font-weight:800; line-height:1.45; }
        .cin-row-meta { display:flex; align-items:center; gap:7px; color:var(--cin-muted); font-size:9px; }
        .cin-dot { width:7px; height:7px; border:1px solid var(--cin-ink); border-radius:50%; background:var(--cin-pink); }
        .cin-row:not(.unread) .cin-dot { background:transparent; }
        .cin-row-date { color:var(--cin-muted); white-space:nowrap; font-size:9px; }
        .cin-chevron { color:#6d6670; }
        .cin-panel { padding:18px; border:2px solid var(--cin-ink); border-radius:18px; background:#fffaf1; box-shadow:4px 4px 0 var(--cin-ink); }
        .cin-detail-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:15px; border-bottom:1.5px solid var(--cin-line); }
        .cin-detail-head .cin-kicker { margin-bottom:9px; }
        .cin-detail-head h1 { margin:0; font-family:"Cormorant Garamond",Georgia,serif; font-size:clamp(32px,7vw,46px); letter-spacing:-.04em; line-height:.94; overflow-wrap:anywhere; }
        .cin-date { display:flex; align-items:center; gap:6px; margin:9px 0 0; color:var(--cin-muted); font-size:9px; }
        .cin-icon-button { width:37px; height:37px; flex:none; display:grid; place-items:center; border:1.5px solid var(--cin-ink); border-radius:50%; background:var(--cin-yellow); color:var(--cin-ink); cursor:pointer; }
        .cin-lead-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:15px 0; }
        .cin-fact { min-width:0; padding:11px; border:1.5px solid var(--cin-ink); border-radius:12px; background:#f0faf6; }
        .cin-fact-label { display:flex; align-items:center; gap:6px; margin:0 0 6px; color:#6b6670; font-size:8px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
        .cin-fact-value { margin:0; overflow-wrap:anywhere; font-size:11px; font-weight:750; line-height:1.45; }
        .cin-contact-note { margin:0 0 14px; color:var(--cin-muted); font-size:9px; line-height:1.5; }
        .cin-section { padding:14px 0; border-top:1.5px solid var(--cin-line); }
        .cin-section h2 { margin:0 0 8px; font-size:11px; font-weight:900; }
        .cin-description { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; line-height:1.7; }
        .cin-refs { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; }
        .cin-ref { position:relative; overflow:hidden; aspect-ratio:1; padding:0; border:1.5px solid var(--cin-ink); border-radius:11px; background:#eee9e3; cursor:zoom-in; }
        .cin-ref img { display:block; width:100%; height:100%; object-fit:cover; }
        .cin-ref span { position:absolute; inset:auto 0 0; overflow:hidden; padding:14px 6px 5px; background:linear-gradient(transparent,rgba(26,23,33,.76)); color:#fffaf1; text-align:left; text-overflow:ellipsis; white-space:nowrap; font-size:8px; }
        .cin-state { padding:34px 18px; border:2px dashed #bdb6b1; border-radius:17px; background:#fffaf1; text-align:center; }
        .cin-state-icon { width:43px; height:43px; display:grid; place-items:center; margin:0 auto 12px; border:1.5px solid var(--cin-ink); border-radius:14px; background:var(--cin-mint); box-shadow:2px 2px 0 var(--cin-ink); }
        .cin-state h2 { margin:0; font-family:"Cormorant Garamond",Georgia,serif; font-size:28px; line-height:1; }
        .cin-state p { max-width:390px; margin:9px auto 15px; color:var(--cin-muted); font-size:10px; line-height:1.65; }
        .cin-state-links { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; }
        .cin-action { min-height:38px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 12px; border:1.5px solid var(--cin-ink); border-radius:999px; background:var(--cin-yellow); color:var(--cin-ink); font:inherit; font-size:9px; font-weight:850; text-decoration:none; cursor:pointer; }
        .cin-action:hover, .cin-back:hover, .cin-nav-link:hover { box-shadow:2px 2px 0 var(--cin-ink); }
        .cin-error { color:#a62749; }
        .cin-skeleton { height:70px; margin:0; border-bottom:1.5px solid var(--cin-line); background:linear-gradient(90deg,#f2ece5 25%,#fff8eb 45%,#f2ece5 65%); background-size:200% 100%; animation:cin-sheen 1.5s ease-in-out infinite; }
        @keyframes cin-sheen { to { background-position:-200% 0; } }
        .cin-lightbox { position:fixed; z-index:100; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:58px 18px 22px; background:rgba(26,23,33,.96); }
        .cin-lightbox img { max-width:100%; max-height:calc(100dvh - 118px); object-fit:contain; }
        .cin-lightbox p { max-width:90vw; margin:12px 0 0; color:#fffaf1; text-align:center; font-size:11px; }
        .cin-lightbox .cin-icon-button { position:absolute; top:15px; right:16px; background:#fffaf1; }
        .cin-footer { display:flex; justify-content:space-between; gap:12px; padding-top:23px; color:#79737b; font-size:9px; }
        .cin-footer a { color:inherit; text-underline-offset:3px; }
        @media (min-width:760px) {
          .cin-wrap { width:min(100% - 64px,1040px); }
          .cin-topbar { min-height:74px; }
          .cin-demo { margin:22px 0 27px; }
          .cin-panel { padding:24px; }
          .cin-row { padding:17px 14px; grid-template-columns:44px minmax(0,1fr) auto 20px; }
          .cin-bell { width:40px; height:40px; }
          .cin-detail-layout { display:grid; grid-template-columns:minmax(0,1fr) 230px; gap:22px; }
          .cin-lead-facts { align-content:start; }
        }
        @media (max-width:520px) {
          .cin-topbar { min-height:60px; }
          .cin-brand { font-size:8px; letter-spacing:.07em; }
          .cin-brand small { font-size:8px; }
          .cin-back { font-size:9px; gap:5px; }
          .cin-nav-link { min-height:34px; padding:0 8px; font-size:9px; }
          .cin-nav-link:first-child { display:none; }
          .cin-nav { gap:5px; }
          .cin-heading { align-items:flex-start; }
          .cin-unread { margin-top:19px; padding:7px 9px; font-size:8px; }
          .cin-row { grid-template-columns:34px minmax(0,1fr) 15px; gap:9px; padding:13px 4px; }
          .cin-bell { width:33px; height:33px; border-radius:10px; }
          .cin-row-date { display:none; }
          .cin-row-title { font-size:10px; }
          .cin-row-meta { font-size:8px; }
          .cin-panel { padding:14px; }
          .cin-detail-head { gap:7px; }
          .cin-lead-facts { gap:8px; padding:12px 0; }
          .cin-fact { padding:9px; }
          .cin-fact-value { font-size:10px; }
          .cin-refs { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .cin-demo { align-items:flex-start; }
          .cin-demo svg { flex:none; margin-top:2px; }
          .cin-footer { flex-direction:column; }
        }
        @media (max-width:360px) {
          .cin-brand { gap:6px; font-size:7px; }
          .cin-brand small { font-size:7px; }
          .cin-nav { gap:4px; }
          .cin-nav-link { padding:0 6px; }
          .cin-demo { font-size:8px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .cin-row, .cin-skeleton { animation:none; transition:none; }
        }
        .cin-page button:focus-visible, .cin-page a:focus-visible { outline:3px solid #df006c; outline-offset:3px; }
      `}</style>

      <div className="cin-wrap">
        {readError && <p className="cin-error" role="alert">{readError}</p>}
        <header className="cin-topbar">
          {selectedId ? (
            <button className="cin-back" type="button" onClick={backToList}>
              <ArrowLeft size={15} /> <span>All notifications</span>
            </button>
          ) : (
            <a className="cin-back" href={sandboxPaths.profile}>
              <ArrowLeft size={15} /> <span>Back to portfolio</span>
            </a>
          )}
          <div className="cin-brand">
            <span className="cin-brand-mark"><Bell size={15} strokeWidth={2.2} /></span>
            <span>CREATOR STUDIO <small>by AIMD</small></span>
          </div>
          <nav className="cin-nav" aria-label="Sandbox navigation">
            <a className="cin-nav-link" href={sandboxPaths.profile}>Profile <ArrowUpRight size={11} /></a>
            <a className="cin-nav-link active" href={sandboxPaths.notifications} aria-current="page" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
              <span className="cin-notification-nav"><Bell size={12} /> <span className="cin-nav-label">Notifications</span>{unreadCount > 0 && <span className="cin-count" aria-hidden="true">{unreadCount}</span>}</span>
            </a>
            <a className="cin-nav-link" href={sandboxPaths.form}>Inquiry form <ArrowUpRight size={11} /></a>
          </nav>
        </header>

        <aside className="cin-demo" aria-label="Sandbox preview notice">
          <Check size={14} />
          <div><strong>Sandbox preview · Stored in this browser</strong><p>Demo creator inbox only. No owner authentication or real notification delivery.</p></div>
        </aside>

        {selectedId ? (
          selected ? (
            <section className="cin-panel" aria-labelledby="cin-detail-title">
              <div className="cin-detail-head">
                <div>
                  <p className="cin-kicker">COMMISSION INQUIRY · {selected.category.toUpperCase()}</p>
                  <h1 id="cin-detail-title">{selected.clientName}</h1>
                  <p className="cin-date"><CalendarDays size={13} /> Received {formatDate(selected.createdAt)}</p>
                </div>
                <button className="cin-icon-button" type="button" onClick={backToList} aria-label="Close inquiry details"><X size={17} /></button>
              </div>
              <div className="cin-detail-layout">
                <div>
                  <div className="cin-lead-facts">
                    <div className="cin-fact"><p className="cin-fact-label"><Mail size={12} /> Email</p><p className="cin-fact-value">{selected.email || "Not provided"}</p></div>
                    <div className="cin-fact"><p className="cin-fact-label"><Phone size={12} /> Phone</p><p className="cin-fact-value">{selected.phone || "Not provided"}</p></div>
                    <div className="cin-fact"><p className="cin-fact-label"><Bell size={12} /> Project type</p><p className="cin-fact-value">{selected.category || "Not specified"}</p></div>
                    <div className="cin-fact"><p className="cin-fact-label"><Clock3 size={12} /> Timing</p><p className="cin-fact-value">{selected.timing || "Not specified"}</p></div>
                    <div className="cin-fact"><p className="cin-fact-label">Budget</p><p className="cin-fact-value">{selected.budget || "Not specified"}</p></div>
                  </div>
                  <p className="cin-contact-note">Contact details are displayed for this local preview only. No messages are sent from here.</p>
                  <section className="cin-section">
                    <h2>Project idea</h2>
                    <p className="cin-description">{selected.description || "No project description was included."}</p>
                  </section>
                  <section className="cin-section">
                    <h2>Reference images <span style={{ color: "var(--cin-muted)", fontWeight: 500 }}>({referenceUrls.length})</span></h2>
                    {referenceUrls.length ? (
                      <div className="cin-refs">
                        {referenceUrls.map((reference) => (
                          <button className="cin-ref" type="button" key={reference.id} onClick={() => setLargeImage({ url: reference.url, name: reference.name })} aria-label={`View reference image ${reference.name} full size`}>
                            <img src={reference.url} alt={reference.name} />
                            <span>{reference.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : <p className="cin-contact-note">No reference images attached.</p>}
                  </section>
                </div>
              </div>
            </section>
          ) : loading ? (
            <section className="cin-state" aria-live="polite"><span className="cin-state-icon"><Bell size={20} /></span><h2>Opening the inquiry…</h2><p>Looking for this item in the browser’s sandbox inbox.</p></section>
          ) : error ? (
            <section className="cin-state" role="alert"><span className="cin-state-icon"><Bell size={20} /></span><h2 className="cin-error">Inbox unavailable</h2><p>{error}</p><div className="cin-state-links"><button className="cin-action" type="button" onClick={retry}>Try again</button><button className="cin-action" type="button" onClick={backToList}>Back to notifications</button></div></section>
          ) : (
            <section className="cin-state" aria-live="polite"><span className="cin-state-icon"><Bell size={20} /></span><h2>Inquiry not found</h2><p>This link may refer to a preview inquiry that is no longer stored in this browser.</p><div className="cin-state-links"><button className="cin-action" type="button" onClick={backToList}>Back to notifications</button><a className="cin-action" href={sandboxPaths.form}>Open inquiry form</a></div></section>
          )
        ) : (
          <>
            <div className="cin-heading">
              <div><p className="cin-kicker">PONCHO DAVILA · DEMO CREATOR INBOX</p><h1 className="cin-title">Notifications</h1><p className="cin-subtitle">Commission inquiries saved from the local preview form, gathered in one place.</p></div>
              <div className="cin-unread"><Bell size={14} /> {unreadCount} unread</div>
            </div>
            {loading ? (
              <div className="cin-list" aria-label="Loading notifications" aria-busy="true"><div className="cin-skeleton" /><div className="cin-skeleton" /><div className="cin-skeleton" /></div>
            ) : error ? (
              <section className="cin-state" role="alert"><span className="cin-state-icon"><Bell size={20} /></span><h2 className="cin-error">Couldn’t load the inbox</h2><p>{error}</p><div className="cin-state-links"><button className="cin-action" type="button" onClick={retry}>Try again</button><a className="cin-action" href={sandboxPaths.form}>Open inquiry form</a></div></section>
            ) : inquiries.length === 0 ? (
              <section className="cin-state"><span className="cin-state-icon"><ImageIcon size={20} /></span><h2>No inquiries yet</h2><p>When a preview inquiry is submitted, it will appear here. This inbox uses only data stored in this browser.</p><div className="cin-state-links"><a className="cin-action" href={sandboxPaths.form}>Preview the inquiry form <ArrowUpRight size={13} /></a><a className="cin-action" href={sandboxPaths.profile}>Visit Poncho’s profile <ArrowUpRight size={13} /></a></div></section>
            ) : (
              <section className="cin-list" aria-label="Commission inquiry notifications">
                {inquiries.map((inquiry) => (
                  <button className={`cin-row ${inquiry.readAt ? "" : "unread"}`} type="button" key={inquiry.id} onClick={() => openInquiry(inquiry)} aria-label={`${inquiry.readAt ? "Read" : "Unread"} notification. ${inquiryNotificationText(inquiry)}. Open inquiry details.`}>
                    <span className="cin-bell"><Bell size={16} /></span>
                    <span className="cin-row-copy"><span className="cin-row-title">{inquiryNotificationText(inquiry)}.</span><span className="cin-row-meta"><span className="cin-dot" />{inquiry.readAt ? "Read" : "New"} · {inquiry.category}</span></span>
                    <span className="cin-row-date">{formatDate(inquiry.createdAt)}</span>
                    <ChevronRight className="cin-chevron" size={16} />
                  </button>
                ))}
              </section>
            )}
          </>
        )}

        <footer className="cin-footer"><span>Local sandbox preview — no inquiry is sent or delivered.</span><a href={sandboxPaths.profile}>Poncho’s portfolio</a></footer>
      </div>

      {largeImage && (
        <div className="cin-lightbox" role="dialog" aria-modal="true" aria-label={`Reference image: ${largeImage.name}`} onClick={() => setLargeImage(null)}>
          <button className="cin-icon-button" type="button" aria-label="Close full-size image" onClick={() => setLargeImage(null)}><X size={19} /></button>
          <img src={largeImage.url} alt={largeImage.name} onClick={(event) => event.stopPropagation()} />
          <p>{largeImage.name}</p>
        </div>
      )}
    </main>
  );
}
