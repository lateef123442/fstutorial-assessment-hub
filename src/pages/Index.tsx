import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Award, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero py-20 px-4">
        <div className="container mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            F.S.Tutorial
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Advanced Computer-Based Testing Platform for Science Students
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90" onClick={() => navigate("/login")}>
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose F.S.Tutorial?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow animate-slide-up">
              <div className="w-14 h-14 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Comprehensive Assessments</h3>
              <p className="text-muted-foreground">
                Teachers create detailed assessments with multiple-choice questions, timed tests, and instant grading.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-14 h-14 rounded-lg gradient-accent flex items-center justify-center mb-4">
                <Award className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Results</h3>
              <p className="text-muted-foreground">
                Students receive immediate feedback with detailed results sent to their email and administrators.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-14 h-14 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Analytics & Tracking</h3>
              <p className="text-muted-foreground">
                Comprehensive analytics dashboard to track student performance, identify trends, and improve learning outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Built for Everyone</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                A
              </div>
              <h3 className="text-xl font-semibold mb-2">Administrators</h3>
              <p className="text-muted-foreground">Manage teachers, students, subjects, and view comprehensive analytics.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                T
              </div>
              <h3 className="text-xl font-semibold mb-2">Teachers</h3>
              <p className="text-muted-foreground">Create assessments, manage questions, and track student performance.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                S
              </div>
              <h3 className="text-xl font-semibold mb-2">Students</h3>
              <p className="text-muted-foreground">Take assessments, view results, and track your academic progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-white/90 mb-8">Join F.S.Tutorial today and experience the future of education.</p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90" onClick={() => navigate("/login")}>
            Start Learning Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 F.S.Tutorial. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
