import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { createTattooBookingDraft, submitTattooBooking } from '@workspace/api-client-react';
import { ArrowRight, ArrowLeft, Brush, Calendar, CheckCircle2, ExternalLink, ImagePlus, Loader2, Mail, Shield, Sparkles, Users, X } from 'lucide-react';
import tattooImg from '@assets/generated_images/tattoo-studio.jpg';
import ponchoImg from '@assets/IMG_0443_1787113468837.jpg';
import ashleyImg from '@assets/A79EF24A-5883-4B50-9303-2DEAD60C2323_1787179907960.jpeg';
import edwinImg from '@assets/2E8CB3C8-F080-4FA1-9C19-31C4FD0B50DD.JPG_1787180646083.jpeg';

const BOOKING_EMAIL = 'info@artismydrug.com';
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;

const PORTFOLIO_URL = 'https://ponchotheartist.com/tattoo';
const ASHLEY_PORTFOLIO_URL = 'https://www.instagram.com/ashole.inkz/';
const EDWIN_PORTFOLIO_URL = 'https://www.instagram.com/edsta1/';

const ARTISTS = [
  {
    name: 'Poncho The Artist',
    role: 'Founder · Lead Resident Artist',
    styles: 'Custom work · Fine line · Black & grey · Signature patterns',
    featured: true,
    available: true,
    photo: ponchoImg,
    portfolioUrl: PORTFOLIO_URL,
  },
  {
    name: 'Edwin',
    role: 'Resident Artist',
    styles: 'Tattoo work · Instagram portfolio',
    featured: true,
    available: true,
    photo: edwinImg,
    portfolioUrl: EDWIN_PORTFOLIO_URL,
  },
  {
    name: 'Ash',
    role: 'Resident Artist',
    styles: 'Tattoo work · Instagram portfolio',
    featured: true,
    available: true,
    photo: ashleyImg,
    portfolioUrl: ASHLEY_PORTFOLIO_URL,
  },
];

type BookingForm = {
  name: string;
  email: string;
  phone: string;
  idea: string;
  placement: string;
  size: string;
  artist: string;
};

const EMPTY_FORM: BookingForm = {
  name: '',
  email: '',
  phone: '',
  idea: '',
  placement: '',
  size: '',
  artist: 'No preference',
};

const STEPS = ['Contact Info', 'Tattoo Concept', 'References & Review'] as const;

export default function Tattoo() {
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [references, setReferences] = useState<File[]>([]);
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedBookingId, setSubmittedBookingId] = useState<number | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<'pending' | 'sent' | 'failed' | null>(null);

  const set = (key: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const stepValid =
    step === 0
      ? form.name.trim() !== '' && form.email.trim() !== ''
      : step === 1
        ? form.idea.trim() !== '' && form.placement.trim() !== '' && form.size.trim() !== ''
        : true;

  const addReferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((file) => {
      return file.type.startsWith('image/') && file.size <= MAX_REFERENCE_BYTES;
    });
    if (files.length !== (e.target.files?.length ?? 0)) {
      setSubmissionError('Reference files must be supported images no larger than 10 MB each.');
    } else {
      setSubmissionError(null);
    }
    setReferences((prev) => [...prev, ...files].slice(0, 6));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (stepValid) setStep(step + 1);
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const draft = await createTattooBookingDraft({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        idea: form.idea.trim(),
        placement: form.placement.trim(),
        estimatedSize: form.size.trim(),
        preferredArtist: form.artist as 'No preference' | 'Poncho The Artist' | 'Edwin' | 'Ash',
        website,
      });

      for (const file of references) {
        const response = await fetch(`/api/tattoo-bookings/${draft.id}/references`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Booking-Token': draft.uploadToken,
            'X-File-Name': encodeURIComponent(file.name),
          },
          body: file,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error || `Could not upload ${file.name}`);
        }
      }

      const result = await submitTattooBooking(draft.id, {
        uploadToken: draft.uploadToken,
      });
      setSubmittedBookingId(result.id);
      setNotificationStatus(result.notificationStatus);
      setForm(EMPTY_FORM);
      setReferences([]);
      setWebsite('');
      setStep(0);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'We could not submit your request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-end border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={tattooImg} alt="AIMD tattoo studio" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-40">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur">
            <Brush className="w-3.5 h-3.5" /> The Studio
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-display uppercase leading-[0.95] tracking-tighter mb-4">
            Ink With <span className="text-gradient-brand">Intention.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Custom work and flash from resident AIMD artists — in a studio built by creators, for creators.
          </p>
        </div>
      </section>

      {/* Artists */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">Meet The Artists</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {ARTISTS.map((a) => (
              <div
                key={a.name}
                className={`glass-card p-6 flex flex-col ${a.featured ? 'glow-magenta border-2' : ''}`}
                style={a.featured ? { borderColor: 'var(--vibrant-magenta)' } : undefined}
              >
                {a.featured && (
                  <span className="self-start font-mono text-[11px] uppercase tracking-widest px-2 py-1 mb-4 text-white" style={{ backgroundColor: 'var(--vibrant-magenta)' }}>
                    Featured Artist
                  </span>
                )}
                {a.photo ? (
                  <img
                    src={a.photo}
                    alt={a.name}
                    className="w-24 h-24 rounded-full object-cover border-2 mb-4"
                    style={{ borderColor: 'var(--vibrant-magenta)' }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-black text-2xl mb-4">
                    {a.name.charAt(0)}
                  </div>
                )}
                <h3 className="font-display font-black uppercase tracking-tight text-xl mb-1">{a.name}</h3>
                <p className="font-mono text-xs uppercase tracking-widest text-primary mb-3">{a.role}</p>
                <p className="text-sm text-muted-foreground mb-5">{a.styles}</p>
                <div className="mt-auto flex flex-col gap-2">
                  {a.portfolioUrl && (
                    <Button
                      variant="outline"
                      className="rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono text-xs"
                      asChild
                    >
                      <a href={a.portfolioUrl} target="_blank" rel="noopener noreferrer">
                        View Tattoo Portfolio <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs"
                    onClick={() => setForm((f) => ({ ...f, artist: a.name }))}
                    asChild
                  >
                    <a href="#booking">Book with {a.name.split(' ')[0]}</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking intake */}
      <section id="booking" className="py-16 px-6 border-b border-border bg-card">
        <div className="container mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary mb-4">
              <Calendar className="w-4 h-4" /> Booking Intake
            </div>
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight mb-4">
              Book Your Session
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Tell us your idea, placement, size, and preferred artist. We'll match you
              with the right artist and confirm a time. Deposits lock in your session.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Describe your idea — references welcome',
                'We pair you with the best-fit resident artist',
                'Confirm date, deposit, and aftercare plan',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 border border-primary/40 text-primary font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ul>
            <div className="border border-border overflow-hidden hidden md:block bg-foreground">
              <div className="grid grid-cols-3 h-72">
                {ARTISTS.map((artist) => (
                  <div key={artist.name} className="relative overflow-hidden">
                    <img
                      src={artist.photo}
                      alt={`${artist.name}, AIMD resident tattoo artist`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-widest text-background">
                      {artist.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-foreground text-background flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">AIMD Tattoo Studio</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">The Residents</span>
              </div>
            </div>
          </div>

          {submittedBookingId ? (
            <div className="glass-card p-8 md:p-10 border-2 border-primary/40" aria-live="polite">
              <CheckCircle2 className="w-12 h-12 text-primary mb-5" />
              <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Request received</p>
              <h3 className="font-display font-black uppercase tracking-tight text-2xl mb-3">
                You're in the studio queue.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your request #{submittedBookingId} and private reference images are saved. The AIMD team will review your idea and contact you about availability, deposit, and scheduling.
              </p>
              {notificationStatus === 'failed' ? (
                <p className="text-sm border border-amber-500/40 bg-amber-500/10 p-3 mb-6">
                  Your booking is safe in our dashboard. The inbox notice was delayed, so you can also reach us at{' '}
                  <a className="underline font-medium" href={`mailto:${BOOKING_EMAIL}`}>{BOOKING_EMAIL}</a>.
                </p>
              ) : notificationStatus === 'pending' ? (
                <p className="text-sm text-muted-foreground mb-6">
                  Your booking is saved and the studio inbox notification is processing.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">
                  A notification was sent to the studio inbox.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="rounded-none uppercase font-mono text-xs"
                onClick={() => {
                  setSubmittedBookingId(null);
                  setNotificationStatus(null);
                }}
              >
                Start another request
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-5">
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <Label htmlFor="booking-website">Website</Label>
              <Input
                id="booking-website"
                name="website"
                type="text"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex-1">
                  <div
                    className="h-1.5 mb-2"
                    style={{ backgroundColor: i <= step ? 'var(--vibrant-magenta)' : 'var(--border)' }}
                  />
                  <p className={`font-mono text-[10px] uppercase tracking-wide ${i === step ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    {i + 1}. {label}
                  </p>
                </div>
              ))}
            </div>

            {step === 0 && (
              <>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="bk-name" className="font-mono text-xs uppercase">Name *</Label>
                    <Input id="bk-name" required value={form.name} onChange={set('name')} className="rounded-none mt-1.5" placeholder="Your full name" />
                  </div>
                  <div>
                    <Label htmlFor="bk-email" className="font-mono text-xs uppercase">Email *</Label>
                    <Input id="bk-email" type="email" required value={form.email} onChange={set('email')} className="rounded-none mt-1.5" placeholder="you@email.com" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="bk-phone" className="font-mono text-xs uppercase">Phone</Label>
                    <Input id="bk-phone" type="tel" value={form.phone} onChange={set('phone')} className="rounded-none mt-1.5" placeholder="(555) 555-5555" />
                  </div>
                  <div>
                    <Label htmlFor="bk-artist" className="font-mono text-xs uppercase">Preferred Artist</Label>
                    <select
                      id="bk-artist"
                      value={form.artist}
                      onChange={set('artist')}
                      className="mt-1.5 w-full h-10 border border-input bg-background px-3 text-sm rounded-none"
                    >
                      <option>No preference</option>
                      <option>Poncho The Artist</option>
                      <option>Edwin</option>
                      <option>Ash</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label htmlFor="bk-idea" className="font-mono text-xs uppercase">Tattoo Idea *</Label>
                  <Textarea id="bk-idea" required value={form.idea} onChange={set('idea')} className="rounded-none mt-1.5 min-h-28" placeholder="Describe your tattoo idea, style, and any meaning behind it" />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="bk-placement" className="font-mono text-xs uppercase">Body Placement *</Label>
                    <Input id="bk-placement" required value={form.placement} onChange={set('placement')} className="rounded-none mt-1.5" placeholder="e.g. left forearm" />
                  </div>
                  <div>
                    <Label htmlFor="bk-size" className="font-mono text-xs uppercase">Estimated Size *</Label>
                    <Input id="bk-size" required value={form.size} onChange={set('size')} className="rounded-none mt-1.5" placeholder='e.g. 4" x 6"' />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label htmlFor="bk-refs" className="font-mono text-xs uppercase">Reference Images (up to 6)</Label>
                  <label
                    htmlFor="bk-refs"
                    className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer py-8 px-4 text-center"
                  >
                    <ImagePlus className="w-6 h-6 text-primary" />
                    <span className="font-mono text-xs uppercase text-primary">Add reference images</span>
                    <span className="text-xs text-muted-foreground">Style examples, sketches, or photos of the placement area</span>
                  </label>
                  <input id="bk-refs" type="file" accept="image/*" multiple className="sr-only" onChange={addReferences} />
                  {references.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {references.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-sm bg-background border border-border px-3 py-1.5">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() => setReferences((prev) => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Review summary */}
                <div className="border border-border bg-background p-4 space-y-1.5 text-sm">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-2">Review Your Request</p>
                  <p><span className="text-muted-foreground">Name:</span> {form.name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {form.email}</p>
                  {form.phone && <p><span className="text-muted-foreground">Phone:</span> {form.phone}</p>}
                  <p><span className="text-muted-foreground">Artist:</span> {form.artist}</p>
                  <p><span className="text-muted-foreground">Placement:</span> {form.placement} · <span className="text-muted-foreground">Size:</span> {form.size}</p>
                  <p className="line-clamp-3"><span className="text-muted-foreground">Idea:</span> {form.idea}</p>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-none border-foreground/20 uppercase font-mono font-bold"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={!stepValid || isSubmitting}
                className="flex-1 h-14 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group"
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Submitting…' : 'Send Booking Request'}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
            {step === STEPS.length - 1 && (
              <p className="font-mono text-xs text-muted-foreground">
                Your request and reference images are sent securely to the AIMD studio. Questions? Email {BOOKING_EMAIL}.
              </p>
            )}
            {submissionError && (
              <p className="text-sm border border-destructive/40 bg-destructive/10 text-destructive p-3" role="alert">
                {submissionError}
              </p>
            )}
          </form>
          )}
        </div>
      </section>

      {/* What we do */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: 'Resident Artists', text: 'A rotating roster of resident and guest artists across styles — fine line, traditional, black & grey, and more.' },
            { icon: Sparkles, title: 'Custom Flash', text: 'Original flash sheets drawn in-house. Walk-in friendly when the books are open — first come, first inked.' },
            { icon: Shield, title: 'Clean & Licensed', text: 'A professional, licensed setup with single-use needles and hospital-grade sterilization. Your skin is the canvas; we treat it that way.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-border bg-card p-6">
              <Icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-display font-black uppercase tracking-tight text-xl mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-sell */}
      <section className="py-14 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display font-black uppercase tracking-tight text-xl">Are you an artist?</p>
            <p className="text-muted-foreground text-sm">Join the creator platform — build your streak, win challenges, and get seen by the studio.</p>
          </div>
          <Button variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono text-xs" asChild>
            <Link href="/app">
              Join the Creator Platform <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
