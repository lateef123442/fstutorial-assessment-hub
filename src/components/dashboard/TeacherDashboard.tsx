import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, LogOut, GraduationCap, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MyAssessments from "./teacher/MyAssessments";
import CreateAssessment from "./teacher/CreateAssessment";
import ViewAttempts from "./teacher/ViewAttempts";
import ScheduleReminders from "./teacher/ScheduleReminders";

interface TeacherDashboardProps {
  user: User;
}

const TeacherDashboard = ({ user }: TeacherDashboardProps) => {
  const [assessmentsRefreshKey, setAssessmentsRefreshKey] = useState(0);

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
              <p className="text-sm text-muted-foreground">Teacher Dashboard</p>
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
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="assessments" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Assessments
            </TabsTrigger>
            <TabsTrigger value="attempts" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Student Attempts
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Create Assessment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="animate-fade-in">
            <MyAssessments teacherId={user.id} refreshKey={assessmentsRefreshKey} />
          </TabsContent>

          <TabsContent value="attempts" className="animate-fade-in">
            <ViewAttempts />
          </TabsContent>

          <TabsContent value="create" className="animate-fade-in">
            <div className="space-y-6">
              <CreateAssessment
                teacherId={user.id}
                onCreated={() => setAssessmentsRefreshKey((k) => k + 1)}
              />
              <ScheduleReminders />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
