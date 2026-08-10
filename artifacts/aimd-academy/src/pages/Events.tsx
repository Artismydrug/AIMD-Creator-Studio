import { useState } from 'react';
import { useListEvents, useRsvpToEvent } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function Events() {
  const [filter, setFilter] = useState<'all' | 'upcoming'>('upcoming');
  const { data: events, isLoading } = useListEvents({ upcoming: filter === 'upcoming' }, { query: { queryKey: ['listEvents', filter] } });
  
  if (isLoading) return <div className="p-8 font-mono animate-pulse">Scanning events...</div>;

  const featured = events?.find(e => e.isFeatured);
  const regular = events?.filter(e => !e.isFeatured) || [];

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Community Events</h1>
          <p className="text-muted-foreground font-mono mt-2">Pop-ups, gallery activations, and studio workshops.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'upcoming' ? 'default' : 'outline'} 
            className={`rounded-none font-mono uppercase text-xs ${filter === 'upcoming' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            className={`rounded-none font-mono uppercase text-xs ${filter === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events
          </Button>
        </div>
      </header>

      {featured && (
        <section className="relative overflow-hidden border border-primary bg-card group">
          <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
            {featured.imageUrl && <img src={featured.imageUrl} className="w-full h-full object-cover grayscale mix-blend-overlay" alt="" />}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
            <div className="max-w-2xl space-y-4">
              <Badge variant="outline" className="rounded-none border-primary text-primary font-mono bg-primary/10 uppercase tracking-widest">
                Featured Activation
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black font-display uppercase leading-[0.9]">{featured.title}</h2>
              <p className="text-muted-foreground text-lg">{featured.description}</p>
              
              <div className="flex flex-wrap gap-6 pt-4 font-mono text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {new Date(featured.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  {new Date(featured.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  {featured.location}
                </div>
              </div>
            </div>
            
            <EventActions event={featured} size="lg" />
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regular.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <div className="border border-border bg-card flex flex-col overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="h-48 bg-muted relative overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={event.title} />
        ) : (
          <div className="w-full h-full bg-background flex items-center justify-center border-b border-border">
            <CalendarIcon className="w-12 h-12 text-border" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="rounded-none bg-background/90 text-foreground backdrop-blur-sm font-mono uppercase text-[10px]">
            {event.category}
          </Badge>
          <Badge className={`rounded-none font-mono uppercase text-[10px] ${
            event.eventType === 'free' ? 'bg-primary text-primary-foreground' : 
            event.eventType === 'members-only' ? 'bg-accent text-accent-foreground' :
            'bg-foreground text-background'
          }`}>
            {event.eventType}
          </Badge>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold font-display uppercase tracking-tight mb-2 line-clamp-2">{event.title}</h3>
        <p className="text-muted-foreground text-sm mb-6 line-clamp-3 flex-1">{event.description}</p>
        
        <div className="space-y-3 mb-6 pb-6 border-b border-border font-mono text-xs">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {new Date(event.startsAt).toLocaleString(undefined, { 
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
            })}
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" />
            {event.rsvpCount} Attending {event.maxCapacity ? `/ ${event.maxCapacity} Max` : ''}
          </div>
        </div>
        
        <EventActions event={event} />
      </div>
    </div>
  );
}

function EventActions({ event, size = "default" }: { event: any, size?: "default" | "lg" }) {
  const queryClient = useQueryClient();
  const rsvp = useRsvpToEvent();
  const { toast } = useToast();

  const handleRsvp = () => {
    rsvp.mutate({ id: event.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['listEvents'] });
        toast({ title: event.hasRsvped ? 'RSVP Cancelled' : 'RSVP Confirmed', description: `For ${event.title}` });
      }
    });
  };

  const isFull = event.maxCapacity && event.rsvpCount >= event.maxCapacity && !event.hasRsvped;

  return (
    <Button 
      className={`rounded-none font-mono uppercase w-full ${size === 'lg' ? 'h-16 text-lg md:w-auto md:px-12' : ''} ${
        event.hasRsvped ? 'bg-primary/20 text-primary border border-primary hover:bg-primary/30' : 
        'bg-foreground text-background hover:bg-foreground/90'
      }`}
      disabled={isFull}
      onClick={handleRsvp}
    >
      {event.hasRsvped ? (
        <><CheckCircle className="w-4 h-4 mr-2" /> Going</>
      ) : isFull ? (
        'Waitlist / Full'
      ) : (
        'RSVP Now'
      )}
    </Button>
  );
}

function CheckCircle(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
