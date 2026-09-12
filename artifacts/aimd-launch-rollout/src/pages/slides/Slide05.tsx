import { Eyebrow, PageNo, PhaseCard, SlideShell } from '../../components/slide-kit';

export default function Slide05() {
  return (
    <SlideShell className="paper-grid">
      <PageNo value="05 / 12" />
      <div className="px-[5.8vw] pt-[5.1vw]">
        <Eyebrow>04 / THE FULL PRODUCT ARC</Eyebrow>
        <div className="mt-[1.3vw] flex items-end justify-between gap-[4vw]">
          <h2 className="display-tight max-w-[48vw] text-[4.65vw] font-black">
            Launch the habit.<br />
            <span className="text-[#FF4D00]">Then build the ladder.</span>
          </h2>
          <p className="max-w-[24vw] pb-[0.6vw] text-[1.2vw] leading-[1.22] text-[#5D5752]">
            The app has a three-phase growth path. Each phase earns the next one through real creator and instructor commitment.
          </p>
        </div>
        <div className="mt-[4.3vw] grid h-[25vw] grid-cols-3 gap-[1.1vw]">
          <PhaseCard number="01" label="NOW / PUBLIC" title="Creative habit + community">
            Launch free-first. Prove that prompts, posting, workshops, and shared wins create repeat behavior and a living network.
          </PhaseCard>
          <PhaseCard number="02" label="NEXT / PAID" title="Structured membership">
            Move toward paid subscriptions once filmed lessons, strong pathways, and clear recurring value are ready. Planning goal: 100 paid subscribers in the first 90 days, 300 in year one.
          </PhaseCard>
          <PhaseCard number="03" label="LATER / OPPORTUNITY" title="Access + partnerships" dark>
            Add one-on-one consultations, events, and partnerships for Tier 3 subscribers: discounts, booth access, or workspace opportunities. Planning goal: 25 founding members.
          </PhaseCard>
        </div>
        <div className="mt-[2.4vw] grid grid-cols-3 gap-[1.1vw] text-[1vw] font-bold uppercase tracking-[0.12em] text-[#6B645D]">
          <div>Gate: return behavior</div>
          <div>Gate: instructor content</div>
          <div>Gate: committed partners</div>
        </div>
      </div>
    </SlideShell>
  );
}