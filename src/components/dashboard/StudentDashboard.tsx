import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Trophy, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AvailableAssessments from "./student/AvailableAssessments";
import MyResults from "./student/MyResults";
import Mock from "./student/Mock"; // Capitalized import

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
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
              <h1 className="text-2xl font-bold">F.S.Tutorial</h1>
              <p className="text-sm text-muted-foreground">Student Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="assessments">
          <TabsList className="flex w-full mb-8">  {/* Changed to flex for horizontal layout in a single line */}
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
          </TabsList>

          <TabsContent value="assessments" className="animate-fade-in">
            <AvailableAssessments studentId={user.id} />
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <MyResults studentId={user.id} />
          </TabsContent>

          <TabsContent value="mock-exams" className="animate-fade-in">  {/* Fixed value to "mock-exams" */}
            <Mock studentId={user.id} />  {/* Capitalized to <Mock> */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
