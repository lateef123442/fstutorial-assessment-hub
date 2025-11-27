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

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const TakeMockExam = () => {
  const { mockExamId } = useParams();
  const navigate = useNavigate();

  const [mockExam, setMockExam] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------
  // LOAD MOCK EXAM + SUBJECT + ADMIN + QUESTIONS
  // --------------------------------------------------

  const loadMockExam = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in");
        navigate("/dashboard");
        return;
      }

      // 1. Load mock exam
      const { data: mock, error: mockError } = await supabase
        .from("mock_exam")
        .select("*")
        .eq("id", mockExamId)
        .single();

      if (mockError || !mock) {
        toast.error("Mock exam not found");
        return;
      }

      // 2. Load subject
      const { data: subject, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("id", mock.subject_id)
        .single();

      if (subjectError || !subject) {
        toast.error("Subject not found");
        return;
      }

      // 3. Load admin profile
      const { data: admin, error: adminError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", mock.admin_id)
        .single();

      if (adminError || !admin) {
        toast.error("Exam creator not found.");
        return;
      }

      // 4. Check if already attempted
      const { data: existingAttempts } = await supabase
        .from("attempts")
        .select("id")
        .eq("mock_exam_id", mockExamId)
        .eq("student_id", user.id)
        .not("submitted_at", "is", null);

      if (existingAttempts?.length > 0) {
        toast.error("You already completed this exam.");
        navigate("/dashboard");
        return;
      }

      // 5. Load questions
      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .eq("subject_id", subject.id);

      // ✅ SYSTEM STRUCTURE
      const subjectPayload = [
        {
          assessmentId: subject.id,
          subject: subject.name,
          questions: questions || []
        }
      ];

      mock.profiles = admin;

      setMockExam(mock);
      setSubjects(subjectPayload);
      setTimeRemaining(mock.total_duration_minutes * 60);
      setLoading(false);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load mock exam");
    }
  };

  useEffect(() => {
    loadMockExam();
  }, []);

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!mockExam || timeRemaining <= 0) {
      if (timeRemaining <= 0) handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(t => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // --------------------------------------------------
  // AUTO SUBMIT
  // --------------------------------------------------

  useEffect(() => {
    const handleLeave = () => handleSubmit(true);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) handleLeave();
    });

    window.addEventListener("blur", handleLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleLeave);
      window.removeEventListener("blur", handleLeave);
    };
  }, []);

  // --------------------------------------------------
  // SUBMIT MOCK
  // --------------------------------------------------

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const subject of subjects) {
      const attemptId = attempts[subject.assessmentId];
      if (!attemptId) continue;

      const { data: attempt } = await supabase
        .from("attempts")
        .select("score, total_questions")
        .eq("id", attemptId)
        .single();

      if (attempt) {
        totalCorrect += attempt.score || 0;
        totalQuestions += attempt.total_questions || 0;
      }
    }

    const percentage = totalQuestions
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;

    notifyUserAction(
      mockExam.profiles.email,
      mockExam.profiles.full_name,
      "results_available",
      `Score: ${totalCorrect}/${totalQuestions} (${percentage}%)`
    );

    toast.success("Exam submitted!");
    navigate("/dashboard");
    setSubmitting(false);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading...</div>;

  const subject = subjects[currentSubjectIndex];
  const overallProgress = ((currentSubjectIndex + 1) / subjects.length) * 100;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>{mockExam.title} - {subject.subject}</CardTitle>
                <CardDescription>
                  Subject {currentSubjectIndex + 1} of {subjects.length}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <Clock /> {new Date(timeRemaining * 1000).toISOString().substr(11, 8)}
              </div>
            </div>
            <Progress value={overallProgress} />
          </CardHeader>
        </Card>

        <SubjectAssessment
          subjectData={subject}
          mockExamId={mockExamId}
          timeRemaining={timeRemaining}
          onAttemptCreated={(id) =>
            setAttempts(prev => ({ ...prev, [subject.assessmentId]: id }))
          }
          onComplete={() => {
            if (currentSubjectIndex < subjects.length - 1) {
              setCurrentSubjectIndex(i => i + 1);
            } else {
              handleSubmit(false);
            }
          }}
        />
      </div>
    </div>
  );
};


// --------------------------------------------------
// SUBJECT COMPONENT
// --------------------------------------------------

const SubjectAssessment = ({
  subjectData,
  mockExamId,
  timeRemaining,
  onComplete,
  onAttemptCreated
}: any) => {

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setQuestions(subjectData.questions || []);
  }, [subjectData]);

  useEffect(() => {
    const createAttempt = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("attempts").insert({
        student_id: user.id,
        mock_exam_id: mockExamId,
        subject_id: subjectData.assessmentId
      }).select().single();

      if (data) {
        setAttemptId(data.id);
        onAttemptCreated(data.id);
      }
    };

    if (questions.length > 0) createAttempt();
  }, [questions]);

  useEffect(() => {
    if (timeRemaining <= 0) handleSubmit(true);
  }, [timeRemaining]);

  const handleSubmit = async (autoSubmitted = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    let score = 0;

    for (const q of questions) {
      const selected = answers[q.id];
      const correct = selected === q.correct_answer;
      if (correct) score++;

      await supabase.from("answers").insert({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: selected || null,
        is_correct: correct
      });
    }

    await supabase.from("attempts").update({
      score,
      total_questions: questions.length,
      passed: score >= 50,
      submitted_at: new Date().toISOString(),
      auto_submitted: autoSubmitted
    }).eq("id", attemptId);

    onComplete();
    setSubmitting(false);
  };

  const q = questions[currentQuestionIndex];

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{q.question_text}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[q.id] || ""}
            onValueChange={(v) =>
              setAnswers(prev => ({ ...prev, [q.id]: v }))
            }
          >
            {["A", "B", "C", "D"].map(opt => (
              <div key={opt} className="border p-3 rounded flex items-center gap-3">
                <RadioGroupItem value={opt} />
                <Label>{q[`option_${opt.toLowerCase()}`]}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
        >
          <ChevronLeft /> Previous
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex(i => i + 1)}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button onClick={() => handleSubmit(false)} disabled={submitting}>
            Submit Subject
          </Button>
        )}
      </div>
    </>
  );
};

export default TakeMockExam;
