import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, Printer, X } from 'lucide-react';

const links = [
  ['Thesis', '#thesis'],
  ['Market', '#market'],
  ['Model', '#model'],
  ['Economics', '#economics'],
  ['Team', '#team'],
  ['Q&A', '#questions'],
];

const tiers = [
  {
    number: '01',
    name: 'Inspiring Artist',
    price: '$0',
    cadence: 'freemium',
    detail: 'A first daily practice. A place to begin.',
    features: ['Community feeds', 'Daily streaks & reward wheels', 'Weekly challenges', 'Preview clips'],
  },
  {
    number: '02',
    name: 'Dedicated Artist',
    price: '$39.99',
    cadence: '/ month · or $399 / year',
    detail: 'Structured craft development, built for momentum.',
    features: ['Full craft modules', 'Tattoo Prep, Fashion, Audio', 'Visual Arts & Athletics', 'Interactive workshop feedback'],
  },
  {
    number: '03',
    name: 'Professional Artist',
    price: '$99',
    cadence: '/ month · or $999 / year',
    detail: 'The systems and access to build an independent career.',
    features: ['Advanced business modules', 'Digital client pipelines', 'Priority planned residency access', 'Monthly 1-on-1 mentor consultations'],
  },
];

const team = [
  ['Edward Davila', 'Founder, CEO & Creative Director'],
  ['Anthony Davila', 'Project Director'],
  ['Nay', 'Operations'],
  ['Bri & Ashley Rae', 'Artist Relations & Events'],
  ['Dwayne', 'Institutional Outreach'],
  ['Nancy', 'Marketing'],
  ['Temo', 'Physical Logistical Production'],
];

const questions = [
  {
    q: 'How does Creator Studio prevent churn better than a habit app?',
    a: 'A streak is an entry point, not the whole product. Creator Studio is designed to connect daily practice to craft instruction, peer feedback, business capability, and eventually in-person opportunities. That progression is the retention thesis; it is not yet a proven retention outcome.',
  },
  {
    q: 'What is the customer acquisition cost, and how will you grow organically?',
    a: 'CAC has not been established and is not represented here as a known figure. The acquisition thesis is cross-pollination: artist-led content and previews introduce new learners, while challenges, community participation, workshops, and events create reasons to share and return. These channels require testing and measurement.',
  },
  {
    q: 'Can the model defend margins as the platform scales?',
    a: 'The model assumes reusable modular learning content and cloud technology can support more learners without matching each new subscriber with equivalent production cost. Technology, support, payments, and physical programming will still carry variable costs; margins are assumptions to validate, not a claim of perfectly flat overhead.',
  },
  {
    q: 'How do subscriptions connect to physical expansion?',
    a: 'Digital membership is the proposed learning and community layer; subscriptions could help inform and fund a phased physical roadmap. Mobile container studios, gallery shows, pop-up markets, and artist retreats are planned expansion concepts—not operating assets or currently available member benefits.',
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Creator Studio by AIMD home">
          <img src="/aimd-investor-one-sheet/aimd-logo.jpg" alt="AIMD — Art Is My Drug" />
          <span className="brand-divider" />
          <span className="brand-name">CREATOR<br />STUDIO</span>
        </a>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={closeMenu}>{label}</a>
          ))}
          <button className="print-button nav-print" onClick={() => window.print()} data-testid="button-print">
            <Printer size={14} /> Print one-sheet
          </button>
        </nav>
        <button className="mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-grain" />
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow"><span className="status-dot" /> Investor overview <span className="eyebrow-line" /> Founder briefing</p>
          <h1>Creator<br /><em>Studio</em> <span className="by-aimd">by AIMD</span></h1>
          <p className="hero-thesis">Bridging raw artistic talent and sustainable professional independence through discipline, digital structure, and real-world physical residency pipelines.</p>
          <div className="hero-actions">
            <a className="button-primary" href="#thesis">Explore the thesis <ArrowRight size={16} /></a>
            <button className="text-action" onClick={() => window.print()}><Printer size={15} /> Print / export</button>
          </div>
          <div className="hero-foot">
            <span>01 / THE INDEPENDENT ARTIST</span>
            <a href="#thesis" aria-label="Scroll to thesis"><ArrowDown size={16} /></a>
            <span>DISCIPLINE → SKILL → INDEPENDENCE</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="art-core"><span>A</span><i /></div>
          <div className="art-label label-top">PRACTICE / DAILY</div>
          <div className="art-label label-bottom">INDEPENDENCE / BUILT</div>
          <div className="art-cross cross-a" /><div className="art-cross cross-b" />
        </div>
      </section>

      <div className="ticker" aria-label="Creator Studio principles">
        <div className="ticker-track"><span>ART IS WORK</span><b>·</b><span>DISCIPLINE EATS TALENT</span><b>·</b><span>BUILD THE PRACTICE</span><b>·</b><span>ART IS WORK</span><b>·</b><span>DISCIPLINE EATS TALENT</span></div>
      </div>

      <section className="section thesis-section" id="thesis">
        <div className="section-index">01 <span>—</span> THE THESIS</div>
        <div className="thesis-layout">
          <div>
            <p className="eyebrow accent">From raw talent to repeatable practice</p>
            <h2>Discipline<br />eats <em>talent.</em></h2>
          </div>
          <div className="thesis-copy">
            <p className="lead">A creative career is not built in a flash of inspiration. It is built in the hours that happen after.</p>
            <p>Creator Studio gives hands-on artists a daily structure to show up, sharpen their craft, and turn effort into forward motion. Mechanical practice, check-in streaks, and behavior retention are the foundation: the smallest repeatable action becomes a path toward mastery.</p>
            <div className="practice-steps">
              <div><span>01</span><strong>Show up</strong><small>Daily mechanical practice</small></div>
              <div><span>02</span><strong>Build skill</strong><small>Structured craft learning</small></div>
              <div><span>03</span><strong>Stand alone</strong><small>Professional independence</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="market-section" id="market">
        <div className="section market-inner">
          <div className="section-index">02 <span>—</span> MARKET & MOAT</div>
          <div className="market-heading">
            <div><p className="eyebrow accent">A large market. A specific unmet need.</p><h2>Creators need<br />more than <em>content.</em></h2></div>
            <p className="market-intro">The opportunity is not to claim every creator is underserved. It is to build for artists whose creative ambition has outgrown the fragmented tools around their work.</p>
          </div>
          <div className="market-grid">
            <article className="market-stat">
              <span className="stat-source-tag">HISTORICAL ESTIMATE · APR 2023</span>
              <strong>$250<span>B</span></strong>
              <p>Goldman Sachs Research estimated the creator economy at $250B in 2023 and projected $480B by 2027.</p>
              <a href="https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027" target="_blank" rel="noreferrer">Read Goldman Sachs Research <ArrowUpRight size={13} /></a>
            </article>
            <article className="market-stat">
              <span className="stat-source-tag">GLOBAL SURVEY · DEC 2024</span>
              <strong>40<span>%+</span></strong>
              <p>Creative Class's 20-country survey reports more than 40% of creators work alone; 40% depend on unpaid help.</p>
              <a href="https://creativeclass.com/reports/The-Creator-Revolution.pdf" target="_blank" rel="noreferrer">Read the global survey <ArrowUpRight size={13} /></a>
            </article>
            <article className="market-thesis">
              <span className="mini-index">THE AIMD THESIS</span>
              <h3>One practice.<br />One connected path.</h3>
              <p>Tools and business support are fragmented for many artists. AIMD's thesis is to connect learning, community, and professional operations instead of asking creators to assemble the system alone.</p>
              <div className="thesis-ribbon"><span>LEARN</span><i /> <span>PRACTICE</span><i /> <span>OPERATE</span></div>
            </article>
          </div>
          <p className="source-note"><strong>Source note.</strong> Goldman Sachs Research, Apr. 19, 2023, estimate and forecast are historical—not current market sizing. Creative Class, <i>The Creator Revolution: Results from a Global Survey</i>, Dec. 2024. The brief's 48% figure was not corroborated by the cited survey; it is not presented as fact. Fragmentation is AIMD's positioning thesis, not a universal survey finding.</p>
        </div>
      </section>

      <section className="section moat-section">
        <div className="section-index">THE MOAT <span>—</span> BEYOND THE SCREEN</div>
        <div className="moat-layout">
          <div className="moat-visual">
            <div className="blueprint-grid" />
            <div className="blueprint-ring ring-large" /><div className="blueprint-ring ring-small" />
            <span className="bp-word bp-one">DIGITAL</span><span className="bp-word bp-two">PHYSICAL</span>
            <span className="bp-center">AIMD<br />ECOSYSTEM</span>
            <span className="bp-caption">PLANNED EXPANSION / NOT YET OPERATIONAL</span>
          </div>
          <div className="moat-copy">
            <p className="eyebrow accent">A digital foundation with a physical horizon</p>
            <h2>Learning that<br />leaves the <em>screen.</em></h2>
            <p className="lead">The long-term differentiator is a proposed bridge between digital education and real-world creative spaces.</p>
            <p>Creator Studio is designed to make practice and learning the front door to a wider ecosystem: hands-on events, places to exhibit, and opportunities to build with other artists. These programs and assets are planned—not currently operating.</p>
            <ul className="planned-list">
              <li><span>01</span> Mobile container studios</li>
              <li><span>02</span> Gallery shows & pop-up markets</li>
              <li><span>03</span> Artist retreats & residencies</li>
            </ul>
            <span className="planned-badge">PLANNED PHYSICAL EXPANSION</span>
          </div>
        </div>
      </section>

      <section className="pricing-section" id="model">
        <div className="section">
          <div className="section-index">03 <span>—</span> THE VALUE LADDER</div>
          <div className="pricing-head"><div><p className="eyebrow accent">Proposed membership tiers</p><h2>Start with practice.<br /><em>Grow into a living.</em></h2></div><p>Three levels of commitment. A clear path from creative spark to independent practice.</p></div>
          <div className="tier-grid">
            {tiers.map((tier, index) => (
              <article className={`tier tier-${index + 1}`} key={tier.number}>
                <div className="tier-top"><span>{tier.number} / TIER</span><span className="tier-mark">{index === 0 ? 'ENTRY' : index === 1 ? 'CRAFT' : 'CAREER'}</span></div>
                <h3>{tier.name}</h3>
                <div className="tier-price">{tier.price}<small>{tier.cadence}</small></div>
                <p className="tier-detail">{tier.detail}</p>
                <ul>{tier.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul>
                <div className="tier-status">{index === 0 ? 'Proposed free access' : 'Planned · checkout not live'}</div>
              </article>
            ))}
          </div>
          <p className="planned-footnote">Pricing and tier benefits are proposed and not currently open for checkout. Physical residency and container access are planned, not guaranteed or currently available.</p>
        </div>
      </section>

      <section className="section operations-section" id="operations">
        <div className="section-index">04 <span>—</span> OPERATING SYSTEM</div>
        <div className="ops-heading"><div><p className="eyebrow accent">Lean by design</p><h2>Built to teach.<br /><em>Built to repeat.</em></h2></div><p>A modular content engine pairs practical instruction with a cloud-first foundation—without pretending execution is already complete.</p></div>
        <div className="ops-grid">
          <article className="ops-production">
            <span className="mini-index">01 / PRODUCTION PIPELINE</span>
            <div className="production-symbol"><span /><span /><span /><span /></div>
            <h3>Make expertise<br />modular.</h3>
            <p>Led by Anthony Davila, multi-camera masterclass shoots break down technical skills and business blueprints into reusable learning blocks.</p>
            <div className="cost-line"><span>Target production cost</span><strong>$500–$1,000 <small>/ modular video block</small></strong></div>
          </article>
          <article className="ops-platform">
            <span className="mini-index">02 / TECHNOLOGY FOUNDATION</span>
            <h3>Cloud first.<br />Payments when ready.</h3>
            <div className="stack-list"><div><span className="stack-icon">01</span><span>Infrastructure</span><strong>Replit cloud</strong></div><div><span className="stack-icon">02</span><span>Payment routing</span><strong>Stripe + in-app purchase</strong></div></div>
            <p>Payment routing is part of the technology foundation. Dedicated and Professional checkout is not live; no public launch is implied.</p>
          </article>
        </div>
        <div className="team-block" id="team">
          <div className="team-heading"><span className="mini-index">03 / EXECUTIVE TEAM</span><p>Artists, operators, and builders around one mission.</p></div>
          <div className="team-list">{team.map(([name, role], index) => <div className="team-row" key={name}><span className="team-num">0{index + 1}</span><strong>{name}</strong><span>{role}</span></div>)}</div>
        </div>
      </section>

      <section className="financial-section" id="economics">
        <div className="section">
          <div className="section-index">05 <span>—</span> ILLUSTRATIVE MODEL</div>
          <div className="financial-heading"><div><p className="eyebrow accent">Founder-provided assumptions</p><h2>Scale with<br /><em>discipline.</em></h2></div><div className="disclaimer"><span className="disclaimer-mark">!</span><p><strong>Every figure below is an illustrative founder-provided projection.</strong> Not actual results, audited guidance, or a guarantee. Assumptions only; not investment advice.</p></div></div>
          <div className="model-label">YEAR 01 <span>— TARGET STATE AT YEAR-END</span></div>
          <div className="financial-metrics">
            <div className="metric"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>500</strong><p>Active paid subscribers by year-end</p></div>
            <div className="metric"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>~$45</strong><p>Blended ARPU / month</p></div>
            <div className="metric metric-highlight"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>$22.5k</strong><p>Year-end MRR · $270k annualized run rate</p></div>
            <div className="metric"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>$157.5k</strong><p>Cumulative gross revenue</p></div>
            <div className="metric"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>~$47k</strong><p>Lean operating expenses</p></div>
            <div className="metric metric-highlight"><span>ILLUSTRATIVE PROJECTION · YEAR 1</span><strong>+$110.5k</strong><p>Modeled operating profit / EBITDA · ~70%</p></div>
          </div>
          <div className="year-scale">
            <article><span>ILLUSTRATIVE FOUNDER-PROVIDED PROJECTION · NOT ACTUAL RESULTS</span><div><b>02</b><strong>&gt; $1.1M</strong></div><p>Year 2 gross revenue · assumed 75%+ margins</p></article>
            <div className="scale-connector"><ArrowRight size={18} /></div>
            <article><span>ILLUSTRATIVE FOUNDER-PROVIDED PROJECTION · NOT ACTUAL RESULTS</span><div><b>03</b><strong>&gt; $2.86M</strong></div><p>Year 3 gross revenue · tech overhead assumed to flatten</p></article>
          </div>
          <div className="compensation">
            <div><span className="mini-index">COMPENSATION ROADMAP</span><h3>Share the upside<br />as it arrives.</h3></div>
            <div className="phase-list">
              <div><span>PHASE A</span><strong>Sweat equity / trade</strong><p>Soft launch</p></div>
              <div><span>PHASE B</span><strong>Hourly / retainers</strong><p>Growth supports pay through Gusto</p></div>
              <div><span>PHASE C</span><strong>Scaled salaries + quarterly bonus pool</strong><p>After 500 subscribers</p></div>
            </div>
          </div>
          <p className="model-footnote">All financial and subscriber values on this page are illustrative founder-provided projections—not actual results, audited guidance, or a guarantee. Annualized run rate is not the same as recognized revenue. Margins, growth, costs, timing, and compensation triggers remain assumptions subject to execution and validation.</p>
        </div>
      </section>

      <section className="section qa-section" id="questions">
        <div className="section-index">06 <span>—</span> INVESTOR Q&A</div>
        <div className="qa-layout">
          <div className="qa-intro"><p className="eyebrow accent">Questions worth asking</p><h2>Clear-eyed<br />about the <em>work.</em></h2><p>Four honest answers to the questions that matter most at this stage.</p><div className="qa-count">01 — 04 <span>OPEN TO EXPLORE</span></div></div>
          <div className="qa-list">
            {questions.map((item, index) => (
              <article className={openQuestion === index ? 'qa-item is-open' : 'qa-item'} key={item.q}>
                <h3><button aria-expanded={openQuestion === index} aria-controls={`answer-${index}`} onClick={() => setOpenQuestion(openQuestion === index ? null : index)} data-testid={`button-question-${index + 1}`}><span className="qa-num">0{index + 1}</span><span>{item.q}</span><ChevronDown size={18} /></button></h3>
                <div className="qa-answer" id={`answer-${index}`} hidden={openQuestion !== index}><p>{item.a}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand"><img src="/aimd-investor-one-sheet/aimd-logo.jpg" alt="AIMD — Art Is My Drug" /><div><span>CREATOR STUDIO</span><small>BY AIMD</small></div></div>
          <p>Raw talent deserves<br />a real-world path.</p>
          <a href="#top" className="back-top">BACK TO TOP <ArrowUpRight size={15} /></a>
        </div>
        <div className="footer-bottom">
          <span>CREATOR STUDIO BY AIMD · INVESTOR OVERVIEW</span>
          <div className="footer-sources"><a href="https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027" target="_blank" rel="noreferrer">Goldman Sachs Research</a><a href="https://creativeclass.com/reports/The-Creator-Revolution.pdf" target="_blank" rel="noreferrer">Creative Class · Dec 2024</a></div>
          <button onClick={() => window.print()}><Printer size={13} /> PRINT / SAVE PDF</button>
        </div>
      </footer>
    </main>
  );
}

export default App;
