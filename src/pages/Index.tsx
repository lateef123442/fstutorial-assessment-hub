import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const cnt1Ref = useRef<HTMLSpanElement>(null);
  const cnt2Ref = useRef<HTMLSpanElement>(null);
  const cnt3Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkAuth();
  }, [navigate]);

  // Intersection observer for scroll-in animations
  useEffect(() => {
    const els = document.querySelectorAll(".pn-anim");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("pn-visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Animated counters
  useEffect(() => {
    const animCount = (
      el: HTMLSpanElement | null,
      target: number,
      suffix: string,
      duration: number
    ) => {
      if (!el) return;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(ease * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const t = setTimeout(() => {
      animCount(cnt1Ref.current, 1200, "+", 1800);
      animCount(cnt2Ref.current, 8400, "+", 2000);
      animCount(cnt3Ref.current, 94, "%", 1600);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pn-root">
      <style>{`
        .pn-root {
          font-family: 'Inter', system-ui, sans-serif;
          background: #050d1a;
          color: #ffffff;
          overflow-x: hidden;
        }
        /* NAV */
        .pn-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 0.5px solid rgba(255,255,255,0.08);
          position: sticky; top: 0; z-index: 100;
          background: rgba(5,13,26,0.85); backdrop-filter: blur(16px);
        }
        .pn-logo { display: flex; align-items: center; gap: 10px; }
        .pn-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #1dd9a0 0%, #0f8f6a 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .pn-logo-name { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .pn-logo-sub  { font-size: 10px; color: #6b9a8a; letter-spacing: 1.5px; text-transform: uppercase; }
        .pn-nav-links { display: flex; gap: 28px; }
        .pn-nav-links a { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); text-decoration: none; transition: color .2s; }
        .pn-nav-links a:hover { color: #fff; }
        .pn-nav-btn {
          background: #1dd9a0; color: #03120d;
          border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background .2s, transform .15s;
        }
        .pn-nav-btn:hover { background: #25f0b2; transform: translateY(-1px); }

        /* HERO */
        .pn-hero {
          position: relative; padding: 80px 40px 60px;
          text-align: center; overflow: hidden; min-height: 560px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .pn-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .pn-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.28;
          pointer-events: none; animation: orbFloat 8s ease-in-out infinite;
        }
        .pn-orb1 { width: 400px; height: 400px; background: #1dd9a0; top: -120px; left: -80px; animation-delay: 0s; }
        .pn-orb2 { width: 320px; height: 320px; background: #0a4fde; top: -60px; right: -60px; animation-delay: -3s; }
        .pn-orb3 { width: 240px; height: 240px; background: #7c3ddb; bottom: -60px; left: 30%; animation-delay: -5s; }
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(20px,-15px) scale(1.05); }
          66%      { transform: translate(-15px,10px) scale(0.97); }
        }
        .pn-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(29,217,160,0.12); border: 0.5px solid rgba(29,217,160,0.35);
          color: #1dd9a0; border-radius: 100px;
          padding: 5px 14px; font-size: 11px; font-weight: 600;
          letter-spacing: 0.8px; text-transform: uppercase;
          margin-bottom: 24px; position: relative; z-index: 2;
          animation: fadeSlideUp .6s ease both;
        }
        .pn-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #1dd9a0; animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .pn-hero-title {
          font-size: clamp(36px, 6vw, 68px); font-weight: 900;
          line-height: 1.08; letter-spacing: -2px;
          position: relative; z-index: 2; max-width: 820px;
          animation: fadeSlideUp .7s .1s ease both;
        }
        .pn-grad-text {
          background: linear-gradient(135deg, #1dd9a0 0%, #5be8c4 40%, #a5f3e0 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pn-hero-sub {
          margin-top: 20px; font-size: 17px; font-weight: 400;
          color: rgba(255,255,255,0.55); max-width: 520px; line-height: 1.7;
          position: relative; z-index: 2;
          animation: fadeSlideUp .7s .2s ease both;
        }
        .pn-hero-cta {
          margin-top: 36px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 2; animation: fadeSlideUp .7s .3s ease both;
        }
        .pn-btn-primary {
          background: #1dd9a0; color: #03120d;
          border: none; border-radius: 10px;
          padding: 13px 28px; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 8px;
        }
        .pn-btn-primary:hover { background: #25f0b2; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(29,217,160,0.3); }
        .pn-btn-ghost {
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85);
          border: 0.5px solid rgba(255,255,255,0.15); border-radius: 10px;
          padding: 13px 28px; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all .2s;
        }
        .pn-btn-ghost:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

        /* STATS */
        .pn-stats {
          display: flex; justify-content: center;
          margin-top: 52px; position: relative; z-index: 2;
          animation: fadeSlideUp .7s .45s ease both;
          border: 0.5px solid rgba(255,255,255,0.1); border-radius: 14px;
          background: rgba(255,255,255,0.04); backdrop-filter: blur(10px);
          max-width: 580px; width: 100%;
        }
        .pn-stat { flex: 1; padding: 18px 20px; text-align: center; border-right: 0.5px solid rgba(255,255,255,0.08); }
        .pn-stat:last-child { border-right: none; }
        .pn-stat-num { font-size: 24px; font-weight: 800; color: #1dd9a0; letter-spacing: -1px; }
        .pn-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }

        /* SECTIONS */
        .pn-section { padding: 80px 40px; }
        .pn-section-label {
          display: inline-block; font-size: 11px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; color: #1dd9a0; margin-bottom: 12px;
        }
        .pn-section-title {
          font-size: clamp(26px, 4vw, 40px); font-weight: 800;
          letter-spacing: -1px; line-height: 1.15; margin-bottom: 10px;
        }
        .pn-section-sub { font-size: 15px; color: rgba(255,255,255,0.45); line-height: 1.7; margin-bottom: 48px; }

        /* FEATURE CARDS */
        .pn-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 16px; }
        .pn-feat-card {
          background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px 24px;
          transition: all .3s; position: relative; overflow: hidden;
        }
        .pn-feat-card::before {
          content: ''; position: absolute; inset: 0; opacity: 0;
          background: linear-gradient(135deg, rgba(29,217,160,0.07) 0%, transparent 60%);
          transition: opacity .3s; border-radius: 16px;
        }
        .pn-feat-card:hover { transform: translateY(-4px); border-color: rgba(29,217,160,0.25); }
        .pn-feat-card:hover::before { opacity: 1; }
        .pn-feat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .pn-feat-icon-teal   { background: rgba(29,217,160,0.15); }
        .pn-feat-icon-blue   { background: rgba(55,138,221,0.15); }
        .pn-feat-icon-purple { background: rgba(124,61,219,0.15); }
        .pn-feat-icon-amber  { background: rgba(239,159,39,0.15); }
        .pn-feat-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; color: #fff; }
        .pn-feat-desc  { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.65; }

        /* HOW IT WORKS */
        .pn-steps { display: flex; flex-direction: column; }
        .pn-step { display: flex; gap: 20px; align-items: flex-start; padding-bottom: 32px; position: relative; }
        .pn-step:not(:last-child)::after {
          content: ''; position: absolute; left: 19px; top: 40px; bottom: 0; width: 1px;
          background: linear-gradient(to bottom, rgba(29,217,160,0.3), transparent);
        }
        .pn-step-num {
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          background: rgba(29,217,160,0.12); border: 0.5px solid rgba(29,217,160,0.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: #1dd9a0;
        }
        .pn-step-title { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
        .pn-step-text  { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.65; }

        /* ROLES */
        .pn-roles-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 16px; max-width: 840px; margin: 0 auto;
        }
        @media (max-width: 600px) { .pn-roles-grid { grid-template-columns: 1fr; } }
        .pn-role-card {
          border-radius: 16px; padding: 32px 24px; text-align: center;
          border: 0.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          transition: all .3s;
        }
        .pn-role-card:hover { transform: translateY(-4px); border-color: rgba(29,217,160,0.2); background: rgba(29,217,160,0.04); }
        .pn-role-avatar {
          width: 60px; height: 60px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 800; margin: 0 auto 16px;
        }
        .pn-role-avatar-teal  { background: rgba(29,217,160,0.15); color: #1dd9a0; }
        .pn-role-avatar-blue  { background: rgba(55,138,221,0.15); color: #5ba8f0; }
        .pn-role-avatar-amber { background: rgba(239,159,39,0.15);  color: #f0b429; }
        .pn-role-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .pn-role-desc  { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.65; }

        /* CTA */
        .pn-cta-section {
          margin: 60px 40px; border-radius: 20px;
          background: linear-gradient(135deg, #0d2e22 0%, #061a1a 50%, #0a1229 100%);
          border: 0.5px solid rgba(29,217,160,0.2);
          padding: 60px 48px; text-align: center;
          position: relative; overflow: hidden;
        }
        .pn-cta-orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(70px); opacity: 0.3; }
        .pn-cta-orb1 { width: 300px; height: 300px; background: #1dd9a0; top: -100px; left: -60px; }
        .pn-cta-orb2 { width: 200px; height: 200px; background: #0a4fde; bottom: -60px; right: 10%; }
        .pn-cta-title { font-size: clamp(24px,4vw,38px); font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; position: relative; z-index: 2; }
        .pn-cta-sub   { font-size: 15px; color: rgba(255,255,255,0.5); margin-bottom: 32px; position: relative; z-index: 2; }

        /* FOOTER */
        .pn-footer {
          padding: 32px 40px; border-top: 0.5px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
        }
        .pn-footer-copy { font-size: 12px; color: rgba(255,255,255,0.25); }
        .pn-footer-links { display: flex; gap: 20px; }
        .pn-footer-links a { font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; }
        .pn-footer-links a:hover { color: #1dd9a0; }

        /* ANIMATIONS */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pn-anim { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
        .pn-anim.pn-visible { opacity: 1; transform: none; }
        .pn-d1 { transition-delay: .1s; }
        .pn-d2 { transition-delay: .2s; }
        .pn-d3 { transition-delay: .3s; }
        .pn-d4 { transition-delay: .4s; }
      `}</style>

      {/* NAV */}
      <nav className="pn-nav">
        <div className="pn-logo">
          <div className="pn-logo-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 5 5 5 10C5 13.866 7.134 16 10 16C12.866 16 15 13.866 15 10C15 5 10 2 10 2Z" fill="white" opacity="0.9"/>
              <circle cx="10" cy="10" r="2.5" fill="white"/>
              <path d="M10 13v3M7 15l3-2 3 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="pn-logo-name">Physio Nexus</div>
            <div className="pn-logo-sub">CBT Platform</div>
          </div>
        </div>
        <div className="pn-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </div>
        <button className="pn-nav-btn" onClick={() => navigate("/login")}>Login →</button>
      </nav>

      {/* HERO */}
      <section className="pn-hero">
        <div className="pn-orb pn-orb1" />
        <div className="pn-orb pn-orb2" />
        <div className="pn-orb pn-orb3" />
        <div className="pn-grid" />

        <div className="pn-badge"><span className="pn-badge-dot" /> Built for physiotherapy students</div>

        <h1 className="pn-hero-title">
          Ace your exams with<br /><span className="pn-grad-text">Physio Nexus</span>
        </h1>
        <p className="pn-hero-sub">
          The advanced CBT platform built specifically for physiotherapy students — timed assessments, instant results, and real analytics.
        </p>

        <div className="pn-hero-cta">
          <button className="pn-btn-primary" onClick={() => navigate("/login")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L14.5 8L8 14.5M14.5 8H1.5" stroke="#03120d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Start learning
          </button>
          <button className="pn-btn-ghost" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            See how it works
          </button>
        </div>

        <div className="pn-stats">
          <div className="pn-stat">
            <div className="pn-stat-num"><span ref={cnt1Ref}>0+</span></div>
            <div className="pn-stat-label">Students enrolled</div>
          </div>
          <div className="pn-stat">
            <div className="pn-stat-num"><span ref={cnt2Ref}>0+</span></div>
            <div className="pn-stat-label">Assessments taken</div>
          </div>
          <div className="pn-stat">
            <div className="pn-stat-num"><span ref={cnt3Ref}>0%</span></div>
            <div className="pn-stat-label">Pass rate</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="pn-section" id="features">
        <div className="pn-anim" style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="pn-section-label">Why choose us</span>
          <h2 className="pn-section-title">Everything you need to excel</h2>
          <p className="pn-section-sub" style={{ maxWidth: 480, margin: "0 auto 0" }}>
            Purpose-built tools that make studying physiology, anatomy, and biomechanics actually effective.
          </p>
        </div>
        <div className="pn-features-grid">
          {[
            { color: "teal", title: "Comprehensive assessments", desc: "Multiple-choice questions, timed tests, and instant auto-grading — covering every physio module.", icon: (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill="#1dd9a0"/><rect x="12" y="3" width="7" height="7" rx="2" fill="#1dd9a0" opacity=".5"/><rect x="3" y="12" width="7" height="7" rx="2" fill="#1dd9a0" opacity=".5"/><rect x="12" y="12" width="7" height="7" rx="2" fill="#1dd9a0" opacity=".25"/></svg>
            )},
            { color: "blue", title: "Timed CBT environment", desc: "Real exam simulation with countdown timers, anti-tab violations, and automatic submission.", icon: (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#5ba8f0" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="#5ba8f0" strokeWidth="1.5" strokeLinecap="round"/></svg>
            )},
            { color: "purple", title: "Analytics & performance", desc: "Track scores, identify weak areas, and monitor improvement across all subjects over time.", icon: (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 16l4-4 3 3 4-5 3 3" stroke="#b07ef5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="16" height="16" rx="3" stroke="#b07ef5" strokeWidth="1.2"/></svg>
            )},
            { color: "amber", title: "Instant results & email", desc: "Scores are calculated server-side and delivered immediately with detailed breakdowns by email.", icon: (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2.5 5.5H19l-4.5 3.5 1.5 5.5L11 14l-5 3.5 1.5-5.5L3 8.5h5.5L11 3z" fill="#f0b429" opacity="0.8"/></svg>
            )},
          ].map((f, i) => (
            <div key={f.title} className={`pn-feat-card pn-anim pn-d${i + 1}`}>
              <div className={`pn-feat-icon pn-feat-icon-${f.color}`}>{f.icon}</div>
              <div className="pn-feat-title">{f.title}</div>
              <div className="pn-feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pn-section" id="how-it-works" style={{ background: "rgba(255,255,255,0.015)", borderTop: "0.5px solid rgba(255,255,255,0.05)", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 80, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="pn-anim">
              <span className="pn-section-label">How it works</span>
              <h2 className="pn-section-title">Simple, fast,<br />effective</h2>
              <p className="pn-section-sub">From registration to results in minutes. No setup headaches.</p>
            </div>
          </div>
          <div className="pn-steps" style={{ flex: 1.4, minWidth: 260 }}>
            {[
              { title: "Register & get assigned", text: "An admin creates your account and assigns you to the right subjects and cohorts." },
              { title: "Receive your assessment link", text: "Your teacher publishes a timed test. Access it directly from your student dashboard." },
              { title: "Take the CBT exam", text: "Answer questions with the JAMB-style navigator, manage time, and submit confidently." },
              { title: "Get your results instantly", text: "Scores are calculated server-side and delivered immediately — no waiting, no guessing." },
            ].map((s, i) => (
              <div key={s.title} className={`pn-step pn-anim pn-d${i + 1}`}>
                <div className="pn-step-num">{i + 1}</div>
                <div>
                  <div className="pn-step-title">{s.title}</div>
                  <div className="pn-step-text">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="pn-section" id="roles" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }} className="pn-anim">
          <span className="pn-section-label">Platform roles</span>
          <h2 className="pn-section-title">Built for everyone</h2>
        </div>
        <div className="pn-roles-grid">
          {[
            { letter: "A", color: "teal",  title: "Administrators", desc: "Manage teachers, students, subjects, and view institution-wide analytics." },
            { letter: "T", color: "blue",  title: "Teachers",       desc: "Create assessments, upload questions, and monitor student performance per cohort." },
            { letter: "S", color: "amber", title: "Students",       desc: "Take timed exams, view past results, and track your academic progress over time." },
          ].map((r, i) => (
            <div key={r.title} className={`pn-role-card pn-anim pn-d${i + 1}`}>
              <div className={`pn-role-avatar pn-role-avatar-${r.color}`}>{r.letter}</div>
              <div className="pn-role-title">{r.title}</div>
              <div className="pn-role-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="pn-cta-section pn-anim">
        <div className="pn-cta-orb pn-cta-orb1" />
        <div className="pn-cta-orb pn-cta-orb2" />
        <h2 className="pn-cta-title">Ready to transform how you study?</h2>
        <p className="pn-cta-sub">Join Physio Nexus and experience the future of physiotherapy education.</p>
        <button className="pn-btn-primary" style={{ margin: "0 auto", position: "relative", zIndex: 2 }} onClick={() => navigate("/login")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14.5 8L8 14.5M14.5 8H1.5" stroke="#03120d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Get started now
        </button>
      </div>

      {/* FOOTER */}
      <footer className="pn-footer">
        <div className="pn-footer-copy">© 2025 Physio Nexus. All rights reserved.</div>
        <div>created by Web Forge <a href="https://ahmed-portfolio-nine-sable.vercel.app/">Ahmed Abdullateef</a></div>
        <div className="pn-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
