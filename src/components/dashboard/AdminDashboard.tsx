import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, GraduationCap, BarChart3, LogOut, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManageTeachers from "./admin/ManageTeachers";
import ManageStudents from "./admin/ManageStudents";
import ManageSubjects from "./admin/ManageSubjects";
import Analytics from "./admin/Analytics";
import ViewStudentAttempts from "./admin/ViewStudentAttempts";
import CreateMockExam from "./admin/CreateMockExam";
import ViewMockExamResults from "./admin/ViewMockExamResults";


interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("teachers");

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
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="attempts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Attempts</span>
            </TabsTrigger>
            <TabsTrigger value="mockresults" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Mock Results</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="createmock" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Create Mock</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="animate-fade-in">
            <Analytics />
          </TabsContent>

          <TabsContent value="attempts" className="animate-fade-in">
            <ViewStudentAttempts />
          </TabsContent>

          <TabsContent value="mockresults" className="animate-fade-in">
            <ViewMockExamResults />
          </TabsContent>

          <TabsContent value="teachers" className="animate-fade-in">
            <ManageTeachers />
          </TabsContent>

          <TabsContent value="students" className="animate-fade-in">
            <ManageStudents />
          </TabsContent>

          <TabsContent value="subjects" className="animate-fade-in">
            <ManageSubjects />
          </TabsContent>

          <TabsContent value="createmock" className="animate-fade-in">
            <CreateMockExam />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
};

export default AdminDashboard;
