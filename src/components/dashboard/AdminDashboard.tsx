import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Users, BookOpen, GraduationCap, BarChart3, LogOut, FileText, ClipboardList, Database, ShieldCheck, HelpCircle, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManageTeachers from "./admin/ManageTeachers";
import ManageStudents from "./admin/ManageStudents";
import ManageSubjects from "./admin/ManageSubjects";
import Analytics from "./admin/Analytics";
import ViewStudentAttempts from "./admin/ViewStudentAttempts";
import CreateMockExam from "./admin/CreateMockExam";
import CreateMockFromExisting from "./admin/CreateMockFromExisting";
import ViewMockExamResults from "./admin/ViewMockExamResults";
import ManageAdmins from "./admin/ManageAdmins";
import ManageQuestionBank from "./admin/ManageQuestionBank";
import ManageAllUsers from "./admin/ManageAllUsers";

interface AdminDashboardProps {
  user: User;
}

const tabs = [
  { value: "analytics", icon: BarChart3, label: "Analytics" },
  { value: "attempts", icon: FileText, label: "Attempts" },
  { value: "mockresults", icon: ClipboardList, label: "Mock Results" },
  { value: "teachers", icon: Users, label: "Teachers" },
  { value: "students", icon: GraduationCap, label: "Students" },
  { value: "subjects", icon: BookOpen, label: "Subjects" },
  { value: "createmock", icon: BookOpen, label: "New Mock" },
  { value: "mockfromexisting", icon: Database, label: "From Existing" },
  { value: "questionbank", icon: HelpCircle, label: "Q-Bank" },
  { value: "users", icon: UserCog, label: "Users" },
  { value: "admins", icon: ShieldCheck, label: "Admins" },
];

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("analytics");

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "analytics": return <Analytics />;
      case "attempts": return <ViewStudentAttempts />;
      case "mockresults": return <ViewMockExamResults />;
      case "teachers": return <ManageTeachers />;
      case "students": return <ManageStudents />;
      case "subjects": return <ManageSubjects />;
      case "createmock": return <CreateMockExam />;
      case "mockfromexisting": return <CreateMockFromExisting />;
      case "questionbank": return <ManageQuestionBank />;
      case "users": return <ManageAllUsers />;
      case "admins": return <ManageAdmins />;
      default: return <Analytics />;
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
        {/* Custom tab navigation - avoids Radix Tabs + Select crash */}
        <div className="flex flex-wrap gap-1 mb-8 p-1 bg-muted rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="animate-fade-in" key={activeTab}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
