import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle } from "lucide-react";

interface MyAssessmentsProps {
  teacherId: string;
}

const MyAssessments = ({ teacherId }: MyAssessmentsProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, [teacherId]);

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        subjects(name),
        questions(count)
      `)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssessments(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Assessments</CardTitle>
          <CardDescription>All assessments you've created</CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments yet. Create your first assessment!</p>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      <p className="text-sm text-muted-foreground">{assessment.subjects?.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {assessment.duration_minutes} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {assessment.questions?.length || 0} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Pass: {assessment.passing_score}%
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${assessment.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {assessment.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAssessments;
