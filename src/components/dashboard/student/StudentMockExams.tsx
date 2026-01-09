import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, CheckCircle, Calendar, Lock } from "lucide-react";
import { toast } from "sonner";

interface StudentMockExamsProps {
  studentId: string;
}

interface MockExamSubject {
  subject_id: string;
  order_position: number;
  subjects: {
    id: string;
    name: string;
  };
}

interface MockExam {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_per_subject_minutes: number;
  total_duration_minutes: number;
  is_active: boolean;
  mock_exam_subjects: MockExamSubject[];
}

const StudentMockExams = ({ studentId }: StudentMockExamsProps) => {
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [completedExams, setCompletedExams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMockExams();
    fetchCompletedExams();
  }, [studentId]);

  const getScheduledDateTime = (exam: MockExam) => {
    if (!exam.scheduled_date) return null;

    const [y, m, d] = String(exam.scheduled_date).split("-").map(Number);
    const scheduled = new Date(y, (m ?? 1) - 1, d ?? 1);

    if (exam.scheduled_time) {
      const [hours, minutes] = String(exam.scheduled_time).split(":");
      scheduled.setHours(parseInt(hours || "0"), parseInt(minutes || "0"), 0, 0);
    }

    return scheduled;
  };

  const fetchMockExams = async () => {
    try {
      const { data: exams, error } = await supabase
        .from("mock_exams")
        .select(`
          id,
          title,
          description,
          scheduled_date,
          scheduled_time,
          duration_per_subject_minutes,
          total_duration_minutes,
          is_active,
          mock_exam_subjects (
            subject_id,
            order_position,
            subjects (
              id,
              name
            )
          )
        `)
        .eq("is_active", true)
        .order("scheduled_date", { ascending: true });

      if (error) {
        console.error("Failed to fetch mock exams:", error);
        toast.error("Failed to load mock exams");
        setLoading(false);
        return;
      }

      setMockExams((exams || []) as MockExam[]);
    } catch (err) {
      console.error("Error fetching mock exams:", err);
      toast.error("Failed to load mock exams");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedExams = async () => {
    try {
      const { data, error } = await supabase
        .from("mock_exam_attempts")
        .select("mock_exam_id")
        .eq("student_id", studentId)
        .eq("is_completed", true);

      if (!error && data) {
        setCompletedExams(data.map(d => d.mock_exam_id));
      }
    } catch (err) {
      console.error("Error fetching completed exams:", err);
    }
  };

  const handleStartMockExam = (examId: string) => {
    if (!examId) {
      toast.error("Invalid exam ID");
      return;
    }
    navigate(`/take-mock-exam/${examId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return <div className="p-4">Loading mock exams...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Available Mock Exams
          </CardTitle>
          <CardDescription>Select a mock exam to begin. Each exam has 4 subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          {mockExams.length === 0 ? (
            <p className="text-muted-foreground">No mock exams available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {mockExams.map((exam) => {
                const isCompleted = completedExams.includes(exam.id);
                const scheduledAt = getScheduledDateTime(exam);
                const isAvailableNow = !scheduledAt || new Date() >= scheduledAt;
                const subjectNames = exam.mock_exam_subjects
                  ?.sort((a, b) => a.order_position - b.order_position)
                  .map(s => s.subjects?.name)
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={exam.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isAvailableNow ? "hover:bg-muted/50" : "bg-muted/30 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{exam.title}</h3>
                          {isCompleted && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Completed
                            </span>
                          )}
                          {!isAvailableNow && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Scheduled
                            </span>
                          )}
                          {isAvailableNow && !isCompleted && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              Open Now
                            </span>
                          )}
                        </div>

                        {exam.description && (
                          <p className="text-sm text-muted-foreground">{exam.description}</p>
                        )}

                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Subjects:</span> {subjectNames || "No subjects assigned"}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(exam.scheduled_date)}
                            {exam.scheduled_time && ` at ${exam.scheduled_time}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {exam.total_duration_minutes} mins total
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {exam.duration_per_subject_minutes} mins/subject
                          </span>
                        </div>

                        {!isAvailableNow && scheduledAt && (
                          <p className="text-sm text-yellow-700 font-medium">
                            Opens on {scheduledAt.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => isAvailableNow && handleStartMockExam(exam.id)}
                        disabled={isCompleted || !isAvailableNow}
                        variant={isCompleted ? "outline" : "default"}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : !isAvailableNow ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Not Yet Open
                          </>
                        ) : (
                          "Start Exam"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentMockExams;
