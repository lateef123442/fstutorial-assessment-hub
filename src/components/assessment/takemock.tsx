import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";

// Type definitions
interface Assessment {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number;
  // Add other fields as per your schema
}

interface MockExam {
  id: string;
  title: string;
  total_duration_minutes: number;
  passing_score: number;
  mock_exam_assessments: {
    assessment_id: string;
    subject: string;
    assessments: Assessment;
  }[];
  profiles?: { email: string; full_name: string }; // Assuming linked
}

interface SubjectData {
  subject: string;
  assessment: Assessment;
  attemptId: string;
}

interface Results {
  correct: number;
  total: number;
}

const TakeMockExam: React.FC = () => {
  const { mockExamId } = useParams<{ mockExamId: string }>();
  const navigate = useNavigate();

  const [mockExam, setMockExam] = useState<MockExam | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState<number>(0);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [overallResults, setOverallResults] = useState<{ totalCorrect: number; totalQuestions: number }>({
    totalCorrect: 0,
    totalQuestions: 0,
  });

  // Load mock exam and create attempts for each subject
  useEffect(() => {
    const loadMockExam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in");
          navigate("/dashboard");
          return;
        }

        // Fetch mock exam
        const { data: mock, error: mockError } = await supabase
          .from("mock_exams")
          .select("*, mock_exam_assessments(assessment_id, subject, assessments(*))")
          .eq("id", mockExamId!)
          .single();
        if (mockError || !mock) {
          toast.error("Mock exam not found");
          navigate("/dashboard");
          return;
        }

        setMockExam(mock);
        setTotalTimeRemaining(mock.total_duration_minutes * 60);

        // Create attempts for each subject
        const subjectData: SubjectData[] = [];
        for (const item of mock.mock_exam_assessments) {
          const { data: attempt, error: attemptError } = await supabase
            .from("attempts")
            .insert({
              student_id: user.id,
              assessment_id: item.assessment_id,
              mock_exam_id: mockExamId,
            })
            .select()
            .single();
          if (attemptError) {
            toast.error(`Failed to start ${item.subject}`);
            return;
          }
          subjectData.push({
            subject: item.subject,
            assessment: item.assessments,
            attemptId: attempt.id,
          });
        }
        setSubjects(subjectData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load mock exam");
        navigate("/dashboard");
      }
    };

    if (mockExamId) loadMockExam();
  }, [mockExamId, navigate]);

  // Overall timer
  useEffect(() => {
    if (totalTimeRemaining <= 0) {
      handleOverallSubmit(true);
      return;
    }
    const timer = setInterval(() => {
      setTotalTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [totalTimeRemaining]);

  // Auto-submit on leaving tab
  useEffect(() => {
    const handleLeave = () => handleOverallSubmit(true);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) handleLeave();
    });
    window.addEventListener("blur", handleLeave);
    return () => {
      document.removeEventListener("visibilitychange", handleLeave);
      window.removeEventListener("blur", handleLeave);
    };
  }, []);

  // Handle subject completion and move to next
  const handleSubjectSubmit = (results: Results) => {
    setOverallResults((prev) => ({
      totalCorrect: prev.totalCorrect + results.correct,
      totalQuestions: prev.totalQuestions + results.total,
    }));
    if (currentSubjectIndex < subjects.length - 1) {
      setCurrentSubjectIndex((i) => i + 1);
    } else {
      handleOverallSubmit(false);
    }
  };

  // Overall submit
  const handleOverallSubmit = async (autoSubmitted: boolean = false) => {
    const passed = overallResults.totalCorrect >= (mockExam?.passing_score || 0);
    // Update mock exam attempt or send email (assuming a mock_exam_attempts table or similar)
    notifyUserAction(
      mockExam?.profiles?.email,
      mockExam?.profiles?.full_name,
      "results_available",
      `Mock Exam: ${overallResults.totalCorrect}/${overallResults.totalQuestions} (${Math.round((overallResults.totalCorrect / overallResults.totalQuestions) * 100)}%).`
    );
    toast.success("Mock Exam Submitted!");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const currentSubject = subjects[currentSubjectIndex];
  const overallProgress = ((currentSubjectIndex + 1) / subjects.length) * 100;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>{mockExam!.title} - {currentSubject.subject}</CardTitle>
                <CardDescription>Subject {currentSubjectIndex + 1} of {subjects.length}</CardDescription>
              </div>
              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-5 h-5" />
                {Math.floor(totalTimeRemaining / 60)}:{(totalTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <Progress value={overallProgress} className="mt-3" />
          </CardHeader>
        </Card>
        <SubjectAssessment
          attemptId={currentSubject.attemptId}
          assessment={currentSubject.assessment}
          onSubmit={handleSubjectSubmit}
          timeRemaining={totalTimeRemaining}
        />
      </div>
    </div>
  );
};

// Sub-component for each subject (adapted from TakeAssessment)
interface SubjectAssessmentProps {
  attemptId: string;
  assessment: Assessment;
  onSubmit: (results: Results) => void;
  timeRemaining: number;
}

const SubjectAssessment: React.FC<SubjectAssessmentProps> = ({ attemptId, assessment, onSubmit, timeRemaining }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [subjectTimeRemaining, setSubjectTimeRemaining] = useState<number>(assessment.duration_minutes * 60);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", assessment.id)
        .order("created_at");
      setQuestions(questionsData || []);
    };
    loadQuestions();
  }, [assessment.id]);

  // Subject timer (optional, or use overall)
  useEffect(() => {
    if (subjectTimeRemaining <= 0) {
      handleSubjectSubmit(true);
      return;
    }
    const timer = setInterval(() => {
      setSubjectTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [subjectTimeRemaining]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubjectSubmit = async (autoSubmitted: boolean = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      let correct = 0;
      for (const q of questions) {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) correct++;

        await supabase.from("answers").insert({
          attempt_id: attemptId,
          question_id: q.id,
          selected_answer: selected || null,
          is_correct: isCorrect,
        });
      }

      const passed = correct >= (assessment.passing_score || 0);
      await supabase
        .from("attempts")
        .update({
          score: correct,
          passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
        })
        .eq("id", attemptId);

      onSubmit({ correct, total: questions.length });
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit subject");
    } finally {
      setSubmitting(false);
    }
  };

  if (questions.length === 0) return <div>Loading questions...</div>;

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{q.question_text}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[q.id] || ""}
            onValueChange={(v) => handleAnswerChange(q.id, v)}
          >
            {["A", "B", "C", "D"].map((opt) => (
              <div key={opt} className="border p-3 rounded-lg flex items-center gap-3">
                <RadioGroupItem value={opt} id={opt} />
                <Label htmlFor={opt}>{q[`option_${opt.toLowerCase()}`]}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          <ChevronLeft /> Previous
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button onClick={() => handleSubjectSubmit(false)} disabled={submitting}>
            Submit Subject
          </Button>
        )}
      </div>
    </>
  );
};

export default TakeMockExam;
