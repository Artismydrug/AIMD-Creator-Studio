import { useEffect } from 'react';
import { ArrowUpRight, Container } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import heroStudioImg from '@assets/IMG_0341_Original_1787745840250.jpeg';
import tattooBusImg from '@assets/The_Mobile_Tattoo_Bus_Tour_-_2019-28_Original_1787745840250.jpeg';
import youthWorkshopImg from '@assets/The_Mobile_Tattoo_Bus_Tour_-_2045_Original_1787745840250.jpeg';
import huluCollaborationImg from '@assets/IMG_6735_1787745840250.jpeg';
import concreteJungleContainerImg from '@assets/IMG_6733_1787745840250.jpeg';

export default function About() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#171514] text-[#f5eee2]">
      <MarketingNav />

      <main>
        <section
          aria-labelledby="about-title"
          className="relative isolate overflow-hidden border-b border-[#f5eee2]/15"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(198,88,50,0.28),transparent_28%),radial-gradient(circle_at_5%_80%,rgba(179,18,95,0.18),transparent_25%)]" />
          <div className="container mx-auto grid min-h-[calc(100dvh-73px)] items-center gap-12 px-6 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:py-24">
            <div className="max-w-3xl">
              <p className="mb-7 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-[#e9a319]">
                <span className="h-px w-10 bg-[#e9a319]" aria-hidden="true" />
                About Us
              </p>
              <h1
                id="about-title"
                data-testid="heading-about-us"
                className="max-w-2xl text-[clamp(3.6rem,9vw,8.8rem)] font-black leading-[0.82] tracking-[-0.075em] text-[#f5eee2] normal-case"
              >
                About Us
                {' '}
                <span className="mt-4 block text-[#e9a319]">— Art Is My Drug</span>
              </h1>
              <p className="mt-10 max-w-xl text-lg leading-8 text-[#d2c5b4] md:text-xl">
                <strong className="font-semibold text-[#f5eee2]">Our Journey: From a Local Hub to a Creative Movement</strong>
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
              <div className="absolute -right-3 -top-3 h-24 w-24 border-r border-t border-[#e9a319]" aria-hidden="true" />
              <div className="absolute -bottom-3 -left-3 h-24 w-24 border-b border-l border-[#c85a32]" aria-hidden="true" />
              <figure className="relative aspect-[4/5] overflow-hidden bg-[#2d2723]">
                <img
                  src={heroStudioImg}
                  alt="Tattoo artists working inside the Art Is My Drug Mobile Tattoo Bus"
                  className="h-full w-full object-cover opacity-85"
                  data-testid="img-about-hero"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171514]/80 via-transparent to-[#171514]/10" />
                <figcaption className="absolute bottom-5 left-5 border-l-2 border-[#e9a319] pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f5eee2]">
                  Art Is My Drug
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="journey-title"
          className="bg-[#f3ecdf] text-[#2c2623]"
        >
          <div className="container mx-auto grid gap-14 px-6 py-20 md:py-28 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2
                id="journey-title"
                data-testid="heading-journey"
                className="max-w-sm text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-7xl normal-case"
              >
                Our Journey:
                {' '}
                <span className="mt-3 block text-[#b3125f]">From a Local Hub to a Creative Movement</span>
              </h2>
              <div className="mt-10 hidden h-24 w-px bg-[#b3125f] lg:block" aria-hidden="true" />
            </div>

            <div className="max-w-2xl">
              <p data-testid="text-journey-intro" className="text-xl leading-9 md:text-2xl md:leading-10">
                Art Is My Drug started with a vision to build a true community of creators. In <strong>2014</strong>, Edward “Ponchotheartist” Davila opened his very first shop in <strong>Torrance, CA</strong>. What started as a <strong>1,000 sq. ft. tattoo shop</strong> quickly grew into something much bigger, expanding to over <strong>4,000 sq. ft.</strong> and serving as a bustling hub for the community. We brought not just tattoos, but <strong>fashion, poetry, music, and all forms of art under one roof.</strong>
              </p>

              <div className="mt-12 grid gap-4 sm:grid-cols-[1.35fr_0.65fr]">
                <figure className="group relative overflow-hidden bg-[#2c2623]">
                  <img
                    src={tattooBusImg}
                    alt="The Art Is My Drug Mobile Tattoo Bus set up for a tour stop"
                    className="aspect-[16/10] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#171514]/90 via-[#171514]/45 to-transparent px-5 pb-4 pt-12 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f5eee2]">
                    The original Mobile Tattoo Bus
                  </figcaption>
                </figure>
                <figure className="relative overflow-hidden border border-[#2c2623]/15 bg-[#d8cebe]">
                  <img
                    src={huluCollaborationImg}
                    alt="Edward Davila at a Hulu collaboration"
                    className="aspect-[3/4] h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="absolute bottom-3 left-3 right-3 bg-[#f3ecdf]/90 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#2c2623]">
                    On the road
                  </figcaption>
                </figure>
              </div>

              <div className="my-16 border-y border-[#2c2623]/20 py-8">
                <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.22em] text-[#b3125f]">
                  Our momentum pushed us beyond the walls of a traditional shop:
                </p>
                <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-x-7">
                  <p className="font-display text-5xl font-black leading-none text-[#c85a32]" aria-hidden="true">01</p>
                  <p data-testid="text-milestone-mobile-tattoo-bus" className="text-lg leading-8">
                    <strong>2017:</strong> We built the first Mobile Tattoo Bus.
                  </p>
                  <p className="font-display text-5xl font-black leading-none text-[#c85a32]" aria-hidden="true">02</p>
                  <p data-testid="text-milestone-tours" className="text-lg leading-8">
                    <strong>National &amp; California Tours:</strong> We collaborated on high-profile projects with Hulu, Mammoth/Heavyhitters, Coachella activations, LA Weekly, and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="next-era-title"
          className="border-b border-[#f5eee2]/15 bg-[#27211e]"
        >
          <div className="container mx-auto grid gap-12 px-6 py-20 md:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-24">
            <div>
              <div className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#e9a319]">
                <Container className="h-4 w-4" aria-hidden="true" />
                The Next Era
              </div>
              <h2
                id="next-era-title"
                data-testid="heading-next-era"
                className="max-w-4xl text-6xl font-black leading-[0.84] tracking-[-0.065em] text-[#f5eee2] md:text-8xl normal-case"
              >
                The Next Era:
                {' '}
                <span className="mt-4 block text-[#c85a32]">Concrete Jungle &amp; The Artist Resort</span>
              </h2>
            </div>
            <div className="border-l border-[#e9a319]/60 pl-6 md:pl-8">
              <p data-testid="text-next-era" className="text-lg leading-8 text-[#d2c5b4] md:text-xl md:leading-9">
                In <strong className="text-[#f5eee2]">2024</strong>, we took a massive leap forward and moved to <strong className="text-[#f5eee2]">Vintageland/Concrete Jungle</strong>—a sprawling <strong className="text-[#f5eee2]">100,000 sq. ft. space</strong> featuring <strong className="text-[#f5eee2]">3 levels dedicated to creation.</strong>
              </p>
              <p className="mt-7 text-lg leading-8 text-[#d2c5b4] md:text-xl md:leading-9">
                We are now scaling to build our long-time dream: <strong className="text-[#f5eee2]">The Artist Resort.</strong> Our plan is to build a sustainable compound utilizing shipping containers, and our very first container compound is already set up right here at Concrete Jungle!
              </p>
              <figure className="relative mt-10 overflow-hidden border border-[#f5eee2]/15 bg-[#171514]">
                <img
                  src={concreteJungleContainerImg}
                  alt="A finished shipping-container studio at Concrete Jungle"
                  className="aspect-[16/10] h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="absolute bottom-0 left-0 border-r border-t border-[#e9a319] bg-[#171514]/90 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f5eee2]">
                  The first container compound
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="support-title"
          className="relative overflow-hidden bg-[#e9a319] text-[#2c2623]"
        >
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[48px] border-[#2c2623]/10" aria-hidden="true" />
          <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full border-[32px] border-[#c85a32]/20" aria-hidden="true" />
          <div className="container relative mx-auto px-6 py-20 md:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
              <div>
                <h2
                  id="support-title"
                  data-testid="heading-supporting-creators"
                  className="max-w-md text-5xl font-black leading-[0.86] tracking-[-0.06em] md:text-7xl normal-case"
                >
                  Supporting the Creators of Tomorrow
                </h2>
                <figure className="relative mt-10 max-w-xl overflow-hidden border-4 border-[#2c2623] bg-[#2c2623] shadow-[12px_12px_0_rgba(44,38,35,0.18)]">
                  <img
                    src={youthWorkshopImg}
                    alt="Young creators gathered in front of the Art Is My Drug Mobile Tattoo Bus"
                    className="aspect-[16/10] h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="border-t border-[#2c2623] bg-[#f5eee2] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#2c2623]">
                    Building with the next generation
                  </figcaption>
                </figure>
              </div>
              <div className="max-w-2xl">
                <p data-testid="text-supporting-creators" className="text-xl leading-9 md:text-2xl md:leading-10">
                  We are deeply committed to lifting up the next generation. In <strong>2024</strong>, we officially launched our <strong>Non-Profit organization dedicated to supporting and nurturing the youth.</strong> We have already hosted over a dozen art workshops and plan to keep building the creators of tomorrow.
                </p>

                <div className="mt-12 border-t border-[#2c2623]/30 pt-8">
                  <p className="max-w-xl text-2xl font-black leading-tight tracking-[-0.025em] md:text-3xl">
                    Want to help empower the next generation of youth creators?
                  </p>
                  <a
                    href="https://www.artismydrug.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Learn more about and support the Art Is My Drug Non-Profit initiative"
                    data-testid="link-nonprofit-support"
                    className="group mt-7 inline-flex max-w-full items-center gap-3 break-words border-b-2 border-[#2c2623] pb-2 font-mono text-sm font-bold tracking-[0.08em] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c2623] focus-visible:ring-offset-4 focus-visible:ring-offset-[#e9a319] md:text-base"
                  >
                    Click here to learn more about and support our Non-Profit initiative www.artismydrug.org
                    <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
