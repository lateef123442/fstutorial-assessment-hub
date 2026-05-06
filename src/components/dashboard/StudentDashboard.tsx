import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Trophy, LogOut, GraduationCap, Shuffle, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AvailableAssessments from "./student/AvailableAssessments";
import StudentMockExams from "./student/StudentMockExams";
import MyResults from "./student/MyResults";
import PracticeQuestions from "./student/PracticeQuestions";
import Leaderboard from "./Leaderboard";
import MyClassProgress from "./student/MyClassProgress";

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const [className, setClassName] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [classDescription, setClassDescription] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const fetchClass = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, class_id, classes(name, description)")
        .eq("id", user.id)
        .maybeSingle();
      const cls = (profile as any)?.classes;
      setClassName(cls?.name || null);
      setClassDescription(cls?.description || null);
      setClassId((profile as any)?.class_id || null);
      setFullName((profile as any)?.full_name || null);
    };
    fetchClass();
  }, [user.id]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PHYSIO NEXUS</h1>
              <p className="text-sm text-muted-foreground">
                Student Dashboard{className ? ` • Class: ${className}` : " • No class assigned"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div
          className={`mb-6 rounded-xl border p-5 flex items-start gap-4 ${
            className ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/30"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              className ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
            }`}
          >
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">My Class</p>
            {className ? (
              <>
                <h2 className="text-xl font-bold mt-0.5 truncate">{className}</h2>
                {classDescription && <p className="text-sm text-muted-foreground mt-1">{classDescription}</p>}
                {fullName && <p className="text-xs text-muted-foreground mt-2">Welcome, {fullName}</p>}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mt-0.5 text-destructive">No class assigned</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Please contact your administrator to be assigned to a class. You won't see
                  assessments or mock exams until then.
                </p>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="assessments">
          <TabsList className="flex w-full mb-8">  {/* Horizontal tabs in a single line */}
            <TabsTrigger value="assessments" className="flex items-center gap-2">
              <FileText className="w-3 h-4" />
              Take Assessment
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Trophy className="w-3 h-4" />
              My Results
            </TabsTrigger>
            <TabsTrigger value="mock-exams" className="flex items-center gap-2">
              <FileText className="w-3 h-4" />
              Mock Exams
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Shuffle className="w-3 h-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <BarChart3 className="w-3 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="animate-fade-in">
            <AvailableAssessments studentId={user.id} />
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <MyResults studentId={user.id} />
          </TabsContent>

          <TabsContent value="mock-exams" className="animate-fade-in">
            <StudentMockExams studentId={user.id} />
          </TabsContent>

          <TabsContent value="practice" className="animate-fade-in">
            <PracticeQuestions studentId={user.id} />
          </TabsContent>

          <TabsContent value="leaderboard" className="animate-fade-in">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
