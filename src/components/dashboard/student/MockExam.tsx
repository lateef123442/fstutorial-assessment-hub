import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, FileText, CheckCircle } from "lucide-react";

interface StudentMockExamsProps {
  studentId: string;
}

const StudentMockExams = ({ studentId }: StudentMockExamsProps) => {
  const [mockExams, setMockExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMockExams();
  }, []);

  const fetchMockExams = async () => {
    const { data, error } = await supabase
      .from("mock_exam")
      .select(`
        *,
        mock_exam_assessments(subject)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Filter by schedule (similar to AvailableAssessments)
      const now = new Date();
      const available = data.filter((exam) => {
        if (!exam.scheduled_date) return true;
        
        const scheduledDateTime = new Date(exam.scheduled_date);
        if (exam.scheduled_time) {
          const [hours, minutes] = exam.scheduled_time.split(":");
          scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
        }
        
        return now >= scheduledDateTime;
      });
      
      setMockExams(available);
    }
    setLoading(false);
  };

  const handleStartMockExam = (examId: string) => {
    // Navigate to take mock exam page (attempt creation happens there)
    navigate(`/take-mock-exam/${examId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Mock Exams</CardTitle>
          <CardDescription>Select a mock exam to begin</CardDescription>
        </CardHeader>
        <CardContent>
          {mockExams.length === 0 ? (
            <p className="text-muted-foreground">No mock exams available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {mockExams.map((exam) => (
                <div key={exam.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Subjects: {exam.mock_exam_assessments.map(a => a.subject).join(", ")}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam.total_duration_minutes} minutes
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Pass: {exam.passing_score}%
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => handleStartMockExam(exam.id)}>
                      Start Exam
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

export default StudentMockExams;
