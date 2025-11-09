import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, TrendingUp } from "lucide-react";

const Analytics = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    totalAssessments: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const [students, teachers, subjects, assessments] = await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact" }).eq("role", "student"),
      supabase.from("user_roles").select("*", { count: "exact" }).eq("role", "teacher"),
      supabase.from("subjects").select("*", { count: "exact" }),
      supabase.from("assessments").select("*", { count: "exact" }),
    ]);

    setStats({
      totalStudents: students.count || 0,
      totalTeachers: teachers.count || 0,
      totalSubjects: subjects.count || 0,
      totalAssessments: assessments.count || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTeachers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAssessments}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>System-wide statistics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your platform is growing! Keep track of all activities and make data-driven decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
