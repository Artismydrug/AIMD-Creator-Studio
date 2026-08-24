import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link, Redirect } from "wouter";
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
  const fetchHQ = useHQFetch(); const { toast } = useToast(); const [applications, setApplications] = useState<any[]>([]); const [note, setNote] = useState("");
  const load = () => fetchHQ("/residency-applications").then(setApplications).catch(() => setApplications([]));
  useEffect(() => { load(); }, []);
  const decide = async (id: number, decision: "approved" | "revision_requested") => { try { await fetchHQ(`/residency-applications/${id}`, { method: "PATCH", body: JSON.stringify({ decision, note }) }); toast({ title: decision === "approved" ? "Approved for residency" : "Revision requested" }); setNote(""); load(); } catch (e: any) { toast({ title: "Could not record decision", description: e.message, variant: "destructive" }); } };
  return <section className="rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]">
    <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-fuchsia-600">Tier 3 · private review</p><h2 className="mt-2 text-2xl font-black">Residency approval desk</h2></div><ShieldCheck className="text-cyan-500" /></div>
    <p className="mt-3 max-w-2xl text-sm text-[#766c67]">Portfolio, BBP certification, and video introductions are only shown to authorized reviewers. Applications will appear here once creators submit a private residency packet.</p>
    {applications.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-[#d9d0c8] p-8 text-center"><p className="font-mono text-sm text-[#766c67]">No private residency applications are awaiting review.</p></div> : <div className="mt-6 space-y-3">{applications.map(application => <div key={application.id} className="rounded-xl border border-[#e5ddd5] bg-white/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{application.username}</p><p className="text-xs text-[#766c67]">{application.email} · {application.status.replace("_", " ")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => decide(application.id, "revision_requested")}>Request revision</Button><Button size="sm" onClick={() => decide(application.id, "approved")} className="bg-fuchsia-600 hover:bg-fuchsia-700">Approve for residency</Button></div></div><div className="mt-3 grid gap-2 text-xs text-[#766c67] sm:grid-cols-3"><span>{application.portfolioObjectPaths?.length ?? 0} private portfolio file(s)</span><span>{application.bbpCertificationObjectPath ? "BBP certification attached" : "BBP pending"}</span><span>{application.introductionVideoObjectPath ? "Video introduction attached" : "Video pending"}</span></div></div>)}</div>}
    <div className="mt-5"><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Private reviewer note (required when requesting a revision)" className="min-h-20 bg-white/70" /></div>
  </section>;
}

function Ledger() {
  const fetchHQ = useHQFetch(); const [entries, setEntries] = useState<any[]>([]); const [entryType, setEntryType] = useState("cloud_infrastructure"); const [amount, setAmount] = useState(""); const { toast } = useToast(); const load = () => fetchHQ("/ledger").then(setEntries).catch(() => setEntries([])); useEffect(() => { load(); }, []);
  const save = async () => { try { await fetchHQ("/ledger", { method: "POST", body: JSON.stringify({ entryType, amountCents: Math.round(Number(amount) * 100) }) }); setAmount(""); load(); toast({ title: "Ledger entry recorded" }); } catch (e: any) { toast({ title: "Could not record entry", description: e.message, variant: "destructive" }); } };
  return <section className="rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]"><div className="flex items-center gap-3"><WalletCards className="text-fuchsia-500" /><h2 className="text-2xl font-black">Financial & 501(c)(3) ledger</h2></div><p className="mt-3 text-sm text-[#766c67]">MRR is shown only when reconciled subscription revenue is recorded. The nonprofit allocation is always 15% of net eligible subscription profit after the 15% App Store commission and recorded costs.</p><div className="mt-6 grid gap-3 sm:grid-cols-4">{["Gross subscriptions", "App Store commission", "Cloud infrastructure", "Instructor royalties"].map((x, i) => <div key={x} className="rounded-xl bg-[#f5f1ec] p-4"><p className="font-mono text-[10px] uppercase text-[#766c67]">{x}</p><p className="mt-2 font-bold">{i === 1 ? "15%" : i === 3 ? "12–15%" : "See entries"}</p></div>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><select value={entryType} onChange={e => setEntryType(e.target.value)} className="h-10 rounded-md border border-input bg-white px-3 text-sm"><option value="cloud_infrastructure">Cloud infrastructure</option><option value="instructor_royalty">Instructor royalty</option><option value="eligible_subscription_revenue">Eligible subscription revenue</option></select><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount in USD" className="bg-white/70" /><Button onClick={save} disabled={!amount}>Record entry</Button></div><div className="mt-4 space-y-2">{entries.slice(0, 8).map(entry => <div key={entry.id} className="flex justify-between rounded-lg border border-[#e5ddd5] bg-white/50 px-3 py-2 text-sm"><span>{String(entry.entryType).replaceAll("_", " ")}</span><b>{money(entry.amountCents)}</b></div>)}</div></section>;
}

function Broadcast() {
  const fetchHQ = useHQFetch(); const { toast } = useToast(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [sent, setSent] = useState(false);
  const send = async () => { try { await fetchHQ("/announcements", { method: "POST", body: JSON.stringify({ title, body }) }); setSent(true); toast({ title: "Announcement saved", description: "It is now available in the in-app broadcast feed." }); } catch (e: any) { toast({ title: "Could not save announcement", description: e.message, variant: "destructive" }); } };
  return <section className="max-w-2xl rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]"><div className="flex items-center gap-3"><Megaphone className="text-cyan-500" /><h2 className="text-2xl font-black">Announcement & broadcast center</h2></div><p className="mt-3 text-sm text-[#766c67]">Draft Monday challenge and live-event notices for the in-app feed. Push delivery is not enabled until a provider is connected.</p><div className="mt-6 space-y-4"><Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/70" /><Textarea placeholder="Write a clear update for creators…" value={body} onChange={e => setBody(e.target.value)} className="min-h-32 bg-white/70" /><Button disabled={!title.trim() || !body.trim()} onClick={send} className="bg-[#282220] text-white hover:bg-[#403631]">{sent ? "Saved to broadcast feed" : "Save announcement"}</Button></div></section>;
}

function Partners() {
  const fetchHQ = useHQFetch(); const { toast } = useToast(); const [partners, setPartners] = useState<any[]>([]); const [name, setName] = useState(""); const [category, setCategory] = useState("Visual Arts"); const [code, setCode] = useState(""); const [perk, setPerk] = useState("");
  const load = () => fetchHQ("/affiliates").then(setPartners).catch(() => setPartners([])); useEffect(() => { load(); }, []);
  const save = async () => { try { await fetchHQ("/affiliates", { method: "POST", body: JSON.stringify({ name, category, affiliateCode: code, perk }) }); setName(""); setCode(""); setPerk(""); load(); toast({ title: "Partner code added" }); } catch (e: any) { toast({ title: "Could not add partner", description: e.message, variant: "destructive" }); } };
  return <section className="rounded-2xl border border-white/60 bg-white/65 p-6 shadow-[0_12px_40px_rgba(50,35,25,.06)]"><div className="flex items-center gap-3"><Users className="text-fuchsia-500" /><h2 className="text-2xl font-black">Affiliate & ecosystem management</h2></div><div className="mt-6 grid gap-3 md:grid-cols-2"><Input placeholder="Partner name" value={name} onChange={e => setName(e.target.value)} className="bg-white/70" /><select value={category} onChange={e => setCategory(e.target.value)} className="h-10 rounded-md border border-input bg-white px-3 text-sm">{["Visual Arts", "Tattoo Supplies", "Audio Production", "Fashion Manufacturing", "Athletics"].map(item => <option key={item}>{item}</option>)}</select><Input placeholder="Affiliate code" value={code} onChange={e => setCode(e.target.value)} className="bg-white/70" /><Input placeholder="Creator / wholesale perk" value={perk} onChange={e => setPerk(e.target.value)} className="bg-white/70" /></div><Button onClick={save} disabled={!name || !code || !perk} className="mt-3">Add partner</Button><div className="mt-6 space-y-2">{partners.length === 0 ? <p className="font-mono text-sm text-[#766c67]">No active partner codes yet.</p> : partners.map(partner => <div key={partner.id} className="rounded-lg border border-[#e5ddd5] bg-white/50 p-3"><b>{partner.name}</b><span className="ml-2 font-mono text-xs text-fuchsia-600">{partner.affiliateCode}</span><p className="mt-1 text-xs text-[#766c67]">{partner.category} · {partner.perk}</p></div>)}</div></section>;
}

export default function HQ() {
  const { isLoaded, isSignedIn } = useAuth(); const { user: clerkUser } = useUser(); const { data: localUser, isLoading: localLoading } = useGetCurrentUser(); const fetchHQ = useHQFetch(); const [summary, setSummary] = useState<Summary | null>(null); const [accessDenied, setAccessDenied] = useState(false);
  useEffect(() => { const hintedRole = String(clerkUser?.publicMetadata?.role ?? clerkUser?.publicMetadata?.aimdRole ?? ""); if (localUser?.isAdmin || hintedRole === "instructor") fetchHQ("/summary").then(setSummary).catch(() => setAccessDenied(true)); }, [localUser?.isAdmin, clerkUser?.publicMetadata?.role, clerkUser?.publicMetadata?.aimdRole]);
  if (!isLoaded || localLoading) return <div className="p-10 font-mono text-sm">Checking HQ access…</div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  const metadataRole = String(clerkUser?.publicMetadata?.role ?? clerkUser?.publicMetadata?.aimdRole ?? "");
  if (metadataRole !== "admin" && metadataRole !== "instructor") return <Redirect to="/app" />;
  if (accessDenied) return <Redirect to="/app" />;
  if (!localUser?.isAdmin && metadataRole !== "instructor") return <Redirect to="/app" />;
  return <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 text-[#282220] md:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.25em] text-fuchsia-600">AIMD · operations workspace</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">Creator Studio HQ</h1><p className="mt-3 max-w-xl text-sm text-[#766c67]">One calm control room for the people keeping the creative community moving.</p></div><div className="flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-2 font-mono text-xs text-cyan-800"><Sparkles className="h-4 w-4" /> Staff access verified</div></header>
    <Tabs defaultValue="overview"><TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-[#eee8e1] p-1"><TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger><TabsTrigger value="operations"><CalendarDays className="mr-2 h-4 w-4" />Operations</TabsTrigger><TabsTrigger value="residency"><ShieldCheck className="mr-2 h-4 w-4" />Residency</TabsTrigger><TabsTrigger value="ledger"><WalletCards className="mr-2 h-4 w-4" />Ledger</TabsTrigger><TabsTrigger value="partners"><Users className="mr-2 h-4 w-4" />Partners</TabsTrigger><TabsTrigger value="broadcast"><Megaphone className="mr-2 h-4 w-4" />Broadcast</TabsTrigger></TabsList>
      <TabsContent value="overview"><Overview summary={summary} /></TabsContent><TabsContent value="operations"><section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-white/60 bg-white/65 p-6"><CalendarDays className="text-cyan-500" /><h2 className="mt-3 text-xl font-black">Event manager</h2><p className="mt-2 text-sm text-[#766c67]">Create and manage community events from the established organizer workflow.</p><Button asChild className="mt-5"><Link href="/admin">Open event manager</Link></Button></div><div className="rounded-2xl border border-white/60 bg-white/65 p-6"><ShieldCheck className="text-fuchsia-500" /><h2 className="mt-3 text-xl font-black">Instructor queue</h2><p className="mt-2 text-sm text-[#766c67]">Review 30-second creator drills, add feedback, and track current curriculum.</p><Button asChild variant="outline" className="mt-5"><Link href="/instructor">Open instructor workspace</Link></Button></div></section></TabsContent><TabsContent value="residency"><ResidencyDesk /></TabsContent><TabsContent value="ledger"><Ledger /></TabsContent><TabsContent value="partners"><Partners /></TabsContent><TabsContent value="broadcast"><Broadcast /></TabsContent>
    </Tabs>
  </div></div>;
}