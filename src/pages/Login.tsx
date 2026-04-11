import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── icon components ─── */
const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <path d="M11 2C11 2 5.5 5.5 5.5 11c0 4.142 2.581 6 5.5 6s5.5-1.858 5.5-6c0-5.5-5.5-9-5.5-9Z" fill="#022010" opacity=".9"/>
    <circle cx="11" cy="11" r="2.8" fill="#022010"/>
    <path d="M11 14v3.5M8 16.5l3-2 3 2" stroke="#022010" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.6 5.3 1 8 1 8s2.5 5 7 5c1.4 0 2.7-.4 3.8-1M6.8 3.1C7.2 3 7.6 3 8 3c4.5 0 7 5 7 5s-.8 1.7-2.2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ animation: "spin .8s linear infinite" }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────── Component ─────────────────────────── */
const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp && formData.password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Logged in successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ln-root">
      <style>{CSS}</style>

      {/* background layers */}
      <div className="ln-bg" aria-hidden="true">
        <div className="ln-grid" />
        <div className="ln-orb ln-orb-a" />
        <div className="ln-orb ln-orb-b" />
        <div className="ln-orb ln-orb-c" />
      </div>

      {/* back to home */}
      <a className="ln-back" href="/" aria-label="Back to homepage">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Home
      </a>

      <main className="ln-main">
        {/* brand */}
        <div className="ln-brand">
          <div className="ln-logo-mark">
            <LogoIcon />
          </div>
          <div>
            <div className="ln-brand-name">Physio Nexus</div>
            <div className="ln-brand-sub">CBT Platform</div>
          </div>
        </div>

        {/* card */}
        <div className="ln-card">
          {/* card header */}
          <div className="ln-card-head">
            <h1 className="ln-card-title">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="ln-card-desc">
              {isSignUp
                ? "Sign up to get started with Physio Nexus"
                : "Sign in to continue to your dashboard"}
            </p>
          </div>

          {/* mode toggle tabs */}
          <div className="ln-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={!isSignUp}
              className={`ln-tab ${!isSignUp ? "ln-tab-active" : ""}`}
              onClick={() => setIsSignUp(false)}
              type="button"
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={isSignUp}
              className={`ln-tab ${isSignUp ? "ln-tab-active" : ""}`}
              onClick={() => setIsSignUp(true)}
              type="button"
            >
              Sign up
            </button>
          </div>

          {/* form */}
          <form className="ln-form" onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <div className="ln-field ln-field-animate">
                <label className="ln-label" htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  className="ln-input"
                  type="text"
                  value={formData.fullName}
                  onChange={set("fullName")}
                  placeholder="Ahmed Abdullateef"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="ln-field">
              <label className="ln-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="ln-input"
                type="email"
                value={formData.email}
                onChange={set("email")}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="ln-field">
              <div className="ln-label-row">
                <label className="ln-label" htmlFor="password">Password</label>
                {!isSignUp && (
                  <button type="button" className="ln-forgot">Forgot password?</button>
                )}
              </div>
              <div className="ln-input-wrap">
                <input
                  id="password"
                  className="ln-input ln-input-pw"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={set("password")}
                  placeholder={isSignUp ? "Min. 8 characters" : "••••••••"}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="ln-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="ln-submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <><SpinnerIcon /> {isSignUp ? "Creating account…" : "Signing in…"}</>
              ) : (
                <>{isSignUp ? "Create account" : "Sign in"} <ArrowRight /></>
              )}
            </button>
          </form>

          {/* divider */}
          <div className="ln-divider" aria-hidden="true">
            <span>or</span>
          </div>

          {/* switch mode */}
          <p className="ln-switch">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="ln-switch-btn"
              onClick={() => setIsSignUp((v) => !v)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        {/* footer credit */}
        <p className="ln-credit">
          Built by{" "}
          <a href="https://ahmed-portfolio-nine-sable.vercel.app/" target="_blank" rel="noopener noreferrer">
            Web Forge · Ahmed Abdullateef
          </a>
        </p>
      </main>
    </div>
  );
};

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#0fffa0;--green-dim:rgba(15,255,160,.12);--green-glow:rgba(15,255,160,.06);
  --blue:#4d8fff;--purple:#a78bfa;
  --bg:#020c14;--bg2:#061622;
  --surface:rgba(255,255,255,.038);--surface-hover:rgba(255,255,255,.06);
  --border:rgba(255,255,255,.08);--border-strong:rgba(255,255,255,.14);--border-green:rgba(15,255,160,.28);
  --tx:#f5f5f5;--tx2:rgba(255,255,255,.52);--tx3:rgba(255,255,255,.26);
  --display:'Bricolage Grotesque',sans-serif;--body:'Geist',sans-serif;
  --r-sm:8px;--r-md:12px;--r-lg:18px;
  --ease:.28s cubic-bezier(.2,.8,.2,1);
}

.ln-root{
  font-family:var(--body);background:var(--bg);color:var(--tx);
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;
}

/* bg */
.ln-bg{position:absolute;inset:0;pointer-events:none;}
.ln-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:52px 52px;
  mask-image:radial-gradient(ellipse 80% 80% at 50% 40%,black,transparent);
  -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 40%,black,transparent);
}
.ln-orb{position:absolute;border-radius:50%;filter:blur(100px);animation:orb-drift 14s ease-in-out infinite;}
.ln-orb-a{width:560px;height:560px;background:var(--green);opacity:.09;top:-260px;left:-180px;animation-delay:0s;}
.ln-orb-b{width:420px;height:420px;background:var(--blue);opacity:.09;bottom:-180px;right:-120px;animation-delay:-6s;}
.ln-orb-c{width:300px;height:300px;background:var(--purple);opacity:.07;top:40%;left:60%;animation-delay:-11s;}
@keyframes orb-drift{
  0%,100%{transform:translate(0,0)}
  40%{transform:translate(22px,-18px)}
  70%{transform:translate(-16px,14px)}
}

/* back link */
.ln-back{
  position:fixed;top:20px;left:24px;z-index:50;
  display:inline-flex;align-items:center;gap:6px;
  font-size:12.5px;color:var(--tx3);text-decoration:none;
  transition:color var(--ease);padding:6px 0;
}
.ln-back:hover{color:var(--tx2);}

/* main */
.ln-main{
  position:relative;z-index:2;
  width:100%;max-width:420px;padding:24px 20px;
  display:flex;flex-direction:column;align-items:center;gap:0;
  animation:slide-up .55s ease both;
}
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* brand */
.ln-brand{
  display:flex;align-items:center;gap:12px;
  margin-bottom:32px;text-decoration:none;
}
.ln-logo-mark{
  width:44px;height:44px;border-radius:13px;flex-shrink:0;
  background:var(--green);
  display:flex;align-items:center;justify-content:center;
  position:relative;
}
.ln-logo-mark::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(135deg,rgba(255,255,255,.28) 0%,transparent 55%);
}
.ln-brand-name{
  font-family:var(--display);font-size:17px;font-weight:800;
  color:var(--tx);letter-spacing:-.4px;line-height:1.1;
}
.ln-brand-sub{
  font-size:10px;font-weight:500;color:var(--green);
  letter-spacing:2px;text-transform:uppercase;
}

/* card */
.ln-card{
  width:100%;
  background:rgba(6,18,32,.7);
  border:.5px solid var(--border-strong);
  border-radius:20px;
  padding:28px;
  backdrop-filter:blur(32px) saturate(160%);
  -webkit-backdrop-filter:blur(32px) saturate(160%);
  box-shadow:0 32px 80px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);
}

/* card header */
.ln-card-head{margin-bottom:22px;}
.ln-card-title{
  font-family:var(--display);font-size:22px;font-weight:800;
  color:var(--tx);letter-spacing:-.6px;margin-bottom:5px;
}
.ln-card-desc{font-size:13px;color:var(--tx2);line-height:1.5;}

/* tabs */
.ln-tabs{
  display:flex;gap:2px;
  background:rgba(255,255,255,.05);
  border:.5px solid var(--border);
  border-radius:var(--r-sm);
  padding:3px;
  margin-bottom:22px;
}
.ln-tab{
  flex:1;padding:8px 12px;border:none;background:transparent;
  font-family:var(--body);font-size:13px;font-weight:400;color:var(--tx2);
  border-radius:6px;cursor:pointer;transition:all var(--ease);
}
.ln-tab-active{
  background:rgba(255,255,255,.08);color:var(--tx);font-weight:500;
}
.ln-tab:not(.ln-tab-active):hover{color:var(--tx);}

/* form */
.ln-form{display:flex;flex-direction:column;gap:16px;}
.ln-field{display:flex;flex-direction:column;gap:6px;}
.ln-field-animate{animation:field-in .3s ease both;}
@keyframes field-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.ln-label-row{display:flex;align-items:center;justify-content:space-between;}
.ln-label{font-size:12.5px;font-weight:500;color:var(--tx2);letter-spacing:.1px;}
.ln-forgot{
  font-size:12px;color:var(--green);background:none;border:none;cursor:pointer;
  padding:0;font-family:var(--body);transition:opacity var(--ease);
}
.ln-forgot:hover{opacity:.75;}

.ln-input{
  width:100%;padding:10px 14px;
  background:rgba(255,255,255,.04);
  border:.5px solid var(--border-strong);
  border-radius:var(--r-sm);
  color:var(--tx);font-family:var(--body);font-size:14px;font-weight:300;
  outline:none;transition:border-color var(--ease),background var(--ease),box-shadow var(--ease);
  -webkit-appearance:none;
}
.ln-input::placeholder{color:var(--tx3);}
.ln-input:focus{
  border-color:var(--border-green);
  background:rgba(15,255,160,.04);
  box-shadow:0 0 0 3px rgba(15,255,160,.08);
}

.ln-input-wrap{position:relative;}
.ln-input-pw{padding-right:42px;}
.ln-eye{
  position:absolute;inset-y:0;right:0;
  width:40px;display:flex;align-items:center;justify-content:center;
  background:none;border:none;color:var(--tx3);cursor:pointer;
  transition:color var(--ease);
}
.ln-eye:hover{color:var(--tx2);}

/* submit button */
.ln-submit{
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;padding:12px 20px;margin-top:4px;
  background:var(--green);color:#021a0e;
  border:none;border-radius:var(--r-sm);
  font-family:var(--display);font-size:14px;font-weight:700;
  cursor:pointer;transition:background var(--ease),transform var(--ease),box-shadow var(--ease);
}
.ln-submit:hover:not(:disabled){
  background:#2bffc0;transform:translateY(-2px);
  box-shadow:0 12px 32px rgba(15,255,160,.28);
}
.ln-submit:active:not(:disabled){transform:none;box-shadow:none;}
.ln-submit:disabled{opacity:.55;cursor:not-allowed;}
@keyframes spin{to{transform:rotate(360deg)}}

/* divider */
.ln-divider{
  display:flex;align-items:center;gap:12px;
  margin:20px 0 0;color:var(--tx3);font-size:12px;
}
.ln-divider::before,.ln-divider::after{
  content:'';flex:1;height:.5px;background:var(--border);
}

/* switch */
.ln-switch{
  margin-top:14px;font-size:13px;color:var(--tx2);text-align:center;
}
.ln-switch-btn{
  background:none;border:none;color:var(--green);font-size:13px;
  font-family:var(--body);font-weight:500;cursor:pointer;padding:0;
  transition:opacity var(--ease);
}
.ln-switch-btn:hover{opacity:.75;}

/* credit */
.ln-credit{
  margin-top:20px;font-size:11.5px;color:var(--tx3);text-align:center;
}
.ln-credit a{color:var(--green);font-weight:500;text-decoration:none;}
.ln-credit a:hover{text-decoration:underline;}

@media(max-width:480px){
  .ln-card{padding:22px 18px;}
  .ln-back{left:16px;}
}
`;

export default Login;
