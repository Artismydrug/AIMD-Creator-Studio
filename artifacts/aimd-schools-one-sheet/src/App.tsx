const platformUrl = '/aimd-academy/';
const logo = '/aimd-schools-one-sheet/aimd-logo.jpg';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function App() {
  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="#welcome" aria-label="Creator Studio by AIMD home">
            <img src={logo} alt="AIMD — Art Is My Drug" />
            <span className="brand-rule" aria-hidden="true" />
            <span className="brand-label">CREATOR<br />STUDIO</span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#habits">The power of habits</a>
            <a href="#offer">What you get</a>
            <a href="#impact">Community impact</a>
            <a className="nav-cta" href={platformUrl}>Explore the platform <Arrow /></a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" id="welcome" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow mono">HERO &amp; WELCOME</p>
              <h1 id="hero-title">Big creative energy.<br />Room to <em>become.</em></h1>
              <p>Creator Studio by AIMD is a welcoming bridge between raw artistic talent and professional readiness—where students can make, practice, share, and find the confidence to explore what comes next, with educators alongside them.</p>
              <div className="hero-actions">
                <a className="button-primary" href={platformUrl}>Explore Creator Studio <Arrow /></a>
                <a className="text-link" href="#offer">See what grows here</a>
              </div>
              <p className="hero-note">For students · educators · schools · creative partners</p>
            </div>
            <div className="orbit-art" aria-label="AIMD creative energy illustration">
              <div className="orbit-ring" aria-hidden="true" />
              <div className="orbit-ring two" aria-hidden="true" />
              <span className="orbit-tag tag-one">try something new</span>
              <span className="orbit-tag tag-two">make / share / grow</span>
              <span className="orbit-tag tag-three">your next chapter</span>
              <span className="star star-a" aria-hidden="true">✳</span>
              <span className="star star-b" aria-hidden="true">✦</span>
              <div className="creative-core" aria-hidden="true"><span>A</span></div>
            </div>
          </div>
        </section>

        <div className="ribbon" aria-label="Creative growth principles">
          <div className="wrap ribbon-inner">
            <span>Show up for your craft</span><b aria-hidden="true">✳</b>
            <span>Make room to experiment</span><b aria-hidden="true">✳</b>
            <span>Grow together</span>
          </div>
        </div>

        <section className="section habit-section" id="habits" aria-labelledby="habits-title">
          <div className="wrap">
            <div className="habit-head">
              <div>
                <p className="section-kicker mono">THE POWER OF HABITS</p>
                <h2 className="section-title" id="habits-title">Talent starts<br />the story. <em>Practice</em><br />keeps it going.</h2>
              </div>
              <p className="section-intro">A little creative effort, repeated, can become a powerful way to build momentum. Creator Studio makes that rhythm visible—so students can notice progress, stay accountable, and keep going when inspiration ebbs.</p>
            </div>
            <div className="habit-layout">
              <article className="discipline-card">
                <p className="mono">A studio reminder</p>
                <div>
                  <h3>Discipline<br />Eats Talent</h3>
                  <p>Not because talent doesn’t matter. Because showing up gives it somewhere to go.</p>
                </div>
                <p className="mono">Small reps. Real growth.</p>
              </article>
              <div className="habit-points">
                <article className="habit-point">
                  <span className="point-num">01 / CHECK IN</span>
                  <h3>Make showing up count</h3>
                  <p>Daily check-in streaks help students recognize a practice rhythm and celebrate consistency.</p>
                </article>
                <article className="habit-point">
                  <span className="point-num">02 / TAKE A PROMPT</span>
                  <h3>Give creativity a nudge</h3>
                  <p>Structured challenges offer a starting point for trying new approaches and finishing small creative goals.</p>
                </article>
                <article className="habit-point">
                  <span className="point-num">03 / NOTICE THE WORK</span>
                  <h3>Reflect on progress</h3>
                  <p>Habit tracking can make effort easier to see, building resilience and personal accountability over time.</p>
                </article>
                <article className="habit-point">
                  <span className="point-num">04 / KEEP EXPLORING</span>
                  <h3>Let practice open doors</h3>
                  <p>As students make and share, they can discover interests and explore pathways across creative fields.</p>
                </article>
                <p className="practice-note">A PRACTICE TOOL, NOT A PROMISE OF OUTCOMES — EVERY CREATOR'S PATH LOOKS DIFFERENT.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section offer-section" id="offer" aria-labelledby="offer-title">
          <div className="wrap">
            <div className="offer-head">
              <div>
                <p className="section-kicker mono">WHAT EDUCATORS &amp; STUDENTS GET</p>
                <h2 className="section-title" id="offer-title">A place to learn,<br />share, and <em>shape a path.</em></h2>
              </div>
              <p className="section-intro">A creative-learning community built around making and meaningful exchange. Students bring their curiosity; educators help guide the growth.</p>
            </div>
            <div className="offer-grid">
              <article className="offer-card">
                <span className="offer-mark" aria-hidden="true">✳</span>
                <h3>Multi-medium workshops</h3>
                  <p>A learning program spanning visual art, tattoo artistry, music, movement, and more. Instructors are filming workshop videos, with sessions introduced as they are ready.</p>
              </article>
              <article className="offer-card">
                <span className="offer-mark" aria-hidden="true">↗</span>
                <h3>Feedback that moves work forward</h3>
                <p>Community interaction gives students ways to share work, exchange feedback, and learn from one another.</p>
              </article>
              <article className="offer-card">
                <span className="offer-mark" aria-hidden="true">▤</span>
                <h3>A record of creative growth</h3>
                <p>Profiles and Studio posts help students gather and share a portfolio-style record of their creative work.</p>
              </article>
              <article className="offer-card">
                <span className="offer-mark" aria-hidden="true">◎</span>
                <h3>Real-world pathways</h3>
                <p>Explore the people, practices, and possibilities behind professional creative fields—without a single prescribed route.</p>
              </article>
            </div>
            <p className="availability-note">Workshop videos are in production; available sessions and participation depend on each program and partner.</p>
          </div>
        </section>

        <section className="impact-section" id="impact" aria-labelledby="impact-title">
          <div className="impact-wrap">
            <div className="impact-art" aria-hidden="true">
              <div className="impact-shape">+</div>
              <span className="impact-art-label mono">CREATIVITY IS A COMMUNITY PRACTICE</span>
            </div>
            <div className="impact-copy">
              <p className="section-kicker mono">COMMUNITY IMPACT</p>
              <h2 className="section-title" id="impact-title">Creative opportunity should <em>travel.</em></h2>
              <p>AIMD’s community mission includes support for youth creative development—making space for young people to learn, connect, and keep exploring their ideas.</p>
              <ul className="impact-list">
                <li>Nonprofit youth workshops</li>
                <li>Creative mentorship</li>
                <li>Creative grants</li>
                <li>Community partnerships</li>
              </ul>
              <p className="impact-caveat">Programs and support vary by initiative and partner; availability is not guaranteed. Reach out through the platform to explore what’s active.</p>
            </div>
          </div>
        </section>

        <section className="cta-section" id="join" aria-labelledby="cta-title">
          <div className="wrap">
            <div className="cta-panel">
              <div className="cta-copy">
                <p className="section-kicker mono">CALL TO ACTION</p>
                <h2 id="cta-title">Your next idea belongs in the room.</h2>
                <p>Schools, educators, and students: come meet the community, explore the platform, and see where creative practice can take you.</p>
              </div>
              <a className="button-primary" href={platformUrl}>Explore Creator Studio <Arrow /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <img src={logo} alt="AIMD — Art Is My Drug" />
            <span>Creator Studio by AIMD</span>
          </div>
          <p>A welcoming place to practice, share, and explore creative possibility.</p>
          <a href={platformUrl}>Visit Creator Studio <Arrow /></a>
        </div>
      </footer>
    </>
  );
}

export default App;
