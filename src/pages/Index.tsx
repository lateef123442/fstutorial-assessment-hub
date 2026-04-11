import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PORTFOLIO_URL = "https://ahmed-portfolio-nine-sable.vercel.app/";

/* ─── tiny hook: count-up animation ─── */
function useCountUp(
  ref: React.RefObject<HTMLSpanElement>,
  target: number,
  suffix: string,
  duration: number,
  delay = 0
) {
  useEffect(() => {
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, []);
}

/* ─── tiny hook: intersection-reveal ─── */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── static data ─── */
const FEATURES = [
  {
    accent: "green",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
        <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity=".45" />
        <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity=".45" />
        <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity=".2" />
      </svg>
    ),
    title: "Comprehensive assessments",
    desc: "MCQs, timed tests, and instant auto-grading across every physiotherapy module.",
  },
  {
    accent: "blue",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4.5l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Timed CBT environment",
    desc: "Real exam simulation with countdown timers, tab-violation detection, and auto-submit.",
  },
  {
    accent: "purple",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 14l4-4 3 3 4-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    title: "Deep analytics",
    desc: "Track scores, identify weak areas, and monitor improvement across every session.",
  },
  {
    accent: "amber",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2.2 5H17l-3.9 3 1.4 5L10 12.5 5.5 15l1.4-5L3 7h4.8L10 2z" fill="currentColor" opacity=".85" />
      </svg>
    ),
    title: "Instant results",
    desc: "Server-side scoring delivers your result the moment you submit — zero delay.",
  },
] as const;

const STEPS = [
  { n: "01", title: "Register & get assigned", text: "An admin creates your account and assigns you to the right subjects and cohorts." },
  { n: "02", title: "Receive your assessment", text: "Your teacher publishes a timed test. Access it directly from your student dashboard." },
  { n: "03", title: "Take the CBT exam", text: "Navigate questions JAMB-style, manage your time, and submit with confidence." },
  { n: "04", title: "Get results instantly", text: "Scores are calculated server-side the moment you submit — no waiting, ever." },
] as const;

const ROLES = [
  { initial: "A", accent: "green", title: "Administrators", desc: "Manage teachers, students, subjects, and view institution-wide performance analytics." },
  { initial: "T", accent: "blue", title: "Teachers", desc: "Create assessments, manage question banks, and track per-cohort performance." },
  { initial: "S", accent: "amber", title: "Students", desc: "Take timed exams, view past results, and track your academic progress over time." },
] as const;

/* ─────────────────────────── Component ─────────────────────────── */
const Index = () => {
  const navigate = useNavigate();
  const cnt1 = useRef<HTMLSpanElement>(null);
  const cnt2 = useRef<HTMLSpanElement>(null);
  const cnt3 = useRef<HTMLSpanElement>(null);

  /* auth check */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  useReveal();
  useCountUp(cnt1, 1200, "+", 1800, 900);
  useCountUp(cnt2, 8400, "+", 2000, 900);
  useCountUp(cnt3, 94, "%", 1600, 900);

  const openMenu = () => {
    const el = document.getElementById("mob-menu");
    el?.setAttribute("data-open", el.getAttribute("data-open") === "true" ? "false" : "true");
  };

  return (
    <div className="pn">
      <style>{CSS}</style>

      {/* ── ticker ── */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((g) => (
            <span className="ticker-row" key={g}>
              {["Physiotherapy CBT", "Instant Results", "JAMB-Style Navigator", "Timed Assessments", "Built for Students", "Deep Analytics", "Track Progress", "Ace Your Exams"].map((t, i) => (
                <span className="ticker-item" key={i}>
                  <span className="ticker-dot" />{t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── nav ── */}
      <header className="nav">
        <a className="logo" href="#" aria-label="Physio Nexus">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C9 1.5 4 4.5 4 9c0 3.314 2.239 5 5 5s5-1.686 5-5c0-4.5-5-7.5-5-7.5Z" fill="#022010" opacity=".9"/>
              <circle cx="9" cy="9" r="2" fill="#022010"/>
              <path d="M9 11.5v3M6.5 13.5l2.5-1.5 2.5 1.5" stroke="#022010" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">Physio Nexus</span>
            <span className="logo-sub">CBT Platform</span>
          </div>
        </a>

        <nav className="nav-links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </nav>

        <div className="nav-end">
          <a className="nav-by" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
            by <strong>Web Forge</strong>
          </a>
          <button className="btn-primary nav-cta" onClick={() => navigate("/login")}>
            Login <ArrowRight />
          </button>
          <button className="hamburger" aria-label="Toggle menu" onClick={openMenu}>
            <span /><span /><span />
          </button>
        </div>

        {/* mobile menu */}
        <div className="mob-menu" id="mob-menu" data-open="false">
          <a href="#features" onClick={openMenu}>Features</a>
          <a href="#how-it-works" onClick={openMenu}>How it works</a>
          <a href="#roles" onClick={openMenu}>Roles</a>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="mob-portfolio">
            Built by Web Forge · Ahmed Abdullateef ↗
          </a>
          <button className="btn-primary mob-login" onClick={() => navigate("/login")}>
            Login to Physio Nexus <ArrowRight />
          </button>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="hero">
        {/* decorative grid */}
        <div className="hero-grid" aria-hidden="true" />
        {/* orbs */}
        <div className="orb orb-a" aria-hidden="true" />
        <div className="orb orb-b" aria-hidden="true" />
        <div className="orb orb-c" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-dot" />
            Built for physiotherapy students
          </div>

          <h1 className="hero-h1">
            <span className="h1-outline">Master</span> every exam
            <br />with <em className="h1-em">Physio Nexus</em>
          </h1>

          <p className="hero-sub">
            The advanced CBT platform built for physio students — timed tests, JAMB-style navigation, instant results, and deep analytics.
          </p>

          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate("/login")}>
              <ArrowRight /> Start for free
            </button>
            <button
              className="btn-ghost btn-lg"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              <ClockIcon /> How it works
            </button>
          </div>

          {/* stats row */}
          <dl className="stats-row">
            {[
              { ref: cnt1, label: "Students enrolled" },
              { ref: cnt2, label: "Assessments taken" },
              { ref: cnt3, label: "Pass rate" },
            ].map(({ ref, label }) => (
              <div className="stat" key={label}>
                <dt className="stat-label">{label}</dt>
                <dd className="stat-value"><span ref={ref}>0</span></dd>
              </div>
            ))}
          </dl>

          <p className="hero-credit">
            <StarIcon /> Crafted by&nbsp;
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              Web Forge · Ahmed Abdullateef
            </a>
          </p>
        </div>
      </section>

      {/* ── features ── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Why choose us</span>
            <h2 className="h2">Everything you need to excel</h2>
            <p className="lead">Purpose-built for physio students — from anatomy to biomechanics, every module covered.</p>
          </div>

          <div className="feat-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className={`feat-card reveal stagger-${i + 1}`} data-accent={f.accent}>
                <div className="feat-icon">{f.icon}</div>
                <h3 className="feat-title">{f.title}</h3>
                <p className="feat-desc">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section className="section section-alt" id="how-it-works">
        <div className="container hiw-layout">
          <div className="hiw-left reveal">
            <span className="eyebrow">How it works</span>
            <h2 className="h2">Simple.<br />Fast.<br />Effective.</h2>
            <p className="lead">From registration to results in under a minute.</p>
            <button className="btn-primary" style={{ marginTop: 32 }} onClick={() => navigate("/login")}>
              Get started <ArrowRight />
            </button>
          </div>

          <ol className="steps" aria-label="Steps to get started">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`step reveal stagger-${i + 1}`}>
                <div className="step-num" aria-hidden="true">{s.n}</div>
                <div className="step-body">
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-text">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── roles ── */}
      <section className="section" id="roles">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Platform roles</span>
            <h2 className="h2">Built for everyone</h2>
          </div>
          <div className="roles-grid">
            {ROLES.map((r, i) => (
              <article key={r.title} className={`role-card reveal stagger-${i + 1}`} data-accent={r.accent}>
                <div className="role-av">{r.initial}</div>
                <h3 className="role-title">{r.title}</h3>
                <p className="role-desc">{r.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── by bar ── */}
      <div className="by-bar reveal">
        <span className="by-text">Designed &amp; built by</span>
        <a className="by-card" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          <span className="by-badge">Web Forge</span>
          <span className="by-info">
            <span className="by-name">Ahmed Abdullateef</span>
            <span className="by-sub">View portfolio ↗</span>
          </span>
        </a>
        <span className="by-text">— Premium web experiences</span>
      </div>

      {/* ── cta ── */}
      <section className="cta-section">
        <div className="cta-inner reveal">
          <div className="cta-glow cta-glow-a" aria-hidden="true" />
          <div className="cta-glow cta-glow-b" aria-hidden="true" />
          <div className="cta-glow cta-glow-c" aria-hidden="true" />
          <h2 className="cta-h2">Ready to transform<br />how you study physiotherapy?</h2>
          <p className="cta-sub">Join Physio Nexus today — it takes less than a minute to get started.</p>
          <div className="cta-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate("/login")}>
              <ArrowRight /> Start now — it's free
            </button>
            <a className="btn-ghost btn-lg" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              Built by Web Forge ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="footer">
        <div className="footer-left">
          <span className="footer-copy">© 2025 Physio Nexus. All rights reserved.</span>
          <span className="footer-by">
            Created by&nbsp;
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              Web Forge · Ahmed Abdullateef
            </a>
          </span>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </nav>
      </footer>
    </div>
  );
};

/* ─── Icon components ─── */
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M5.5 1l1.3 3.2H10L7.2 6.3l1 3L5.5 7.8 2.8 9.3l1-3L1 4.2h3.2L5.5 1Z" fill="currentColor" opacity=".5"/>
  </svg>
);

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500&display=swap');

/* ── reset ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  /* palette */
  --green:#0fffa0;--green-dim:rgba(15,255,160,.15);--green-glow:rgba(15,255,160,.08);
  --blue:#4d8fff;--purple:#a78bfa;--amber:#fbbf24;
  /* surface */
  --bg:#020c14;--bg2:#061622;
  --surface:rgba(255,255,255,.035);--surface-hover:rgba(255,255,255,.06);
  /* border */
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);--border-green:rgba(15,255,160,.25);
  /* text */
  --tx:#f5f5f5;--tx2:rgba(255,255,255,.5);--tx3:rgba(255,255,255,.25);
  /* type */
  --display:'Bricolage Grotesque',sans-serif;
  --body:'Geist',sans-serif;
  /* radius */
  --r-sm:8px;--r-md:12px;--r-lg:20px;--r-xl:28px;
  /* spacing scale */
  --s-xs:4px;--s-sm:8px;--s-md:16px;--s-lg:24px;--s-xl:40px;--s-2xl:64px;--s-3xl:96px;
  /* transition */
  --ease:.3s cubic-bezier(.2,.8,.2,1);
}

.pn{
  font-family:var(--body);
  background:var(--bg);
  color:var(--tx);
  overflow-x:hidden;
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}

/* ────────────────── TICKER ────────────────── */
.ticker{
  background:var(--green);
  padding:8px 0;
  overflow:hidden;
  white-space:nowrap;
}
.ticker-track{
  display:inline-flex;
  animation:ticker-scroll 35s linear infinite;
}
.ticker-row{display:inline-flex;align-items:center;}
.ticker-item{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--display);font-size:10.5px;font-weight:700;
  color:#021a0e;letter-spacing:1.8px;text-transform:uppercase;
  padding:0 22px;
}
.ticker-dot{
  width:3px;height:3px;border-radius:50%;
  background:#021a0e;opacity:.3;flex-shrink:0;
}
@keyframes ticker-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ────────────────── NAV ────────────────── */
.nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 48px;
  position:sticky;top:0;z-index:200;
  background:rgba(2,12,20,.85);
  backdrop-filter:blur(24px) saturate(160%);
  -webkit-backdrop-filter:blur(24px) saturate(160%);
  border-bottom:.5px solid var(--border);
}
.logo{display:flex;align-items:center;gap:11px;text-decoration:none;}
.logo-mark{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  background:var(--green);
  display:flex;align-items:center;justify-content:center;
  position:relative;
}
.logo-mark::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(135deg,rgba(255,255,255,.25) 0%,transparent 55%);
}
.logo-name{
  display:block;font-family:var(--display);font-size:15px;font-weight:700;
  color:var(--tx);letter-spacing:-.3px;line-height:1.1;
}
.logo-sub{
  display:block;font-size:9.5px;font-weight:500;
  color:var(--green);letter-spacing:2px;text-transform:uppercase;
}

.nav-links{display:flex;gap:28px;}
.nav-links a{
  font-size:13px;font-weight:400;color:var(--tx2);
  text-decoration:none;transition:color var(--ease);letter-spacing:.1px;
}
.nav-links a:hover{color:var(--tx);}

.nav-end{display:flex;align-items:center;gap:10px;}
.nav-by{
  font-size:11.5px;color:var(--tx3);text-decoration:none;
  transition:color var(--ease);white-space:nowrap;
}
.nav-by strong{color:var(--green);font-weight:600;}
.nav-by:hover{color:var(--tx2);}
.nav-cta{}

.hamburger{
  display:none;flex-direction:column;gap:4.5px;
  cursor:pointer;padding:4px;background:none;border:none;
}
.hamburger span{
  display:block;width:20px;height:1.5px;
  background:var(--tx);border-radius:2px;transition:all .3s;
}

/* mobile menu */
.mob-menu{
  display:none;
  position:absolute;top:100%;left:0;right:0;
  background:rgba(2,12,20,.97);
  backdrop-filter:blur(28px);
  border-bottom:.5px solid var(--border);
  padding:16px 24px 20px;
  flex-direction:column;gap:0;
  z-index:198;
}
.mob-menu[data-open="true"]{display:flex;}
.mob-menu a{
  font-size:14px;color:var(--tx2);text-decoration:none;
  padding:13px 0;border-bottom:.5px solid var(--border);
  transition:color var(--ease);
}
.mob-menu a:hover{color:var(--tx);}
.mob-portfolio{color:var(--green)!important;font-weight:500;}
.mob-login{margin-top:14px;justify-content:center;}

/* ────────────────── BUTTONS ────────────────── */
.btn-primary{
  display:inline-flex;align-items:center;gap:8px;
  background:var(--green);color:#021a0e;
  border:none;border-radius:var(--r-sm);
  padding:10px 22px;
  font-family:var(--display);font-size:13px;font-weight:700;letter-spacing:.1px;
  cursor:pointer;transition:background var(--ease),transform var(--ease),box-shadow var(--ease);
  white-space:nowrap;text-decoration:none;
}
.btn-primary:hover{
  background:#2bffc0;
  transform:translateY(-2px);
  box-shadow:0 12px 32px rgba(15,255,160,.28);
}
.btn-primary:active{transform:translateY(0);box-shadow:none;}
.btn-primary.btn-lg{padding:13px 28px;font-size:14px;}

.btn-ghost{
  display:inline-flex;align-items:center;gap:8px;
  background:transparent;color:rgba(255,255,255,.75);
  border:.5px solid var(--border-strong);border-radius:var(--r-sm);
  padding:10px 22px;
  font-size:13px;font-weight:400;
  cursor:pointer;transition:all var(--ease);
  white-space:nowrap;text-decoration:none;
}
.btn-ghost:hover{
  border-color:var(--border-green);color:var(--green);
  transform:translateY(-2px);background:var(--green-glow);
}
.btn-ghost.btn-lg{padding:13px 28px;font-size:14px;}

/* ────────────────── HERO ────────────────── */
.hero{
  position:relative;overflow:hidden;
  padding:108px 48px 88px;
  display:flex;justify-content:center;
  min-height:620px;
  text-align:center;
}
.hero-grid{
  position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
  background-size:56px 56px;
  mask-image:radial-gradient(ellipse 70% 65% at 50% 30%,black,transparent);
  -webkit-mask-image:radial-gradient(ellipse 70% 65% at 50% 30%,black,transparent);
}
.orb{
  position:absolute;border-radius:50%;pointer-events:none;
  filter:blur(100px);animation:orb-float 12s ease-in-out infinite;
}
.orb-a{width:520px;height:520px;background:var(--green);opacity:.13;top:-220px;left:-160px;animation-delay:0s;}
.orb-b{width:400px;height:400px;background:var(--blue);opacity:.12;top:-120px;right:-120px;animation-delay:-5s;}
.orb-c{width:320px;height:320px;background:var(--purple);opacity:.10;bottom:-100px;left:38%;animation-delay:-9s;}
@keyframes orb-float{
  0%,100%{transform:translate(0,0) scale(1)}
  40%{transform:translate(20px,-16px) scale(1.05)}
  70%{transform:translate(-14px,12px) scale(0.97)}
}

.hero-inner{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  max-width:860px;width:100%;
  animation:hero-in .6s ease both;
}
@keyframes hero-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

.hero-badge{
  display:inline-flex;align-items:center;gap:7px;
  border:.5px solid var(--border-green);background:var(--green-glow);
  color:var(--green);border-radius:100px;
  padding:5px 14px;
  font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;
  margin-bottom:26px;
  animation:hero-in .6s .05s ease both;
}
.badge-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--green);
  animation:pulse 2.5s ease-in-out infinite;
}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(1.6)}}

.hero-h1{
  font-family:var(--display);
  font-size:clamp(40px,7.5vw,80px);font-weight:800;
  line-height:1.03;letter-spacing:-2.5px;
  margin-bottom:22px;
  animation:hero-in .65s .1s ease both;
}
.h1-outline{
  -webkit-text-stroke:1.5px rgba(255,255,255,.2);
  -webkit-text-fill-color:transparent;
}
.h1-em{
  font-style:normal;
  background:linear-gradient(115deg,var(--green) 0%,#5ef5c8 55%,#b5ffe8 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

.hero-sub{
  font-size:17px;font-weight:300;color:var(--tx2);
  max-width:520px;line-height:1.8;margin-bottom:36px;
  animation:hero-in .65s .15s ease both;
}

.hero-actions{
  display:flex;gap:12px;justify-content:center;flex-wrap:wrap;
  margin-bottom:48px;
  animation:hero-in .65s .22s ease both;
}

/* stats */
.stats-row{
  display:flex;
  border:.5px solid var(--border-strong);border-radius:var(--r-lg);
  background:rgba(255,255,255,.025);backdrop-filter:blur(10px);
  max-width:540px;width:100%;overflow:hidden;
  list-style:none;
  animation:hero-in .65s .3s ease both;
}
.stat{
  flex:1;padding:18px 20px;text-align:center;
  border-right:.5px solid var(--border);
  position:relative;
  transition:background var(--ease);
}
.stat::after{
  content:'';position:absolute;bottom:0;left:50%;
  transform:translateX(-50%);
  width:0;height:2px;background:var(--green);
  transition:width .4s ease;border-radius:2px;
}
.stat:hover{background:rgba(255,255,255,.035);}
.stat:hover::after{width:55%;}
.stat:last-child{border-right:none;}
.stat-label{
  font-size:10.5px;color:var(--tx3);letter-spacing:.4px;
  text-transform:uppercase;font-weight:500;
  display:block;margin-bottom:6px;
}
.stat-value{
  font-family:var(--display);font-size:26px;font-weight:800;
  color:var(--green);letter-spacing:-1px;line-height:1;
  display:block;
}

.hero-credit{
  margin-top:28px;font-size:11px;color:var(--tx3);
  display:flex;align-items:center;gap:5px;
  animation:hero-in .65s .38s ease both;
}
.hero-credit a{color:var(--green);font-weight:500;text-decoration:none;}
.hero-credit a:hover{text-decoration:underline;}

/* ────────────────── SHARED SECTION ────────────────── */
.section{padding:var(--s-3xl) 0;}
.section-alt{background:rgba(255,255,255,.018);}
.container{max-width:1120px;margin:0 auto;padding:0 48px;}

.section-header{text-align:center;margin-bottom:52px;}
.eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  font-size:11px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:var(--green);
  margin-bottom:12px;
}
.eyebrow::before{content:'';display:inline-block;width:18px;height:1.5px;background:var(--green);}
.h2{
  font-family:var(--display);
  font-size:clamp(28px,4.5vw,46px);font-weight:800;
  letter-spacing:-1.5px;line-height:1.1;margin-bottom:14px;color:var(--tx);
}
.lead{font-size:15.5px;color:var(--tx2);line-height:1.8;max-width:480px;margin:0 auto;}

/* ────────────────── REVEAL ────────────────── */
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;}
.reveal.is-visible{opacity:1;transform:none;}
.stagger-1.is-visible{transition-delay:.05s}
.stagger-2.is-visible{transition-delay:.13s}
.stagger-3.is-visible{transition-delay:.21s}
.stagger-4.is-visible{transition-delay:.29s}

/* ────────────────── FEATURES ────────────────── */
.feat-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
}
.feat-card{
  background:var(--surface);
  border:.5px solid var(--border);
  border-radius:var(--r-md);
  padding:26px 22px;
  transition:transform var(--ease),border-color var(--ease),background var(--ease);
  position:relative;overflow:hidden;cursor:default;
}
.feat-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1.5px;
  background:linear-gradient(90deg,transparent,var(--card-accent,var(--green)),transparent);
  opacity:0;transition:opacity var(--ease);
}
.feat-card:hover{
  transform:translateY(-5px);
  border-color:rgba(255,255,255,.14);
  background:var(--surface-hover);
}
.feat-card:hover::before{opacity:1;}

/* accent colors per card */
.feat-card[data-accent="green"] .feat-icon{background:rgba(15,255,160,.1);color:var(--green);}
.feat-card[data-accent="green"]{--card-accent:var(--green);}
.feat-card[data-accent="blue"] .feat-icon{background:rgba(77,143,255,.1);color:var(--blue);}
.feat-card[data-accent="blue"]{--card-accent:var(--blue);}
.feat-card[data-accent="purple"] .feat-icon{background:rgba(167,139,250,.1);color:var(--purple);}
.feat-card[data-accent="purple"]{--card-accent:var(--purple);}
.feat-card[data-accent="amber"] .feat-icon{background:rgba(251,191,36,.1);color:var(--amber);}
.feat-card[data-accent="amber"]{--card-accent:var(--amber);}

.feat-icon{
  width:44px;height:44px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:16px;transition:transform var(--ease);
}
.feat-card:hover .feat-icon{transform:scale(1.08);}
.feat-title{font-family:var(--display);font-size:14px;font-weight:700;margin-bottom:8px;color:var(--tx);}
.feat-desc{font-size:12.5px;color:var(--tx2);line-height:1.7;}

/* ────────────────── HOW IT WORKS ────────────────── */
.hiw-layout{
  display:flex;gap:80px;align-items:flex-start;
}
.hiw-left{flex:0 0 260px;}

.steps{
  flex:1;list-style:none;
  display:flex;flex-direction:column;
  padding-top:4px;
}
.step{
  display:flex;gap:20px;align-items:flex-start;
  padding-bottom:32px;position:relative;
}
.step:not(:last-child)::after{
  content:'';position:absolute;
  left:19px;top:44px;bottom:0;
  width:1px;
  background:linear-gradient(to bottom,rgba(15,255,160,.3) 0%,transparent 100%);
}
.step-num{
  width:40px;height:40px;flex-shrink:0;
  border-radius:50%;
  background:rgba(15,255,160,.08);
  border:.5px solid rgba(15,255,160,.28);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:11px;font-weight:800;
  color:var(--green);letter-spacing:.5px;
  transition:background var(--ease),border-color var(--ease);
}
.step:hover .step-num{background:rgba(15,255,160,.18);border-color:var(--green);}
.step-title{font-family:var(--display);font-size:14.5px;font-weight:700;margin-bottom:5px;color:var(--tx);}
.step-text{font-size:13px;color:var(--tx2);line-height:1.7;}

/* ────────────────── ROLES ────────────────── */
.roles-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:14px;max-width:860px;margin:0 auto;
}
.role-card{
  border-radius:var(--r-md);padding:36px 26px;text-align:center;
  border:.5px solid var(--border);background:var(--surface);
  transition:transform var(--ease),border-color var(--ease);
  position:relative;overflow:hidden;
}
.role-card::after{
  content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 50% -10%,rgba(15,255,160,.06) 0%,transparent 65%);
  opacity:0;transition:opacity var(--ease);
}
.role-card:hover{transform:translateY(-5px);border-color:var(--border-strong);}
.role-card:hover::after{opacity:1;}

.role-av{
  width:58px;height:58px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:20px;font-weight:800;
  margin:0 auto 16px;
  transition:transform var(--ease);
}
.role-card:hover .role-av{transform:scale(1.08);}
.role-card[data-accent="green"] .role-av{background:rgba(15,255,160,.12);color:var(--green);}
.role-card[data-accent="blue"] .role-av{background:rgba(77,143,255,.12);color:var(--blue);}
.role-card[data-accent="amber"] .role-av{background:rgba(251,191,36,.12);color:var(--amber);}
.role-title{font-family:var(--display);font-size:16px;font-weight:700;margin-bottom:8px;color:var(--tx);}
.role-desc{font-size:13px;color:var(--tx2);line-height:1.7;}

/* ────────────────── BY BAR ────────────────── */
.by-bar{
  border-top:.5px solid var(--border);border-bottom:.5px solid var(--border);
  padding:32px 48px;
  display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;
  text-align:center;
}
.by-text{font-size:12.5px;color:var(--tx3);}
.by-card{
  display:inline-flex;align-items:center;gap:12px;
  background:var(--surface);border:.5px solid var(--border);
  border-radius:100px;padding:9px 18px;text-decoration:none;
  transition:all var(--ease);
}
.by-card:hover{border-color:var(--border-green);background:var(--green-glow);transform:translateY(-2px);}
.by-badge{
  background:var(--green);color:#021a0e;
  font-family:var(--display);font-size:9.5px;font-weight:800;
  letter-spacing:1.2px;text-transform:uppercase;padding:3px 9px;border-radius:100px;
}
.by-name{display:block;font-size:13px;font-weight:500;color:var(--tx);}
.by-sub{display:block;font-size:11px;color:var(--tx2);}

/* ────────────────── CTA ────────────────── */
.cta-section{padding:0 48px 80px;}
.cta-inner{
  border-radius:var(--r-xl);padding:80px 64px;text-align:center;
  position:relative;overflow:hidden;
  background:linear-gradient(135deg,#072818 0%,#050d1f 45%,#0b0e2f 100%);
  border:.5px solid rgba(15,255,160,.22);
}
.cta-glow{position:absolute;border-radius:50%;pointer-events:none;filter:blur(90px);}
.cta-glow-a{width:380px;height:380px;background:var(--green);opacity:.12;top:-130px;left:-80px;}
.cta-glow-b{width:280px;height:280px;background:var(--blue);opacity:.12;bottom:-80px;right:8%;}
.cta-glow-c{width:220px;height:220px;background:var(--purple);opacity:.1;top:-50px;right:28%;}
.cta-h2{
  font-family:var(--display);font-size:clamp(28px,4.5vw,46px);font-weight:800;
  letter-spacing:-1.5px;margin-bottom:14px;position:relative;z-index:2;
  color:var(--tx);
}
.cta-sub{font-size:15px;color:var(--tx2);margin-bottom:36px;position:relative;z-index:2;}
.cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative;z-index:2;}

/* ────────────────── FOOTER ────────────────── */
.footer{
  padding:24px 48px;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;
  border-top:.5px solid var(--border);
}
.footer-left{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.footer-copy,.footer-by{font-size:12px;color:var(--tx3);}
.footer-by a{color:var(--green);font-weight:500;text-decoration:none;}
.footer-by a:hover{text-decoration:underline;}
.footer-nav{display:flex;gap:18px;}
.footer-nav a{font-size:12px;color:var(--tx3);text-decoration:none;transition:color var(--ease);}
.footer-nav a:hover{color:var(--tx2);}

/* ────────────────── RESPONSIVE ────────────────── */
@media(max-width:1024px){
  .feat-grid{grid-template-columns:repeat(2,1fr);}
  .nav-links,.nav-by{display:none;}
}
@media(max-width:768px){
  .nav{padding:12px 18px;}
  .hamburger{display:flex;}
  .nav-cta{display:none;}
  .hero{padding:64px 18px 52px;min-height:auto;}
  .hero-h1{letter-spacing:-1.5px;}
  .hero-sub{font-size:15px;}
  .stats-row{flex-direction:column;border-radius:var(--r-md);}
  .stat{border-right:none;border-bottom:.5px solid var(--border);padding:14px 18px;}
  .stat:last-child{border-bottom:none;}
  .section{padding:64px 0;}
  .container{padding:0 18px;}
  .feat-grid{grid-template-columns:1fr;gap:10px;}
  .hiw-layout{flex-direction:column;gap:36px;}
  .hiw-left{flex:none;text-align:center;}
  .hiw-left .lead{margin:0 auto;}
  .hiw-left .btn-primary{margin:32px auto 0;display:inline-flex;}
  .roles-grid{grid-template-columns:1fr;max-width:400px;margin:0 auto;}
  .by-bar{padding:24px 18px;flex-direction:column;}
  .cta-section{padding:0 18px 56px;}
  .cta-inner{padding:52px 24px;border-radius:var(--r-lg);}
  .footer{padding:20px 18px;flex-direction:column;align-items:flex-start;gap:10px;}
}
@media(max-width:480px){
  .hero-actions .btn-primary,.hero-actions .btn-ghost{width:100%;justify-content:center;}
  .stats-row{max-width:100%;}
  .cta-actions .btn-primary,.cta-actions .btn-ghost{width:100%;justify-content:center;}
  .roles-grid{max-width:100%;}
  .hero-h1{letter-spacing:-1px;}
}
`;

export default Index;
