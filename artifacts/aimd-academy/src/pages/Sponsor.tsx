import { useState } from 'react';
import { useListSponsorships, useCreateSponsorship } from '@workspace/api-client-react';
import { Gift, HeartHandshake, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Sponsor() {
  const { data: sponsorships, isLoading } = useListSponsorships({ limit: 20 }, { query: { queryKey: ['listSponsorships'] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading sponsors...</div>;

  return (
    <div className="p-6 md:p-10 space-y-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-sm uppercase mb-4">
            <Sparkles className="w-4 h-4" /> Support a Creator
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight mb-4">Sponsor a Creator</h1>
          <p className="text-muted-foreground font-sans text-lg">
            Directly fund the tools, tuition, and pipeline for emerging artists in underserved communities. 
            100% of your sponsorship goes to the creators.
          </p>
        </div>
      </header>

      {/* Sponsorship Tiers */}
      <section className="grid md:grid-cols-3 gap-6">
        <SponsorCard 
          tier="kit" 
          title="Studio Kit" 
          price={49} 
          icon={Shield} 
          desc="Provides essential art supplies, tattoo needles, or software licenses for one month." 
        />
        <SponsorCard 
          tier="tuition" 
          title="Workshop Tuition" 
          price={199} 
          icon={HeartHandshake} 
          desc="Funds full access to AIMD workshops and mentorship for a rising creator."
          featured 
        />
        <SponsorCard 
          tier="full-ride" 
          title="Full-Ride Residency" 
          price={499} 
          icon={Gift} 
          desc="Covers tuition, supplies, and studio fees for a creator's entire residency phase." 
        />
      </section>

      {/* Leaderboard */}
      <section className="border border-border bg-card p-8">
        <h2 className="text-2xl font-bold font-display uppercase mb-8 flex items-center gap-3">
          <HeartHandshake className="text-primary w-6 h-6" /> Recent Sponsors
        </h2>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsorships?.map(sponsor => (
            <div key={sponsor.id} className="flex items-start gap-4 p-4 border border-white/5 bg-background">
              <Avatar className="w-12 h-12 rounded-none border border-border">
                <AvatarImage src={sponsor.sponsorAvatarUrl || ''} />
                <AvatarFallback className="bg-primary/20 text-primary rounded-none font-mono">
                  {sponsor.sponsorName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold truncate pr-2">{sponsor.sponsorName}</span>
                  <span className="text-primary font-mono text-sm">${sponsor.amount}</span>
                </div>
                {sponsor.message ? (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">"{sponsor.message}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono uppercase">Sponsored {sponsor.creatorName}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SponsorCard({ tier, title, price, desc, icon: Icon, featured = false }: any) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [creatorId, setCreatorId] = useState('1'); // Mocking creator selection for now
  
  const createSponsorship = useCreateSponsorship();

  const handleSponsor = () => {
    createSponsorship.mutate({
      data: { tier, creatorId: parseInt(creatorId), message }
    }, {
      onSuccess: (res: any) => {
        // Mock redirect to checkout
        window.location.href = res.checkoutUrl || '/dashboard';
      }
    });
  };

  return (
    <div className={`p-8 border flex flex-col ${featured ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <Icon className={`w-10 h-10 mb-6 ${featured ? 'text-primary' : 'text-muted-foreground'}`} />
      <h3 className="text-2xl font-bold font-display uppercase mb-2">{title}</h3>
      <div className="text-4xl font-black font-mono mb-6">${price}</div>
      <p className="text-muted-foreground text-sm flex-1 mb-8">{desc}</p>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            size="lg" 
            className={`rounded-none font-mono uppercase w-full ${
              featured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          >
            Sponsor
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-2xl">Confirm Sponsorship</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-background border border-border p-4 flex justify-between items-center">
              <span className="font-bold font-display uppercase">{title}</span>
              <span className="font-mono text-primary">${price}</span>
            </div>
            
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Select Creator (ID)</label>
              <Input className="rounded-none border-border bg-background font-mono" value={creatorId} onChange={e => setCreatorId(e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave 1 to sponsor the general fund.</p>
            </div>
            
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Encouragement Message</label>
              <Textarea 
                className="rounded-none border-border bg-background" 
                placeholder="Keep grinding..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
              />
            </div>
            
            <Button 
              className="w-full rounded-none h-14 bg-primary text-primary-foreground font-mono uppercase font-bold text-lg"
              onClick={handleSponsor}
              disabled={createSponsorship.isPending}
            >
              {createSponsorship.isPending ? 'Processing...' : 'Proceed to Checkout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
