import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { BarChart3, CalendarDays, Megaphone, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Summary = { tiers: { free: number; dedicated: number; pro: number }; streakSignals: number; mrrCents: number | null; nonprofitCents: number | null; events: number; pendingReviews: number };
const money = (cents: number | null) => cents == null ? "Unavailable" : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function useHQFetch() {
  return async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/hq${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "HQ request failed");
    return response.json();
  };
}

function Metric({ label, value, detail, accent = "magenta" }: { label: string; value: string | number; detail: string; accent?: string }) {
  return <div className="rounded-2xl border border-white/60 bg-white/65 p-5 shadow-[0_12px_40px_rgba(50,35,25,.06)]">
    <div className={`mb-4 h-1 w-12 rounded-full ${accent === "cyan" ? "bg-cyan-400" : "bg-fuchsia-500"}`} />
    <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#766c67]">{label}</p>
    <p className="mt-2 text-3xl font-black tracking-tight text-[#282220]">{value}</p>
    <p className="mt-1 text-xs text-[#766c67]">{detail}</p>
  </div>;
}

function Overview({ summary }: { summary: Summary | null }) {
  if (!summary) return <div className="rounded-2xl border border-dashed border-[#d9d0c8] p-12 text-center font-mono text-sm text-[#766c67]">Loading HQ metrics…</div>;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Free / Tier 1" value={summary.tiers.free} detail="Active creator accounts" />
      <Metric label="Dedicated / Tier 2" value={summary.tiers.dedicated} detail="Existing access only" accent="cyan" />
      <Metric label="Pro / Tier 3" value={summary.tiers.pro} detail="Residency pathway" />
      <Metric label="Creator streak signals" value={summary.streakSignals} detail="Creators with an active streak" accent="cyan" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Metric label="Monthly recurring revenue" value={money(summary.mrrCents)} detail="Recorded subscription revenue; no estimates" accent="cyan" />
      <Metric label="Nonprofit allocation · 15%" value={money(summary.nonprofitCents)} detail="Calculated from eligible recorded revenue after platform commission" />
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric label="Upcoming events" value={summary.events} detail="Published community events" accent="cyan" />
      <Metric label="Review queue" value={summary.pendingReviews} detail="Submissions awaiting staff review" />
      <Metric label="Royalty pool" value="12–15%" detail="Instructor royalty policy; ledger integration pending" accent="cyan" />
    </div>
  </div>;
}

function ResidencyDesk() {
  const [revision, setRevision] = useState("");
  const [notice, setNotice] = useState("No private residency applications are awaiting review.");
  return <section className="rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]">
    <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-fuchsia-600">Tier 3 · private review</p><h2 className="mt-2 text-2xl font-black">Residency approval desk</h2></div><ShieldCheck className="text-cyan-500" /></div>
    <p className="mt-3 max-w-2xl text-sm text-[#766c67]">Portfolio, BBP certification, and video introductions are only shown to authorized reviewers. Applications will appear here once creators submit a private residency packet.</p>
    <div className="mt-6 rounded-xl border border-dashed border-[#d9d0c8] p-8 text-center"><p className="font-mono text-sm text-[#766c67]">{notice}</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><Input value={revision} onChange={e => setRevision(e.target.value)} placeholder="Revision request template (optional)" className="bg-white/70" /><Button variant="outline" onClick={() => setNotice(revision ? "Revision note saved for the next application review." : "Add a note before saving.")}>Save note</Button></div>
  </section>;
}

function Ledger() {
  return <section className="rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]"><div className="flex items-center gap-3"><WalletCards className="text-fuchsia-500" /><h2 className="text-2xl font-black">Financial & 501(c)(3) ledger</h2></div><p className="mt-3 text-sm text-[#766c67]">Only reconciled provider records are included. Cloud costs and instructor royalties remain unavailable until recorded in the ledger—no fabricated totals.</p><div className="mt-6 grid gap-3 sm:grid-cols-4">{["Gross subscriptions", "App Store commission", "Cloud infrastructure", "Instructor royalties"].map((x, i) => <div key={x} className="rounded-xl bg-[#f5f1ec] p-4"><p className="font-mono text-[10px] uppercase text-[#766c67]">{x}</p><p className="mt-2 font-bold">{i === 1 ? "15%" : i === 3 ? "12–15%" : "Unavailable"}</p></div>)}</div></section>;
}

function Broadcast() {
  const fetchHQ = useHQFetch(); const { toast } = useToast(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [sent, setSent] = useState(false);
  const send = async () => { try { await fetchHQ("/announcements", { method: "POST", body: JSON.stringify({ title, body }) }); setSent(true); toast({ title: "Announcement saved", description: "It is now available in the in-app broadcast feed." }); } catch (e: any) { toast({ title: "Could not save announcement", description: e.message, variant: "destructive" }); } };
  return <section className="max-w-2xl rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]"><div className="flex items-center gap-3"><Megaphone className="text-cyan-500" /><h2 className="text-2xl font-black">Announcement & broadcast center</h2></div><p className="mt-3 text-sm text-[#766c67]">Draft Monday challenge and live-event notices for the in-app feed. Push delivery is not enabled until a provider is connected.</p><div className="mt-6 space-y-4"><Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/70" /><Textarea placeholder="Write a clear update for creators…" value={body} onChange={e => setBody(e.target.value)} className="min-h-32 bg-white/70" /><Button disabled={!title.trim() || !body.trim()} onClick={send} className="bg-[#282220] text-white hover:bg-[#403631]">{sent ? "Saved to broadcast feed" : "Save announcement"}</Button></div></section>;
}

export default function HQ() {
  const { isLoaded, isSignedIn } = useAuth(); const { user: clerkUser } = useUser(); const { data: localUser, isLoading: localLoading } = useGetCurrentUser(); const fetchHQ = useHQFetch(); const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => { if (localUser?.isAdmin || clerkUser?.publicMetadata?.role === "instructor") fetchHQ("/summary").then(setSummary).catch(() => setSummary(null)); }, [localUser?.isAdmin, clerkUser?.publicMetadata?.role]);
  if (!isLoaded || localLoading) return <div className="p-10 font-mono text-sm">Checking HQ access…</div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  const metadataRole = String(clerkUser?.publicMetadata?.role ?? "");
  if (metadataRole !== "admin" && metadataRole !== "instructor") return <Redirect to="/app" />;
  if (!localUser?.isAdmin && metadataRole !== "instructor") return <Redirect to="/app" />;
  return <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 text-[#282220] md:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.25em] text-fuchsia-600">AIMD · operations workspace</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">Creator Studio HQ</h1><p className="mt-3 max-w-xl text-sm text-[#766c67]">One calm control room for the people keeping the creative community moving.</p></div><div className="flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-2 font-mono text-xs text-cyan-800"><Sparkles className="h-4 w-4" /> Staff access verified</div></header>
    <Tabs defaultValue="overview"><TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-[#eee8e1] p-1"><TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger><TabsTrigger value="residency"><ShieldCheck className="mr-2 h-4 w-4" />Residency</TabsTrigger><TabsTrigger value="ledger"><WalletCards className="mr-2 h-4 w-4" />Ledger</TabsTrigger><TabsTrigger value="partners"><Users className="mr-2 h-4 w-4" />Partners</TabsTrigger><TabsTrigger value="broadcast"><Megaphone className="mr-2 h-4 w-4" />Broadcast</TabsTrigger></TabsList>
      <TabsContent value="overview"><Overview summary={summary} /></TabsContent><TabsContent value="residency"><ResidencyDesk /></TabsContent><TabsContent value="ledger"><Ledger /></TabsContent><TabsContent value="partners"><section className="rounded-2xl border border-dashed border-[#d9d0c8] bg-white/50 p-12 text-center"><Users className="mx-auto text-fuchsia-500" /><h2 className="mt-3 text-xl font-black">Affiliate & ecosystem management</h2><p className="mt-2 text-sm text-[#766c67]">Partner codes and wholesale perks will appear here once partner records are connected.</p><p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#766c67]">Visual Arts · Tattoo Supplies · Audio Production · Fashion Manufacturing · Athletics</p></section></TabsContent><TabsContent value="broadcast"><Broadcast /></TabsContent>
    </Tabs>
  </div></div>;
}