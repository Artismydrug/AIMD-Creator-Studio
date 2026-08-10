import { 
  useGetCurrentUser,
  useListBadges,
  useListApplications,
  useListSkillTracks
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Sparkles, Shield, Send, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Profile() {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: badges, isLoading: isLoadingBadges } = useListBadges();
  const { data: apps, isLoading: isLoadingApps } = useListApplications();
  const { data: tracks, isLoading: isLoadingTracks } = useListSkillTracks();

  if (isLoadingUser) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-48 w-full bg-card rounded-lg" />
        <Skeleton className="h-64 w-full bg-card rounded-lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header Profile */}
      <section className="bg-card border border-border rounded-lg overflow-hidden relative">
        <div className="h-32 bg-background border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px]" />
          {user.tier === 'pro' && <div className="absolute inset-0 bg-amber-500/5 mix-blend-overlay" />}
        </div>
        
        <div className="p-6 md:p-10 pt-0 relative flex flex-col md:flex-row gap-6 md:items-end -mt-12">
          <Avatar className="w-24 h-24 rounded-lg border-4 border-card bg-background relative z-10">
            <AvatarImage src={user.avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="rounded bg-background text-2xl text-muted-foreground">
              <User className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter">{user.username}</h1>
              {user.studioReadyBadge && (
                <div title="Studio Ready Certified" className="text-primary bg-primary/10 p-1 rounded">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Shield className="w-3.5 h-3.5" />
                Tier: <span className={
                  user.tier === 'pro' ? 'text-amber-500 font-bold' :
                  user.tier === 'workshop' ? 'text-primary font-bold' : ''
                }>{user.tier}</span>
              </div>
            </div>
          </div>
          
          <Button variant="outline" className="font-bold tracking-widest uppercase text-xs rounded-none border-border">
            Edit Profile
          </Button>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-10">
          {/* Skill Tracks Summary */}
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-6 uppercase">Skill Tracks</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {isLoadingTracks ? (
                <Skeleton className="h-32 bg-background" />
              ) : tracks && tracks.length > 0 ? (
                tracks.map(track => (
                  <div key={track.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-bold tracking-tight">{track.artForm} Track</span>
                      <span className="text-xs font-mono text-muted-foreground">{Math.round(track.percentComplete)}%</span>
                    </div>
                    <Progress value={track.percentComplete} className="h-1.5 rounded-none bg-background [&>div]:bg-primary" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tracks started.</p>
              )}
            </div>
          </section>

          {/* Badges Wall */}
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-6 uppercase">Trophy Wall</h2>
            <div className="bg-card border border-border rounded-lg p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {isLoadingBadges ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 bg-background rounded" />)
              ) : badges && badges.length > 0 ? (
                badges.map(badge => (
                  <div key={badge.id} className="bg-background border border-border p-4 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      {badge.imageUrl ? (
                        <img src={badge.imageUrl} alt={badge.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <Shield className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest leading-tight">{badge.name}</div>
                      {badge.workshopTitle && (
                        <div className="text-[9px] text-muted-foreground font-mono mt-1 line-clamp-1">{badge.workshopTitle}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                  Earn badges by completing workshops and skill tracks.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Applications Sidebar */}
        <aside className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight uppercase">Applications</h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {isLoadingApps ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 bg-background" />)
            ) : apps && apps.length > 0 ? (
              apps.map(app => (
                <div key={app.id} className="p-4 bg-background border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-sm tracking-tight line-clamp-1">{app.studioName}</div>
                    <div className="shrink-0">
                      {app.status === 'accepted' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       app.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-500" /> :
                       app.status === 'reviewing' ? <Clock className="w-4 h-4 text-amber-500" /> :
                       <Send className="w-4 h-4 text-blue-500" />}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    {app.jobTitle}
                  </div>
                  <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest inline-block px-2 py-0.5 ${
                    app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                    app.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                    app.status === 'reviewing' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {app.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No job applications sent.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
