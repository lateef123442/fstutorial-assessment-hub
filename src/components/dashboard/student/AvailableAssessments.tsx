import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, FileText, CheckCircle } from "lucide-react";

interface AvailableAssessmentsProps {
  studentId: string;
}

const AvailableAssessments = ({ studentId }: AvailableAssessmentsProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        subjects(name),
        profiles(full_name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssessments(data);
    }
    setLoading(false);
  };

  const handleStartAssessment = async (assessmentId: string) => {
    const { data: attempt, error } = await supabase
      .from("attempts")
      .insert({
        student_id: studentId,
        assessment_id: assessmentId,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
    } else {
      // Navigate to assessment taking page (to be implemented)
      console.log("Start assessment", attempt.id);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Assessments</CardTitle>
          <CardDescription>Select an assessment to begin</CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {assessment.subjects?.name} • by {assessment.profiles?.full_name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {assessment.duration_minutes} minutes
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Pass: {assessment.passing_score}%
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => handleStartAssessment(assessment.id)}>
                      Start Test
                    </Button>
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

export default AvailableAssessments;
