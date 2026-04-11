import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import { toast } from "sonner";

/* ─── loading screen ─── */
const LoadingScreen = () => (
  <div className="ds-loading">
    <style>{LOADING_CSS}</style>
    <div className="ds-loading-inner">
      <div className="ds-spinner-wrap" aria-hidden="true">
        <div className="ds-spinner-ring" />
        <div className="ds-logo-mark">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C10 2 5 5 5 10c0 3.866 2.239 5.5 5 5.5s5-1.634 5-5.5c0-5-5-8-5-8Z" fill="#022010" opacity=".9"/>
            <circle cx="10" cy="10" r="2.4" fill="#022010"/>
            <path d="M10 12.5v3M7.5 14.5l2.5-1.5 2.5 1.5" stroke="#022010" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <p className="ds-loading-text">Loading your dashboard</p>
      <div className="ds-loading-dots" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  </div>
);

/* ─── error / no role screen ─── */
const NoRoleScreen = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="ds-loading">
    <div className="ds-no-role">
      <div className="ds-no-role-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14 9v5M14 18v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="ds-no-role-title">No role assigned</h2>
      <p className="ds-no-role-desc">
        Your account doesn't have a role yet. Please contact your administrator to get access.
      </p>
      <button className="ds-no-role-btn" onClick={onSignOut}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 7h7M9 4l3 3-3 3M5 3H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Sign out
      </button>
    </div>
  </div>
);

/* ─────────────────────────── Component ─────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noRole, setNoRole] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (error || !roleData) {
        toast.error("No role assigned. Please contact your administrator.");
        setNoRole(true);
        setLoading(false);
        return;
      }

      setUserRole(roleData.role);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return <LoadingScreen />;
  if (noRole || !user || !userRole) return <NoRoleScreen onSignOut={handleSignOut} />;

  return (
    <>
      {userRole === "admin"   && <AdminDashboard   user={user} />}
      {userRole === "teacher" && <TeacherDashboard user={user} />}
      {userRole === "student" && <StudentDashboard user={user} />}
    </>
  );
};

/* ─── CSS for loading & error states ─── */
const LOADING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Geist:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#0fffa0;--blue:#4d8fff;--purple:#a78bfa;
  --bg:#020c14;
  --border:rgba(255,255,255,.08);--border-green:rgba(15,255,160,.28);
  --tx:#f5f5f5;--tx2:rgba(255,255,255,.5);--tx3:rgba(255,255,255,.25);
  --display:'Bricolage Grotesque',sans-serif;--body:'Geist',sans-serif;
  --r-sm:8px;--r-md:12px;--r-lg:18px;
}

.ds-loading{
  font-family:var(--body);
  background:var(--bg);
  min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
.ds-loading::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:52px 52px;
  mask-image:radial-gradient(ellipse 70% 70% at 50% 50%,black,transparent);
  -webkit-mask-image:radial-gradient(ellipse 70% 70% at 50% 50%,black,transparent);
}
.ds-loading::after{
  content:'';position:absolute;
  width:600px;height:600px;border-radius:50%;
  background:var(--green);opacity:.07;filter:blur(120px);
  top:50%;left:50%;transform:translate(-50%,-50%);
  pointer-events:none;
}

.ds-loading-inner{
  position:relative;z-index:2;
  display:flex;flex-direction:column;align-items:center;gap:0;
  animation:fade-up .5s ease both;
}
@keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

/* spinner */
.ds-spinner-wrap{
  position:relative;
  width:72px;height:72px;
  margin-bottom:24px;
}
.ds-spinner-ring{
  position:absolute;inset:0;border-radius:50%;
  border:1.5px solid var(--border);
  border-top-color:var(--green);
  animation:spin .9s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.ds-logo-mark{
  position:absolute;inset:0;
  display:flex;align-items:center;justify-content:center;
  background:var(--green);border-radius:50%;
  margin:14px;
}
.ds-logo-mark::after{
  content:'';position:absolute;inset:0;border-radius:50%;
  background:linear-gradient(135deg,rgba(255,255,255,.25) 0%,transparent 55%);
}

.ds-loading-text{
  font-family:var(--display);font-size:15px;font-weight:700;
  color:var(--tx);letter-spacing:-.3px;
  margin-bottom:14px;
}
.ds-loading-dots{display:flex;gap:5px;}
.ds-loading-dots span{
  width:5px;height:5px;border-radius:50%;
  background:var(--green);opacity:.35;
  animation:dot-pulse 1.4s ease-in-out infinite;
}
.ds-loading-dots span:nth-child(2){animation-delay:.2s;}
.ds-loading-dots span:nth-child(3){animation-delay:.4s;}
@keyframes dot-pulse{
  0%,100%{opacity:.2;transform:scale(.8)}
  50%{opacity:.8;transform:scale(1.2)}
}

/* no role */
.ds-no-role{
  position:relative;z-index:2;
  max-width:360px;text-align:center;
  padding:40px 32px;
  background:rgba(6,18,32,.7);
  border:.5px solid rgba(255,255,255,.12);
  border-radius:20px;
  backdrop-filter:blur(32px);
  -webkit-backdrop-filter:blur(32px);
  animation:fade-up .5s ease both;
}
.ds-no-role-icon{
  width:56px;height:56px;border-radius:50%;
  background:rgba(255,179,71,.1);color:#fbbf24;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 18px;
}
.ds-no-role-title{
  font-family:var(--display);font-size:19px;font-weight:800;
  color:var(--tx);letter-spacing:-.4px;margin-bottom:10px;
}
.ds-no-role-desc{
  font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:24px;
}
.ds-no-role-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 22px;
  background:rgba(255,255,255,.06);color:var(--tx);
  border:.5px solid rgba(255,255,255,.12);border-radius:var(--r-sm);
  font-family:var(--body);font-size:13px;font-weight:400;
  cursor:pointer;transition:all .25s ease;
}
.ds-no-role-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);}
`;

export default Dashboard;
