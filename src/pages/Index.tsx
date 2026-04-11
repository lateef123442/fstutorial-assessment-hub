import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PORTFOLIO_URL = "https://ahmed-portfolio-nine-sable.vercel.app/";

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

  useEffect(() => {
    const els = document.querySelectorAll(".pn-anim");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("pn-visible"); }),
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const animCount = (el: HTMLSpanElement | null, target: number, suffix: string, duration: number) => {
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
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const toggleMenu = () => {
    const m = document.getElementById("pn-mob");
    if (m) m.classList.toggle("open");
  };

  return (
    <div className="pn-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --g:#0fffa0;--gd:#0dd980;--gg:rgba(15,255,160,0.18);--gs:rgba(15,255,160,0.07);
          --bl:#3d7eff;--pu:#9b5de5;--am:#ffb347;
          --bg:#030b15;--bg2:#061220;--sf:rgba(255,255,255,0.04);
          --bo:rgba(255,255,255,0.08);--bog:rgba(15,255,160,0.22);
          --tx:#ffffff;--txm:rgba(255,255,255,0.45);--txh:rgba(255,255,255,0.22);
          --fd:'Syne',sans-serif;--fb:'DM Sans',sans-serif;
          --rsm:10px;--rmd:16px;--rlg:24px;--rxl:32px;
        }
        .pn-root{font-family:var(--fb);background:var(--bg);color:var(--tx);overflow-x:hidden;min-height:100vh;}

        /* MARQUEE */
        .pn-strip{background:var(--g);padding:9px 0;overflow:hidden;white-space:nowrap;}
        .pn-strip-inner{display:inline-flex;animation:marquee 30s linear infinite;}
        .pn-strip-item{display:inline-flex;align-items:center;gap:10px;font-family:var(--fd);font-size:11px;font-weight:700;color:#03120d;letter-spacing:1.5px;text-transform:uppercase;padding:0 28px;}
        .pn-strip-dot{width:4px;height:4px;border-radius:50%;background:#03120d;opacity:0.35;flex-shrink:0;}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        /* NAV */
        .pn-nav{
          display:flex;align-items:center;justify-content:space-between;
          padding:16px 48px;border-bottom:0.5px solid var(--bo);
          position:sticky;top:0;z-index:200;
          background:rgba(3,11,21,0.92);backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
        }
        .pn-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .pn-logo-mark{
          width:38px;height:38px;border-radius:11px;flex-shrink:0;
          background:var(--g);display:flex;align-items:center;justify-content:center;
          position:relative;overflow:hidden;
        }
        .pn-logo-mark::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.28) 0%,transparent 60%);}
        .pn-logo-name{font-family:var(--fd);font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.4px;line-height:1;}
        .pn-logo-sub{font-size:9px;color:var(--g);letter-spacing:2.5px;text-transform:uppercase;font-weight:500;}
        .pn-nav-links{display:flex;gap:32px;}
        .pn-nav-links a{font-size:13px;font-weight:500;color:var(--txm);text-decoration:none;transition:color .2s;letter-spacing:0.2px;}
        .pn-nav-links a:hover{color:var(--g);}
        .pn-nav-right{display:flex;align-items:center;gap:12px;}
        .pn-nav-wf{font-size:11px;color:var(--txh);text-decoration:none;transition:color .2s;white-space:nowrap;letter-spacing:0.3px;}
        .pn-nav-wf span{color:var(--g);font-weight:700;}
        .pn-nav-wf:hover{color:var(--txm);}
        .pn-nav-btn{
          background:var(--g);color:#03120d;border:none;border-radius:var(--rsm);
          padding:9px 22px;font-family:var(--fd);font-size:13px;font-weight:700;
          cursor:pointer;transition:all .2s;white-space:nowrap;
        }
        .pn-nav-btn:hover{background:#25ffb0;transform:translateY(-1px);box-shadow:0 8px 24px rgba(15,255,160,0.3);}
        .pn-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none;}
        .pn-hamburger span{display:block;width:22px;height:1.5px;background:var(--tx);border-radius:2px;transition:all .3s;}
        .pn-mobile-menu{
          display:none;position:absolute;top:100%;left:0;right:0;
          background:rgba(3,11,21,0.98);backdrop-filter:blur(24px);
          border-bottom:0.5px solid var(--bo);padding:20px 24px;
          flex-direction:column;gap:4px;z-index:199;
        }
        .pn-mobile-menu.open{display:flex;}
        .pn-mobile-menu a{font-size:15px;color:var(--txm);text-decoration:none;padding:12px 0;border-bottom:0.5px solid var(--bo);}
        .pn-mobile-menu a:last-of-type{border-bottom:none;}
        .pn-mobile-menu a:hover{color:var(--g);}
        .pn-mob-btn{margin-top:12px;width:100%;justify-content:center;}

        /* HERO */
        .pn-hero{
          position:relative;overflow:hidden;
          padding:100px 48px 80px;min-height:640px;
          display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
        }
        .pn-bg-grid{
          position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(var(--bo) 1px,transparent 1px),linear-gradient(90deg,var(--bo) 1px,transparent 1px);
          background-size:52px 52px;
          mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black 40%,transparent 100%);
          -webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black 40%,transparent 100%);
        }
        .pn-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(90px);opacity:0.2;animation:orbDrift 10s ease-in-out infinite;}
        .pn-orb1{width:500px;height:500px;background:var(--g);top:-180px;left:-140px;animation-delay:0s;}
        .pn-orb2{width:380px;height:380px;background:var(--bl);top:-80px;right:-100px;animation-delay:-4s;}
        .pn-orb3{width:300px;height:300px;background:var(--pu);bottom:-80px;left:35%;animation-delay:-7s;}
        @keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(24px,-18px) scale(1.06)}66%{transform:translate(-18px,14px) scale(0.96)}}
        .pn-hero-badge{
          display:inline-flex;align-items:center;gap:8px;
          border:0.5px solid var(--bog);background:var(--gs);
          color:var(--g);border-radius:100px;padding:6px 16px;
          font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
          margin-bottom:28px;position:relative;z-index:2;
          animation:heroIn .6s ease both;
        }
        .pn-bdot{width:6px;height:6px;border-radius:50%;background:var(--g);animation:blink 2s ease-in-out infinite;}
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}
        .pn-hero-h1{
          font-family:var(--fd);font-size:clamp(38px,7vw,76px);font-weight:800;
          line-height:1.05;letter-spacing:-2.5px;
          position:relative;z-index:2;max-width:900px;margin:0 auto;
          animation:heroIn .7s .1s ease both;
        }
        .pn-hero-h1 em{
          font-style:normal;
          background:linear-gradient(120deg,var(--g) 0%,#5ef5c8 50%,#a8ffe4 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .pn-outline{-webkit-text-stroke:1.5px rgba(255,255,255,0.22);-webkit-text-fill-color:transparent;}
        .pn-hero-sub{
          margin-top:24px;font-size:17px;font-weight:300;
          color:var(--txm);max-width:540px;line-height:1.75;
          position:relative;z-index:2;animation:heroIn .7s .2s ease both;
        }
        .pn-hero-cta{
          margin-top:40px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap;
          position:relative;z-index:2;animation:heroIn .7s .3s ease both;
        }
        .pn-btn-primary{
          background:var(--g);color:#03120d;border:none;border-radius:var(--rsm);
          padding:14px 30px;font-family:var(--fd);font-size:14px;font-weight:700;letter-spacing:0.2px;
          cursor:pointer;transition:all .25s;display:flex;align-items:center;gap:10px;
        }
        .pn-btn-primary:hover{background:#25ffb0;transform:translateY(-3px);box-shadow:0 16px 40px rgba(15,255,160,0.35);}
        .pn-btn-primary:active{transform:translateY(-1px);}
        .pn-btn-ghost{
          background:transparent;color:rgba(255,255,255,0.8);
          border:0.5px solid rgba(255,255,255,0.18);border-radius:var(--rsm);
          padding:14px 30px;font-size:14px;font-weight:400;
          cursor:pointer;transition:all .25s;display:flex;align-items:center;gap:8px;text-decoration:none;
        }
        .pn-btn-ghost:hover{border-color:var(--bog);color:var(--g);transform:translateY(-3px);}

        /* STATS */
        .pn-stats{
          display:flex;margin-top:56px;position:relative;z-index:2;
          animation:heroIn .7s .45s ease both;
          border:0.5px solid var(--bo);border-radius:var(--rlg);
          background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);
          max-width:600px;width:100%;overflow:hidden;
        }
        .pn-stat{flex:1;padding:20px 24px;text-align:center;border-right:0.5px solid var(--bo);position:relative;}
        .pn-stat::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:2px;background:var(--g);transition:width .4s ease;border-radius:2px;}
        .pn-stat:hover::after{width:60%;}
        .pn-stat:last-child{border-right:none;}
        .pn-stat-num{font-family:var(--fd);font-size:26px;font-weight:800;color:var(--g);letter-spacing:-1.5px;line-height:1;}
        .pn-stat-label{font-size:11px;color:var(--txh);margin-top:4px;letter-spacing:0.3px;}

        /* hero credit */
        .pn-hero-credit{
          margin-top:32px;position:relative;z-index:2;animation:heroIn .7s .55s ease both;
          font-size:11px;color:var(--txh);display:flex;align-items:center;gap:6px;
        }
        .pn-hero-credit a{color:var(--g);font-weight:600;text-decoration:none;}
        .pn-hero-credit a:hover{text-decoration:underline;}
        @keyframes heroIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}

        /* SECTIONS */
        .pn-section{padding:96px 48px;}
        .pn-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--g);margin-bottom:14px;}
        .pn-eyebrow::before{content:'';display:inline-block;width:20px;height:1.5px;background:var(--g);}
        .pn-h2{font-family:var(--fd);font-size:clamp(28px,4.5vw,46px);font-weight:800;letter-spacing:-1.5px;line-height:1.1;margin-bottom:14px;}
        .pn-lead{font-size:16px;color:var(--txm);line-height:1.75;max-width:500px;}
        .pn-divider{height:0.5px;background:linear-gradient(90deg,transparent 0%,var(--bo) 20%,var(--bo) 80%,transparent 100%);margin:0 48px;}

        /* FEATURES */
        .pn-feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:52px;}
        .pn-feat-card{
          background:var(--sf);border:0.5px solid var(--bo);border-radius:var(--rmd);padding:28px 22px;
          transition:all .35s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;cursor:default;
        }
        .pn-feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,var(--g),transparent);opacity:0;transition:opacity .35s;}
        .pn-feat-card:hover{transform:translateY(-6px);border-color:var(--bog);background:rgba(15,255,160,0.04);}
        .pn-feat-card:hover::before{opacity:1;}
        .pn-feat-ico{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
        .ic-g{background:rgba(15,255,160,0.12);}.ic-b{background:rgba(61,126,255,0.12);}.ic-p{background:rgba(155,93,229,0.12);}.ic-a{background:rgba(255,179,71,0.12);}
        .pn-feat-title{font-family:var(--fd);font-size:14px;font-weight:700;margin-bottom:8px;}
        .pn-feat-desc{font-size:12.5px;color:var(--txm);line-height:1.65;}

        /* HOW IT WORKS */
        .pn-hiw{display:flex;gap:80px;flex-wrap:wrap;align-items:flex-start;max-width:1080px;margin:0 auto;}
        .pn-hiw-l{flex:1;min-width:220px;}
        .pn-hiw-r{flex:1.5;min-width:280px;margin-top:8px;}
        .pn-steps{display:flex;flex-direction:column;}
        .pn-step{display:flex;gap:20px;padding-bottom:36px;position:relative;align-items:flex-start;}
        .pn-step:not(:last-child)::after{content:'';position:absolute;left:19px;top:42px;bottom:0;width:1px;background:linear-gradient(to bottom,rgba(15,255,160,0.35) 0%,transparent 100%);}
        .pn-step-n{
          width:40px;height:40px;border-radius:50%;flex-shrink:0;
          background:rgba(15,255,160,0.1);border:0.5px solid rgba(15,255,160,0.3);
          display:flex;align-items:center;justify-content:center;
          font-family:var(--fd);font-size:14px;font-weight:800;color:var(--g);transition:all .3s;
        }
        .pn-step:hover .pn-step-n{background:rgba(15,255,160,0.2);border-color:var(--g);}
        .pn-step-title{font-family:var(--fd);font-size:14px;font-weight:700;margin-bottom:5px;}
        .pn-step-text{font-size:13px;color:var(--txm);line-height:1.65;}

        /* ROLES */
        .pn-roles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:52px auto 0;}
        .pn-role-card{
          border-radius:var(--rmd);padding:36px 28px;text-align:center;
          border:0.5px solid var(--bo);background:var(--sf);
          transition:all .35s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;
        }
        .pn-role-card::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(15,255,160,0.06) 0%,transparent 70%);opacity:0;transition:opacity .35s;}
        .pn-role-card:hover{transform:translateY(-6px);border-color:var(--bog);}
        .pn-role-card:hover::after{opacity:1;}
        .pn-role-av{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:24px;font-weight:800;margin:0 auto 18px;transition:transform .3s;}
        .pn-role-card:hover .pn-role-av{transform:scale(1.1);}
        .av-g{background:rgba(15,255,160,0.12);color:var(--g);}
        .av-b{background:rgba(61,126,255,0.12);color:#6e9fff;}
        .av-a{background:rgba(255,179,71,0.12);color:var(--am);}
        .pn-role-title{font-family:var(--fd);font-size:16px;font-weight:700;margin-bottom:8px;}
        .pn-role-desc{font-size:13px;color:var(--txm);line-height:1.65;}

        /* WEB FORGE BAR */
        .pn-built-bar{
          border-top:0.5px solid var(--bo);border-bottom:0.5px solid var(--bo);
          padding:36px 48px;display:flex;align-items:center;justify-content:center;
          gap:24px;flex-wrap:wrap;text-align:center;
        }
        .pn-built-text{font-size:13px;color:var(--txh);}
        .pn-built-card{
          display:inline-flex;align-items:center;gap:12px;
          background:var(--sf);border:0.5px solid var(--bo);
          border-radius:100px;padding:10px 20px;text-decoration:none;transition:all .25s;
        }
        .pn-built-card:hover{border-color:var(--bog);background:var(--gs);transform:translateY(-2px);}
        .pn-wf-badge{background:var(--g);color:#03120d;font-family:var(--fd);font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:100px;}
        .pn-wf-name{font-size:13px;font-weight:500;color:var(--tx);}
        .pn-wf-sub{font-size:11px;color:var(--txm);}

        /* CTA */
        .pn-cta-wrap{padding:0 48px 80px;}
        .pn-cta-inner{
          border-radius:var(--rxl);padding:72px 60px;text-align:center;
          position:relative;overflow:hidden;
          background:linear-gradient(135deg,#0a2e1f 0%,#061520 40%,#0b1235 100%);
          border:0.5px solid var(--bog);
        }
        .pn-cta-glow{position:absolute;border-radius:50%;pointer-events:none;filter:blur(80px);}
        .cg1{width:360px;height:360px;background:var(--g);opacity:.13;top:-120px;left:-80px;}
        .cg2{width:260px;height:260px;background:var(--bl);opacity:.13;bottom:-80px;right:8%;}
        .cg3{width:200px;height:200px;background:var(--pu);opacity:.11;top:-40px;right:30%;}
        .pn-cta-h2{font-family:var(--fd);font-size:clamp(26px,4.5vw,44px);font-weight:800;letter-spacing:-1.5px;margin-bottom:14px;position:relative;z-index:2;}
        .pn-cta-sub{font-size:15px;color:var(--txm);margin-bottom:36px;position:relative;z-index:2;}
        .pn-cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative;z-index:2;}

        /* FOOTER */
        .pn-footer{padding:28px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;}
        .pn-footer-left{display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
        .pn-footer-copy{font-size:12px;color:var(--txh);}
        .pn-footer-by{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txh);}
        .pn-footer-by a{color:var(--g);font-weight:600;text-decoration:none;}
        .pn-footer-by a:hover{text-decoration:underline;}
        .pn-footer-links{display:flex;gap:20px;}
        .pn-footer-links a{font-size:12px;color:var(--txh);text-decoration:none;transition:color .2s;}
        .pn-footer-links a:hover{color:var(--g);}

        /* ANIM */
        .pn-anim{opacity:0;transform:translateY(28px);transition:opacity .65s ease,transform .65s ease;}
        .pn-anim.pn-visible{opacity:1;transform:none;}
        .pn-d1{transition-delay:.1s}.pn-d2{transition-delay:.2s}.pn-d3{transition-delay:.3s}.pn-d4{transition-delay:.4s}

        /* RESPONSIVE */
        @media(max-width:1024px){
          .pn-feat-grid{grid-template-columns:repeat(2,1fr);}
          .pn-nav-links{display:none;}
          .pn-nav-wf{display:none;}
        }
        @media(max-width:768px){
          .pn-nav{padding:14px 20px;}
          .pn-hamburger{display:flex;}
          .pn-nav-btn{display:none;}
          .pn-hero{padding:60px 20px 48px;min-height:auto;}
          .pn-hero-h1{letter-spacing:-1.5px;}
          .pn-hero-sub{font-size:15px;}
          .pn-stats{flex-direction:column;border-radius:var(--rmd);}
          .pn-stat{border-right:none;border-bottom:0.5px solid var(--bo);padding:16px 20px;}
          .pn-stat:last-child{border-bottom:none;}
          .pn-section{padding:60px 20px;}
          .pn-feat-grid{grid-template-columns:1fr;gap:12px;}
          .pn-hiw{gap:40px;}
          .pn-roles-grid{grid-template-columns:1fr;max-width:420px;}
          .pn-cta-wrap{padding:0 20px 60px;}
          .pn-cta-inner{padding:48px 24px;border-radius:var(--rlg);}
          .pn-built-bar{padding:28px 20px;flex-direction:column;}
          .pn-footer{padding:24px 20px;flex-direction:column;align-items:flex-start;gap:12px;}
          .pn-divider{margin:0 20px;}
          .pn-hero-badge{font-size:10px;padding:5px 12px;}
        }
        @media(max-width:480px){
          .pn-hero-h1{letter-spacing:-1px;}
          .pn-hero-cta{gap:10px;}
          .pn-btn-primary,.pn-btn-ghost{width:100%;justify-content:center;}
          .pn-stats{max-width:100%;}
          .pn-cta-btns .pn-btn-primary,.pn-cta-btns .pn-btn-ghost{width:100%;justify-content:center;}
          .pn-roles-grid{max-width:100%;}
          .pn-feat-grid{grid-template-columns:1fr;}
        }
      `}</style>

      {/* MARQUEE STRIP */}
      <div className="pn-strip" aria-hidden="true">
        <div className="pn-strip-inner">
          {[0, 1].map((gi) => (
            <span key={gi}>
              {["Physiotherapy CBT","Instant Results","JAMB-Style Navigator","Timed Assessments","Built for Students","Physio Nexus","Track Your Progress","Ace Your Exams"].map((t, i) => (
                <span key={i} className="pn-strip-item">{t}<span className="pn-strip-dot" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <nav className="pn-nav">
        <a className="pn-logo" href="#">
          <div className="pn-logo-mark">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 5 5 5 10C5 13.866 7.134 16 10 16C12.866 16 15 13.866 15 10C15 5 10 2 10 2Z" fill="#03120d" opacity="0.9"/>
              <circle cx="10" cy="10" r="2.5" fill="#03120d"/>
              <path d="M10 13v3M7 15l3-2 3 2" stroke="#03120d" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="pn-logo-name">Physio Nexus</div>
            <div className="pn-logo-sub">CBT Platform</div>
          </div>
        </a>
        <div className="pn-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </div>
        <div className="pn-nav-right">
          <a className="pn-nav-wf" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
            by <span>Web Forge</span>
          </a>
          <button className="pn-nav-btn" onClick={() => navigate("/login")}>Login →</button>
          <button className="pn-hamburger" aria-label="Menu" onClick={toggleMenu}>
            <span /><span /><span />
          </button>
        </div>
        <div className="pn-mobile-menu" id="pn-mob">
          <a href="#features" onClick={toggleMenu}>Features</a>
          <a href="#how-it-works" onClick={toggleMenu}>How it works</a>
          <a href="#roles" onClick={toggleMenu}>Roles</a>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--g)" }}>Built by Web Forge · Ahmed Abdullateef ↗</a>
          <button className="pn-btn-primary pn-mob-btn" onClick={() => navigate("/login")}>Login to Physio Nexus →</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pn-hero">
        <div className="pn-orb pn-orb1" />
        <div className="pn-orb pn-orb2" />
        <div className="pn-orb pn-orb3" />
        <div className="pn-bg-grid" />
        <div className="pn-hero-badge"><span className="pn-bdot" />Built for physiotherapy students</div>
        <h1 className="pn-hero-h1">
          <span className="pn-outline">Master</span> every exam<br />with <em>Physio Nexus</em>
        </h1>
        <p className="pn-hero-sub">
          The advanced CBT platform built for physio students — timed tests, JAMB-style navigation, instant results, and deep analytics.
        </p>
        <div className="pn-hero-cta">
          <button className="pn-btn-primary" onClick={() => navigate("/login")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 8L8 14.5M14.5 8H1.5" stroke="#03120d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Start for free
          </button>
          <button className="pn-btn-ghost" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            How it works
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
        <div className="pn-hero-credit">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.5 3.3H11L8.3 6.5l1 3.2L6 8 2.7 9.7l1-3.2L1 4.3h3.5L6 1z" fill="currentColor" opacity="0.6"/></svg>
          Crafted by&nbsp;<a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">Web Forge · Ahmed Abdullateef</a>
        </div>
      </section>

      {/* FEATURES */}
      <div className="pn-divider" />
      <section className="pn-section" id="features">
        <div className="pn-anim" style={{ textAlign: "center" }}>
          <div className="pn-eyebrow">Why choose us</div>
          <h2 className="pn-h2">Everything you need to excel</h2>
          <p className="pn-lead" style={{ margin: "0 auto" }}>
            Purpose-built for physio students — from anatomy to biomechanics, every module covered.
          </p>
        </div>
        <div className="pn-feat-grid">
          {[
            { ic:"ic-g", title:"Comprehensive assessments", desc:"MCQs, timed tests, and instant auto-grading across every physio module.", svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill="#0fffa0"/><rect x="12" y="3" width="7" height="7" rx="2" fill="#0fffa0" opacity=".5"/><rect x="3" y="12" width="7" height="7" rx="2" fill="#0fffa0" opacity=".5"/><rect x="12" y="12" width="7" height="7" rx="2" fill="#0fffa0" opacity=".25"/></svg> },
            { ic:"ic-b", title:"Timed CBT environment", desc:"Real exam simulation with countdown timers, tab-violation detection, and auto-submit.", svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#6e9fff" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="#6e9fff" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { ic:"ic-p", title:"Deep analytics", desc:"Track scores, spot weak areas, and monitor improvement across every session.", svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 16l4-4 3 3 4-5 3 3" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="16" height="16" rx="3" stroke="#c084fc" strokeWidth="1.2"/></svg> },
            { ic:"ic-a", title:"Instant results & email", desc:"Server-side scoring delivers your result the moment you submit — zero delay.", svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2.5 5.5H19l-4.5 3.5 1.5 5.5L11 14l-5 3.5 1.5-5.5L3 8.5h5.5L11 3z" fill="#ffb347" opacity="0.85"/></svg> },
          ].map((f, i) => (
            <div key={f.title} className={`pn-feat-card pn-anim pn-d${i + 1}`}>
              <div className={`pn-feat-ico ${f.ic}`}>{f.svg}</div>
              <div className="pn-feat-title">{f.title}</div>
              <div className="pn-feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="pn-divider" />
      <section className="pn-section" id="how-it-works" style={{ background: "rgba(255,255,255,0.012)" }}>
        <div className="pn-hiw">
          <div className="pn-hiw-l">
            <div className="pn-anim">
              <div className="pn-eyebrow">How it works</div>
              <h2 className="pn-h2">Simple.<br />Fast.<br />Effective.</h2>
              <p className="pn-lead">From registration to results in under a minute.</p>
              <button className="pn-btn-primary" style={{ marginTop: 32 }} onClick={() => navigate("/login")}>
                Get started
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#03120d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <div className="pn-hiw-r">
            <div className="pn-steps">
              {[
                { title:"Register & get assigned", text:"An admin creates your account and assigns you to the right subjects and cohorts." },
                { title:"Receive your assessment link", text:"Your teacher publishes a timed test. Access it directly from your student dashboard." },
                { title:"Take the CBT exam", text:"Navigate questions JAMB-style, manage your time, and submit with confidence." },
                { title:"Get your results instantly", text:"Scores are calculated server-side the moment you submit — no waiting, ever." },
              ].map((s, i) => (
                <div key={s.title} className={`pn-step pn-anim pn-d${i + 1}`}>
                  <div className="pn-step-n">{i + 1}</div>
                  <div>
                    <div className="pn-step-title">{s.title}</div>
                    <div className="pn-step-text">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <div className="pn-divider" />
      <section className="pn-section" id="roles">
        <div className="pn-anim" style={{ textAlign: "center" }}>
          <div className="pn-eyebrow">Platform roles</div>
          <h2 className="pn-h2">Built for everyone</h2>
        </div>
        <div className="pn-roles-grid">
          {[
            { letter:"A", av:"av-g", title:"Administrators", desc:"Manage teachers, students, subjects, and view institution-wide performance analytics." },
            { letter:"T", av:"av-b", title:"Teachers",       desc:"Create assessments, manage question banks, and track per-cohort performance." },
            { letter:"S", av:"av-a", title:"Students",       desc:"Take timed exams, view past results, and track your academic progress over time." },
          ].map((r, i) => (
            <div key={r.title} className={`pn-role-card pn-anim pn-d${i + 1}`}>
              <div className={`pn-role-av ${r.av}`}>{r.letter}</div>
              <div className="pn-role-title">{r.title}</div>
              <div className="pn-role-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WEB FORGE BAR */}
      <div className="pn-built-bar pn-anim">
        <span className="pn-built-text">Designed &amp; built by</span>
        <a className="pn-built-card" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          <span className="pn-wf-badge">Web Forge</span>
          <span>
            <div className="pn-wf-name">Ahmed Abdullateef</div>
            <div className="pn-wf-sub">View portfolio ↗</div>
          </span>
        </a>
        <span className="pn-built-text">— Premium web experiences</span>
      </div>

      {/* CTA */}
      <div className="pn-cta-wrap">
        <div className="pn-cta-inner pn-anim">
          <div className="pn-cta-glow cg1" /><div className="pn-cta-glow cg2" /><div className="pn-cta-glow cg3" />
          <h2 className="pn-cta-h2">Ready to transform how<br />you study physiotherapy?</h2>
          <p className="pn-cta-sub">Join Physio Nexus today — it takes less than a minute to get started.</p>
          <div className="pn-cta-btns">
            <button className="pn-btn-primary" onClick={() => navigate("/login")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 8L8 14.5M14.5 8H1.5" stroke="#03120d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Start now — it's free
            </button>
            <a className="pn-btn-ghost" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              Built by Web Forge ↗
            </a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="pn-footer">
        <div className="pn-footer-left">
          <span className="pn-footer-copy">© 2025 Physio Nexus. All rights reserved.</span>
          <span className="pn-footer-by">
            Created by&nbsp;
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">Web Forge · Ahmed Abdullateef</a>
          </span>
        </div>
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
