import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Assuming Badge component exists
import { toast } from "sonner";
import { Clock, Play, CheckCircle } from "lucide-react";

interface MockExam {
  id: string;
  title: string;
  total_duration_minutes: number;
  passing_score: number;
  mock_exam_assessments: {
    subject: string;
  }[];
}

interface StudentMockExam {
  mock_exam: MockExam;
  attempts: any[]; // Array of attempts for this mock exam
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  passed?: boolean;
}

const StudentMockExams = () => {
  const navigate = useNavigate();
  const [mockExams, setMockExams] = useState<StudentMockExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentMockExams();
  }, []);

  const fetchStudentMockExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        navigate("/dashboard");
        return;
      }

      // Fetch attempts with mock_exam_id
      const { data: attempts, error: attemptsError } = await supabase
        .from("attempts")
        .select("*, mock_exams(*, mock_exam_assessments(subject))")
        .eq("student_id", user.id)
        .not("mock_exam_id", "is", null);

      if (attemptsError) throw attemptsError;

      // Group by mock_exam_id
      const examMap = new Map<string, StudentMockExam>();
      attempts.forEach((attempt) => {
        const examId = attempt.mock_exam_id;
        if (!examMap.has(examId)) {
          examMap.set(examId, {
            mock_exam: attempt.mock_exams,
            attempts: [],
            status: "not_started",
          });
        }
        examMap.get(examId)!.attempts.push(attempt);
      });

      // Determine status for each
      const studentExams: StudentMockExam[] = Array.from(examMap.values()).map((exam) => {
        const completedAttempts = exam.attempts.filter(a => a.submitted_at);
        if (completedAttempts.length > 0) {
          // Assume last attempt's score
          const lastAttempt = completedAttempts[completedAttempts.length - 1];
          return {
            ...exam,
            status: "completed",
            score: lastAttempt.score,
            passed: lastAttempt.passed,
          };
        } else if (exam.attempts.length > 0) {
          return { ...exam, status: "in_progress" };
        }
        return exam;
      });

      setMockExams(studentExams);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load mock exams");
    } finally {
      setLoading(false);
    }
  };

  const startMockExam = (examId: string) => {
    navigate(`/take-mock-exam/${examId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Mock Exams</h1>
        {mockExams.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No mock exams available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mockExams.map((exam) => (
              <Card key={exam.mock_exam.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{exam.mock_exam.title}</CardTitle>
                      <CardDescription>
                        Subjects: {exam.mock_exam.mock_exam_assessments.map(a => a.subject).join(", ")}
                      </CardDescription>
                    </div>
                    <Badge variant={exam.status === "completed" ? "default" : exam.status === "in_progress" ? "secondary" : "outline"}>
                      {exam.status === "completed" ? "Completed" : exam.status === "in_progress" ? "In Progress" : "Not Started"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{exam.mock_exam.total_duration_minutes} minutes</span>
                    </div>
                    {exam.status === "completed" && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Score: {exam.score}% {exam.passed ? "(Passed)" : "(Failed)"}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => startMockExam(exam.mock_exam.id)}
                    disabled={exam.status === "completed"}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {exam.status === "completed" ? "View Results" : exam.status === "in_progress" ? "Continue" : "Start Exam"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mock;
